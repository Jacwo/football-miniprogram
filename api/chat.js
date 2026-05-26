// api/chat.js - 聊天会话相关接口
const { get, request } = require('./index')

/**
 * 获取用户的所有聊天会话
 * @param {string} userId 用户ID
 * @returns {Promise<Array>} 会话列表
 */
function getSessions(userId) {
  return get(`/api/chat/sessions/user/${userId}`, { _t: Date.now() }, { showLoading: false })
}

/**
 * 创建新会话
 * @param {string} matchId 比赛ID
 * @param {string} userId 用户ID
 * @returns {Promise<Object>} { sessionId, userId }
 */
function createSession(matchId, userId) {
  return request({
    url: `/api/chat/session/create?matchId=${encodeURIComponent(matchId)}&userId=${encodeURIComponent(userId)}`,
    method: 'POST',
    showLoading: false
  })
}

/**
 * 获取会话的聊天记录列表
 * @param {string} sessionId 会话ID
 * @returns {Promise<Array>} 聊天记录列表，每条记录包含 sessionId, userId, matchId, role, content, messageIndex
 */
function getSessionHistory(sessionId) {
  return get(`/api/chat/history/session/${sessionId}`, { _t: Date.now() }, { showLoading: true })
}

module.exports = {
  getSessions,
  createSession,
  getSessionHistory
}
