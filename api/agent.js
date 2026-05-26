// api/agent.js - 智能体相关接口
const { get, post, put, del } = require('./index')

/**
 * 获取用户的智能体列表
 * @param {string} userId 用户ID
 * @returns {Promise<Array>} 智能体列表
 */
function getAgentList(userId) {
  return get(`/api/agent/list/${userId}`, { _t: Date.now() }, { showLoading: false, showError: false })
}

/**
 * 获取智能体详情
 * @param {string} userId 用户ID
 * @param {string} agentId 智能体ID
 * @returns {Promise<Object>} 智能体详情（含因素配置列表）
 */
function getAgentDetail(userId, agentId) {
  return get(`/api/agent/detail/${userId}/${agentId}`, { _t: Date.now() }, { showLoading: false, showError: false })
}

/**
 * 新建专属智能体
 * @param {Object} data 智能体信息
 * @param {string} data.userId 用户ID
 * @param {string} data.agentName 智能体名称
 * @param {string} data.description 智能体描述
 * @param {string} data.avatar 智能体头像URL
 * @param {boolean} data.copySystemConfig 是否复制系统默认配置
 * @returns {Promise<Object>} 创建的智能体
 */
function createAgent(data) {
  return post('/api/agent/create', { ...data, _t: Date.now() }, { showLoading: true })
}

/**
 * 保存单个因素配置
 * @param {Object} data 因素配置
 * @param {string} data.userId 用户ID
 * @param {string} data.agentId 智能体ID
 * @param {string} data.factorCode 因素编码
 * @param {boolean} data.isEnabled 是否启用
 * @param {number} data.weight 权重
 * @returns {Promise<Object>}
 */
function saveFactor(data) {
  return post('/api/agent/factor/save', { ...data, _t: Date.now() }, { showLoading: false, showError: false })
}

/**
 * 批量保存因素配置
 * @param {Object} data
 * @param {string} data.userId 用户ID
 * @param {string} data.agentId 智能体ID
 * @param {Array<{factorCode: string, isEnabled: boolean, weight: number}>} data.configs 因素配置列表
 * @returns {Promise<Object>}
 */
function batchSaveFactors(data) {
  return post('/api/agent/factor/batchSave', { ...data, _t: Date.now() }, { showLoading: true })
}

/**
 * 创建自定义因素
 * @param {Object} data
 * @param {string} data.userId 用户ID
 * @param {string} data.agentId 智能体ID
 * @param {string} data.factorName 因素名称
 * @param {string} data.description 因素描述
 * @param {string} data.promptTemplate Prompt模板（使用{value}作为占位符）
 * @returns {Promise<Object>}
 */
function createCustomFactor(data) {
  return post('/api/agent/factor/createCustom', { ...data, _t: Date.now() }, { showLoading: true })
}

/**
 * 更新自定义因素
 * @param {Object} data
 * @param {string} data.userId 用户ID
 * @param {string} data.factorCode 因素编码
 * @param {string} data.factorName 因素名称
 * @param {string} data.description 因素描述
 * @param {string} data.promptTemplate Prompt模板（使用{value}作为占位符）
 * @returns {Promise<Object>}
 */
function updateCustomFactor(data) {
  const { userId, factorCode, ...body } = data
  return put(`/api/agent/factor/updateCustom/${userId}/${factorCode}`, { ...body, _t: Date.now() }, { showLoading: true })
}

/**
 * 删除自定义因素
 * @param {Object} data
 * @param {string} data.userId 用户ID
 * @param {string} data.factorCode 因素编码
 * @returns {Promise<Object>}
 */
function deleteCustomFactor(data) {
  const { userId, factorCode } = data
  return post(`/api/agent/factor/deleteCustom/${userId}/${factorCode}`, { _t: Date.now() }, { showLoading: true })
}

/**
 * 更新智能体信息
 * @param {Object} data
 * @param {string} data.userId 用户ID
 * @param {string} data.agentId 智能体ID
 * @param {string} data.agentName 智能体名称
 * @param {string} data.description 智能体描述
 * @returns {Promise<Object>}
 */
function updateAgent(data) {
  return post('/api/agent/update', { ...data, _t: Date.now() }, { showLoading: true })
}

/**
 * 删除智能体
 * @param {Object} data
 * @param {string} data.userId 用户ID
 * @param {string} data.agentId 智能体ID
 * @returns {Promise<Object>}
 */
function deleteAgent(data) {
  const { userId, agentId } = data
  return post(`/api/agent/delete/${userId}/${agentId}`, { _t: Date.now() }, { showLoading: true })
}

module.exports = {
  getAgentList,
  getAgentDetail,
  createAgent,
  updateAgent,
  deleteAgent,
  saveFactor,
  batchSaveFactors,
  createCustomFactor,
  updateCustomFactor,
  deleteCustomFactor
}
