// utils/match.js - 比赛相关工具函数

export const MATCH_STATUS = {
  '1': { name: '待开', color: '#999999', badge: 'default' },
  '2': { name: '开放', color: '#1890ff', badge: 'processing' },
  '3': { name: '关闭', color: '#ff4d4f', badge: 'error' },
  '4': { name: '进行中', color: '#52c41a', badge: 'success' },
  '5': { name: '已完成', color: '#666666', badge: 'default' },
  '6': { name: '已取消', color: '#ff4d4f', badge: 'error' }
}

export function getMatchStatus(status) {
  return MATCH_STATUS[status] || { name: '未知', color: '#999999', badge: 'default' }
}

export function getMatchStatusName(status) {
  return getMatchStatus(status).name
}

export function getMatchStatusColor(status) {
  return getMatchStatus(status).color
}

export function canAnalyze(match) {
  return match.status === '2' || match.status === '1'
}

export function isMatchLive(match) {
  return match.status === '4'
}

export function isMatchFinished(match) {
  return match.status === '5'
}

export function formatOdds(odds, decimals = 2) {
  if (odds === null || odds === undefined || odds === '') return '-'
  const num = parseFloat(odds)
  if (isNaN(num)) return '-'
  return num.toFixed(decimals)
}

export function formatGoalLine(goalLine) {
  if (!goalLine || goalLine === '0') return '平手'
  const num = parseFloat(goalLine)
  if (num > 0) return `+${goalLine}`
  return goalLine
}

export function getResultClass(result) {
  const classMap = { '胜': 'result-win', '平': 'result-draw', '负': 'result-lose' }
  return classMap[result] || ''
}

export function getMatchOutcome(match, teamType = 'home') {
  if (!match.score) return null
  const [homeScore, awayScore] = match.score.split(':').map(Number)
  if (isNaN(homeScore) || isNaN(awayScore)) return null
  if (teamType === 'home') {
    if (homeScore > awayScore) return '胜'
    if (homeScore < awayScore) return '负'
    return '平'
  } else {
    if (awayScore > homeScore) return '胜'
    if (awayScore < homeScore) return '负'
    return '平'
  }
}

export function calculateWinRate(wins, total) {
  if (!total || total === 0) return 0
  return Math.round((wins / total) * 100)
}

export function calculateXgPercent(homeXg, awayXg) {
  const total = (homeXg || 0) + (awayXg || 0)
  if (total === 0) return { home: 50, away: 50 }
  return { home: Math.round((homeXg / total) * 100), away: Math.round((awayXg / total) * 100) }
}

export function getOddsChangeFlag(hf) {
  if (hf === '1') return { text: '主热', color: '#f5222d' }
  if (hf === '-1') return { text: '客热', color: '#52c41a' }
  return null
}

export function groupMatchesByLeague(matches) {
  const groups = {}
  matches.forEach(match => {
    const league = match.league || '其他'
    if (!groups[league]) groups[league] = []
    groups[league].push(match)
  })
  return Object.keys(groups).map(league => ({ league, matches: groups[league] }))
}

export function groupMatchesByDate(matches) {
  const { formatDate: fd, getFriendlyDate: gfd } = require('./date')
  const groups = {}
  matches.forEach(match => {
    const date = fd(match.fullMatchTime)
    const friendlyDate = gfd(match.fullMatchTime)
    if (!groups[date]) groups[date] = { date, friendlyDate, matches: [] }
    groups[date].matches.push(match)
  })
  return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date))
}
