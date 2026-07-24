// api/team.js - 球队相关接口
import { get } from './index'

export function getTeamDetail(teamId) {
  return get(`/api/team/${teamId}`)
}

export function getTeamList(params) {
  return get('/api/team/list', params)
}
