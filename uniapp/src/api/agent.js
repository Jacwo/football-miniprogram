// api/agent.js - 智能体接口
import { get, post } from './index'

export function createAgent(data) {
  return post('/api/agent/create', data)
}

export function getAgentList(userId) {
  return get(`/api/agent/list/${userId}`, {}, { showLoading: false })
}

export function getAgentDetail(id) {
  return get(`/api/agent/${id}`)
}

export function updateAgent(id, data) {
  return post(`/api/agent/update/${id}`, data)
}

export function getAgentFactors(agentId) {
  return get(`/api/agent/factors/${agentId}`, {}, { showLoading: false })
}

export function updateAgentFactors(agentId, factors) {
  return post(`/api/agent/factors/update/${agentId}`, { factors })
}

export function getPluginMarket() {
  return get('/api/agent/plugins/market', {}, { showLoading: false })
}

export function getPluginFactors() {
  return get('/api/agent/plugins/factors', {}, { showLoading: false })
}

export function batchSaveFactors(data) {
  return post('/api/agent/plugins/factors/batch', data)
}
