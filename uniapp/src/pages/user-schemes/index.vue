<template>
  <view class="user-schemes-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-ring">
        <view class="ring-inner"></view>
      </view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error-wrapper">
      <text class="error-icon">⚠️</text>
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="onRetry">重新加载</view>
    </view>

    <!-- 主内容 -->
    <view v-else class="main-content">
      <!-- 用户信息头部 -->
      <view class="user-header">
        <view class="avatar-ring">
          <view class="user-avatar">
            <image v-if="userAvatar" class="avatar-img" :src="userAvatar" mode="aspectFill"></image>
            <view v-else class="avatar-fallback">{{ userName[0] }}</view>
          </view>
        </view>
        <view class="user-name-area">
          <view class="name-row">
            <text class="user-name">{{ userName }}</text>
            <view v-if="topMedal" class="rank-medal-icon" :class="topMedal.colorClass">
              <text>{{ topMedal.icon }}</text>
            </view>
          </view>
          <view v-if="!topMedal" class="level-badge">
            <text class="level-icon">⚡</text>
            <text class="level-text">推单人</text>
          </view>
        </view>
        <text class="scheme-count-tag">{{ stats.totalRecords }}条记录</text>
      </view>

      <!-- 统计卡片 -->
      <view class="stats-section">
        <view class="stats-main-card">
          <view class="main-stat win-rate">
            <text class="ms-value">{{ stats.winRate }}<text class="ms-unit">%</text></text>
            <text class="ms-label">胜率</text>
            <view class="ms-bar-bg">
              <view class="ms-bar-fill" :style="{ width: Math.min(stats.winRate, 100) + '%' }"></view>
            </view>
          </view>
          <view class="main-stat-divider"></view>
          <view class="main-stat bonus">
            <text class="ms-value gold">¥{{ stats.totalBonusStr }}</text>
            <text class="ms-label">累计奖金</text>
          </view>
        </view>
        <view class="stats-sub-grid">
          <view class="sub-stat won">
            <text class="ss-num">{{ stats.winRecords }}</text>
            <text class="ss-label">中奖</text>
          </view>
          <view class="sub-stat lost">
            <text class="ss-num">{{ stats.loseRecords }}</text>
            <text class="ss-label">未中</text>
          </view>
          <view class="sub-stat pending">
            <text class="ss-num">{{ stats.pendingRecords }}</text>
            <text class="ss-label">待开</text>
          </view>
        </view>
      </view>

      <!-- 筛选栏 -->
      <view class="filter-bar">
        <view class="filter-item" :class="{ active: statusFilter === '' }" @tap="onFilterChange('')">
          <text>全部</text>
        </view>
        <view class="filter-item won" :class="{ active: statusFilter === 'won' }" @tap="onFilterChange('won')">
          <text class="filter-dot won"></text>
          <text>已中奖</text>
        </view>
        <view class="filter-item lost" :class="{ active: statusFilter === 'lost' }" @tap="onFilterChange('lost')">
          <text class="filter-dot lost"></text>
          <text>未中奖</text>
        </view>
        <view class="filter-item pending" :class="{ active: statusFilter === 'pending' }" @tap="onFilterChange('pending')">
          <text class="filter-dot pending"></text>
          <text>待开奖</text>
        </view>
      </view>

      <!-- 方案列表 -->
      <scroll-view v-if="filteredSchemes.length > 0" class="schemes-scroll" scroll-y>
        <view
          v-for="item in filteredSchemes"
          :key="item.id"
          class="scheme-item"
          :class="item.status === 1 ? 'status-won' : (item.status === 2 ? 'status-lost' : 'status-pending')"
        >
          <view class="scheme-left-accent"></view>
          <view class="scheme-body">
            <view class="scheme-top">
              <view class="scheme-play-tag">{{ item.passTypesStr }}</view>
              <view class="scheme-status-badge" :class="item.status === 1 ? 'won' : (item.status === 2 ? 'lost' : 'pending')">
                <text>{{ item.status === 1 ? '🎯 中奖' : (item.status === 2 ? '✗ 未中' : '⏳ 待开') }}</text>
              </view>
              <text v-if="item.status === 1" class="amount-won-inline">+¥{{ item.totalAmount }}</text>
              <view class="scheme-top-spacer"></view>
              <text class="scheme-time">{{ item.createTimeStr }}</text>
            </view>

            <view class="scheme-bottom-row">
              <view class="scheme-metas">
                <view class="meta-chip">
                  <text class="meta-icon">⚽</text>
                  <text class="meta-text">{{ item.matchCount }}场</text>
                </view>
                <view class="meta-chip">
                  <text class="meta-icon">🎫</text>
                  <text class="meta-text">{{ item.bets }}注 · </text>
                  <text class="meta-text bet-amount">¥{{ item.betAmount }}</text>
                </view>
              </view>
              <view class="scheme-action" @tap="onRecordTap(item)">
                <text>查看方案</text>
                <text class="action-arrow">→</text>
              </view>
            </view>
          </view>
        </view>
        <view class="bottom-placeholder"></view>
      </scroll-view>

      <!-- 空状态：无方案 -->
      <view v-if="schemes.length === 0 && !loading" class="empty-state">
        <view class="empty-card">
          <text class="empty-icon">📭</text>
          <text class="empty-text">该用户暂无分享方案</text>
        </view>
      </view>

      <!-- 空状态：筛选无结果 -->
      <view v-else-if="filteredSchemes.length === 0 && !loading" class="empty-state">
        <view class="empty-card">
          <text class="empty-icon">🔍</text>
          <text class="empty-text">暂无符合条件的方案</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import * as matchApi from '@/api/match'

const PASS_TYPE_MAP = {
  single: '单关', '2_1': '2串1', '3_1': '3串1', '4_1': '4串1',
  '5_1': '5串1', '6_1': '6串1', '7_1': '7串1', '8_1': '8串1'
}

export default {
  setup() {
    const userStore = useUserStore()
    const userId = ref('')
    const userName = ref('未知用户')
    const userAvatar = ref('')
    const topMedal = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const schemes = ref([])
    const filteredSchemes = ref([])
    const statusFilter = ref('')
    const stats = reactive({
      totalRecords: 0, winRecords: 0, loseRecords: 0,
      pendingRecords: 0, totalBonus: 0, totalBonusStr: '0.00', winRate: 0
    })

    function formatTime(time) {
      if (!time) return ''
      const d = new Date(time)
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hour = String(d.getHours()).padStart(2, '0')
      const minute = String(d.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${minute}`
    }

    function formatPassTypes(passTypes) {
      if (!passTypes || !Array.isArray(passTypes)) return ''
      return passTypes.map(p => PASS_TYPE_MAP[p] || p).join('/')
    }

    function applyFilter() {
      if (!statusFilter.value) {
        filteredSchemes.value = schemes.value
        return
      }
      filteredSchemes.value = schemes.value.filter(item => {
        if (statusFilter.value === 'won') return item.status === 1
        if (statusFilter.value === 'lost') return item.status === 2
        return item.status !== 1 && item.status !== 2
      })
    }

    async function loadSchemes() {
      loading.value = true
      error.value = null
      try {
        const res = await matchApi.getCalculatorRecommendList()
        const rawRecords = (res && res.data) ? res.data : (res || [])
        const userRecords = rawRecords.filter(
          item => String(item.userId) === String(userId.value)
        )

        const processed = userRecords.map(item => {
          const bets = item.totalBets || 1
          const multiple = item.multiple || 1
          return {
            ...item,
            matchCount: item.matchDetails ? item.matchDetails.length : 0,
            passTypesStr: formatPassTypes(item.passTypes),
            createTimeStr: formatTime(item.createTime),
            totalAmount: item.actualBonus ? parseFloat(item.actualBonus).toFixed(2) : '--',
            bets,
            betAmount: (2 * bets * multiple).toFixed(2)
          }
        })

        let winRecords = 0, loseRecords = 0, pendingRecords = 0, totalBonus = 0
        processed.forEach(item => {
          if (item.status === 1) { winRecords++; totalBonus += parseFloat(item.actualBonus || 0) }
          else if (item.status === 2) loseRecords++
          else pendingRecords++
        })

        const finishedRecords = winRecords + loseRecords
        const winRate = finishedRecords > 0 ? Math.round((winRecords / finishedRecords) * 100) : 0

        schemes.value = processed
        stats.totalRecords = processed.length
        stats.winRecords = winRecords
        stats.loseRecords = loseRecords
        stats.pendingRecords = pendingRecords
        stats.totalBonus = Math.round(totalBonus * 100) / 100
        stats.totalBonusStr = totalBonus.toFixed(2)
        stats.winRate = winRate
        loading.value = false

        applyFilter()
      } catch (e) {
        console.error('加载用户方案失败:', e)
        loading.value = false
        error.value = '加载失败，请重试'
      }
    }

    function onFilterChange(filter) {
      statusFilter.value = filter === statusFilter.value ? '' : filter
      applyFilter()
    }

    function onRecordTap(record) {
      if (!record || !record.id) return
      if (!userStore.getIsLoggedIn) {
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }
      uni.navigateTo({ url: `/pages/calculator-detail/index?id=${record.id}&from=hall` })
    }

    function onRetry() { loadSchemes() }

    onLoad((options) => {
      const { userId: uid, userName: name, userAvatar: avatar, topMedal: medal } = options || {}
      userId.value = uid || ''
      userName.value = name ? decodeURIComponent(name) : '未知用户'
      userAvatar.value = avatar ? decodeURIComponent(avatar) : ''
      topMedal.value = medal ? JSON.parse(decodeURIComponent(medal)) : null
      uni.setNavigationBarTitle({ title: userName.value + '的推单' })
      loadSchemes()
    })

    return {
      userId, userName, userAvatar, topMedal, loading, error,
      schemes, filteredSchemes, statusFilter, stats,
      onFilterChange, onRecordTap, onRetry
    }
  }
}
</script>

<style scoped>
.user-schemes-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: env(safe-area-inset-bottom);
}

/* ========== 加载状态 ========== */
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 300rpx 0;
}

.loading-ring {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #6366f1, #a78bfa, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ring-rotate 1.2s linear infinite;
}

@keyframes ring-rotate {
  to { transform: rotate(360deg); }
}

.ring-inner {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #f5f6fa;
}

.loading-text {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #999;
  letter-spacing: 2rpx;
}

/* ========== 错误状态 ========== */
.error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 300rpx 0;
}

.error-icon { font-size: 64rpx; margin-bottom: 16rpx; }
.error-text { font-size: 26rpx; color: #999; margin-bottom: 32rpx; }

.retry-btn {
  padding: 14rpx 48rpx;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  font-size: 26rpx;
  border-radius: 32rpx;
  font-weight: 500;
  box-shadow: 0 4rpx 16rpx rgba(99, 102, 241, 0.25);
}

/* ========== 用户头部 ========== */
.user-header {
  display: flex;
  align-items: center;
  padding: 36rpx 32rpx 28rpx;
  background: linear-gradient(180deg, #fff 0%, #f8f9ff 100%);
}

.avatar-ring {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  padding: 3rpx;
  flex-shrink: 0;
  box-shadow: 0 4rpx 20rpx rgba(99, 102, 241, 0.2);
}

.user-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: #e8eaf0;
}

.avatar-img { width: 100%; height: 100%; }

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  font-size: 36rpx;
  color: #fff;
  font-weight: 700;
}

.user-name-area { margin-left: 20rpx; display: flex; flex-direction: column; }
.name-row { display: flex; align-items: center; }

.user-name {
  font-size: 36rpx;
  color: #1a1a2e;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.level-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 6rpx;
  padding: 2rpx 14rpx;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 16rpx;
  align-self: flex-start;
}

.level-icon { font-size: 20rpx; }
.level-text { font-size: 20rpx; color: #6366f1; font-weight: 500; }

.rank-medal-icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  margin-left: 8rpx;
  background: transparent;
}

.scheme-count-tag {
  margin-left: auto;
  padding: 6rpx 20rpx;
  background: #f0f0f5;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #999;
}

/* ========== 统计区域 ========== */
.stats-section { margin: 0 24rpx; }

.stats-main-card {
  display: flex;
  align-items: stretch;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 0;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.main-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.ms-value {
  font-size: 44rpx;
  font-weight: 800;
  color: #1a1a2e;
  display: flex;
  align-items: baseline;
}

.ms-value.gold { color: #d43030; font-size: 40rpx; }

.ms-unit {
  font-size: 24rpx;
  font-weight: 500;
  color: #666;
  margin-left: 2rpx;
}

.ms-label { font-size: 22rpx; color: #999; letter-spacing: 2rpx; }

.ms-bar-bg {
  width: 80%;
  height: 6rpx;
  background: #f0f0f5;
  border-radius: 3rpx;
  margin-top: 4rpx;
  overflow: hidden;
}

.ms-bar-fill {
  height: 100%;
  border-radius: 3rpx;
  background: linear-gradient(90deg, #6366f1, #a78bfa);
  transition: width 0.6s ease;
}

.main-stat-divider {
  width: 1rpx;
  background: #eee;
  margin: 12rpx 0;
}

.stats-sub-grid {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.sub-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  border-radius: 16rpx;
  background: #fff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
  border-bottom: 4rpx solid transparent;
}

.sub-stat.won { border-bottom-color: #d43030; }
.sub-stat.lost { border-bottom-color: #dcdfe6; }
.sub-stat.pending { border-bottom-color: #52c41a; }

.ss-num { font-size: 40rpx; font-weight: 700; color: #1a1a2e; }
.sub-stat.won .ss-num { color: #d43030; }
.sub-stat.lost .ss-num { color: #999; }
.sub-stat.pending .ss-num { color: #52c41a; }

.ss-label { font-size: 24rpx; color: #aaa; margin-top: 6rpx; letter-spacing: 2rpx; }

/* ========== 筛选栏 ========== */
.filter-bar {
  display: flex;
  gap: 12rpx;
  margin: 24rpx 24rpx 0;
  overflow-x: auto;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: #888;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  white-space: nowrap;
  transition: all 0.2s ease;
}

.filter-item.active {
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  font-weight: 500;
  box-shadow: 0 4rpx 16rpx rgba(99, 102, 241, 0.25);
}

.filter-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
}

.filter-dot.won { background: #d43030; }
.filter-dot.lost { background: #bbb; }
.filter-dot.pending { background: #52c41a; }

/* ========== 方案列表 ========== */
.schemes-scroll {
  margin-top: 20rpx;
  padding: 0 24rpx;
  height: calc(100vh - 480rpx);
}

.scheme-item {
  display: flex;
  margin-bottom: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  transition: transform 0.15s ease;
}

.scheme-item:active { transform: scale(0.98); }

.scheme-left-accent { width: 6rpx; flex-shrink: 0; }
.status-won .scheme-left-accent { background: linear-gradient(180deg, #d43030, #e8453c); }
.status-lost .scheme-left-accent { background: #dcdfe6; }
.status-pending .scheme-left-accent { background: linear-gradient(180deg, #52c41a, #73d13d); }

.scheme-body {
  flex: 1;
  padding: 22rpx 40rpx 22rpx 22rpx;
}

.scheme-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.scheme-top-spacer { flex: 1; }

.scheme-time {
  width: 140rpx;
  text-align: center;
  font-size: 22rpx;
  color: #666;
  flex-shrink: 0;
}

.amount-won-inline {
  font-size: 26rpx;
  font-weight: 700;
  color: #d43030;
}

.scheme-play-tag {
  padding: 6rpx 16rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 6rpx;
  letter-spacing: 1rpx;
}

.scheme-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  font-size: 22rpx;
  border-radius: 6rpx;
  font-weight: 500;
  line-height: 1.4;
}

.scheme-status-badge.won { color: #d43030; background: rgba(212, 48, 48, 0.08); }
.scheme-status-badge.lost { color: #999; background: #f5f5f5; }
.scheme-status-badge.pending { color: #52c41a; background: rgba(82, 196, 26, 0.08); }

.scheme-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.scheme-metas { display: flex; gap: 16rpx; }

.meta-chip {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.meta-icon { font-size: 22rpx; }
.meta-text { font-size: 24rpx; color: #888; }
.meta-text.bet-amount { font-size: 26rpx; font-weight: 700; color: #333; }

.scheme-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140rpx;
  padding: 10rpx 0;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(99, 102, 241, 0.25);
}

.action-arrow { font-size: 22rpx; color: rgba(255, 255, 255, 0.7); }

/* ========== 空状态 ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 32rpx;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 80rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.empty-icon { font-size: 72rpx; margin-bottom: 20rpx; filter: grayscale(1); }
.empty-text { font-size: 26rpx; color: #bbb; letter-spacing: 1rpx; }

.bottom-placeholder { height: 40rpx; }
</style>
