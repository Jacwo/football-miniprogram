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
    hotLeagues: [], // 热门赛事
    // 功能开关
    showAiAnalysis: false, // 是否显示AI分析按钮
    isRefreshing: false, // 下拉刷新状态
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
      isSingleMatch: item.isSingleMatch || item.singleMatch || false,
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
      content: `本次分析将消耗 ${pointsNeeded} 积分，是否继续？\n提示：开通会员可查看所有分析`,
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
      const hotLeagues = data.hotLeagues || [];

      // 先给所有 majorEvents 加上根据实际日期判断的 isActive + 格式化日期
      const now = new Date();
      const processedMajorEvents = majorEvents.map(item => {
        const startDate = item.startDate ? new Date(item.startDate) : null;
        const endDate = item.endDate ? new Date(item.endDate) : null;
        let isActive = false;
        if (startDate && startDate <= now) {
          // 已开始：判断是否还在进行中（未结束或无结束日期）
          isActive = !endDate || endDate >= now;
        }
        return {
          ...item,
          isActive,
          showStartDate: this.formatShowDate(item.startDate),
          showEndDate: this.formatShowDate(item.endDate),
        };
      });

      // 按startDate分类：进行中的为热门，未开始的为精选
      const hotTopics = [];
      const selectTopics = [];

      processedMajorEvents.forEach((item) => {
        const startDate = item.startDate ? new Date(item.startDate) : null;
        if (startDate && startDate <= now) {
          hotTopics.push(item);
        } else {
          selectTopics.push(item);
        }
      });

      // 转换热门比赛数据为 match-card 组件需要的格式
      const transformedHotMatches = this.transformMatchList(hotMatches);

      // 处理 hotLeagues：根据实际日期判断是否已经开始 + 格式化日期
      const processedHotLeagues = hotLeagues.map(item => {
        const startDate = item.startDate ? new Date(item.startDate) : null;
        const endDate = item.endDate ? new Date(item.endDate) : null;
        let isActive = false;
        
        if (startDate && startDate <= now) {
          // 已开始，如果没有结束日期或结束日期在未来，则视为进行中
          isActive = !endDate || endDate >= now;
        }
        // 如果 status 字段明确为 live/ongoing，也视为进行中
        if (!isActive && item.status && (item.status === 'live' || item.status === 'ongoing')) {
          isActive = true;
        }
        
        return {
          ...item,
          isActive,
          showStartDate: this.formatShowDate(item.startDate),
          showEndDate: this.formatShowDate(item.endDate),
          leagueNameShort: this.truncateStr(item.leagueName, 8),
        };
      });

      // 合并轮播图数据：majorEvents + hotLeagues中有carouselImageUrl的
      const carouselItems = [
        ...processedMajorEvents.map(item => ({
          ...item,
          _key: `event_${item.id}`,
          _name: item.topicName,
          _desc: item.topicDesc,
          _id: item.id,
        })),
        ...processedHotLeagues
          .filter(item => item.carouselImageUrl)
          .map(item => ({
            ...item,
            _key: `league_${item.topicId || item.leagueId}`,
            _name: item.topicName || item.leagueName,
            _desc: item.topicDesc || item.leagueDesc,
            _id: item.topicId,
          })),
      ];

      this.setData({
        hotMatches: transformedHotMatches,
        majorEvents: processedMajorEvents,
        hotTopics,
        selectTopics,
        hotLeagues: processedHotLeagues,
        carouselItems,
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

  // scroll-view 下拉刷新
  onScrollRefresh() {
    this.setData({ isRefreshing: true });
    this.loadTopicData().finally(() => {
      this.setData({ isRefreshing: false });
    });
  },

  // 页面级下拉刷新（兼容场景）
  onPullDownRefresh() {
    this.loadTopicData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 点击轮播图
  onEventCardTap(e) {
    const { id, name, url, jump } = e.currentTarget.dataset;
    
    // jump 字段为 false 时不跳转
    if (jump === false || jump === 'false') return;

    // 如果有专题ID，跳转到专题详情页
    if (id) {
      wx.navigateTo({
        url: `/pages/topic-detail/index?topicId=${id}&topicName=${encodeURIComponent(name || '')}&imageUrl=${encodeURIComponent(url || '')}`,
      });
      return;
    }

    // 否则预览图片
    const { carouselItems } = this.data;
    const urls = carouselItems.map(item => item.carouselImageUrl || item.imageUrl).filter(Boolean);
    wx.previewImage({
      current: url,
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

  // 截断字符串，超长尾部加...
  truncateStr(str, maxLen) {
    if (!str || str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '...';
  },

  // 格式化展示日期：2026-06-12T03:00:00 → 2026.06.12
  formatShowDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return dateStr;
    }
  },
});
