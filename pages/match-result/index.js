// pages/match-result/index.js - 赛果列表
const matchApi = require("../../api/match");
const historyApi = require("../../api/history");
const leagueColor = require("../../store/leagueColor");
const userStore = require("../../store/user");

Page({
  data: {
    activeTab: "live", // live: 比分直播, result: 赛果, history: 历史记录
    results: [],
    liveMatches: [],
    historyList: [],
    loading: false,
    error: null,
    expandedId: null,
    showHistory: false, // 是否显示历史tab，由后端配置控制
    // 历史记录相关
    historyLoading: false,
    historyRefreshing: false,
    historyHasMore: true,
    historyPageNo: 1,
    historyPageSize: 20,
    historyTotal: 0,
    historyError: null,
    // 历史页面内的Tab
    historySubTab: "list", // list: 历史列表, models: 模型统计
    // 模型列表相关
    models: [],
    modelsLoading: false,
    modelsError: null,
    // 模型统计详情相关
    modelStats: null,
    modelStatsLoading: false,
    modelStatsError: null,
  },

  onLoad() {
    this._isFirstShow = true;
    this.setData({ loading: true });
    this.checkFeatures(); // 获取配置，控制历史tab显示
    this.loadLiveMatches();
  },

  // 检查功能开关，控制历史tab显示
  async checkFeatures() {
    try {
      const result = await matchApi.checkFeatures();
      const showHistory = result === true;
      this.setData({ showHistory });
      
      // 如果当前在历史tab但配置关闭，自动切换到赛果tab
      if (!showHistory && this.data.activeTab === 'history') {
        this.setData({ activeTab: 'result' });
        this.loadResults();
      }
    } catch (error) {
      console.error("检查功能开关失败:", error);
      this.setData({ showHistory: false });
    }
  },

  onShow() {
    // 设置tabBar选中状态
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selectedPath: "/pages/match-result/index" });
    }
    // 首次显示时跳过（onLoad已加载），后续切换tab时刷新
    if (this._isFirstShow) {
      this._isFirstShow = false;
      return;
    }
    if (this.data.activeTab === "live") {
      this.loadLiveMatches();
    } else if (this.data.activeTab === "result") {
      this.loadResults();
    } else if (this.data.activeTab === "history") {
      this.loadHistory();
    }
  },

  // 切换 Tab
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;

    this.setData({ activeTab: tab, expandedId: null });

    if (tab === "result") {
      this.loadResults();
    } else if (tab === "live") {
      this.loadLiveMatches();
    } else if (tab === "history") {
      this.loadHistory();
    }
  },

  // 加载赛果列表
  async loadResults() {
    this.setData({ loading: true, error: null });
    try {
      const res = await matchApi.getMatchResults();
      const results = res.data || res || [];

      // 缓存联赛颜色
      leagueColor.batchSetColors(results);

      const processedResults = results.map((item) => {
        const score = item.crsResult;
        // 兼容不同的联赛字段名
        const lgId = item.leagueId || item.leagueCode || item.league_id;
        const lgName = item.leagueName || item.leagueAbbName;

        // 获取联赛颜色：优先接口返回 -> 按ID查缓存 -> 按名称查缓存 -> 默认色
        const displayColor =
          item.backColor ||
          leagueColor.getColor(lgId, null) ||
          leagueColor.getColor(lgName, null) ||
          "667eea";

        return {
          ...item,
          statusClass: this.getStatusClass(item.matchStatus),
          fullScore: this.formatScore(score),
          halfScore: this.formatScore(item.sectionsNo1 || item.halfScore),
          displayDate: this.formatDate(item.matchDate),
          displayTime: item.matchTime || "--:--",
          displayColor,
        };
      });

      this.setData({ results: processedResults, loading: false });
    } catch (error) {
      console.error("加载赛果失败:", error);
      this.setData({ loading: false, error: "加载失败，请重试" });
    }
  },

  // 加载比分直播列表
  async loadLiveMatches() {
    this.setData({ loading: true, error: null });
    try {
      const res = await matchApi.getMatchLive();
      const matches = res.data || res || [];

      // 缓存联赛颜色
      leagueColor.batchSetColors(matches);

      const processedMatches = matches.map((item) => {
        // 按时间升序排列事件（先进球在上）
        const eventList = (item.eventList || [])
          .map((event) => {
            const minute = parseInt(event.matchMinute, 10) || 0;
            // 补时进球格式化：如 "45+3" → "+3'"
            const rawMinute = event.matchMinute || '';
            let _displayMinute = rawMinute;
            if (rawMinute && rawMinute.includes('+')) {
              const parts = rawMinute.split('+');
              _displayMinute = '+' + parts[1];
            }
            return {
              ...event,
              eventName: this.getEventName(event.eventCode),
              isHome: event.teamType === "home",
              _sortMinute: minute,
              _displayMinute,
            };
          })
          .sort((a, b) => a._sortMinute - b._sortMinute);

        // 标记下半场第一条事件（中场分隔线）
        let halfLineInserted = false;
        for (let i = 0; i < eventList.length; i++) {
          if (!halfLineInserted && eventList[i]._sortMinute > 45) {
            eventList[i]._showHalfLine = true;
            halfLineInserted = true;
          }
        }

        return {
          ...item,
          displayDate: this.formatDate(item.matchDate),
          displayTime: item.matchTime ? item.matchTime.substring(0, 5) : "--:--",
          displayColor: item.backColor || leagueColor.getColor(item.leagueId),
          events: eventList,
        };
      });

      this.setData({ liveMatches: processedMatches, loading: false });
    } catch (error) {
      console.error("加载比分直播失败:", error);
      this.setData({ loading: false, error: "加载失败，请重试" });
    }
  },

  // 获取事件名称
  getEventName(eventCode) {
    const eventMap = {
      G: "进球",
      PG: "点球",
      OG: "乌龙球",
      Y: "黄牌",
      R: "红牌",
      S: "换人",
    };
    return eventMap[eventCode] || eventCode;
  },

  // 获取状态样式类
  getStatusClass(status) {
    const statusMap = {
      0: "upcoming",
      1: "ongoing",
      2: "finished",
      6: "finished",
    };
    return statusMap[status] || "unknown";
  },

  // 格式化比分
  formatScore(score) {
    if (!score) return "-";
    return score;
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return "--";
    try {
      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${month}-${day}`;
    } catch (e) {
      return dateStr;
    }
  },

  // 切换展开状态
  onToggleExpand(e) {
    const matchId = e.currentTarget.dataset.matchid;
    const isExpanded = this.data.expandedId === matchId;
    this.setData({
      expandedId: isExpanded ? null : matchId,
    });
  },

  // 重试加载
  onRetry() {
    if (this.data.activeTab === "result") {
      this.loadResults();
    } else {
      this.loadLiveMatches();
    }
  },

  // 刷新
  onRefresh() {
    wx.showToast({ title: "刷新中...", icon: "loading", duration: 500 });
    if (this.data.activeTab === "result") {
      this.loadResults();
    } else if (this.data.activeTab === "live") {
      this.loadLiveMatches();
    } else if (this.data.activeTab === "history") {
      this.refreshHistory();
    }
  },

  // ====== 历史记录相关方法 ======
  // 加载历史记录
  async loadHistory() {
    this.setData({ historyLoading: true, historyError: null });

    try {
      const { historyPageNo, historyPageSize } = this.data;
      const result = await historyApi.getHistoryList({ pageNo: historyPageNo, pageSize: historyPageSize });

      const { list = [], total = 0 } = result || {};

      // 按照时间倒序排列（最新的在前）
      if (Array.isArray(list)) {
        list.sort((a, b) => {
          const timeA = new Date(a.createTime || a.matchTime || 0).getTime();
          const timeB = new Date(b.createTime || b.matchTime || 0).getTime();
          return timeB - timeA;
        });
      }

      this.setData({
        historyList: list,
        historyTotal: total,
        historyHasMore: list.length >= historyPageSize,
        historyLoading: false,
      });
    } catch (e) {
      console.error("加载历史记录失败:", e);
      this.setData({
        historyLoading: false,
        historyError: e.message || "加载失败",
      });
    }
  },

  // 刷新历史记录
  async refreshHistory() {
    this.setData({
      historyPageNo: 1,
      historyRefreshing: true,
    });

    await this.loadHistory();

    this.setData({ historyRefreshing: false });
  },

  // 加载更多历史记录
  async loadMoreHistory() {
    if (!this.data.historyHasMore || this.data.historyLoading) return;

    const { historyPageNo, historyPageSize, historyList } = this.data;

    this.setData({ historyLoading: true });

    try {
      const result = await historyApi.getHistoryList({
        pageNo: historyPageNo + 1,
        pageSize: historyPageSize,
      });

      const { list: newList = [] } = result || {};

      this.setData({
        historyList: [...historyList, ...newList],
        historyPageNo: historyPageNo + 1,
        historyHasMore: newList.length >= historyPageSize,
        historyLoading: false,
      });
    } catch (e) {
      console.error("加载更多失败:", e);
      this.setData({ historyLoading: false });
      wx.showToast({
        title: "加载失败",
        icon: "none",
      });
    }
  },

  // 点击历史记录
  onHistoryItemTap(e) {
    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      wx.navigateTo({
        url: "/pages/login/index",
      });
      return;
    }

    const { record } = e.detail;
    const matchId = record && record.matchId;
    wx.navigateTo({
      url: `/pages/history-detail/index?id=` + matchId,
    });
  },

  // 处理下拉刷新
  onPullDownRefresh() {
    if (this.data.activeTab === "history") {
      this.refreshHistory().finally(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  // 处理上拉加载
  onReachBottom() {
    if (this.data.activeTab === "history" && this.data.historySubTab === "list" && this.data.historyHasMore && !this.data.historyLoading) {
      this.loadMoreHistory();
    }
  },

  // 赛果列表上拉加载
  onResultScrollToLower() {
    wx.showToast({ title: "没有更多赛果了", icon: "none", duration: 1500 });
  },

  // 实时列表上拉加载
  onLiveScrollToLower() {
    wx.showToast({ title: "实时数据自动刷新中", icon: "none", duration: 1500 });
    this.loadLiveMatches();
  },

  // 历史记录上拉加载
  onHistoryScrollToLower() {
    if (this.data.historyHasMore && !this.data.historyLoading) {
      this.loadMoreHistory();
    }
  },

  // ====== 历史页面内的Tab切换 ======
  onHistorySubTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.historySubTab) return;

    this.setData({ historySubTab: tab });

    if (tab === "models") {
      this.loadModels();
    }
  },

  // 加载模型列表
  async loadModels() {
    this.setData({ modelsLoading: true, modelsError: null, modelStats: null });
    try {
      const data = await historyApi.getModelList();
      const models = data.data || data || [];
      this.setData({ models, modelsLoading: false });
    } catch (error) {
      console.error("加载模型列表失败:", error);
      this.setData({ modelsLoading: false, modelsError: error.message || "加载失败" });
    }
  },

  // 加载模型统计详情
  async loadModelStats(modelType) {
    this.setData({ modelStatsLoading: true, modelStatsError: null });
    try {
      const data = await historyApi.getModelStats(modelType);
      this.setData({ modelStats: data[0], modelStatsLoading: false });
    } catch (error) {
      console.error("加载模型统计详情失败:", error);
      this.setData({ modelStatsLoading: false, modelStatsError: error.message || "加载失败" });
    }
  },

  // 点击模型
  onModelTap(e) {
    const { modelType } = e.currentTarget.dataset;
    this.loadModelStats(modelType);
  },

  // 返回模型列表
  onModelBackClick() {
    this.setData({ modelStats: null });
  },

});
