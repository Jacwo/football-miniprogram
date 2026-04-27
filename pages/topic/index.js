// pages/topic/index.js - 专题页面
const topicApi = require("../../api/topic");

Page({
  data: {
    loading: false,
    error: null,
    hotMatches: [],
    majorEvents: [],
    hotTopics: [], // 热门专题（进行中）
    selectTopics: [], // 精选专题（未开始）
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
      const majorEvents = data.majorEvents || [];

      // 按startDate分类：进行中的为热门，未开始的为精选
      const now = new Date();
      const hotTopics = [];
      const selectTopics = [];

      majorEvents.forEach((item) => {
        const startDate = item.startDate ? new Date(item.startDate) : null;
        if (startDate && startDate <= now) {
          hotTopics.push(item);
        } else {
          selectTopics.push(item);
        }
      });

      this.setData({
        hotMatches: data.hotMatches || [],
        majorEvents,
        hotTopics,
        selectTopics,
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
});
