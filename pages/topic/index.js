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
    // 模拟选号按钮位置
    calculatorX: 500,
    calculatorY: 120,
    // 功能开关
    showCalculator: false, // 是否显示模拟选号按钮
    showAiAnalysis: false, // 是否显示AI分析按钮
    // 展开的比赛ID
    expandedMatchId: null,
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

  // 检查功能开关
  async checkFeatures() {
    try {
      const result = await matchApi.checkFeatures();
      const showCalculator = result === true;
      this.setData({ showCalculator, showAiAnalysis: showCalculator });
    } catch (error) {
      console.error("检查功能开关失败:", error);
      this.setData({ showCalculator: false, showAiAnalysis: false });
    }
  },

  // 跳转到模拟选号（只包含当前页面的热门比赛）
  onCalculator() {
    if (!userStore.isLoggedIn()) {
      wx.showToast({ title: "请先登录", icon: "none" });
      wx.navigateTo({ url: "/pages/login/index" });
      return;
    }

    // 将当前页面的热门比赛数据传递给计算器页面
    const hotMatches = this.data.hotMatches;
    if (hotMatches && hotMatches.length > 0) {
      const matchData = encodeURIComponent(JSON.stringify(hotMatches));
      wx.navigateTo({
        url: `/pages/calculator/index?matches=${matchData}&source=topic`,
      });
    } else {
      wx.showToast({ title: "暂无热门比赛", icon: "none" });
    }
  },

  // 模拟选号按钮拖动
  onCalculatorMove() {
    this._lastMoveTime = Date.now();
  },

  // 点击热门比赛卡片
  onHotMatchTap(e) {
    const { matchid } = e.currentTarget.dataset;
    const match = this.data.hotMatches.find(m => m.matchId === matchid);
    if (!match) return;

    if (!userStore.isLoggedIn()) {
      wx.showToast({ title: "请先登录", icon: "none" });
      wx.navigateTo({ url: "/pages/login/index" });
      return;
    }

    // 跳转到分析页面（数据分析免费）
    wx.navigateTo({
      url: `/pages/analysis/index?matchId=${match.matchId}`,
    });
  },

  // 数据分析按钮点击（免费，直接跳转分析页）
  onDataAnalyze(e) {
    const { matchid } = e.currentTarget.dataset;
    const match = this.data.hotMatches.find(m => m.matchId === matchid);
    if (!match) return;

    if (!userStore.isLoggedIn()) {
      wx.showToast({ title: "请先登录", icon: "none" });
      wx.navigateTo({ url: "/pages/login/index" });
      return;
    }

    // 免费跳转到分析页面
    wx.navigateTo({
      url: `/pages/analysis/index?matchId=${match.matchId}`,
    });
  },

  // AI分析按钮点击
  onAiAnalyze(e) {
    const { matchid } = e.currentTarget.dataset;
    const match = this.data.hotMatches.find(m => m.matchId === matchid);
    if (!match) return;

    if (!userStore.isLoggedIn()) {
      const app = getApp();
      app.globalData.pendingAnalysisMatch = match;
      wx.navigateTo({ url: "/pages/login/index" });
      return;
    }

    const userInfo = userStore.getUserInfo();
    const isVip = userInfo && userInfo.isVip === true;

    // VIP直接跳转
    if (isVip) {
      this.navigateToAiAnalysis(match);
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
          await this.unlockAiAnalysis(match, userInfo.id, pointsNeeded);
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
        league: match.leagueAbbName,
        homeTeam: match.homeTeamAbbName,
        awayTeam: match.awayTeamAbbName,
      }),
    );

    wx.navigateTo({
      url: `/pages/ai-analysis/index?matchId=${match.matchId}&matchInfo=${matchInfo}`,
    });
  },

  // 触发指定比赛的AI分析
  triggerAnalysisForMatch(targetMatch) {
    if (!targetMatch || !targetMatch.matchId) return;

    const userInfo = userStore.getUserInfo();
    if (!userInfo) return;

    const match = this.data.hotMatches.find(m => m.matchId === targetMatch.matchId);
    if (!match) return;

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
            await this.unlockAiAnalysis(match, userInfo.id, pointsNeeded);
          }
        },
      });
    } else {
      this.navigateToAiAnalysis(match);
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

      // 筛选欧冠相关比赛
      const championsLeagueMatches = championsLeague.topicName 
        ? hotMatches.filter(m => {
            const league = (m.leagueAbbName || '').toLowerCase();
            return league.includes('欧冠') || league.includes('champions');
          })
        : [];

      this.setData({
        hotMatches,
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
});
