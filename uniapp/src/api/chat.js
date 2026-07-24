// api/chat.js - 聊天会话接口
import { get, post } from './index'

export function getSessionList(userId) {
  return get(`/api/chat/sessions/${userId}`, {}, { showLoading: false })
}

export function createSession(data) {
  return post('/api/chat/session/create', data)
}

export function getSessionDetail(id) {
  return get(`/api/chat/session/${id}`)
}

export function deleteSession(id) {
  return post(`/api/chat/session/delete/${id}`)
}

export function renameSession(id, name) {
  return post(`/api/chat/session/rename/${id}`, { name })
}
