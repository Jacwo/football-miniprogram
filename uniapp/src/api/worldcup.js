// api/worldcup.js - 世界杯相关接口
import { get } from './index'

export function getWorldCupMatches() {
  return get('/api/worldcup/matches', {}, { showLoading: false })
}

export function getWorldCupGroups() {
  return get('/api/worldcup/groups', {}, { showLoading: false })
}

export function getWorldCupTeams() {
  return get('/api/worldcup/team/groups', {}, { showLoading: false })
}
