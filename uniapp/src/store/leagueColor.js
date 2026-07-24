// store/leagueColor.js - 联赛颜色缓存管理 (Pinia)
import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'league_colors'

export const useLeagueColorStore = defineStore('leagueColor', () => {
  const colorCache = ref(null)

  function loadFromStorage() {
    uni.getStorage({
      key: STORAGE_KEY,
      success: (res) => { colorCache.value = res.data || {} },
      fail: () => { colorCache.value = {} }
    })
  }

  function saveToStorage() {
    if (!colorCache.value) return
    uni.setStorage({ key: STORAGE_KEY, data: colorCache.value })
  }

  function getAll() {
    if (colorCache.value) return colorCache.value
    loadFromStorage()
    return {}
  }

  function getColor(key, defaultColor = '667eea') {
    if (!key) return defaultColor
    const colors = colorCache.value || {}
    return colors[key] || defaultColor
  }

  function setColor(leagueId, color) {
    if (!leagueId || !color) return
    if (!colorCache.value) colorCache.value = {}
    colorCache.value[leagueId] = color
    saveToStorage()
  }

  function batchSetColors(matches) {
    if (!Array.isArray(matches) || matches.length === 0) return
    if (!colorCache.value) { loadFromStorage(); colorCache.value = {} }
    let updated = false
    matches.forEach(match => {
      const leagueId = match.leagueId || match.leagueCode || match.league_id
      const leagueName = match.leagueName || match.leagueAbbName || match.league
      const color = match.backColor || match.leagueColor || match.color
      if (color) {
        if (leagueId) { colorCache.value[leagueId] = color; updated = true }
        if (leagueName) { colorCache.value[leagueName] = color; updated = true }
      }
    })
    if (updated) saveToStorage()
  }

  function clear() {
    colorCache.value = null
    uni.removeStorage({ key: STORAGE_KEY })
  }

  return { colorCache, getAll, getColor, setColor, batchSetColors, clear }
})
