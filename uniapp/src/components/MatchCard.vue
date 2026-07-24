<template>
  <view class="match-card" :class="{ 'vip-card': isVip }">
    <!-- VIP专属光效 -->
    <view v-if="isVip" class="vip-glow"></view>

    <!-- 顶部信息 -->
    <view class="card-header">
      <view class="header-left">
        <text class="match-num">{{ match.matchNumStr }}</text>
        <text class="league-tag" :style="{ backgroundColor: '#' + leagueColorNormalized }">{{ match.league }}</text>
      </view>
      <view class="header-right">
        <!-- VIP标识 -->
        <view v-if="isVip" class="vip-tag">
          <view class="vip-tag-diamond"></view>
          <text>VIP</text>
        </view>
        <text class="match-time">{{ formattedTime }}</text>
      </view>
    </view>

    <!-- 球队信息 -->
    <view class="teams-row">
      <view class="team-info home">
        <text class="team-name">{{ match.homeTeam }}</text>
        <text v-if="match.homeTeamRank" class="team-rank">[{{ match.homeTeamRank }}]</text>
      </view>
      <!-- 已完成比赛显示比分 -->
      <view v-if="match.homeScore != null && match.awayScore != null" class="score-box">
        <text class="home-score">{{ match.homeScore }}</text>
        <text class="score-divider">:</text>
        <text class="away-score">{{ match.awayScore }}</text>
      </view>
      <text v-else class="vs">VS</text>
      <view class="team-info away">
        <text class="team-name">{{ match.awayTeam }}</text>
        <text v-if="match.awayTeamRank" class="team-rank">[{{ match.awayTeamRank }}]</text>
      </view>
    </view>

    <!-- Tips提示 -->
    <view v-if="showAiAnalysis && ((match.homeTags && match.homeTags.length) || (match.awayTags && match.awayTags.length) || match.homeFormTrend || match.awayFormTrend)" class="team-tip-bar" @tap.stop="onToggleTip">
      <view class="tip-label">
        <text class="tip-icon">💡</text>
        <text class="tip-text">Tips 球队标签</text>
      </view>
      <text class="tip-arrow" :class="{ expanded: showTip }">›</text>
    </view>

    <!-- 展开的详情 -->
    <view class="team-detail-panel" :class="{ show: showTip }">
      <!-- 主队信息 -->
      <view class="team-detail-item">
        <view class="detail-header">
          <text class="detail-team-name">{{ match.homeTeam }}</text>
          <view v-if="match.homeFormTrend" class="trend-badge" :class="trendClass(match.homeFormTrend)">
            <text class="trend-icon">{{ trendIcon(match.homeFormTrend) }}</text>
            <text class="trend-text">{{ match.homeFormTrend }}</text>
          </view>
        </view>
        <view v-if="match.homeTags && match.homeTags.length" class="detail-tags">
          <text v-for="(tag, i) in match.homeTags" :key="i" class="tag-item">{{ tag }}</text>
        </view>
        <!-- 球队建议 -->
        <view v-if="isVip" class="advice-section">
          <view class="advice-header">
            <text class="advice-label">球队建议</text>
          </view>
          <view class="advice-content">
            <text class="advice-text">{{ match.homeAdvice || '暂无建议' }}</text>
          </view>
        </view>
        <view v-else-if="match.homeAdvice" class="advice-section locked">
          <view class="advice-header">
            <text class="advice-label">球队建议</text>
            <view class="vip-required">
              <view class="vip-lock-icon">🔒</view>
              <text class="vip-hint">VIP可见</text>
            </view>
          </view>
          <view class="advice-content blurred">
            <text class="advice-text">{{ match.homeAdvice || '暂无建议' }}</text>
          </view>
        </view>
      </view>
      <!-- 客队信息 -->
      <view class="team-detail-item">
        <view class="detail-header">
          <text class="detail-team-name">{{ match.awayTeam }}</text>
          <view v-if="match.awayFormTrend" class="trend-badge" :class="trendClass(match.awayFormTrend)">
            <text class="trend-icon">{{ trendIcon(match.awayFormTrend) }}</text>
            <text class="trend-text">{{ match.awayFormTrend }}</text>
          </view>
        </view>
        <view v-if="match.awayTags && match.awayTags.length" class="detail-tags">
          <text v-for="(tag, i) in match.awayTags" :key="i" class="tag-item">{{ tag }}</text>
        </view>
        <view v-if="isVip" class="advice-section">
          <view class="advice-header">
            <text class="advice-label">球队建议</text>
          </view>
          <view class="advice-content">
            <text class="advice-text">{{ match.awayAdvice || '暂无建议' }}</text>
          </view>
        </view>
        <view v-else-if="match.awayAdvice" class="advice-section locked">
          <view class="advice-header">
            <text class="advice-label">球队建议</text>
            <view class="vip-required">
              <view class="vip-lock-icon">🔒</view>
              <text class="vip-hint">VIP可见</text>
            </view>
          </view>
          <view class="advice-content blurred">
            <text class="advice-text">{{ match.awayAdvice || '暂无建议' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- AI分析 + 欧赔 (4列) - 已完成比赛不显示 -->
    <view v-if="!isFinished" class="odds-row">
      <view
        v-if="showAiAnalysis"
        class="odds-cell action-cell"
        :class="isVip ? 'vip-unlocked' : (isUnlocked ? 'unlocked' : 'locked')"
        @tap.stop="onAnalyze"
      >
        <view class="action-content">
          <text class="action-tag" :class="{ 'vip-tag-text': isVip }">AI</text>
          <text class="action-text">分析</text>
          <view v-if="isVip" class="vip-free-icon">
            <view class="mini-diamond"></view>
          </view>
          <text v-else-if="!isUnlocked" class="lock-icon">🔒</text>
        </view>
      </view>
      <view v-else class="odds-cell action-cell-placeholder"></view>
      <view class="odds-cell">
        <text class="odds-label">主胜</text>
        <text class="odds-num">{{ match.odds.home || '-' }}</text>
      </view>
      <view class="odds-cell">
        <text class="odds-label">平局</text>
        <text class="odds-num">{{ match.odds.draw || '-' }}</text>
      </view>
      <view class="odds-cell">
        <text class="odds-label">客胜</text>
        <text class="odds-num">{{ match.odds.away || '-' }}</text>
      </view>
      <!-- 单场红框覆盖层 -->
      <view v-if="match.isSingleMatch" class="odds-single-overlay">
        <text class="single-odds-corner">单</text>
      </view>
    </view>

    <!-- 查看详情 + 让球赔率 (4列) -->
    <view v-if="match.odds.goalLine && !isFinished" class="odds-row handicap-row">
      <view class="odds-cell detail-cell" @tap.stop="onTap">
        <text class="detail-text">分析</text>
      </view>
      <view class="odds-cell goalline">
        <text class="goalline-label">让{{ match.odds.goalLine }}</text>
        <text class="odds-num">{{ match.odds.hhome || '-' }}</text>
      </view>
      <view class="odds-cell">
        <text class="odds-label">让平</text>
        <text class="odds-num">{{ match.odds.hdraw || '-' }}</text>
      </view>
      <view class="odds-cell">
        <text class="odds-label">让客</text>
        <text class="odds-num">{{ match.odds.haway || '-' }}</text>
      </view>
    </view>

    <!-- 无让球或已完成的详情入口 -->
    <view v-if="isFinished || !match.odds.goalLine" class="odds-row">
      <view class="odds-cell detail-cell full" @tap.stop="onTap">
        <text class="detail-text">分析</text>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import { useUserStore } from '@/store/user'
import { formatOdds, formatGoalLine, getMatchStatus } from '@/utils/match'
import { formatShortDateTime } from '@/utils/date'
import * as userApi from '@/api/user'

export default {
  name: 'MatchCard',
  props: {
    match: { type: Object, default: () => ({}) },
    showOdds: { type: Boolean, default: true },
    clickable: { type: Boolean, default: true },
    showAiAnalysis: { type: Boolean, default: true },
    forceVipStyle: { type: Boolean, default: false }
  },
  emits: ['tap', 'analyze'],
  setup(props, { emit }) {
    const userStore = useUserStore()
    const showTip = ref(false)

    const formattedTime = computed(() => {
      if (!props.match?.fullMatchTime) return ''
      const isFinished = props.match.isFinished || (props.match.homeScore !== undefined && props.match.awayScore !== undefined)
      return isFinished ? '已结束' : formatShortDateTime(props.match.fullMatchTime)
    })

    const statusInfo = computed(() => {
      return props.match?.status ? getMatchStatus(props.match.status) : null
    })

    const isVip = computed(() => {
      if (props.forceVipStyle) return true
      const userInfo = userStore.getUserInfo
      return userInfo?.isVip === true
    })

    const isUnlocked = computed(() => {
      return isVip.value || props.match?.isUnlocked || false
    })

    const isFinished = computed(() => {
      return props.match?.isFinished || (props.match?.homeScore !== undefined && props.match?.awayScore !== undefined)
    })

    const leagueColorNormalized = computed(() => {
      const raw = props.match?.leagueColor || '667eea'
      return String(raw).startsWith('#') ? raw.substring(1) : raw
    })

    function trendClass(trend) {
      if (trend === '上升') return 'up'
      if (trend === '下降') return 'down'
      return 'stable'
    }

    function trendIcon(trend) {
      if (trend === '上升') return '↑'
      if (trend === '下降') return '↓'
      return '→'
    }

    function onToggleTip() {
      showTip.value = !showTip.value
    }

    function onTap() {
      if (!props.clickable) return
      if (!userStore.checkLoginWithRedirect()) return
      if (!props.match?.id) return
      uni.navigateTo({ url: `/pages/analysis/index?matchId=${props.match.id}` })
    }

    async function onAnalyze() {
      const match = props.match
      if (!match?.id) return
      if (!userStore.checkLoginWithRedirect()) return

      if (isVip.value || isUnlocked.value) {
        navigateToAnalysis(match)
        return
      }

      const pointsNeeded = 1
      const userPoints = userStore.getUserInfo?.point || 0

      if (userPoints < pointsNeeded) {
        uni.showModal({
          title: '积分不足',
          content: `AI分析需要消耗 ${pointsNeeded} 积分，当前积分 ${userPoints}。开通会员可免费查看所有分析！`,
          confirmText: '开通会员',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/vip/index' })
          }
        })
        return
      }

      const confirmRes = await new Promise(r => {
        uni.showModal({
          title: '解锁AI分析',
          content: `本次分析将消耗 ${pointsNeeded} 积分，是否继续？`,
          confirmText: '确认',
          cancelText: '取消',
          success: r
        })
      })

      if (confirmRes.confirm) {
        try {
          uni.showLoading({ title: `消耗${pointsNeeded}积分中...`, mask: true })
          await userApi.deductPoint(userStore.getUserInfo.id, pointsNeeded, match.id)
          const latest = await userApi.getUserInfoById(userStore.getUserInfo.id)
          if (latest) userStore.updateLocalUserInfo(latest)
          uni.hideLoading()
          uni.showToast({ title: `消耗${pointsNeeded}积分`, icon: 'success', duration: 1500 })
          setTimeout(() => navigateToAnalysis(match), 1500)
        } catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '解锁失败', icon: 'error' })
        }
      }
    }

    function navigateToAnalysis(match) {
      const matchInfo = encodeURIComponent(JSON.stringify({
        league: match.league, homeTeam: match.homeTeam, awayTeam: match.awayTeam
      }))
      uni.navigateTo({ url: `/pages/ai-analysis/index?matchId=${match.id}&matchInfo=${matchInfo}` })
    }

    return {
      showTip, formattedTime, statusInfo, isVip, isUnlocked, isFinished,
      leagueColorNormalized,
      trendClass, trendIcon, onToggleTip, onTap, onAnalyze,
      formatOdds: (v) => formatOdds(v),
      formatGoalLine: (v) => formatGoalLine(v)
    }
  }
}
</script>

<style scoped>
.match-card {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

/* VIP专属样式 */
.match-card.vip-card {
  border: 2rpx solid transparent;
  background: linear-gradient(#fff, #fff) padding-box,
              linear-gradient(135deg, #ffd700, #ff8c00) border-box;
  box-shadow: 0 4rpx 16rpx rgba(255, 140, 0, 0.15);
}

.vip-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60rpx;
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.08) 0%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}

/* VIP标识 */
.vip-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  margin-right: 8rpx;
}

.vip-tag text {
  font-size: 18rpx;
  color: #fff;
  font-weight: bold;
}

.vip-tag-diamond {
  width: 14rpx;
  height: 14rpx;
  position: relative;
}

.vip-tag-diamond::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 7rpx solid transparent;
  border-right: 7rpx solid transparent;
  border-bottom: 5rpx solid #fff;
}

.vip-tag-diamond::after {
  content: '';
  position: absolute;
  top: 5rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 7rpx solid transparent;
  border-right: 7rpx solid transparent;
  border-top: 9rpx solid #fff;
}

/* 头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #f8f9fc;
  border-bottom: 1rpx solid #eee;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.match-num {
  font-size: 26rpx;
  color: #667eea;
  font-weight: 600;
}

.league-tag {
  font-size: 22rpx;
  color: #fff;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 500;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
}

.match-time {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

/* 球队行 */
.teams-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
}

.team-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.team-info.home {
  justify-content: flex-start;
}

.team-info.away {
  justify-content: flex-end;
}

.team-name {
  font-size: 32rpx;
  color: #222;
  font-weight: 600;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-rank {
  font-size: 22rpx;
  color: #999;
}

.vs {
  font-size: 24rpx;
  color: #ccc;
  font-weight: 500;
  padding: 0 20rpx;
}

/* 比分框 */
.score-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 0 24rpx;
}

.home-score,
.away-score {
  font-size: 42rpx;
  font-weight: 700;
  color: #333;
  font-family: -apple-system, 'Helvetica Neue', sans-serif;
}

.score-divider {
  font-size: 36rpx;
  color: #ccc;
  font-weight: 700;
}

/* Tips提示条 */
.team-tip-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 20rpx;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border-top: 1rpx solid #e8ecf4;
}

.tip-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.tip-icon {
  font-size: 24rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #667eea;
  font-weight: 500;
}

.tip-arrow {
  font-size: 28rpx;
  color: #667eea;
  transition: transform 0.3s ease;
  transform: rotate(90deg);
}

.tip-arrow.expanded {
  transform: rotate(-90deg);
}

/* 展开的详情面板 */
.team-detail-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
  background: #fafbff;
}

.team-detail-panel.show {
  max-height: 800rpx;
}

.team-detail-item {
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #eef1f8;
}

.team-detail-item:last-child {
  border-bottom: none;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.detail-team-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 600;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.tag-item {
  font-size: 22rpx;
  color: #666;
  background: #fff;
  padding: 6rpx 14rpx;
  border-radius: 20rpx;
  border: 1rpx solid #e5e5e5;
  white-space: nowrap;
}

.trend-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.trend-badge.up {
  background: rgba(82, 196, 26, 0.12);
  color: #52c41a;
}

.trend-badge.down {
  background: rgba(255, 77, 79, 0.12);
  color: #ff4d4f;
}

.trend-badge.stable {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.trend-icon {
  font-size: 20rpx;
  font-weight: bold;
}

.trend-text {
  font-size: 22rpx;
  font-weight: 500;
}

/* 球队建议样式 */
.advice-section {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #e8ecf4;
}

.advice-section.locked {
  opacity: 0.8;
}

.advice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.advice-label {
  font-size: 22rpx;
  color: #667eea;
  font-weight: 600;
}

.vip-required {
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  padding: 3rpx 10rpx;
  border-radius: 10rpx;
}

.vip-lock-icon {
  font-size: 18rpx;
}

.vip-hint {
  font-size: 18rpx;
  color: #fff;
  font-weight: 500;
}

.advice-content {
  background: #fff;
  padding: 12rpx 16rpx;
  border-radius: 8rpx;
  border: 1rpx solid #e5e5e5;
}

.advice-content.blurred {
  position: relative;
  filter: blur(4rpx);
  opacity: 0.6;
  user-select: none;
  pointer-events: none;
}

.advice-text {
  font-size: 24rpx;
  color: #333;
  line-height: 1.6;
}

/* AI分析隐藏时的占位 */
.odds-cell.action-cell-placeholder {
  background: #f5f5f5;
}

/* 单场红框覆盖层 */
.odds-single-overlay {
  position: absolute;
  top: 0;
  left: 25%;
  width: 75%;
  height: 100%;
  border: 2rpx solid #c41d1d;
  border-radius: 8rpx;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 1;
}

/* 单场角标 - 左上角 */
.single-odds-corner {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 18rpx;
  color: #fff;
  background: #c41d1d;
  padding: 2rpx 10rpx;
  border-radius: 6rpx 0 6rpx 0;
  font-weight: 600;
  line-height: 1;
  z-index: 2;
}

/* 赔率行 - 4列 */
.odds-row {
  display: flex;
  position: relative;
  border-top: 1rpx solid #f0f0f0;
}

.odds-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16rpx 8rpx;
  gap: 4rpx;
  box-sizing: border-box;
}

.odds-cell + .odds-cell {
  border-left: 1rpx solid #f0f0f0;
}

/* AI分析按钮 */
.odds-cell.action-cell {
  background: linear-gradient(135deg, #667eea, #764ba2);
  flex-direction: row;
  gap: 6rpx;
  position: relative;
}

.odds-cell.action-cell.locked {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}

.odds-cell.action-cell.unlocked {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

/* VIP专属按钮样式 */
.odds-cell.action-cell.vip-unlocked {
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  position: relative;
  overflow: hidden;
}

.odds-cell.action-cell.vip-unlocked::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: vipBtnShine 2s infinite;
}

@keyframes vipBtnShine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

.action-tag.vip-tag-text {
  background: rgba(255, 255, 255, 0.35);
}

/* VIP免费图标 */
.vip-free-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4rpx;
}

.mini-diamond {
  width: 18rpx;
  height: 18rpx;
  position: relative;
}

.mini-diamond::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 9rpx solid transparent;
  border-right: 9rpx solid transparent;
  border-bottom: 6rpx solid #fff;
}

.mini-diamond::after {
  content: '';
  position: absolute;
  top: 6rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 9rpx solid transparent;
  border-right: 9rpx solid transparent;
  border-top: 12rpx solid #fff;
}

.odds-cell.action-cell:active {
  opacity: 0.85;
}

.action-content {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.action-tag {
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
  background: rgba(255,255,255,0.25);
  padding: 4rpx 8rpx;
  border-radius: 4rpx;
}

.action-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.lock-icon {
  font-size: 22rpx;
  margin-left: 2rpx;
}

/* 赔率文字 */
.odds-label {
  font-size: 22rpx;
  color: #999;
}

.odds-num {
  font-size: 30rpx;
  color: #333;
  font-weight: 600;
  font-family: -apple-system, 'Helvetica Neue', sans-serif;
}

/* 让球行 */
.handicap-row {
  background: #fafafa;
}

/* 分析按钮 */
.odds-cell.detail-cell {
  background: linear-gradient(135deg, #52c41a, #389e0d);
  flex-direction: row;
  gap: 4rpx;
}

.odds-cell.detail-cell:active {
  opacity: 0.85;
}

.odds-cell.detail-cell.full {
  flex: 1;
}

.detail-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

/* 让球格 */
.odds-cell.goalline {
  background: rgba(102, 126, 234, 0.06);
}

.goalline-label {
  font-size: 22rpx;
  color: #667eea;
  font-weight: 500;
}
</style>
