<template>
  <view class="topic-page">
    <!-- 加载状态 -->
    <view class="loading-wrapper" v-if="loading">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="topic">
      <!-- 世界杯专题头部 -->
      <view class="wc-header" v-if="isWorldCup">
        <view class="wc-title">{{ topic.title }}</view>
        <view class="wc-badge">FIFA World Cup 2026</view>
        <view class="wc-daterange" v-if="topic.dateRange">{{ topic.dateRange }}</view>
        <view class="wc-countdown" v-if="countdownText">
          <view class="cd-item"><text class="cd-num">{{ countdown.days }}</text><text class="cd-label">天</text></view>
          <view class="cd-item"><text class="cd-num">{{ countdown.hours }}</text><text class="cd-label">时</text></view>
          <view class="cd-item"><text class="cd-num">{{ countdown.minutes }}</text><text class="cd-label">分</text></view>
          <view class="cd-item"><text class="cd-num">{{ countdown.seconds }}</text><text class="cd-label">秒</text></view>
        </view>
      </view>

      <!-- 普通专题标题 -->
      <view class="normal-header" v-else>
        <view class="normal-title">{{ topic.title }}</view>
        <view class="normal-desc" v-if="topic.description">{{ topic.description }}</view>
      </view>

      <!-- 赛程标题栏 -->
      <view class="schedule-bar" :class="{ sticky: isWorldCup }">
        <view class="schedule-title">赛程</view>
        <view class="schedule-actions">
          <view class="action-link" @click="onViewGroups">查看小组积分榜</view>
          <view class="action-link" @click="onViewTeams">球队信息</view>
        </view>
      </view>

      <!-- 时间轴比赛列表 -->
      <scroll-view class="timeline" scroll-y v-if="timelineData.length > 0">
        <view class="timeline-group" v-for="(group, gIdx) in timelineData" :key="gIdx">
          <!-- 日期标签 -->
          <view class="date-label">{{ group.dateLabel }}</view>

          <!-- 比赛卡片 -->
          <view class="match-card" v-for="match in group.matches" :key="match.matchId" @click="onMatchTap(match)">
            <view class="card-left">
              <view class="match-day">{{ match.day }}</view>
              <view class="match-time">{{ match.time }}</view>
              <view class="match-group" v-if="match.groupName">{{ match.groupName }}</view>
            </view>
            <view class="card-center">
              <view class="team-row">
                <text class="home-team">{{ match.homeTeamName }}</text>
                <text class="vs-text">VS</text>
                <text class="away-team">{{ match.awayTeamName }}</text>
              </view>
              <view class="match-status" v-if="match.statusDesc">{{ match.statusDesc }}</view>
            </view>
            <view class="card-right">›</view>
          </view>
        </view>
      </scroll-view>

      <!-- 空状态 -->
      <view class="empty-wrapper" v-else>
        <view class="empty-icon">📭</view>
        <text class="empty-text">暂无比赛</text>
      </view>
    </template>

    <!-- 错误状态 -->
    <view class="error-wrapper" v-else-if="error">
      <text class="error-text">{{ error }}</text>
    </view>

    <!-- 分组弹窗 -->
    <view class="groups-overlay" v-if="showGroups" @click="showGroups = false">
      <view class="groups-popup" @click.stop>
        <view class="groups-header">
          <view class="groups-title">小组积分榜</view>
          <view class="groups-close" @click="showGroups = false">✕</view>
        </view>

        <!-- 分组Tab -->
        <scroll-view class="groups-tabs" scroll-x>
          <view
            class="group-tab"
            :class="{ active: activeGroupIdx === idx }"
            v-for="(g, idx) in groupData"
            :key="idx"
            @click="activeGroupIdx = idx"
          >{{ g.groupName }}</view>
        </scroll-view>

        <!-- 积分表 -->
        <swiper class="groups-swiper" :current="activeGroupIdx" @change="onGroupSwiperChange" v-if="groupData.length">
          <swiper-item v-for="(g, idx) in groupData" :key="idx">
            <scroll-view class="table-scroll" scroll-y>
              <view class="standings-table">
                <view class="table-header">
                  <text class="th rank">#</text>
                  <text class="th team">球队</text>
                  <text class="th">赛</text>
                  <text class="th">胜</text>
                  <text class="th">平</text>
                  <text class="th">负</text>
                  <text class="th">进</text>
                  <text class="th">失</text>
                  <text class="th">净</text>
                  <text class="th pts">积分</text>
                </view>
                <view class="table-row" v-for="team in g.teams" :key="team.teamId || team.name">
                  <text class="td rank">{{ team.rank }}</text>
                  <text class="td team">{{ team.name || team.teamName }}</text>
                  <text class="td">{{ team.played }}</text>
                  <text class="td">{{ team.won }}</text>
                  <text class="td">{{ team.drawn }}</text>
                  <text class="td">{{ team.lost }}</text>
                  <text class="td">{{ team.goalsFor }}</text>
                  <text class="td">{{ team.goalsAgainst }}</text>
                  <text class="td gd">{{ formatGD(team.goalDifference) }}</text>
                  <text class="td pts">{{ team.points }}</text>
                </view>
              </view>
            </scroll-view>
          </swiper-item>
        </swiper>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import * as worldcupApi from '@/api/worldcup'
import * as topicApi from '@/api/topic'

const loading = ref(true)
const error = ref(null)
const topic = ref(null)
const isWorldCup = ref(false)
const timelineData = ref([])
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
const countdownText = ref('')
const showGroups = ref(false)
const activeGroupIdx = ref(0)
const groupData = ref([])
const groupsLoading = ref(false)
let cdTimer = null

onShow(() => {
  uni.setStorageSync('tab_selected', '/pages/topic/topic')
})

onLoad((options) => {
  const id = options.topicId
  const title = options.topicName || ''
  const imageUrl = options.imageUrl || ''

  if (!id) {
    loading.value = false
    error.value = '参数错误'
    return
  }

  topic.value = { id, title: decodeURIComponent(title || '专题详情'), imageUrl: decodeURIComponent(imageUrl || '') }
  isWorldCup.value = id === 'worldcup' || title === '世界杯'

  if (isWorldCup.value) {
    startCountdown()
    loadWorldCupData()
  } else {
    loadNormalTopic(id)
  }
})

function startCountdown() {
  const target = new Date('2026-06-12T03:00:00').getTime()
  const update = () => {
    const now = Date.now()
    const diff = target - now
    if (diff <= 0) {
      countdownText.value = ''
      clearInterval(cdTimer)
      return
    }
    countdown.value = {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000)
    }
    countdownText.value = '距离开幕'
  }
  update()
  cdTimer = setInterval(update, 1000)
}

async function loadWorldCupData() {
  try {
    const res = await worldcupApi.getWorldCupMatches()
    const matches = res || []
    timelineData.value = formatTimelineData(matches)
    loading.value = false
  } catch (e) {
    console.error('加载世界杯数据失败:', e)
    loading.value = false
    error.value = '加载失败'
  }
}

async function loadNormalTopic(id) {
  try {
    const res = await topicApi.getTopicDetail(id)
    const data = res
    if (data) {
      topic.value = { ...topic.value, ...data }
    }
    loading.value = false
  } catch (e) {
    console.error('加载专题详情失败:', e)
    loading.value = false
    error.value = '加载失败'
  }
}

function formatTimelineData(matches) {
  const grouped = {}
  matches.forEach(m => {
    const dateKey = m.matchDate || m.date || '未知日期'
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push({
      ...m,
      day: getDayOfWeek(m.matchDate || m.date),
      time: formatMatchTime(m.matchTime || m.time)
    })
  })

  return Object.entries(grouped).map(([date, list]) => ({
    dateLabel: date,
    matches: list
  }))
}

function getDayOfWeek(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[d.getDay()] || ''
}

function formatMatchTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.substring(0, 5) || timeStr
}

function onMatchTap(match) {
  uni.navigateTo({ url: `/pages/analysis/index?matchId=${match.matchId}` })
}

async function onViewGroups() {
  showGroups.value = true
  activeGroupIdx.value = 0
  groupsLoading.value = true
  try {
    const res = await worldcupApi.getWorldCupGroups()
    const list = res || []
    groupData.value = list.sort((a, b) => (a.groupName || '').localeCompare(b.groupName || ''))
  } catch (e) {
    console.error('加载分组失败:', e)
  } finally {
    groupsLoading.value = false
  }
}

function onViewTeams() {
  uni.navigateTo({ url: '/pages/team-info/index' })
}

function onGroupSwiperChange(e) {
  activeGroupIdx.value = e.detail.current
}

function formatGD(val) {
  if (val == null) return '0'
  if (val > 0) return `+${val}`
  return String(val)
}

onUnmounted(() => {
  if (cdTimer) clearInterval(cdTimer)
})
</script>

<style scoped>
.topic-page {
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

/* 世界杯头部 */
.wc-header {
  background: linear-gradient(180deg, #1a0533 0%, #2d1b69 50%, #4a2d8f 100%);
  padding: 60rpx 32rpx 40rpx;
  text-align: center;
}

.wc-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.wc-badge {
  display: inline-block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  padding: 6rpx 20rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  margin-bottom: 16rpx;
}

.wc-daterange {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 24rpx;
}

.wc-countdown {
  display: flex;
  justify-content: center;
  gap: 20rpx;
}

.cd-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80rpx;
}

.cd-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #faad14;
  line-height: 1.2;
}

.cd-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* 普通专题标题 */
.normal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 50rpx 32rpx;
  text-align: center;
}

.normal-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #fff;
}

.normal-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 12rpx;
}

/* 赛程标题栏 */
.schedule-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.schedule-bar.sticky {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.schedule-bar.sticky .schedule-title,
.schedule-bar.sticky .action-link {
  color: #fff;
}

.schedule-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
}

.schedule-actions {
  display: flex;
  gap: 24rpx;
}

.action-link {
  font-size: 24rpx;
  color: #667eea;
}

/* 时间轴 */
.timeline {
  padding: 20rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
  height: calc(100vh - 180rpx);
}

.timeline-group {
  margin-bottom: 24rpx;
}

.date-label {
  display: inline-block;
  font-size: 24rpx;
  color: #fff;
  background: #667eea;
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
  margin-bottom: 16rpx;
  font-weight: 600;
}

.match-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 16rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.card-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 90rpx;
  padding-right: 16rpx;
  border-right: 1rpx solid #f0f0f0;
  gap: 4rpx;
}

.match-day {
  font-size: 22rpx;
  color: #4a90d9;
  font-weight: 600;
}

.match-time {
  font-size: 24rpx;
  color: #333;
  font-weight: 600;
}

.match-group {
  font-size: 18rpx;
  color: #fff;
  background: linear-gradient(135deg, #ff8c42 0%, #ff6b6b 100%);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  margin-top: 4rpx;
}

.card-center {
  flex: 1;
  padding: 0 16rpx;
}

.team-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.home-team, .away-team {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  max-width: 160rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-team { text-align: right; }
.away-team { text-align: left; }

.vs-text {
  font-size: 22rpx;
  color: #ccc;
  flex-shrink: 0;
}

.match-status {
  text-align: center;
  font-size: 20rpx;
  color: #999;
  margin-top: 6rpx;
}

.card-right {
  font-size: 32rpx;
  color: #ccc;
}

/* 空状态 */
.empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 0;
}

.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-top: 20rpx; }

/* 分组弹窗 */
.groups-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.groups-popup {
  background: #fff;
  border-radius: 20rpx;
  width: 680rpx;
  height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.groups-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.groups-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
}

.groups-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #999;
}

.groups-tabs {
  white-space: nowrap;
  padding: 16rpx 20rpx;
  flex-shrink: 0;
}

.group-tab {
  display: inline-block;
  padding: 10rpx 24rpx;
  font-size: 24rpx;
  color: #666;
  margin-right: 12rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
}

.group-tab.active {
  background: #667eea;
  color: #fff;
}

.groups-swiper {
  flex: 1;
}

.table-scroll {
  height: 100%;
}

.standings-table {
  padding: 0 16rpx 20rpx;
}

.table-header {
  display: flex;
  align-items: center;
  background: #667eea;
  padding: 14rpx 8rpx;
  border-radius: 8rpx 8rpx 0 0;
  font-size: 20rpx;
}

.th {
  color: #fff;
  text-align: center;
  font-weight: 600;
}

.th.rank { width: 40rpx; }
.th.team { flex: 1; text-align: left; padding-left: 8rpx; }
.th.pts { width: 56rpx; }

.th:not(.rank):not(.team):not(.pts) {
  width: 44rpx;
}

.table-row {
  display: flex;
  align-items: center;
  padding: 12rpx 8rpx;
  font-size: 22rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.table-row:nth-child(even) {
  background: #f8f9fc;
}

.td {
  text-align: center;
  color: #333;
}

.td.rank { width: 40rpx; }
.td.team { flex: 1; text-align: left; padding-left: 8rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td.pts { width: 56rpx; font-weight: 700; color: #667eea; }
.td.gd { width: 44rpx; font-weight: 600; }
.td.gd:not(:empty) { color: #52c41a; }

.td:not(.rank):not(.team):not(.pts):not(.gd) {
  width: 44rpx;
}
</style>
