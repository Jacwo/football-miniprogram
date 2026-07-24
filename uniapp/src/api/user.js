// api/user.js - 用户相关接口
import { get, post } from './index'

export function sendSms(phone) {
  return post('/api/sms/send', { phone }, { showLoading: false })
}

export function login(phone, code) {
  return post('/api/user/login', { phone, code })
}

export function logout() {
  return post('/api/user/logout', {}, { showLoading: false })
}

export function getUserInfo() {
  return get('/api/user/info', {}, { showLoading: false })
}

export function getUserInfoById(id) {
  return post('/api/user/info', { id, _t: Date.now() }, { showLoading: false })
}

export function updateUserInfo(data) {
  return post('/api/user/update', data)
}

export function deductPoint(id, deductPoint, matchId) {
  const params = { id, deductPoint, _t: Date.now() }
  if (matchId) params.matchId = matchId
  return post('/api/user/point/deduct', params)
}

export function deductPointForInformation(id, deductPoint, matchId) {
  const params = { id, deductPoint }
  if (matchId) params.matchId = matchId
  return post('/api/user/point/information/deduct', params)
}

export function checkInformationUnlock(matchId, userId) {
  return post('/api/match/check/Information/unlock', { matchId, userId }, { showLoading: false })
}

export function batchCheckMatchUnlock(matchIds, userId) {
  return post('/api/match/batch/check/unlock', { matchIds, userId }, { showLoading: false })
}

export function userSign(userId) {
  return post(`/api/user/sign/${userId}`)
}

export function wxLogin(code, userInfo) {
  return post('/api/user/wx/login/v2', { code, ...userInfo })
}

export function updateUserInfoWithPhone(data) {
  return post('/api/user/info/update', { userId: data.userId, phone: data.phone, code: data.code })
}

export function getPointDetailList(userId, changeType, pageNum = 1, pageSize = 20, timestamp) {
  const params = { userId, pageNum, pageSize }
  if (changeType) params.changeType = changeType
  if (timestamp) params.timestamp = timestamp
  return post('/api/user/point/detail/list', params, { showLoading: false })
}

export function updateUserName(userId, userName) {
  return post('/api/user/info/update/name', { userId, userName })
}

export function getUserMedals(userId) {
  return get(`/api/user/medal/my/${userId}?_t=${Date.now()}`, {}, { showLoading: false })
}

export function buyVipPackage(userId, packageId, code) {
  return post('/api/user/vip/purchase', { userId, packageId, code })
}

export function renewVip(userId, packageId, code) {
  return post('/api/user/vip/renew', { userId, packageId, code })
}

export function checkVipStatus(userId) {
  return get(`/api/user/vip/status/${userId}`, {}, { showLoading: false })
}

export function checkVip(userId) {
  return get(`/api/vip/check/${userId}`, { _t: Date.now() }, { showLoading: false })
}
