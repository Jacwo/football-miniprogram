// api/worldcup.js - 世界杯相关接口
const { get } = require('./index')

/**
 * 获取世界杯比赛列表
 */
function getWorldCupMatches() {
  return get('/api/worldcup/matches', {}, { showLoading: false })
}

/**
 * 获取世界杯分组积分
 */
function getWorldCupGroups() {
  return get('/api/worldcup/groups', {}, { showLoading: false })
}

/**
 * 获取世界杯球队及球员信息
 */
function getWorldCupTeams() {
  return get('/api/worldcup/team/groups', {}, { showLoading: false })
}

module.exports = {
  getWorldCupMatches,
  getWorldCupGroups,
  getWorldCupTeams,
};
