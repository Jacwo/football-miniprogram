// api/groupbuy.js - 拼团接口
import { get, post } from './index'

export function createGroupBuy(data) {
  return post('/api/groupbuy/create', data)
}

export function joinGroupBuy(groupId, userId) {
  return post('/api/groupbuy/join', { groupId, userId })
}

export function getGroupBuyDetail(id) {
  return get(`/api/groupbuy/${id}`)
}

export function claimReward(groupId, userId) {
  return post('/api/groupbuy/reward', { groupId, userId })
}

export function getHotGroups() {
  return get('/api/groupbuy/hot', {}, { showLoading: false })
}

export function getMyGroupList() {
  return post('/api/groupbuy/my/list')
}
