// pages/topic-detail/index.js - 专题详情页
const worldcupApi = require("../../api/worldcup");

Page({
  data: {
    topicId: null,
    topicInfo: null,
    loading: false,
    error: null,
    timelineMatches: [], // 时间轴比赛列表
    showGroupsModal: false, // 是否显示分组弹窗
    groupsLoading: false, // 分组加载状态
    groupNames: [], // 分组名称数组
    groupList: {}, // 分组数据（按小组名索引的对象）
    selectedGroupIndex: 0, // 当前选中的分组索引
    // 倒计时数据
    countdownDays: 0,
    countdownHours: 0,
    countdownMins: 0,
    countdownSecs: 0,
    // 是否是世界杯专题
    isWorldCup: false,

  },

  onLoad(options) {
    const { topicId, topicName, imageUrl } = options;
    console.log('专题详情页接收参数:', { topicId, topicName, imageUrl });

    const decodedTopicName = topicName ? decodeURIComponent(topicName) : '';
    const isWorldCup = decodedTopicName.includes('世界杯') || decodedTopicName.includes('World Cup');
    console.log('解码后的专题名称:', decodedTopicName);
    console.log('是否包含世界杯:', isWorldCup);

    // 如果有传入专题信息，先显示
    if (topicName || imageUrl) {
      const topicInfo = {
        topicName: decodedTopicName || '专题详情',
        imageUrl: imageUrl ? decodeURIComponent(imageUrl) : null,
      };
      console.log('设置 topicInfo:', topicInfo);
      this.setData({ topicInfo, isWorldCup });
      console.log('设置后的 topicInfo:', this.data.topicInfo);
    }

    if (topicId) {
      this.setData({ topicId: Number(topicId) });
      this.loadTopicDetail();
    }

    // 启动倒计时
    this.startCountdown();
  },

  // 启动倒计时
  startCountdown() {
    // 世界杯开幕日期：2026年6月12日 03:00
    const targetDate = new Date('2026-06-12T03:00:00');

    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        this.setData({
          countdownDays: days,
          countdownHours: hours,
          countdownMins: mins,
          countdownSecs: secs,
        });
      }
    };

    updateCountdown();
    this.countdownTimer = setInterval(updateCountdown, 1000); // 每秒更新
  },

  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selectedPath: "/pages/topic/index" });
    }
  },

  // 加载专题详情
  async loadTopicDetail() {
    this.setData({ loading: true, error: null });

    const topicName = decodeURIComponent(this.data.topicInfo?.topicName || '专题');
    const isWorldCup = topicName.includes('世界杯') || topicName.includes('World Cup');

    try {
      // 如果是世界杯专题，调用真实接口
      if (isWorldCup) {
        const res = await worldcupApi.getWorldCupMatches();
        const matches = res || [];

        // 转换为时间轴格式，按日期分组并标记日期标签
        const timelineMatches = this.formatTimelineData(matches);

        this.setData({
          timelineMatches,
          loading: false,
        });
      } else {
        this.setData({
          loading: false,
        });
      }
    } catch (err) {
      console.error('加载专题详情失败:', err);
      this.setData({
        error: '加载失败，请重试',
        loading: false,
      });
    }
  },

  // 格式化时间轴数据
  formatTimelineData(matches) {
    if (!matches || matches.length === 0) return [];

    // 按日期分组排序
    const sortedMatches = [...matches].sort((a, b) => {
      const dateCompare = (a.matchDate || '').localeCompare(b.matchDate || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.matchTime || '').localeCompare(b.matchTime || '');
    });

    let lastDate = '';
    return sortedMatches.map(item => {
      const showDateLabel = item.matchDate !== lastDate;
      if (showDateLabel) {
        lastDate = item.matchDate;
      }
      return {
        id: item.id,
        homeTeam: item.homeTeam || '',
        awayTeam: item.awayTeam || '',
        matchDate: item.matchDate || '',
        matchTime: item.matchTime || '',
        weekDay: item.weekDay || '',
        groupName: item.groupName || '',
        showDateLabel,
      };
    });
  },

  onPullDownRefresh() {
    this.loadTopicDetail().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 重试
  onRetry() {
    this.loadTopicDetail();
  },

  // 点击比赛卡片
  onMatchTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/analysis/index?matchId=${id}`,
    });
  },

  // 查看分组
  onViewGroups() {
    this.setData({ showGroupsModal: true, groupsLoading: true, groupNames: [], groupList: {}, selectedGroupIndex: 0 });
    this.loadGroups();
  },

  // 加载分组数据
  async loadGroups() {
    try {
      console.log('开始加载分组数据...');
      const res = await worldcupApi.getWorldCupGroups();
      console.log('分组API返回:', res);
      const list = res || [];

      // 按小组分组
      const groupMap = {};
      list.forEach(item => {
        const groupName = item.groupName || '未知';
        if (!groupMap[groupName]) {
          groupMap[groupName] = [];
        }
        groupMap[groupName].push(item);
      });

      // 排序每个小组内的数据
      Object.keys(groupMap).forEach(key => {
        groupMap[key].sort((a, b) => (a.teamRank || 0) - (b.teamRank || 0));
      });

      // 按小组字母顺序排序分组名称
      const groupNames = Object.keys(groupMap).sort();
      console.log('分组名称:', groupNames);
      console.log('分组数据:', groupMap);
      this.setData({
        groupNames,
        groupList: groupMap,
        groupsLoading: false,
      });
    } catch (err) {
      console.error('加载分组失败:', err);
      this.setData({ groupsLoading: false });
      wx.showToast({ title: '加载分组失败: ' + (err.message || '未知错误'), icon: 'none' });
    }
  },

  // 关闭分组弹窗
  onCloseGroupsModal() {
    this.setData({ showGroupsModal: false });
  },

  // 滑动切换分组
  onGroupSwiperChange(e) {
    const current = e.detail.current;
    this.setData({ selectedGroupIndex: current });
  },

  // 点击Tab切换分组
  onTabTap(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedGroupIndex: index });
  },

  // 查看球队信息
  onViewTeams() {
    wx.navigateTo({
      url: '/pages/team-info/index',
    });
  },

});
