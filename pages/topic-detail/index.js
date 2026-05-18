// pages/topic-detail/index.js - 专题详情页
const topicApi = require("../../api/topic");
const userStore = require("../../store/user");

Page({
  data: {
    topicId: null,
    topicInfo: null,
    loading: false,
    error: null,
    finishedMatches: [], // 已完成比赛（全部）
    finishedDisplayMatches: [], // 已展示的比赛（分页）
    upcomingByGroup: [], // 待开始比赛按分组+日期分组（保留原始结构）
    groupTabs: [], // 分组Tab列表
    activeGroupTab: 0, // 当前选中的Tab索引
    selectedGroupMatches: [], // 当前选中分组的比赛
    isWorldCup: false, // 是否为世界杯专题
    finishedPage: 1, // 已完成比赛当前页
    finishedPageSize: 5, // 每页展示数量
    finishedHasMore: true, // 是否有更多数据
  },

  onLoad(options) {
    const { topicId, topicName, imageUrl } = options;

    // 如果有传入专题信息，先显示
    if (topicName || imageUrl) {
      this.setData({
        topicInfo: {
          topicName: topicName ? decodeURIComponent(topicName) : '专题详情',
          imageUrl: imageUrl ? decodeURIComponent(imageUrl) : null,
        },
      });
    }

    if (topicId) {
      this.setData({ topicId: Number(topicId) });
      this.loadTopicDetail(topicId);
    } else {
      // 没有topicId时，直接加载mock数据
      this.loadTopicDetail(0);
    }
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selectedPath: "/pages/topic/index" });
    }
  },

  // 加载专题详情
  async loadTopicDetail(topicId) {
    this.setData({ loading: true, error: null });

    // Mock数据
    const mockData = this.getMockData(topicId);
    const topicName = decodeURIComponent(this.data.topicInfo?.topicName || '专题');
    const isWorldCup = topicName.includes('世界杯') || topicName.includes('World Cup');

    // 模拟网络延迟
    setTimeout(() => {
      const finished = mockData.finishedMatches || [];
      const upcoming = mockData.upcomingMatches || [];
      const upcomingByGroup = this.groupMatchesByGroupAndDate(upcoming);
      
      // 构建分组Tab列表
      const groupTabs = upcomingByGroup.map(item => item.groupName);
      
      // 默认选中第一个分组的比赛
      const selectedGroupMatches = upcomingByGroup.length > 0 ? upcomingByGroup[0].dates : [];
      
      // 初始化已完成比赛分页
      const finishedPageSize = this.data.finishedPageSize;
      const finishedDisplayMatches = finished.slice(0, finishedPageSize);
      const finishedHasMore = finished.length > finishedPageSize;
      
      this.setData({
        topicInfo: mockData.topicInfo,
        finishedMatches: finished,
        finishedDisplayMatches: finishedDisplayMatches,
        upcomingByGroup: upcomingByGroup,
        groupTabs: groupTabs,
        activeGroupTab: 0,
        selectedGroupMatches: selectedGroupMatches,
        isWorldCup: isWorldCup,
        finishedHasMore: finishedHasMore,
        loading: false,
      });
    }, 500);
  },

  // 按分组+日期分组比赛
  groupMatchesByGroupAndDate(matches) {
    // 按分组
    const groupMap = {};
    matches.forEach(match => {
      const group = match.groupName || '其他';
      if (!groupMap[group]) {
        groupMap[group] = {};
      }
      // 提取日期
      const dateStr = match.matchTime ? match.matchTime.split(' ')[0] : '未知';
      if (!groupMap[group][dateStr]) {
        groupMap[group][dateStr] = [];
      }
      // 添加只显示时间的字段
      const timeOnly = match.matchTime ? match.matchTime.split(' ')[1] || match.matchTime : '';
      groupMap[group][dateStr].push({
        ...match,
        timeOnly: timeOnly
      });
    });

    // 转换为数组格式
    const result = [];
    const groupOrder = ['A组', 'B组', 'C组', 'D组', 'E组', 'F组', 'G组', 'H组', 'I组', 'J组', 'K组', 'L组'];
    
    // 按顺序添加有数据的分组
    groupOrder.forEach(groupName => {
      if (groupMap[groupName]) {
        const dates = Object.keys(groupMap[groupName]).sort().map(date => ({
          date: date,
          matches: groupMap[groupName][date].sort((a, b) => a.matchTime.localeCompare(b.matchTime))
        }));
        result.push({
          groupName: groupName,
          dates: dates
        });
      }
    });
    
    return result;
  },

  // Tab切换
  onGroupTabChange(e) {
    const index = e.currentTarget.dataset.index;
    const matches = this.data.upcomingByGroup[index].dates;
    this.setData({
      activeGroupTab: index,
      selectedGroupMatches: matches
    });
  },

  // 加载更多已完成比赛
  onLoadMoreFinished() {
    if (!this.data.finishedHasMore) return;
    
    const { finishedMatches, finishedDisplayMatches, finishedPageSize } = this.data;
    const nextPage = this.data.finishedPage + 1;
    const newDisplayMatches = finishedMatches.slice(0, nextPage * finishedPageSize);
    
    this.setData({
      finishedDisplayMatches: newDisplayMatches,
      finishedPage: nextPage,
      finishedHasMore: newDisplayMatches.length < finishedMatches.length
    });
  },

  // Mock数据
  getMockData(topicId) {
    const topicName = decodeURIComponent(this.data.topicInfo?.topicName || '专题');

    // 欧冠专题Mock数据
    if (topicName.includes('欧冠') || topicName.includes('Champions')) {
      return {
        topicInfo: {
          topicName: '2025-2026 欧冠联赛',
          topicDesc: '欧洲顶级足球赛事，汇聚全球顶尖俱乐部',
          imageUrl: this.data.topicInfo?.imageUrl || 'https://img.icons8.com/color/500/uefa-champions-league.png',
        },
        finishedMatches: [
          {
            matchId: 1001,
            matchNumStr: '周二001',
            leagueAbbName: '欧冠',
            homeTeamAbbName: '皇家马德里',
            awayTeamAbbName: '拜仁慕尼黑',
            homeTeamRank: '西甲1',
            awayTeamRank: '德甲1',
            homeScore: 3,
            awayScore: 2,
          },
          {
            matchId: 1002,
            matchNumStr: '周二002',
            leagueAbbName: '欧冠',
            homeTeamAbbName: '曼城',
            awayTeamAbbName: '巴黎圣日耳曼',
            homeTeamRank: '英超2',
            awayTeamRank: '法甲1',
            homeScore: 2,
            awayScore: 1,
          },
        ],
        upcomingMatches: [
          {
            matchId: 1003,
            matchNumStr: '周三001',
            leagueAbbName: '欧冠',
            homeTeamAbbName: '巴塞罗那',
            awayTeamAbbName: '国际米兰',
            homeTeamRank: '西甲2',
            awayTeamRank: '意甲1',
            matchTime: '03:00',
          },
          {
            matchId: 1004,
            matchNumStr: '周三002',
            leagueAbbName: '欧冠',
            homeTeamAbbName: '多特蒙德',
            awayTeamAbbName: '利物浦',
            homeTeamRank: '德甲4',
            awayTeamRank: '英超3',
            matchTime: '03:00',
          },
        ],
      };
    }

    // 世界杯专题Mock数据 - 2026美加墨世界杯（48队12组）
    if (topicName.includes('世界杯') || topicName.includes('World Cup')) {
      return {
        topicInfo: {
          topicName: '2026 世界杯',
          topicDesc: '美加墨三国联合举办，48支球队分12小组角逐冠军',
          imageUrl: this.data.topicInfo?.imageUrl || 'https://ai-football.cn/fifa.jpg',
        },
        // 已完成比赛
        finishedMatches: [
          {
            matchId: 2001,
            matchNumStr: '揭幕战',
            leagueAbbName: '世界杯',
            groupName: 'A组',
            homeTeamAbbName: '墨西哥',
            awayTeamAbbName: '加拿大',
            homeScore: 2,
            awayScore: 1,
            matchTime: '06-11 08:00',
          },
        ],
        // 待开始比赛 - 按12个分组生成
        upcomingMatches: [
          // A组：墨西哥、加拿大、美国、哥斯达黎加
          { matchId: 2101, matchNumStr: 'A组', leagueAbbName: '世界杯', groupName: 'A组', homeTeamAbbName: '墨西哥', awayTeamAbbName: '美国', matchTime: '06-14 08:00' },
          { matchId: 2102, matchNumStr: 'A组', leagueAbbName: '世界杯', groupName: 'A组', homeTeamAbbName: '加拿大', awayTeamAbbName: '哥斯达黎加', matchTime: '06-15 02:00' },
          { matchId: 2103, matchNumStr: 'A组', leagueAbbName: '世界杯', groupName: 'A组', homeTeamAbbName: '美国', awayTeamAbbName: '墨西哥', matchTime: '06-20 05:00' },
          { matchId: 2104, matchNumStr: 'A组', leagueAbbName: '世界杯', groupName: 'A组', homeTeamAbbName: '哥斯达黎加', awayTeamAbbName: '加拿大', matchTime: '06-21 02:00' },
          { matchId: 2105, matchNumStr: 'A组', leagueAbbName: '世界杯', groupName: 'A组', homeTeamAbbName: '墨西哥', awayTeamAbbName: '哥斯达黎加', matchTime: '06-26 03:00' },
          { matchId: 2106, matchNumStr: 'A组', leagueAbbName: '世界杯', groupName: 'A组', homeTeamAbbName: '美国', awayTeamAbbName: '加拿大', matchTime: '06-26 03:00' },
          // B组：卡塔尔、澳大利亚、新西兰、牙买加
          { matchId: 2201, matchNumStr: 'B组', leagueAbbName: '世界杯', groupName: 'B组', homeTeamAbbName: '卡塔尔', awayTeamAbbName: '澳大利亚', matchTime: '06-13 10:00' },
          { matchId: 2202, matchNumStr: 'B组', leagueAbbName: '世界杯', groupName: 'B组', homeTeamAbbName: '新西兰', awayTeamAbbName: '牙买加', matchTime: '06-14 07:00' },
          { matchId: 2203, matchNumStr: 'B组', leagueAbbName: '世界杯', groupName: 'B组', homeTeamAbbName: '澳大利亚', awayTeamAbbName: '新西兰', matchTime: '06-19 04:00' },
          { matchId: 2204, matchNumStr: 'B组', leagueAbbName: '世界杯', groupName: 'B组', homeTeamAbbName: '牙买加', awayTeamAbbName: '卡塔尔', matchTime: '06-19 07:00' },
          { matchId: 2205, matchNumStr: 'B组', leagueAbbName: '世界杯', groupName: 'B组', homeTeamAbbName: '卡塔尔', awayTeamAbbName: '新西兰', matchTime: '06-25 03:00' },
          { matchId: 2206, matchNumStr: 'B组', leagueAbbName: '世界杯', groupName: 'B组', homeTeamAbbName: '澳大利亚', awayTeamAbbName: '牙买加', matchTime: '06-25 03:00' },
          // C组：乌兹别克斯坦、伊朗、日本、巴勒斯坦
          { matchId: 2301, matchNumStr: 'C组', leagueAbbName: '世界杯', groupName: 'C组', homeTeamAbbName: '乌兹别克斯坦', awayTeamAbbName: '伊朗', matchTime: '06-12 14:00' },
          { matchId: 2302, matchNumStr: 'C组', leagueAbbName: '世界杯', groupName: 'C组', homeTeamAbbName: '日本', awayTeamAbbName: '巴勒斯坦', matchTime: '06-13 14:00' },
          { matchId: 2303, matchNumStr: 'C组', leagueAbbName: '世界杯', groupName: 'C组', homeTeamAbbName: '伊朗', awayTeamAbbName: '日本', matchTime: '06-18 08:00' },
          { matchId: 2304, matchNumStr: 'C组', leagueAbbName: '世界杯', groupName: 'C组', homeTeamAbbName: '巴勒斯坦', awayTeamAbbName: '乌兹别克斯坦', matchTime: '06-18 11:00' },
          { matchId: 2305, matchNumStr: 'C组', leagueAbbName: '世界杯', groupName: 'C组', homeTeamAbbName: '乌兹别克斯坦', awayTeamAbbName: '日本', matchTime: '06-24 07:00' },
          { matchId: 2306, matchNumStr: 'C组', leagueAbbName: '世界杯', groupName: 'C组', homeTeamAbbName: '伊朗', awayTeamAbbName: '巴勒斯坦', matchTime: '06-24 07:00' },
          // D组：英格兰、瑞典、波黑、希腊
          { matchId: 2401, matchNumStr: 'D组', leagueAbbName: '世界杯', groupName: 'D组', homeTeamAbbName: '英格兰', awayTeamAbbName: '瑞典', matchTime: '06-15 17:00' },
          { matchId: 2402, matchNumStr: 'D组', leagueAbbName: '世界杯', groupName: 'D组', homeTeamAbbName: '波黑', awayTeamAbbName: '希腊', matchTime: '06-16 14:00' },
          { matchId: 2403, matchNumStr: 'D组', leagueAbbName: '世界杯', groupName: 'D组', homeTeamAbbName: '瑞典', awayTeamAbbName: '波黑', matchTime: '06-21 14:00' },
          { matchId: 2404, matchNumStr: 'D组', leagueAbbName: '世界杯', groupName: 'D组', homeTeamAbbName: '希腊', awayTeamAbbName: '英格兰', matchTime: '06-22 14:00' },
          { matchId: 2405, matchNumStr: 'D组', leagueAbbName: '世界杯', groupName: 'D组', homeTeamAbbName: '英格兰', awayTeamAbbName: '波黑', matchTime: '06-28 03:00' },
          { matchId: 2406, matchNumStr: 'D组', leagueAbbName: '世界杯', groupName: 'D组', homeTeamAbbName: '瑞典', awayTeamAbbName: '希腊', matchTime: '06-28 03:00' },
          // E组：法国、荷兰、奥地利、克罗地亚
          { matchId: 2501, matchNumStr: 'E组', leagueAbbName: '世界杯', groupName: 'E组', homeTeamAbbName: '法国', awayTeamAbbName: '荷兰', matchTime: '06-16 20:00' },
          { matchId: 2502, matchNumStr: 'E组', leagueAbbName: '世界杯', groupName: 'E组', homeTeamAbbName: '奥地利', awayTeamAbbName: '克罗地亚', matchTime: '06-17 17:00' },
          { matchId: 2503, matchNumStr: 'E组', leagueAbbName: '世界杯', groupName: 'E组', homeTeamAbbName: '荷兰', awayTeamAbbName: '奥地利', matchTime: '06-22 17:00' },
          { matchId: 2504, matchNumStr: 'E组', leagueAbbName: '世界杯', groupName: 'E组', homeTeamAbbName: '克罗地亚', awayTeamAbbName: '法国', matchTime: '06-23 17:00' },
          { matchId: 2505, matchNumStr: 'E组', leagueAbbName: '世界杯', groupName: 'E组', homeTeamAbbName: '法国', awayTeamAbbName: '奥地利', matchTime: '06-27 03:00' },
          { matchId: 2506, matchNumStr: 'E组', leagueAbbName: '世界杯', groupName: 'E组', homeTeamAbbName: '荷兰', awayTeamAbbName: '克罗地亚', matchTime: '06-27 03:00' },
          // F组：德国、西班牙、阿根廷、秘鲁
          { matchId: 2601, matchNumStr: 'F组', leagueAbbName: '世界杯', groupName: 'F组', homeTeamAbbName: '德国', awayTeamAbbName: '西班牙', matchTime: '06-18 03:00' },
          { matchId: 2602, matchNumStr: 'F组', leagueAbbName: '世界杯', groupName: 'F组', homeTeamAbbName: '阿根廷', awayTeamAbbName: '秘鲁', matchTime: '06-18 20:00' },
          { matchId: 2603, matchNumStr: 'F组', leagueAbbName: '世界杯', groupName: 'F组', homeTeamAbbName: '西班牙', awayTeamAbbName: '阿根廷', matchTime: '06-23 20:00' },
          { matchId: 2604, matchNumStr: 'F组', leagueAbbName: '世界杯', groupName: 'F组', homeTeamAbbName: '秘鲁', awayTeamAbbName: '德国', matchTime: '06-24 03:00' },
          { matchId: 2605, matchNumStr: 'F组', leagueAbbName: '世界杯', groupName: 'F组', homeTeamAbbName: '德国', awayTeamAbbName: '阿根廷', matchTime: '06-29 03:00' },
          { matchId: 2606, matchNumStr: 'F组', leagueAbbName: '世界杯', groupName: 'F组', homeTeamAbbName: '西班牙', awayTeamAbbName: '秘鲁', matchTime: '06-29 03:00' },
          // G组：巴西、葡萄牙、埃及、尼日利亚
          { matchId: 2701, matchNumStr: 'G组', leagueAbbName: '世界杯', groupName: 'G组', homeTeamAbbName: '巴西', awayTeamAbbName: '葡萄牙', matchTime: '06-19 10:00' },
          { matchId: 2702, matchNumStr: 'G组', leagueAbbName: '世界杯', groupName: 'G组', homeTeamAbbName: '埃及', awayTeamAbbName: '尼日利亚', matchTime: '06-20 07:00' },
          { matchId: 2703, matchNumStr: 'G组', leagueAbbName: '世界杯', groupName: 'G组', homeTeamAbbName: '葡萄牙', awayTeamAbbName: '埃及', matchTime: '06-25 07:00' },
          { matchId: 2704, matchNumStr: 'G组', leagueAbbName: '世界杯', groupName: 'G组', homeTeamAbbName: '尼日利亚', awayTeamAbbName: '巴西', matchTime: '06-26 07:00' },
          { matchId: 2705, matchNumStr: 'G组', leagueAbbName: '世界杯', groupName: 'G组', homeTeamAbbName: '巴西', awayTeamAbbName: '埃及', matchTime: '07-01 03:00' },
          { matchId: 2706, matchNumStr: 'G组', leagueAbbName: '世界杯', groupName: 'G组', homeTeamAbbName: '葡萄牙', awayTeamAbbName: '尼日利亚', matchTime: '07-01 03:00' },
          // H组：比利时、摩洛哥、巴拿马、哥伦比亚
          { matchId: 2801, matchNumStr: 'H组', leagueAbbName: '世界杯', groupName: 'H组', homeTeamAbbName: '比利时', awayTeamAbbName: '摩洛哥', matchTime: '06-20 17:00' },
          { matchId: 2802, matchNumStr: 'H组', leagueAbbName: '世界杯', groupName: 'H组', homeTeamAbbName: '巴拿马', awayTeamAbbName: '哥伦比亚', matchTime: '06-21 14:00' },
          { matchId: 2803, matchNumStr: 'H组', leagueAbbName: '世界杯', groupName: 'H组', homeTeamAbbName: '摩洛哥', awayTeamAbbName: '巴拿马', matchTime: '06-26 14:00' },
          { matchId: 2804, matchNumStr: 'H组', leagueAbbName: '世界杯', groupName: 'H组', homeTeamAbbName: '哥伦比亚', awayTeamAbbName: '比利时', matchTime: '06-27 14:00' },
          { matchId: 2805, matchNumStr: 'H组', leagueAbbName: '世界杯', groupName: 'H组', homeTeamAbbName: '比利时', awayTeamAbbName: '巴拿马', matchTime: '07-02 03:00' },
          { matchId: 2806, matchNumStr: 'H组', leagueAbbName: '世界杯', groupName: 'H组', homeTeamAbbName: '摩洛哥', awayTeamAbbName: '哥伦比亚', matchTime: '07-02 03:00' },
          // I组：乌拉圭、厄瓜多尔、南非、科特迪瓦
          { matchId: 2901, matchNumStr: 'I组', leagueAbbName: '世界杯', groupName: 'I组', homeTeamAbbName: '乌拉圭', awayTeamAbbName: '厄瓜多尔', matchTime: '06-21 20:00' },
          { matchId: 2902, matchNumStr: 'I组', leagueAbbName: '世界杯', groupName: 'I组', homeTeamAbbName: '南非', awayTeamAbbName: '科特迪瓦', matchTime: '06-22 17:00' },
          { matchId: 2903, matchNumStr: 'I组', leagueAbbName: '世界杯', groupName: 'I组', homeTeamAbbName: '厄瓜多尔', awayTeamAbbName: '南非', matchTime: '06-27 17:00' },
          { matchId: 2904, matchNumStr: 'I组', leagueAbbName: '世界杯', groupName: 'I组', homeTeamAbbName: '科特迪瓦', awayTeamAbbName: '乌拉圭', matchTime: '06-28 17:00' },
          { matchId: 2905, matchNumStr: 'I组', leagueAbbName: '世界杯', groupName: 'I组', homeTeamAbbName: '乌拉圭', awayTeamAbbName: '南非', matchTime: '07-03 03:00' },
          { matchId: 2906, matchNumStr: 'I组', leagueAbbName: '世界杯', groupName: 'I组', homeTeamAbbName: '厄瓜多尔', awayTeamAbbName: '科特迪瓦', matchTime: '07-03 03:00' },
          // J组：塞尔维亚、黑山共和国、斯洛伐克、格鲁吉亚
          { matchId: 3001, matchNumStr: 'J组', leagueAbbName: '世界杯', groupName: 'J组', homeTeamAbbName: '塞尔维亚', awayTeamAbbName: '黑山共和国', matchTime: '06-23 03:00' },
          { matchId: 3002, matchNumStr: 'J组', leagueAbbName: '世界杯', groupName: 'J组', homeTeamAbbName: '斯洛伐克', awayTeamAbbName: '格鲁吉亚', matchTime: '06-24 00:00' },
          { matchId: 3003, matchNumStr: 'J组', leagueAbbName: '世界杯', groupName: 'J组', homeTeamAbbName: '黑山共和国', awayTeamAbbName: '斯洛伐克', matchTime: '06-29 00:00' },
          { matchId: 3004, matchNumStr: 'J组', leagueAbbName: '世界杯', groupName: 'J组', homeTeamAbbName: '格鲁吉亚', awayTeamAbbName: '塞尔维亚', matchTime: '06-30 00:00' },
          { matchId: 3005, matchNumStr: 'J组', leagueAbbName: '世界杯', groupName: 'J组', homeTeamAbbName: '塞尔维亚', awayTeamAbbName: '斯洛伐克', matchTime: '07-04 03:00' },
          { matchId: 3006, matchNumStr: 'J组', leagueAbbName: '世界杯', groupName: 'J组', homeTeamAbbName: '黑山共和国', awayTeamAbbName: '格鲁吉亚', matchTime: '07-04 03:00' },
          // K组：波兰、乌克兰、罗马尼亚、白俄罗斯
          { matchId: 3101, matchNumStr: 'K组', leagueAbbName: '世界杯', groupName: 'K组', homeTeamAbbName: '波兰', awayTeamAbbName: '乌克兰', matchTime: '06-24 17:00' },
          { matchId: 3102, matchNumStr: 'K组', leagueAbbName: '世界杯', groupName: 'K组', homeTeamAbbName: '罗马尼亚', awayTeamAbbName: '白俄罗斯', matchTime: '06-25 14:00' },
          { matchId: 3103, matchNumStr: 'K组', leagueAbbName: '世界杯', groupName: 'K组', homeTeamAbbName: '乌克兰', awayTeamAbbName: '罗马尼亚', matchTime: '06-30 14:00' },
          { matchId: 3104, matchNumStr: 'K组', leagueAbbName: '世界杯', groupName: 'K组', homeTeamAbbName: '白俄罗斯', awayTeamAbbName: '波兰', matchTime: '07-01 14:00' },
          { matchId: 3105, matchNumStr: 'K组', leagueAbbName: '世界杯', groupName: 'K组', homeTeamAbbName: '波兰', awayTeamAbbName: '罗马尼亚', matchTime: '07-05 03:00' },
          { matchId: 3106, matchNumStr: 'K组', leagueAbbName: '世界杯', groupName: 'K组', homeTeamAbbName: '乌克兰', awayTeamAbbName: '白俄罗斯', matchTime: '07-05 03:00' },
          // L组：韩国、沙特阿拉伯、约旦、阿曼
          { matchId: 3201, matchNumStr: 'L组', leagueAbbName: '世界杯', groupName: 'L组', homeTeamAbbName: '韩国', awayTeamAbbName: '沙特阿拉伯', matchTime: '06-25 23:59' },
          { matchId: 3202, matchNumStr: 'L组', leagueAbbName: '世界杯', groupName: 'L组', homeTeamAbbName: '约旦', awayTeamAbbName: '阿曼', matchTime: '06-26 20:59' },
          { matchId: 3203, matchNumStr: 'L组', leagueAbbName: '世界杯', groupName: 'L组', homeTeamAbbName: '沙特阿拉伯', awayTeamAbbName: '约旦', matchTime: '07-01 20:00' },
          { matchId: 3204, matchNumStr: 'L组', leagueAbbName: '世界杯', groupName: 'L组', homeTeamAbbName: '阿曼', awayTeamAbbName: '韩国', matchTime: '07-02 17:00' },
          { matchId: 3205, matchNumStr: 'L组', leagueAbbName: '世界杯', groupName: 'L组', homeTeamAbbName: '韩国', awayTeamAbbName: '约旦', matchTime: '07-06 03:00' },
          { matchId: 3206, matchNumStr: 'L组', leagueAbbName: '世界杯', groupName: 'L组', homeTeamAbbName: '沙特阿拉伯', awayTeamAbbName: '阿曼', matchTime: '07-06 03:00' },
        ],
      };
    }

    // 默认专题Mock数据
    return {
      topicInfo: {
        topicName: topicName || '热门专题',
        topicDesc: '精彩赛事分析，尽在掌握',
        imageUrl: this.data.topicInfo?.imageUrl || 'https://img.icons8.com/color/500/stadium.png',
      },
      finishedMatches: [
        {
          matchId: 3001,
          matchNumStr: '周五001',
          leagueAbbName: '英超',
          homeTeamAbbName: '曼联',
          awayTeamAbbName: '阿森纳',
          homeTeamRank: '英超8',
          awayTeamRank: '英超2',
          homeScore: 1,
          awayScore: 1,
        },
        {
          matchId: 3002,
          matchNumStr: '周五002',
          leagueAbbName: '德甲',
          homeTeamAbbName: '拜仁慕尼黑',
          awayTeamAbbName: '多特蒙德',
          homeTeamRank: '德甲1',
          awayTeamRank: '德甲5',
          homeScore: 4,
          awayScore: 2,
        },
      ],
      upcomingMatches: [
        {
          matchId: 3003,
          matchNumStr: '周六001',
          leagueAbbName: '意甲',
          homeTeamAbbName: '尤文图斯',
          awayTeamAbbName: 'AC米兰',
          homeTeamRank: '意甲4',
          awayTeamRank: '意甲3',
          matchTime: '周六 02:45',
        },
      ],
    };
  },

  onPullDownRefresh() {
    this.loadTopicDetail(this.data.topicId).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 重试
  onRetry() {
    this.loadTopicDetail(this.data.topicId);
  },

  // 点击比赛卡片
  onMatchTap(e) {
    const { matchid } = e.currentTarget.dataset;
    if (!userStore.isLoggedIn()) {
      wx.showToast({ title: "请先登录", icon: "none" });
      wx.navigateTo({ url: "/pages/login/index" });
      return;
    }
    wx.navigateTo({
      url: `/pages/analysis/index?matchId=${matchid}`,
    });
  },
});
