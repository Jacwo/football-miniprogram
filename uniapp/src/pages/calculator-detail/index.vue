<template>
  <view class="detail-page">
    <!-- 加载状态 -->
    <view class="loading-wrapper" v-if="loading">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view class="error-wrapper" v-else-if="error">
      <text class="error-text">{{ error }}</text>
    </view>

    <!-- 详情内容 -->
    <scroll-view class="detail-content" scroll-y v-else-if="record">
      <!-- 状态卡片 -->
      <view class="status-card" :class="statusClass">
        <view class="status-row">
          <view class="status-left">
            <text class="status-icon">{{ statusIcon }}</text>
            <text class="status-text">{{ record.statusDesc }}</text>
          </view>
          <view class="scheme-no">{{ record.schemeNo }}</view>
        </view>
      </view>

      <!-- 投注信息 -->
      <view class="info-card">
        <view class="card-title-row">
          <text class="card-title">投注信息</text>
          <text class="time-value">{{ record.createTimeStr }}</text>
        </view>
        <view class="info-row">
          <view class="info-left">
            <text class="info-value">{{ record.totalBets }}注</text>
            <text class="info-value amount">{{ record.multiple }}倍{{ record.totalAmount }}元</text>
          </view>
          <view class="info-right">
            <text v-if="record.status === 1" class="info-value bonus win">中奖¥{{ record.actualBonus }}</text>
            <text v-else-if="record.status === 2" class="info-value bonus lose">未中奖</text>
            <text v-else-if="record.bonusRange" class="info-value bonus">预计奖金¥{{ record.bonusRange }}</text>
          </view>
        </view>
      </view>

      <!-- 选择的比赛 -->
      <view class="matches-card">
        <view class="card-title">比赛详情 ({{ record.matchDetails.length }}场)</view>
        <view class="pass-row">
          <text class="pass-label">过关方式</text>
          <text class="pass-value">{{ record.passTypesStr }}</text>
        </view>

        <view class="match-item" v-for="match in record.matchDetails" :key="match.matchId">
          <view class="match-header">
            <text class="match-num">{{ match.matchNumStr }}</text>
            <view class="match-teams">
              <text class="team-name home">{{ match.homeTeamName }}</text>
              <text class="match-time">{{ match.matchTime }}</text>
              <text class="team-name away">{{ match.awayTeamName }}</text>
            </view>
          </view>

          <view class="match-options">
            <view class="option-group" v-for="group in match.optionGroups" :key="group.type">
              <view class="group-row">
                <view class="group-title-box">
                  <text class="group-title">{{ group.typeDesc }}</text>
                  <text class="group-goalline" v-if="group.goalLine">({{ group.goalLine }})</text>
                </view>
                <view class="group-options" :class="{ vertical: isVerticalType(group.type) }">
                  <view
                    class="option-cell"
                    :class="[
                      opt.checked ? 'checked' : 'unchecked',
                      { hit: opt.checked && opt.isHit, miss: opt.checked && opt.checkTime && !opt.isHit },
                      { vertical: isVerticalType(group.type) }
                    ]"
                    v-for="opt in group.options"
                    :key="opt.value"
                  >
                    <text class="cell-value">{{ opt.displayValue }}</text>
                    <text class="cell-odds">{{ opt.odds }}</text>
                  </view>
                </view>
                <view class="group-result" :class="resultClass(group)">
                  <text class="result-value">{{ group.matchResultDesc || '待开奖' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-share-bar" v-if="record">
      <button class="share-btn" v-if="!isFromHall" @click="onRecommend" :loading="recommending">
        <text class="share-icon">👍</text>
        <text class="share-text">分享到大厅</text>
      </button>
      <button class="share-btn" v-else open-type="share">
        <text class="share-icon">📤</text>
        <text class="share-text">分享</text>
      </button>
    </view>

    <!-- 分享确认弹窗 -->
    <view class="confirm-overlay" v-if="showConfirmPopup" @click="onCloseConfirm">
      <view class="confirm-popup" @click.stop>
        <view class="confirm-title">分享到大厅</view>
        <view class="confirm-body">确定将该方案分享到大厅吗？</view>
        <view class="confirm-actions">
          <button class="confirm-btn cancel" @click="onCloseConfirm">取消</button>
          <button class="confirm-btn ok" @click="onConfirmShare" :loading="recommending">确定分享</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import * as matchApi from '@/api/match'

const loading = ref(true)
const error = ref(null)
const record = ref(null)
const recommending = ref(false)
const isFromHall = ref(false)
const showConfirmPopup = ref(false)

const statusClass = computed(() => {
  if (!record.value) return ''
  if (record.value.status === 1) return 'win'
  if (record.value.status === 2) return 'lose'
  return ''
})

const statusIcon = computed(() => {
  if (!record.value) return ''
  if (record.value.status === 1) return '🎉'
  if (record.value.status === 2) return '😔'
  return '⏳'
})

function isVerticalType(type) {
  return type === 'crs' || type === 'ttg' || type === 'hafu'
}

function resultClass(group) {
  if (group.checkTime) {
    return group.isHit ? 'hit' : 'miss'
  }
  return 'pending'
}

onLoad((options) => {
  const id = options.id
  const from = options.from
  if (!id) {
    loading.value = false
    error.value = '参数错误'
    return
  }
  isFromHall.value = from === 'hall'
  loadRecord(id)
})

async function loadRecord(id) {
  try {
    const res = await matchApi.getCalculatorRecords(id)
    const records = res.data || res || []
    const found = records.find(r => String(r.id) === String(id))
    if (found) {
      processRecord(found)
    } else {
      loading.value = false
      error.value = '记录不存在'
    }
  } catch (err) {
    console.error('加载记录失败:', err)
    loading.value = false
    error.value = '加载失败'
  }
}

function processRecord(raw) {
  const data = JSON.parse(JSON.stringify(raw))
  data.passTypesStr = formatPassTypes(data.passTypes)
  data.createTimeStr = formatTime(data.createTime)
  data.bonusRange = calculateBonusRange(data)

  if (data.matchDetails) {
    data.matchDetails = data.matchDetails.map(match => {
      const options = (match.options || []).map(opt => ({
        ...opt,
        displayValue: getValueName(opt.optionType, opt.optionValue),
        isHit: opt.isHit === 1
      }))
      const optionGroups = groupOptionsByType(options)
      return { ...match, options, optionGroups }
    })
  }

  data.actualBonus = calculateActualBonus(data)
  record.value = data
  loading.value = false
}

function formatPassTypes(passTypes) {
  if (!passTypes || !Array.isArray(passTypes)) return ''
  const map = {
    'single': '单关', '2_1': '2串1', '3_1': '3串1',
    '4_1': '4串1', '5_1': '5串1', '6_1': '6串1',
    '7_1': '7串1', '8_1': '8串1'
  }
  return passTypes.map(p => map[p] || p).join(' / ')
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const Y = date.getFullYear()
  const M = String(date.getMonth() + 1).padStart(2, '0')
  const D = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${Y}-${M}-${D} ${h}:${m}`
}

function calculateBonusRange(raw) {
  if (!raw.matchDetails || raw.matchDetails.length === 0) return ''
  const multiple = raw.multiple || 1
  const passTypes = raw.passTypes || []
  if (passTypes.length === 0) return ''

  const selections = {}
  const matchIds = []
  raw.matchDetails.forEach(match => {
    const mid = String(match.matchId)
    matchIds.push(mid)
    selections[mid] = (match.options || [])
      .filter(opt => opt.checked !== false)
      .map(opt => ({ type: opt.optionType, value: opt.optionValue, odds: opt.odds || 1 }))
  })

  let allResults = []
  passTypes.forEach(pt => {
    allResults = allResults.concat(calcPassTypeBonusResults(pt, matchIds, selections))
  })
  if (allResults.length === 0) return ''
  const valid = allResults.filter(r => r > 0)
  if (valid.length === 0) return ''

  const minBonus = (Math.min(...valid) * 2 * multiple).toFixed(2)

  // max bonus
  const hitSelections = {}
  matchIds.forEach(mid => {
    const allOpts = selections[mid] || []
    if (allOpts.length > 0) {
      hitSelections[mid] = allOpts.reduce((max, o) => o.odds > max.odds ? o : max, allOpts[0])
    }
  })
  let maxTotal = 0
  passTypes.forEach(pt => {
    maxTotal += calcMaxBonusForPassType(pt, matchIds, selections, hitSelections)
  })
  const maxBonus = (maxTotal * 2 * multiple).toFixed(2)
  return `${minBonus} ~ ${maxBonus}`
}

function getCombinations(arr, m) {
  if (m === 1) return arr.map(item => [item])
  if (m === arr.length) return [arr]
  const result = []
  for (let i = 0; i <= arr.length - m; i++) {
    const first = arr[i]
    const rest = arr.slice(i + 1)
    const subs = getCombinations(rest, m - 1)
    subs.forEach(combo => result.push([first, ...combo]))
  }
  return result
}

function getPlayTypePaths(matchIds, matchPlayTypes) {
  if (matchIds.length === 0) return [{}]
  const [first, ...rest] = matchIds
  const firstTypes = Object.keys(matchPlayTypes[first] || {})
  if (firstTypes.length === 0) return getPlayTypePaths(rest, matchPlayTypes)
  const restPaths = getPlayTypePaths(rest, matchPlayTypes)
  const result = []
  firstTypes.forEach(playType => {
    restPaths.forEach(rp => {
      result.push({ ...rp, [first]: playType })
    })
  })
  return result
}

function calcPassTypeBonusResults(passType, matchIds, selections) {
  if (passType === 'single') {
    const results = []
    matchIds.forEach(mid => {
      (selections[mid] || []).forEach(sel => {
        if (sel.odds > 0) results.push(sel.odds)
      })
    })
    return results
  }
  const [m] = passType.split('_').map(Number)
  if (matchIds.length < m) return []

  const matchPlayTypes = {}
  matchIds.forEach(mid => {
    matchPlayTypes[mid] = {}
    ;(selections[mid] || []).forEach(sel => {
      if (!matchPlayTypes[mid][sel.type]) matchPlayTypes[mid][sel.type] = []
      matchPlayTypes[mid][sel.type].push(sel)
    })
  })

  const paths = getPlayTypePaths(matchIds, matchPlayTypes)
  let results = []
  paths.forEach(path => {
    const pathSelections = {}
    matchIds.forEach(mid => {
      pathSelections[mid] = matchPlayTypes[mid][path[mid]] || []
    })
    const combos = getCombinations(matchIds, m)
    combos.forEach(combo => {
      const oddsList = getOddsCombos(combo, pathSelections)
      oddsList.forEach(odds => {
        const product = odds.reduce((p, o) => p * o, 1)
        if (product > 0) results.push(product)
      })
    })
  })
  return results
}

function getOddsCombos(matchIds, pathSelections) {
  if (matchIds.length === 0) return [[]]
  const [first, ...rest] = matchIds
  const firstOdds = (pathSelections[first] || []).map(s => s.odds).filter(o => o > 0)
  if (firstOdds.length === 0) firstOdds.push(1)
  const restCombos = getOddsCombos(rest, pathSelections)
  const result = []
  firstOdds.forEach(odds => {
    restCombos.forEach(rc => result.push([odds, ...rc]))
  })
  return result
}

function calcMaxBonusForPassType(passType, matchIds, selections, hitSelections) {
  if (passType === 'single') {
    let bonus = 0
    matchIds.forEach(mid => {
      const hit = hitSelections[mid]
      if (hit && hit.odds > 0) bonus += hit.odds
    })
    return bonus
  }
  const [m] = passType.split('_').map(Number)
  if (matchIds.length < m) return 0

  const matchPlayTypes = {}
  matchIds.forEach(mid => {
    matchPlayTypes[mid] = {}
    ;(selections[mid] || []).forEach(sel => {
      if (!matchPlayTypes[mid][sel.type]) matchPlayTypes[mid][sel.type] = []
      matchPlayTypes[mid][sel.type].push(sel)
    })
  })

  const paths = getPlayTypePaths(matchIds, matchPlayTypes)
  let total = 0
  paths.forEach(path => {
    const matchHitStatus = {}
    matchIds.forEach(mid => {
      const hit = hitSelections[mid]
      const ticketOpts = matchPlayTypes[mid][path[mid]] || []
      matchHitStatus[mid] = ticketOpts.some(o => o.type === hit.type && o.value === hit.value)
    })
    const combos = getCombinations(matchIds, m)
    combos.forEach(combo => {
      if (combo.every(mid => matchHitStatus[mid])) {
        let product = 1
        combo.forEach(mid => { product *= hitSelections[mid].odds })
        total += product
      }
    })
  })
  return total
}

function groupOptionsByType(options) {
  const typeMap = {}
  const typeDescMap = {
    'had': '胜平负', 'hhad': '让球', 'crs': '比分',
    'ttg': '总进球', 'hafu': '半全场'
  }
  options.forEach(opt => {
    const type = opt.optionType
    if (!typeMap[type]) {
      typeMap[type] = {
        type,
        typeDesc: typeDescMap[type] || opt.optionTypeDesc || type,
        goalLine: opt.goalLine,
        matchResultDesc: opt.matchResultDesc,
        checkTime: opt.checkTime,
        isHit: false,
        options: []
      }
    }
    typeMap[type].options.push({
      value: opt.optionValue,
      displayValue: opt.displayValue,
      odds: opt.odds,
      checked: opt.checked !== false,
      isHit: opt.isHit,
      checkTime: opt.checkTime
    })
    if (opt.matchResultDesc) typeMap[type].matchResultDesc = opt.matchResultDesc
    if (opt.checkTime) typeMap[type].checkTime = opt.checkTime
    if (opt.checked !== false && opt.isHit) typeMap[type].isHit = true
  })
  return Object.values(typeMap)
}

function getValueName(type, value) {
  if (type === 'had') {
    const map = { 'H': '胜', 'D': '平', 'A': '负' }
    return map[value] || value
  }
  if (type === 'hhad') {
    const map = { 'H': '让胜', 'D': '让平', 'A': '让负' }
    return map[value] || value
  }
  if (type === 'ttg') return value === '7' ? '7+球' : `${value}球`
  if (type === 'hafu') {
    const map = {
      'HH': '胜胜', 'HD': '胜平', 'HA': '胜负',
      'DH': '平胜', 'DD': '平平', 'DA': '平负',
      'AH': '负胜', 'AD': '负平', 'AA': '负负'
    }
    return map[value] || value
  }
  return value
}

function calculateActualBonus(raw) {
  if (raw.status !== 1) return '0.00'
  if (!raw.matchDetails || raw.matchDetails.length === 0) return '0.00'

  const multiple = raw.multiple || 1
  const passTypes = raw.passTypes || []
  const matchDetails = raw.matchDetails

  const hitOptionsByMatch = {}
  const matchPlayTypes = {}
  const matchIds = []

  for (const match of matchDetails) {
    if (!match.options) continue
    const mid = String(match.matchId)
    matchIds.push(mid)
    hitOptionsByMatch[mid] = {}
    matchPlayTypes[mid] = {}

    for (const opt of match.options) {
      if (opt.checked !== false && opt.isHit === true) {
        hitOptionsByMatch[mid][opt.optionType] = {
          value: opt.optionValue,
          odds: opt.odds || 1
        }
      }
      if (opt.checked === false) continue
      if (!matchPlayTypes[mid][opt.optionType]) matchPlayTypes[mid][opt.optionType] = []
      matchPlayTypes[mid][opt.optionType].push({
        value: opt.optionValue,
        odds: opt.odds || 1,
        isHit: opt.isHit === true
      })
    }
  }

  const playTypePaths = generatePlayTypePaths(matchIds, matchPlayTypes)
  let totalBonus = 0

  for (const passType of passTypes) {
    if (passType === 'single') {
      totalBonus += calcSingle(matchIds, matchPlayTypes, hitOptionsByMatch, multiple)
    } else {
      const [m] = passType.split('_').map(Number)
      if (matchIds.length < m) continue
      totalBonus += calcParlay(matchIds, m, playTypePaths, matchPlayTypes, hitOptionsByMatch, multiple)
    }
  }
  return totalBonus.toFixed(2)
}

function generatePlayTypePaths(matchIds, matchPlayTypes) {
  if (matchIds.length === 0) return [{}]
  const [first, ...rest] = matchIds
  const firstTypes = Object.keys(matchPlayTypes[first] || {})
  if (firstTypes.length === 0) return generatePlayTypePaths(rest, matchPlayTypes)
  const restPaths = generatePlayTypePaths(rest, matchPlayTypes)
  const result = []
  firstTypes.forEach(pt => {
    restPaths.forEach(rp => result.push({ ...rp, [first]: pt }))
  })
  return result
}

function calcSingle(matchIds, matchPlayTypes, hitOptionsByMatch, multiple) {
  let bonus = 0
  for (const mid of matchIds) {
    const playTypes = matchPlayTypes[mid] || {}
    const hitOptions = hitOptionsByMatch[mid] || {}
    for (const pt of Object.keys(playTypes)) {
      if (hitOptions[pt]) {
        const hitOption = (playTypes[pt] || []).find(o => o.isHit === true)
        if (hitOption) bonus += 2 * hitOptions[pt].odds * multiple
      }
    }
  }
  return bonus
}

function calcParlay(matchIds, m, playTypePaths, matchPlayTypes, hitOptionsByMatch, multiple) {
  let total = 0
  const combos = getCombinations(matchIds, m)
  for (const path of playTypePaths) {
    for (const combo of combos) {
      const matchHitOddsList = []
      let allHit = true
      for (const mid of combo) {
        const pt = path[mid]
        if (!pt) { allHit = false; break }
        const hitForType = (hitOptionsByMatch[mid] || {})[pt]
        if (!hitForType) { allHit = false; break }
        const selectedOpts = (matchPlayTypes[mid] || {})[pt] || []
        const hitSelected = selectedOpts.filter(o => o.isHit)
        if (hitSelected.length === 0) { allHit = false; break }
        matchHitOddsList.push(hitSelected.map(o => o.odds))
      }
      if (allHit && matchHitOddsList.length === m) {
        const products = calcOddsProducts(matchHitOddsList)
        for (const p of products) total += 2 * p * multiple
      }
    }
  }
  return total
}

function calcOddsProducts(matchOddsList) {
  if (matchOddsList.length === 0) return [1]
  const [first, ...rest] = matchOddsList
  const restProducts = calcOddsProducts(rest)
  const results = []
  for (const odds of first) {
    for (const rp of restProducts) results.push(odds * rp)
  }
  return results
}

function onRecommend() {
  if (!record.value) {
    uni.showToast({ title: '记录不存在', icon: 'error' })
    return
  }
  showConfirmPopup.value = true
}

function onCloseConfirm() {
  showConfirmPopup.value = false
}

async function onConfirmShare() {
  showConfirmPopup.value = false
  recommending.value = true
  try {
    await matchApi.recommendCalculatorRecord(record.value.id)
    recommending.value = false
    uni.showToast({ title: '分享成功', icon: 'success' })
  } catch (err) {
    console.error('分享失败:', err)
    recommending.value = false
    uni.showToast({ title: err.message || '分享失败', icon: 'error' })
  }
}

onShareAppMessage(() => {
  if (!record.value) {
    return {
      title: '我的模拟选号方案',
      path: '/pages/calculator/index'
    }
  }
  const matchCount = record.value.matchDetails ? record.value.matchDetails.length : 0
  const statusText = record.value.status === 1 ? '中奖啦！' : record.value.status === 2 ? '未中奖' : '待开奖'
  return {
    title: `${statusText} ${matchCount}场比赛 ${record.value.passTypesStr}`,
    path: `/pages/calculator-detail/index?id=${record.value.id}`
  }
})
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.loading-wrapper, .error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 400rpx 80rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text, .error-text {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #666;
}

.detail-content {
  height: 100vh;
  padding: 12rpx;
  box-sizing: border-box;
}

.status-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 12rpx;
}

.status-card.win {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8c8c 100%);
}

.status-card.lose {
  background: linear-gradient(135deg, #d9d9d9 0%, #e8e8e8 100%);
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.status-icon {
  font-size: 36rpx;
}

.status-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.scheme-no {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
}

.status-card.lose .status-text {
  color: #999;
  text-shadow: none;
}

.status-card.lose .scheme-no {
  color: rgba(100, 100, 100, 0.8);
}

.info-card, .matches-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.card-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
}

.pass-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 10rpx 16rpx;
  background: #f8f9fc;
  border-radius: 6rpx;
  margin-bottom: 12rpx;
}

.pass-label {
  font-size: 22rpx;
  color: #666;
  font-weight: 600;
}

.pass-value {
  font-size: 24rpx;
  color: #ff6b6b;
  font-weight: 600;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10rpx 16rpx;
  background: #f8f9fc;
  border-radius: 6rpx;
}

.info-left, .info-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.info-value {
  font-size: 22rpx;
  color: #333;
  font-weight: 600;
}

.info-value.amount { color: #ff6b6b; }
.info-value.bonus { color: #c41d1d; }
.info-value.bonus.win { color: #c41d1d; }
.info-value.bonus.lose { color: #999; }

.time-value {
  font-size: 20rpx;
  color: #666;
}

.match-item {
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.match-item:last-child {
  border-bottom: none;
}

.match-header {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
  justify-content: center;
}

.match-num {
  position: absolute;
  left: 0;
  font-size: 20rpx;
  color: #fff;
  background: #667eea;
  padding: 3rpx 10rpx;
  border-radius: 5rpx;
  font-weight: 600;
  white-space: nowrap;
}

.match-teams {
  display: flex;
  align-items: center;
  gap: 8rpx;
  justify-content: center;
}

.team-name {
  font-size: 22rpx;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140rpx;
}

.team-name.home { text-align: right; }
.team-name.away { text-align: left; }

.match-time {
  font-size: 20rpx;
  color: #999;
  white-space: nowrap;
  flex-shrink: 0;
  padding: 0 4rpx;
}

.match-options {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.option-group {
  background: #f8f9fc;
  border-radius: 10rpx;
  padding: 10rpx 12rpx;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.group-title-box {
  display: flex;
  align-items: center;
  gap: 3rpx;
  min-width: 110rpx;
  flex-shrink: 0;
}

.group-title {
  font-size: 20rpx;
  color: #666;
  font-weight: 600;
}

.group-goalline {
  font-size: 18rpx;
  color: #667eea;
  font-weight: 500;
}

.group-options {
  display: flex;
  gap: 0;
  flex-wrap: nowrap;
  flex: 1;
}

.group-options.vertical {
  flex-wrap: wrap;
  gap: 8rpx;
}

.option-cell {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5rpx;
  width: 110rpx;
  padding: 8rpx 0;
  border-radius: 6rpx;
  position: relative;
}

.option-cell.vertical {
  flex-direction: column;
  gap: 3rpx;
  width: auto;
  min-width: 80rpx;
  padding: 6rpx 10rpx;
}

.option-cell.checked {
  background: linear-gradient(135deg, #c41d1d 0%, #d32f2f 100%);
}

.option-cell.checked .cell-value,
.option-cell.checked .cell-odds {
  color: #fff;
}

.option-cell.unchecked {
  background: #fff;
  border: 1rpx solid #e8e8e8;
}

.option-cell.unchecked .cell-value { color: #999; }
.option-cell.unchecked .cell-odds { color: #bbb; }

.option-cell.checked.hit {
  background: linear-gradient(135deg, #c41d1d 0%, #d32f2f 100%);
}

.option-cell.checked.miss {
  background: linear-gradient(135deg, #bdbdbd 0%, #d0d0d0 100%);
}

.cell-value {
  font-size: 22rpx;
  font-weight: 700;
}

.cell-odds {
  font-size: 20rpx;
  font-weight: 600;
}

.group-result {
  min-width: 70rpx;
  padding: 5rpx 12rpx 10rpx;
  border-radius: 6rpx;
  text-align: center;
  flex-shrink: 0;
}

.group-result.hit {
  background: linear-gradient(135deg, #c41d1d 0%, #d32f2f 100%);
}

.group-result.pending {
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
}

.group-result.miss {
  background: linear-gradient(135deg, #bdbdbd 0%, #d0d0d0 100%);
}

.group-result .result-value {
  font-size: 20rpx;
  color: #fff;
  font-weight: 600;
}

.bottom-placeholder {
  height: calc(120rpx + env(safe-area-inset-bottom));
}

.bottom-share-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12rpx 20rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
  display: flex;
  gap: 10rpx;
}

.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  flex: 1;
  height: 76rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10rpx;
  border: none;
  padding: 0;
  margin: 0;
}

.share-btn::after {
  border: none;
}

.share-icon {
  font-size: 32rpx;
}

.share-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-popup {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx 36rpx 28rpx;
  width: 560rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
}

.confirm-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 20rpx;
}

.confirm-body {
  font-size: 28rpx;
  color: #666;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 36rpx;
}

.confirm-actions {
  display: flex;
  gap: 20rpx;
}

.confirm-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
  margin: 0;
  line-height: 80rpx;
}

.confirm-btn::after { border: none; }

.confirm-btn.cancel {
  background: #f2f3f5;
  color: #666;
}

.confirm-btn.ok {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
</style>
