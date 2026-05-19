// pages/topic/index.js - 专题页面
const topicApi = require("../../api/topic");
const matchApi = require("../../api/match");
const userStore = require("../../store/user");
const userApi = require("../../api/user");

Page({
  data: {
    loading: false,
    error: null,
    hotMatches: [],
    majorEvents: [],
    hotTopics: [], // 热门专题（进行中）
    selectTopics: [], // 精选专题（未开始）
    championsLeague: {}, // 欧冠专题
    worldCup: {}, // 世界杯专题
    championsLeagueMatches: [], // 欧冠相关比赛
    // 功能开关
    showAiAnalysis: false, // 是否显示AI分析按钮
  },

  onLoad() {
    this.loadTopicData();
    this.checkFeatures();
  },

  onShow() {
    // 设置tabBar选中状态
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selectedPath: "/pages/topic/index" });
    }

    // 如果从登录页返回，且有待分析的比赛
    const app = getApp();
    if (app.globalData.pendingAnalysisMatch && userStore.isLoggedIn()) {
      const pendingMatch = app.globalData.pendingAnalysisMatch;
      app.globalData.pendingAnalysisMatch = null;
      setTimeout(() => {
        this.triggerAnalysisForMatch(pendingMatch);
      }, 500);
    }
  },

  // 将比赛数据转换为 match-card 组件需要的格式
  transformMatchList(matches) {
    return matches.map(item => ({
      id: item.matchId,
      matchNumStr: item.matchNumStr || '',
      league: item.leagueAbbName || '',
      leagueColor: item.leagueColor || '667eea',
      homeTeam: item.homeTeamAbbName || '',
      awayTeam: item.awayTeamAbbName || '',
      homeTeamRank: item.homeTeamRank || '',
      awayTeamRank: item.awayTeamRank || '',
      homeScore: item.homeScore,
      awayScore: item.awayScore,
      isFinished: item.homeScore !== undefined && item.awayScore !== undefined,
      matchTime: item.matchTime || '',
      fullMatchTime: item.matchDate ? `${item.matchDate} ${item.matchTime || ''}` : (item.fullMatchTime || ''),
      // Tips 相关字段
      homeTags: item.homeTags ? (typeof item.homeTags === 'string' ? item.homeTags.split(',') : item.homeTags) : [],
      homeFormTrend: item.homeFormTrend || '',
      homeAdvice: item.homeAdvice || '',
      awayTags: item.awayTags ? (typeof item.awayTags === 'string' ? item.awayTags.split(',') : item.awayTags) : [],
      awayFormTrend: item.awayFormTrend || '',
      awayAdvice: item.awayAdvice || '',
      // 赔率数据
      odds: {
        home: item.homeWin || '-',
        draw: item.draw || '-',
        away: item.awayWin || '-',
        goalLine: item.goalLine || null,
        hhome: item.hhomeWin || item.hhome || '-',
        hdraw: item.hdraw || '-',
        haway: item.hawayWin || item.haway || '-',
      },
      // 保留原始数据用于跳转
      _originalMatch: item,
    }));
  },

  // 检查功能开关
  async checkFeatures() {
    try {
      const result = await matchApi.checkFeatures();
      this.setData({ showAiAnalysis: result === true });
    } catch (error) {
      console.error("检查功能开关失败:", error);
      this.setData({ showAiAnalysis: false });
    }
  },

  // 点击热门比赛卡片
  onHotMatchTap(e) {
    const { match } = e.detail;
    if (!match) return;

    if (!userStore.isLoggedIn()) {
      wx.showToast({ title: "请先登录", icon: "none" });
      wx.navigateTo({ url: "/pages/login/index" });
      return;
    }

    // 获取原始数据用于跳转
    const originalMatch = match._originalMatch || match;
    const matchId = match.id || originalMatch.matchId;

    // 跳转到分析页面（数据分析免费）
    wx.navigateTo({
      url: `/pages/analysis/index?matchId=${matchId}`,
    });
  },

  // AI分析按钮点击
  onAiAnalyze(e) {
    const { match } = e.detail;
    if (!match) return;

    // 获取原始数据
    const originalMatch = match._originalMatch || match;

    if (!userStore.isLoggedIn()) {
      const app = getApp();
      app.globalData.pendingAnalysisMatch = originalMatch;
      wx.navigateTo({ url: "/pages/login/index" });
      return;
    }

    const userInfo = userStore.getUserInfo();
    const isVip = userInfo && userInfo.isVip === true;

    // VIP直接跳转
    if (isVip) {
      this.navigateToAiAnalysis(originalMatch);
      return;
    }

    // 检查积分
    const userPoints = userInfo.point || 0;
    const pointsNeeded = 1;

    if (userPoints < pointsNeeded) {
      wx.showModal({
        title: "积分不足",
        content: `AI分析需要消耗 ${pointsNeeded} 积分，您当前积分为 ${userPoints}。\n\n开通会员可免费查看所有分析！`,
        confirmText: "开通会员",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: "/pages/vip/index" });
          }
        },
      });
      return;
    }

    wx.showModal({
      title: "解锁AI分析",
      content: `本次分析将消耗 ${pointsNeeded} 积分，是否继续？\n\n提示：开通会员可免费查看所有分析`,
      confirmText: "确认",
      cancelText: "取消",
      success: async (res) => {
        if (res.confirm) {
          await this.unlockAiAnalysis(originalMatch, userInfo.id, pointsNeeded);
        }
      },
    });
  },

  // 解锁并跳转AI分析
  async unlockAiAnalysis(match, userId, points) {
    try {
      wx.showLoading({ title: `消耗${points}积分中...`, mask: true });

      await userApi.deductPoint(userId, points, match.matchId);

      const latestUserInfo = await userApi.getUserInfoById(userId);
      if (latestUserInfo) {
        const app = getApp();
        app.globalData.userInfo = latestUserInfo;
        wx.setStorageSync("userInfo", latestUserInfo);
      }

      wx.hideLoading();
      wx.showToast({ title: `消耗${points}积分`, icon: "success", duration: 1500 });

      setTimeout(() => {
        this.navigateToAiAnalysis(match);
      }, 1500);
    } catch (e) {
      wx.hideLoading();
      console.error("解锁失败:", e);
      wx.showToast({ title: "解锁失败", icon: "none" });
    }
  },

  // 跳转到AI分析页面
  navigateToAiAnalysis(match) {
    const matchInfo = encodeURIComponent(
      JSON.stringify({
        league: match.leagueAbbName || match.league,
        homeTeam: match.homeTeamAbbName || match.homeTeam,
        awayTeam: match.awayTeamAbbName || match.awayTeam,
      }),
    );

    wx.navigateTo({
      url: `/pages/ai-analysis/index?matchId=${match.matchId || match.id}&matchInfo=${matchInfo}`,
    });
  },

  // 触发指定比赛的AI分析
  triggerAnalysisForMatch(targetMatch) {
    if (!targetMatch || !targetMatch.matchId) return;

    const userInfo = userStore.getUserInfo();
    if (!userInfo) return;

    // 从原始数据中查找
    const match = this.data.hotMatches.find(m => {
      const original = m._originalMatch || m;
      return original.matchId === targetMatch.matchId;
    });
    if (!match) return;

    // 获取原始数据
    const originalMatch = match._originalMatch || match;

    const isVip = userInfo.isVip === true;
    const userPoints = userInfo.point || 0;
    const pointsNeeded = 1;

    if (!match.isUnlocked && !isVip) {
      if (userPoints < pointsNeeded) {
        wx.showModal({
          title: "积分不足",
          content: `AI分析需要消耗 ${pointsNeeded} 积分，您当前积分为 ${userPoints}，请做任务或者联系客服获取积分。`,
          confirmText: "我的页面",
          cancelText: "取消",
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({ url: "/pages/profile/index" });
            }
          },
        });
        return;
      }

      wx.showModal({
        title: "解锁AI分析",
        content: `本次分析将消耗 ${pointsNeeded} 积分，是否继续？`,
        confirmText: "确认",
        cancelText: "取消",
        success: async (res) => {
          if (res.confirm) {
            await this.unlockAiAnalysis(originalMatch, userInfo.id, pointsNeeded);
          }
        },
      });
    } else {
      this.navigateToAiAnalysis(originalMatch);
    }
  },

  // 加载专题数据
  async loadTopicData() {
    this.setData({ loading: true, error: null });
    try {
      const data = await topicApi.getTopicHome();
      const majorEvents = data.majorEvents || [];
      const hotMatches = data.hotMatches || [];

      // 按startDate分类：进行中的为热门，未开始的为精选
      const now = new Date();
      const hotTopics = [];
      const selectTopics = [];
      const championsLeague = {};
      const worldCup = {};

      // 筛选欧冠和世界杯专题
      majorEvents.forEach((item) => {
        const topicName = (item.topicName || '').toLowerCase();
        if (topicName.includes('欧冠') || topicName.includes('champions league')) {
          Object.assign(championsLeague, item);
        } else if (topicName.includes('世界杯') || topicName.includes('world cup')) {
          Object.assign(worldCup, item);
        } else {
          const startDate = item.startDate ? new Date(item.startDate) : null;
          if (startDate && startDate <= now) {
            hotTopics.push(item);
          } else {
            selectTopics.push(item);
          }
        }
      });

      // 格式化世界杯日期
      if (worldCup.startDate && worldCup.endDate) {
        worldCup.formattedDate = this.formatDateRange(worldCup.startDate, worldCup.endDate);
      }

      // 筛选欧冠相关比赛
      const championsLeagueMatches = championsLeague.topicName 
        ? hotMatches.filter(m => {
            const league = (m.leagueAbbName || '').toLowerCase();
            return league.includes('欧冠') || league.includes('champions');
          })
        : [];

      // 转换热门比赛数据为 match-card 组件需要的格式
      const transformedHotMatches = this.transformMatchList(hotMatches);

      this.setData({
        hotMatches: transformedHotMatches,
        majorEvents,
        hotTopics,
        selectTopics,
        championsLeague,
        worldCup,
        championsLeagueMatches,
        loading: false,
      });
    } catch (error) {
      console.error("加载专题失败:", error);
      this.setData({
        loading: false,
        error: error.message || "加载失败",
      });
    }
  },

  // 重试
  onRetry() {
    this.loadTopicData();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadTopicData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 点击专题推荐卡片，放大显示图片
  onEventCardTap(e) {
    const { url } = e.currentTarget.dataset;
    const { majorEvents } = this.data;

    // 获取所有图片URL用于预览
    const urls = majorEvents.map(item => item.imageUrl);
    const current = url;

    wx.previewImage({
      current,
      urls,
    });
  },

  // 点击专题卡片，跳转到详情页
  onTopicTap(e) {
    const { id, name, url } = e.currentTarget.dataset;
    if (!id) return;

    wx.navigateTo({
      url: `/pages/topic-detail/index?topicId=${id}&topicName=${encodeURIComponent(name || '')}&imageUrl=${encodeURIComponent(url || '')}`,
    });
  },

  // 跳转到VIP页面
  goToVip() {
    wx.navigateTo({
      url: '/pages/vip/index',
    });
  },

  // 格式化日期范围
  formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return '';

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    };

    const start = formatDate(startDate);
    const end = formatDate(endDate);

    // 如果年份相同，只显示月日
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();

    if (startYear === endYear) {
      return `${start} - ${end}`;
    }
    return `${startYear}${start} - ${endYear}${end}`;
  },
});
