<template>
  <view class="dragon-page">
    <!-- 加载状态 -->
    <view class="loading-wrapper" v-if="loading">
      <view class="loading-spinner"></view>
      <text class="loading-text">正在分析数据...</text>
    </view>

    <!-- 错误状态 -->
    <view class="error-wrapper" v-else-if="error">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @click="loadAnalysis">重试</view>
    </view>

    <scroll-view class="dragon-content" scroll-y v-else-if="data">
      <!-- 头部 -->
      <view class="header">
        <view class="header-title">单关斩龙计划</view>
        <view class="header-desc">分析未出现场次，捕捉拐点信号</view>
      </view>

      <!-- 样本选择 -->
      <view class="sample-selector">
        <view
          class="sample-btn"
          :class="{ active: sampleSize === size }"
          v-for="size in [20, 30, 50]"
          :key="size"
          @click="onSampleChange(size)"
        >{{ size }}期</view>
      </view>

      <!-- 当前龙位 -->
      <view class="result-card">
        <view class="card-title">当前龙位</view>
        <view class="dragon-items">
          <view class="dragon-item" :class="type" v-for="type in ['had', 'hhad']" :key="type">
            <view class="dragon-label">{{ dragonLabel(type) }}</view>
            <view class="dragon-stats">
              <view class="stat-block">
                <text class="stat-label">主胜未出</text>
                <text class="stat-value red">{{ data.currentDragon?.[type]?.home || 0 }}场</text>
              </view>
              <view class="stat-block">
                <text class="stat-label">平局未出</text>
                <text class="stat-value orange">{{ data.currentDragon?.[type]?.draw || 0 }}场</text>
              </view>
              <view class="stat-block">
                <text class="stat-label">客胜未出</text>
                <text class="stat-value blue">{{ data.currentDragon?.[type]?.away || 0 }}场</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 赔率龙位 -->
      <view class="result-card" v-if="data.oddsDragon">
        <view class="card-title">赔率龙位</view>
        <view class="dragon-items">
          <view class="dragon-item odds high">
            <text class="dragon-label">最高赔率龙</text>
            <text class="dragon-count">{{ data.oddsDragon.highest || 0 }}场</text>
          </view>
          <view class="dragon-item odds low">
            <text class="dragon-label">最低赔率龙</text>
            <text class="dragon-count">{{ data.oddsDragon.lowest || 0 }}场</text>
          </view>
        </view>
      </view>

      <!-- 历史最长纪录 -->
      <view class="result-card" v-if="data.historyRecords">
        <view class="card-title">历史龙纪录</view>
        <view class="history-list">
          <view class="history-item" v-for="(item, key) in data.historyRecords" :key="key">
            <text class="history-type">{{ historyLabel(key) }}</text>
            <text class="history-value">{{ item }}场</text>
          </view>
        </view>
      </view>

      <!-- 出现率统计 -->
      <view class="result-card" v-if="data.occurrenceRates">
        <view class="card-title">出现率统计</view>
        <view class="rate-list">
          <view class="rate-item" v-for="(item, key) in data.occurrenceRates" :key="key">
            <view class="rate-top">
              <text class="rate-label">{{ historyLabel(key) }}</text>
              <text class="rate-count">{{ item.count }}次</text>
            </view>
            <view class="rate-bar-bg">
              <view class="rate-bar-fill" :class="rateColor(key)" :style="{ width: item.rate + '%' }"></view>
            </view>
            <text class="rate-pct">{{ item.rate }}%</text>
          </view>
        </view>
      </view>

      <!-- 关联比赛 -->
      <view class="result-card" v-if="data.matchDetails?.length">
        <view class="card-title">关联比赛 ({{ data.matchDetails.length }}场)</view>
        <view class="match-list">
          <view class="match-row" v-for="match in data.matchDetails" :key="match.matchId">
            <view class="match-num">{{ match.matchNumStr || match.matchId }}</view>
            <view class="match-teams">
              <text class="home-team">{{ match.homeTeamName }}</text>
              <text class="vs-text">VS</text>
              <text class="away-team">{{ match.awayTeamName }}</text>
            </view>
            <view class="match-result">{{ match.result || match.matchResult || '待开' }}</view>
            <view class="match-odds" v-if="match.odds">@{{ match.odds }}</view>
            <view class="match-tags">
              <text class="tag high" v-if="match.isHighest">最高</text>
              <text class="tag low" v-if="match.isLowest">最低</text>
            </view>
            <text class="match-gap" v-if="match.gapFromNow != null">前{{ match.gapFromNow }}场</text>
          </view>
        </view>
      </view>

      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar" v-if="data">
      <view class="bottom-btn copy" @click="onCopy">📋 复制分析</view>
      <button class="bottom-btn share" open-type="share">📤 分享</button>
    </view>

    <!-- 复制提示 -->
    <view class="copy-toast" v-if="showCopyToast">已复制到剪贴板</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import * as matchApi from '@/api/match'

const loading = ref(true)
const error = ref(null)
const data = ref(null)
const sampleSize = ref(20)
const showCopyToast = ref(false)

function dragonLabel(type) {
  return type === 'had' ? '胜平负' : '让球胜平负'
}

function historyLabel(key) {
  const map = {
    'home': '主胜', 'draw': '平局', 'away': '客胜',
    'hhadHome': '让胜', 'hhadDraw': '让平', 'hhadAway': '让负'
  }
  return map[key] || key
}

function rateColor(key) {
  if (key.includes('home') || key.includes('Home')) return 'red'
  if (key.includes('draw') || key.includes('Draw')) return 'orange'
  return 'blue'
}

onLoad((options) => {
  if (options.sampleSize) sampleSize.value = Number(options.sampleSize)
  loadAnalysis()
})

async function loadAnalysis() {
  loading.value = true
  error.value = null
  try {
    const res = await matchApi.getDragonAnalysis(sampleSize.value)
    const result = res.data || res
    // 按 gapFromNow 排序 matchDetails
    if (result.matchDetails) {
      result.matchDetails.sort((a, b) => (a.gapFromNow || 0) - (b.gapFromNow || 0))
    }
    data.value = result
    loading.value = false
  } catch (e) {
    console.error('加载分析失败:', e)
    error.value = '加载失败'
    loading.value = false
  }
}

function onSampleChange(size) {
  if (sampleSize.value === size) return
  sampleSize.value = size
  loadAnalysis()
}

function generateCopyText() {
  if (!data.value) return ''
  const d = data.value
  let text = '【单关斩龙计划】\n'
  text += `样本: 最近${sampleSize.value}场\n\n`

  if (d.currentDragon) {
    text += '◆ 当前龙位\n'
    for (const type of ['had', 'hhad']) {
      const cd = d.currentDragon[type]
      if (cd) {
        text += `  ${dragonLabel(type)}: 主${cd.home || 0}场/平${cd.draw || 0}场/客${cd.away || 0}场\n`
      }
    }
  }

  if (d.oddsDragon) {
    text += '\n◆ 赔率龙位\n'
    text += `  最高赔率龙: ${d.oddsDragon.highest || 0}场\n`
    text += `  最低赔率龙: ${d.oddsDragon.lowest || 0}场\n`
  }

  if (d.historyRecords) {
    text += '\n◆ 历史纪录\n'
    for (const [key, value] of Object.entries(d.historyRecords)) {
      text += `  ${historyLabel(key)}: ${value}场\n`
    }
  }

  return text
}

function onCopy() {
  const text = generateCopyText()
  uni.setClipboardData({
    data: text,
    success: () => {
      showCopyToast.value = true
      setTimeout(() => { showCopyToast.value = false }, 1500)
    }
  })
}

onShareAppMessage(() => ({
  title: '单关斩龙计划分析报告',
  path: `/pages/dragon-analysis/index?sampleSize=${sampleSize.value}`
}))
</script>

<style scoped>
.dragon-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f7fa 0%, #f0f2f5 100%);
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

.retry-btn {
  margin-top: 30rpx;
  padding: 16rpx 48rpx;
  background: #667eea;
  color: #fff;
  border-radius: 40rpx;
  font-size: 26rpx;
}

.dragon-content {
  height: 100vh;
  padding: 0 16rpx;
}

/* 头部 */
.header {
  padding: 36rpx 16rpx 20rpx;
  text-align: center;
}

.header-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 10rpx;
}

.header-desc {
  font-size: 24rpx;
  color: #999;
}

/* 样本选择 */
.sample-selector {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.sample-btn {
  padding: 12rpx 36rpx;
  background: #fff;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
  border: 2rpx solid #e8e8e8;
  transition: all 0.2s;
}

.sample-btn.active {
  background: #c41d1d;
  color: #fff;
  border-color: #c41d1d;
}

/* 结果卡片 */
.result-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 20rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

/* 龙位 */
.dragon-items {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.dragon-item {
  padding: 16rpx;
  border-radius: 10rpx;
  border-left: 5rpx solid;
}

.dragon-item.had { border-color: #ff6b6b; background: rgba(255, 107, 107, 0.04); }
.dragon-item.hhad { border-color: #ffa940; background: rgba(255, 169, 64, 0.04); }
.dragon-item.odds { flex-direction: row; justify-content: space-between; align-items: center; }
.dragon-item.odds.high { border-color: #faad14; background: rgba(250, 173, 20, 0.06); }
.dragon-item.odds.low { border-color: #52c41a; background: rgba(82, 196, 26, 0.06); }

.dragon-label {
  font-size: 24rpx;
  color: #666;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.dragon-count {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
}

.odds.high .dragon-count { color: #faad14; }
.odds.low .dragon-count { color: #52c41a; }

.dragon-stats {
  display: flex;
  gap: 20rpx;
}

.stat-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-label {
  font-size: 20rpx;
  color: #999;
  margin-bottom: 6rpx;
}

.stat-value {
  font-size: 32rpx;
  font-weight: 700;
}

.stat-value.red { color: #ff6b6b; }
.stat-value.orange { color: #ffa940; }
.stat-value.blue { color: #4a90d9; }

/* 历史纪录 */
.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 18rpx;
  background: #f8f9fc;
  border-radius: 8rpx;
}

.history-type {
  font-size: 22rpx;
  color: #666;
}

.history-value {
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
}

/* 出现率 */
.rate-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.rate-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.rate-top {
  display: flex;
  align-items: center;
  min-width: 120rpx;
  justify-content: space-between;
}

.rate-label {
  font-size: 22rpx;
  color: #666;
}

.rate-count {
  font-size: 20rpx;
  color: #999;
}

.rate-bar-bg {
  flex: 1;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.rate-bar-fill {
  height: 100%;
  border-radius: 6rpx;
}

.rate-bar-fill.red { background: linear-gradient(90deg, #ff6b6b, #ff8c8c); }
.rate-bar-fill.orange { background: linear-gradient(90deg, #ffa940, #ffc069); }
.rate-bar-fill.blue { background: linear-gradient(90deg, #4a90d9, #69b1ff); }

.rate-pct {
  font-size: 22rpx;
  font-weight: 600;
  color: #333;
  min-width: 60rpx;
  text-align: right;
}

/* 关联比赛 */
.match-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.match-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 12rpx;
  background: #f8f9fc;
  border-radius: 10rpx;
  border-left: 4rpx solid #667eea;
}

.match-num {
  font-size: 20rpx;
  color: #999;
  min-width: 50rpx;
}

.match-teams {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
  overflow: hidden;
}

.home-team, .away-team {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120rpx;
}

.vs-text {
  color: #ccc;
  font-size: 20rpx;
  flex-shrink: 0;
}

.match-result {
  font-size: 22rpx;
  font-weight: 600;
  color: #667eea;
  min-width: 60rpx;
  text-align: center;
}

.match-odds {
  font-size: 20rpx;
  color: #999;
  min-width: 60rpx;
}

.match-tags {
  display: flex;
  gap: 4rpx;
}

.tag {
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  color: #fff;
}

.tag.high { background: #faad14; }
.tag.low { background: #52c41a; }

.match-gap {
  font-size: 20rpx;
  color: #999;
}

.bottom-placeholder {
  height: calc(120rpx + env(safe-area-inset-bottom));
}

/* 底部栏 */
.bottom-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  padding: 12rpx 20rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  gap: 10rpx;
  z-index: 100;
}

.bottom-btn {
  flex: 1;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 10rpx;
  font-size: 26rpx;
  font-weight: 600;
  border: none;
  padding: 0;
  margin: 0;
}

.bottom-btn::after { border: none; }

.bottom-btn.copy {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.bottom-btn.share {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8c8c 100%);
  color: #fff;
}

/* 复制提示 */
.copy-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 20rpx 40rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  z-index: 300;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
