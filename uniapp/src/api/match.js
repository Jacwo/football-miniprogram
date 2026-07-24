// api/match.js - 比赛相关接口
import { get, post } from './index'

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMatchList(params = {}) {
  return get('/api/match/list', params)
}

export function getMatchDetail(matchId) {
  return get(`/api/match/${matchId}`)
}

export function getTodayMatches() {
  const today = formatDate(new Date())
  return getMatchList({ date: today })
}

export function getMatchesByStatus(status) {
  return getMatchList({ status })
}

export function getMatchesByLeague(leagueId) {
  return getMatchList({ leagueId })
}

export function getCalculatorMatches() {
  return get('/api/match/calculator')
}

export function saveCalculatorSelection(data) {
  return post('/api/match/calculator/save', data)
}

export function getCalculatorRecords(userId) {
  return get(`/api/match/calculator/get/${userId}?_t=${Date.now()}`)
}

export function deleteCalculatorRecord(id) {
  return post(`/api/match/calculator/delete/${id}`)
}

export function getMatchAllOdds(matchId) {
  return get(`/api/match/odds/${matchId}`)
}

export function recommendCalculatorRecord(id) {
  return post(`/api/match/calculator/recommend/${id}`)
}

export function getCalculatorRecommendList() {
  return post('/api/match/calculator/list')
}

export function getMatchResults() {
  return post('/api/match/result/list')
}

export function getMatchLive() {
  return post(`/api/match/live?_t=${Date.now()}`)
}

export function getDragonAnalysis(sampleSize = 10) {
  const timestamp = Date.now()
  return get(`/api/dragon/analysis/analyze?sampleSize=${sampleSize}&t=${timestamp}`)
}

// checkFeatures 的缓存
let _featuresCache = null
let _featuresCacheTime = 0
const FEATURES_CACHE_TTL = 5 * 60 * 1000

export function checkFeatures(forceRefresh = false) {
  const now = Date.now()
  if (!forceRefresh && _featuresCache !== null && (now - _featuresCacheTime) < FEATURES_CACHE_TTL) {
    return Promise.resolve(_featuresCache)
  }
  return post('/api/match/check/config').then(result => {
    _featuresCache = result
    _featuresCacheTime = now
    return result
  })
}

export function getTableData(matchId) {
  return get(`/api/match/table/${matchId}`)
}

export function saveBonusStats(data) {
  return post('/api/user/bonus/stats', data)
}
