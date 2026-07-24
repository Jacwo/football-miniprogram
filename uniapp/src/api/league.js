// api/league.js - 联赛相关接口
import { post } from './index'

export function getLeagueList() {
  return post('/api/league/list', {}, { showLoading: false })
}

export function getSeasonList(leagueId) {
  return post(`/api/league/season/list/${leagueId}`, {}, { showLoading: false })
}

export function getStanding(leagueId, seasonId) {
  return post(`/api/league/standing/${leagueId}/${seasonId}`, {}, { showLoading: false })
}
