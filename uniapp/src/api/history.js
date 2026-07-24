// api/history.js - 历史记录相关接口
import { get, post } from './index'

export function getHistoryList(params = {}) {
  const { pageNo = 1, pageSize = 20 } = params
  return post('/api/analysis/history/list', { pageNo, pageSize })
}

export function getHistoryDetail(matchId) {
  return get(`/api/analysis/history/${matchId}`)
}

export function deleteHistory(id) {
  return post(`/api/analysis/history/delete/${id}`)
}

export function getModelList() {
  const timestamp = Date.now()
  return get(`/api/prediction-model/list?t=${timestamp}`)
}

export function getModelStats(modelType) {
  const timestamp = Date.now()
  return get(`/api/prediction-model/stats/type/${modelType}?t=${timestamp}`)
}
