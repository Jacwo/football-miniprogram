// api/analysis.js - 比赛分析相关接口
import { get, post } from './index'

/**
 * 获取历史交锋数据
 */
export function getHistoryData(matchId) {
  return post(`/api/match/history/data/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取 xG 数据
 */
export function getXgData(matchId) {
  return post(`/api/match/xg/data/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取相似比赛数据
 */
export function getSimilarData(matchId) {
  return post(`/api/match/similar/data/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取赔率变化数据
 */
export function getOddsData(matchId) {
  return post(`/api/match/odds/data/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取情报数据
 */
export function getInformationData(matchId) {
  return post(`/api/match/information/data/${matchId}`, {}, { showLoading: false })
}

/**
 * 删除分析数据
 */
export function deleteAnalysis(matchId) {
  return get(`/api/analysis/delete/${matchId}`)
}

/**
 * 获取最近比赛数据
 */
export function getRecentMatches(matchId) {
  return post(`/api/match/history/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取必发交易汇总
 */
export function getBifaSummary(matchId) {
  return post(`/api/bifa/summary/latest/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取必发大额明细
 */
export function getBifaDetail(matchId) {
  return post(`/api/bifa/detail/latest/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取必发走势数据
 */
export function getBifaTrend(matchId) {
  return post(`/api/bifa/trend/latest/${matchId}`, {}, { showLoading: false })
}
