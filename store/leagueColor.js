// store/leagueColor.js - 联赛颜色缓存管理

const STORAGE_KEY = 'league_colors'

// 内存缓存，避免频繁读写 storage
let colorCache = null

/**
 * 获取所有联赛颜色缓存（异步）
 */
function getAll() {
  if (colorCache) return colorCache

  // 异步加载存储数据，同时返回空对象兜底
  loadFromStorage()
  return {}
}

/**
 * 从本地存储加载颜色数据
 */
function loadFromStorage() {
  wx.getStorage({
    key: STORAGE_KEY,
    success: (res) => {
      colorCache = res.data || {}
    },
    fail: () => {
      colorCache = {}
    }
  })
}

/**
 * 保存颜色数据到本地存储（异步）
 */
function saveToStorage() {
  if (!colorCache) return
  wx.setStorage({
    key: STORAGE_KEY,
    data: colorCache,
    fail: (e) => {
      console.error('保存联赛颜色失败:', e)
    }
  })
}

/**
 * 获取指定联赛的颜色
 * @param {string} key 联赛ID或联赛名称
 * @param {string} defaultColor 默认颜色，传null则不返回默认值
 */
function getColor(key, defaultColor = '667eea') {
  if (!key) return defaultColor
  const colors = colorCache || {}
  return colors[key] || defaultColor
}

/**
 * 设置联赛颜色
 * @param {string} leagueId 联赛ID
 * @param {string} color 颜色值（不带#）
 */
function setColor(leagueId, color) {
  if (!leagueId || !color) return
  if (!colorCache) colorCache = {}
  colorCache[leagueId] = color
  saveToStorage()
}

/**
 * 批量设置联赛颜色
 * @param {Array} matches 比赛列表，包含 leagueId 和 backColor
 */
function batchSetColors(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return

  if (!colorCache) {
    // 首次调用时异步加载存储
    loadFromStorage()
    colorCache = {}
  }

  let updated = false

  matches.forEach(match => {
    const leagueId = match.leagueId || match.leagueCode || match.league_id
    const leagueName = match.leagueName || match.leagueAbbName || match.league
    const color = match.backColor || match.leagueColor || match.color

    if (color) {
      if (leagueId) {
        colorCache[leagueId] = color
        updated = true
      }
      if (leagueName) {
        colorCache[leagueName] = color
        updated = true
      }
    }
  })

  if (updated) {
    saveToStorage()
  }
}

/**
 * 清除缓存
 */
function clear() {
  colorCache = null
  wx.removeStorage({
    key: STORAGE_KEY,
    fail: (e) => {
      console.error('清除联赛颜色缓存失败:', e)
    }
  })
}

module.exports = {
  getAll,
  getColor,
  setColor,
  batchSetColors,
  clear
}
