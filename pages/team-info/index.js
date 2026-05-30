// pages/team-info/index.js - 球队信息页
const worldcupApi = require("../../api/worldcup");

// 位置分类映射（英文缩写 + 中文名称）
const POSITION_MAP = {
  // English
  GK: '门将',
  DF: '后卫', CB: '后卫', LB: '后卫', RB: '后卫',
  SW: '后卫', RWB: '后卫', LWB: '后卫', WB: '后卫',
  MF: '中场', CM: '中场', CDM: '中场', CAM: '中场',
  LM: '中场', RM: '中场', AM: '中场', DM: '中场',
  FW: '前锋', ST: '前锋', CF: '前锋', LW: '前锋',
  RW: '前锋', SS: '前锋', WF: '前锋',
  // Chinese
  '门将': '门将', '守门员': '门将',
  '后卫': '后卫', '中后卫': '后卫', '边后卫': '后卫', '右后卫': '后卫', '左后卫': '后卫',
  '中场': '中场', '前腰': '中场', '后腰': '中场', '边前卫': '中场', '中前卫': '中场',
  '前锋': '前锋', '中锋': '前锋', '边锋': '前锋', '影锋': '前锋',
};

const POSITION_ORDER = ['前锋', '中场', '后卫', '门将'];

function classifyPosition(pos) {
  if (!pos) return '其他';
  const val = pos.trim();
  // 直接匹配
  if (POSITION_MAP[val]) return POSITION_MAP[val];
  if (POSITION_MAP[val.toUpperCase()]) return POSITION_MAP[val.toUpperCase()];
  // 模糊匹配：中文包含关键字
  if (val.includes('门将') || val.includes('守门')) return '门将';
  if (val.includes('后卫') || val.includes('卫')) return '后卫';
  if (val.includes('中场') || val.includes('腰') || val.includes('前卫')) return '中场';
  if (val.includes('前锋') || val.includes('锋')) return '前锋';
  return '其他';
}

function buildPlayerSections(players) {
  if (!players || players.length === 0) return [];
  const groups = {};
  POSITION_ORDER.forEach(p => { groups[p] = []; });
  (players || []).forEach(p => {
    const cat = classifyPosition(p.position);
    if (groups[cat]) groups[cat].push(p);
    else (groups['其他'] = groups['其他'] || []).push(p);
  });
  const sections = [];
  POSITION_ORDER.forEach(pos => {
    if (groups[pos] && groups[pos].length > 0) {
      sections.push({ label: pos, players: groups[pos] });
    }
  });
  // 兜底：未识别位置
  if (groups['其他'] && groups['其他'].length > 0) {
    sections.push({ label: '其他', players: groups['其他'] });
  }
  return sections;
}

Page({
  data: {
    loading: false,
    groupNames: [],
    groupList: {},
    selectedGroupIndex: 0,
    swiperHeight: 500, // JS动态计算
  },

  onLoad() {
    this.calcSwiperHeight();
    this.loadTeams();
  },

  calcSwiperHeight() {
    const info = wx.getSystemInfoSync();
    const rpx = info.windowWidth / 750;
    // tabs区域 ~90rpx，底部指示器 ~100rpx
    const reserved = (90 + 100) * rpx;
    this.setData({ swiperHeight: Math.floor(info.windowHeight - reserved) });
  },

  // 加载球队数据
  async loadTeams() {
    this.setData({ loading: true });
    try {
      const res = await worldcupApi.getWorldCupTeams();
      const list = res || [];

      // 按 groupName 分组，每组内按 fifaRank 排序
      const groupMap = {};
      list.forEach(group => {
        const key = group.groupName || '未知';
        const teams = (group.teams || []).map((team, teamIdx) => ({
          ...team,
          _playersExpanded: teamIdx === 0,
          _playerSections: buildPlayerSections(team.players),
        })).sort((a, b) => (a.fifaRank || 999) - (b.fifaRank || 999));
        groupMap[key] = teams;
      });

      const names = Object.keys(groupMap).sort();
      this.setData({
        groupNames: names,
        groupList: groupMap,
        loading: false,
      });
    } catch (err) {
      console.error('加载球队信息失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 分组滑动
  onSwiperChange(e) {
    this.setData({ selectedGroupIndex: e.detail.current });
  },

  // 分组Tab点击
  onTabTap(e) {
    this.setData({ selectedGroupIndex: e.currentTarget.dataset.index });
  },

  // 展开/收起球员列表
  onTogglePlayers(e) {
    const { groupIndex, teamIndex } = e.currentTarget.dataset;
    const groupName = this.data.groupNames[groupIndex];
    const teams = this.data.groupList[groupName];
    if (teams && teams[teamIndex]) {
      teams[teamIndex]._playersExpanded = !teams[teamIndex]._playersExpanded;
      this.setData({
        [`groupList.${groupName}`]: teams
      });
    }
  },
});
