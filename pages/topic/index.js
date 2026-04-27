// pages/topic/index.js - 专题页面
const topicApi = require("../../api/topic");

Page({
  data: {
    loading: false,
    error: null,
    hotMatches: [],
    majorEvents: [],
  },

  onLoad() {
    this.loadTopicData();
  },

  onShow() {
    // 设置tabBar选中状态
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selectedPath: "/pages/topic/index" });
    }
  },

  // 加载专题数据
  async loadTopicData() {
    this.setData({ loading: true, error: null });
    try {
      const data = await topicApi.getTopicHome();
      this.setData({
        hotMatches: data.hotMatches || [],
        majorEvents: data.majorEvents || [],
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
});
