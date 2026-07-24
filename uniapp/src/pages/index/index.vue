<template>
  <view class="page-container">
    <!-- 公告栏 -->
    <view v-if="announcements.length > 0" class="announcement-bar">
      <view class="announcement-icon">📢</view>
      <view class="announcement-scroll-wrapper">
        <view class="announcement-content" :class="{ marquee: announcements[0] && announcements[0].content && announcements[0].content.length > 20 }">
          <text class="announcement-text">{{ announcements[0].content }}</text>
          <text class="announcement-text">{{ announcements[0].content }}</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
    </view>

    <!-- 错误状态 -->
    <empty-state
      v-else-if="error"
      type="error"
      :title="'加载失败'"
      :description="error"
      button-text="重试"
      @buttonTap="loadMatches"
    />

    <!-- 空状态 -->
    <empty-state
      v-else-if="!loading && groupedMatches.length === 0"
      type="empty"
      title="暂无比赛"
      description="当前日期没有比赛数据"
    />

    <!-- 比赛列表 -->
    <view v-else class="match-list">
      <view v-for="(group, groupIndex) in groupedMatches" :key="group._key" class="weekday-group">
        <view class="weekday-header" :data-index="groupIndex" @tap="onToggleGroup">
          <view class="weekday-left">
            <view class="weekday-info">
              <text v-if="group.date" class="weekday-date">{{ group.date }}</text>
              <text class="weekday-name">{{ group.league }}</text>
            </view>
            <text class="match-count">{{ group.matches.length }}场</text>
          </view>
          <view class="weekday-right">
            <view v-if="showCalculator && groupIndex === 0" class="lobster-ai-btn" @tap.stop="onLobsterAI">
              <text class="lobster-ai-icon">👑</text>
              <text class="lobster-ai-text">AI问答</text>
              <view class="ai-vip-tag">VIP</view>
            </view>
            <text class="toggle-icon" :class="{ collapsed: collapsedGroups[groupIndex] }"></text>
          </view>
        </view>

        <view class="match-items" :class="{ hidden: collapsedGroups[groupIndex] }">
          <match-card
            v-for="match in group.matches"
            :key="match.id"
            :match="match"
            :show-ai-analysis="showCalculator"
            @tap="onMatchTap(match)"
            @analyze="onAnalyze(match)"
          />
        </view>
      </view>
    </view>

    <!-- 足球计算器入口 - 可拖动 -->
    <movable-area v-if="showCalculator" class="calculator-area">
      <movable-view
        class="calculator-btn"
        direction="all"
        :x="calculatorX"
        :y="calculatorY"
        @change="onCalculatorMove"
        @tap="onCalculator"
      >
        <text class="calculator-icon">🎮</text>
        <text class="calculator-text">足球计算器</text>
      </movable-view>
    </movable-area>

    <!-- 底部安全区域 -->
    <view class="safe-area-bottom"></view>
  </view>
</template>

<script>
import { ref, reactive } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useLeagueColorStore } from '@/store/leagueColor'
import * as matchApi from '@/api/match'
import * as userApi from '@/api/user'
import * as systemApi from '@/api/system'
import MatchCard from '@/components/MatchCard.vue'
import EmptyState from '@/components/EmptyState.vue'

export default {
  components: { MatchCard, EmptyState },
  setup() {
    const userStore = useUserStore()
    const leagueColor = useLeagueColorStore()

    const matches = ref([])
    const groupedMatches = ref([])
    const loading = ref(false)
    const error = ref(null)
    const collapsedGroups = reactive({})
    const showCalculator = ref(false)
    const announcements = ref([])
    const calculatorX = ref(500)
    const calculatorY = ref(120)

    onLoad(() => {
      checkFeatures()
      loadMatches()
      loadAnnouncements()
    })

    onShow(() => {
      // 同步 tabBar 选中状态
      // #ifdef MP-WEIXIN
      const pages = getCurrentPages()
      const curPage = pages[pages.length - 1]
      if (curPage && typeof curPage.getTabBar === 'function' && curPage.getTabBar()) {
        curPage.getTabBar().setData({ selectedPath: '/pages/index/index' })
      }
      // #endif

      checkVipStatus()
      const app = getApp()
      if (app?.globalData?.pendingAnalysisMatch && userStore.getIsLoggedIn) {
        const pendingMatch = app.globalData.pendingAnalysisMatch
        app.globalData.pendingAnalysisMatch = null
        loadMatches().then(() => setTimeout(() => triggerAnalysis(pendingMatch), 500))
      }
    })

    onPullDownRefresh(() => {
      checkFeatures()
      Promise.all([loadMatches(), loadAnnouncements()]).finally(() => uni.stopPullDownRefresh())
    })

    async function loadMatches() {
      loading.value = true
      error.value = null
      try {
        const res = await matchApi.getMatchList({})
        const rawMatches = Array.isArray(res) ? res : (res?.list || [])
        leagueColor.batchSetColors(rawMatches)

        const mapped = rawMatches.map(item => ({
          id: item.matchId,
          matchNumStr: item.matchNumStr,
          matchNum: item.matchNum,
          league: item.leagueAbbName,
          leagueId: item.leagueId,
          leagueColor: item.backColor || leagueColor.getColor(item.leagueId),
          homeTeam: item.homeTeamAbbName,
          homeTeamFull: item.homeTeamAllName,
          homeTeamId: item.homeTeamId,
          homeTeamRank: item.homeTeamRank,
          homeTags: item.homeTags ? String(item.homeTags).split(',') : [],
          homeFormTrend: item.homeFormTrend || '',
          homeAdvice: item.homeAdvice || '',
          awayTeam: item.awayTeamAbbName,
          awayTeamFull: item.awayTeamAllName,
          awayTeamId: item.awayTeamId,
          awayTeamRank: item.awayTeamRank,
          awayTags: item.awayTags ? String(item.awayTags).split(',') : [],
          awayFormTrend: item.awayFormTrend || '',
          awayAdvice: item.awayAdvice || '',
          status: item.matchStatus,
          statusName: item.matchStatusName,
          matchDate: item.matchDate,
          matchTime: item.matchTime,
          fullMatchTime: `${item.matchDate} ${item.matchTime}`,
          isSingleMatch: item.isSingleMatch,
          odds: { home: item.homeWin, draw: item.draw, away: item.awayWin, hhome: item.hhomeWin, haway: item.hawayWin, hdraw: item.hdraw, goalLine: item.goalLine }
        }))

        matches.value = mapped
        groupedMatches.value = groupMatchesByWeekday(mapped)
        loading.value = false
        if (userStore.getIsLoggedIn) batchCheckUnlockStatus(mapped)
      } catch (e) {
        console.error('加载比赛失败:', e)
        error.value = e.message || '加载失败'
        loading.value = false
      }
    }

    async function loadAnnouncements() {
      try {
        const res = await systemApi.getAnnouncements()
        if (typeof res === 'string') {
          const list = res.split('\n').filter(s => s.trim()).map((text, i) => ({ id: i, content: text }))
          if (list.length === 1) list.push({ id: 1, content: list[0].content })
          announcements.value = list
        } else if (Array.isArray(res)) {
          const list = res.map((text, i) => ({ id: i, content: String(text) }))
          if (list.length === 1) list.push({ id: 1, content: list[0].content })
          announcements.value = list
        } else {
          announcements.value = []
        }
      } catch (e) {
        announcements.value = []
      }
    }

    async function checkFeatures() {
      try {
        const result = await matchApi.checkFeatures()
        showCalculator.value = typeof result === 'object' ? !!result.showCalculator : result === true
      } catch (e) {
        showCalculator.value = false
      }
    }

    async function batchCheckUnlockStatus(matchList) {
      const userInfo = userStore.getUserInfo
      if (!userInfo?.id) return
      try {
        const matchIds = matchList.map(m => m.id).filter(id => id)
        if (!matchIds.length) return
        const result = await userApi.batchCheckMatchUnlock(matchIds, userInfo.id)
        const unlockMap = {}
        if (Array.isArray(result)) result.forEach(item => { unlockMap[item.matchId] = item.unlocked })
        else if (typeof result === 'object') Object.assign(unlockMap, result)
        matches.value = matches.value.map(m => ({ ...m, isUnlocked: unlockMap[m.id] || false }))
        groupedMatches.value = groupMatchesByWeekday(matches.value)
      } catch (e) { /* 静默 */ }
    }

    async function checkVipStatus() {
      const userInfo = userStore.getUserInfo
      if (!userStore.getIsLoggedIn || !userInfo?.id) return
      try {
        const isVip = await userApi.checkVip(userInfo.id)
        if (typeof isVip === 'boolean') userStore.updateLocalUserInfo({ isVip })
      } catch (e) { /* 静默 */ }
    }

    function triggerAnalysis(targetMatch) {
      if (!targetMatch?.id) return
      const match = matches.value.find(m => m.id === targetMatch.id)
      if (!match) return
      const userInfo = userStore.getUserInfo
      if (!userInfo) return
      if (!match.isUnlocked) {
        const points = userInfo.point || 0
        if (points < 1) {
          uni.showModal({ title: '积分不足', content: `AI分析需要消耗1积分，当前${points}分`, confirmText: '我的页面', success: r => { if (r.confirm) uni.switchTab({ url: '/pages/profile/profile' }) } })
          return
        }
      }
      navigateToAnalysis(match)
    }

    function navigateToAnalysis(match) {
      const info = encodeURIComponent(JSON.stringify({ league: match.league, homeTeam: match.homeTeam, awayTeam: match.awayTeam }))
      uni.navigateTo({ url: `/pages/ai-analysis/index?matchId=${match.id}&matchInfo=${info}` })
    }

    function groupMatchesByWeekday(list) {
      const groups = {}
      const groupMeta = {}
      const dateMap = {}
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const dayOfWeek = now.getDay()
      const thisMonday = new Date(today); thisMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      const nextMonday = new Date(thisMonday); nextMonday.setDate(thisMonday.getDate() + 7)

      list.forEach(match => {
        const weekday = match.matchNumStr ? match.matchNumStr.replace(/\d+/g, '') : '其他'
        let isCurrentWeek = false, isPast = false, dateStr = ''
        if (match.matchDate) {
          const parts = match.matchDate.split('-')
          if (parts.length >= 3) dateStr = `${parts[1]}-${parts[2]}`
          const md = new Date(match.matchDate.replace(/-/g, '/'))
          md.setHours(0, 0, 0, 0)
          isCurrentWeek = md >= thisMonday && md < nextMonday
          isPast = md < thisMonday
        } else { isCurrentWeek = true }

        let groupKey
        if (isCurrentWeek) groupKey = weekday
        else if (isPast) groupKey = `往期·${weekday}`
        else groupKey = `${weekday}·${dateStr}`

        if (!groups[groupKey]) groups[groupKey] = []
        groups[groupKey].push(match)
        groupMeta[groupKey] = { weekday, isCurrentWeek, isPast }
        if (!dateMap[groupKey] && dateStr) dateMap[groupKey] = dateStr
      })

      const currentKeys = Object.keys(groups).filter(k => groupMeta[k].isCurrentWeek)
      const pastKeys = Object.keys(groups).filter(k => groupMeta[k].isPast)
      const futureKeys = Object.keys(groups).filter(k => !groupMeta[k].isCurrentWeek && !groupMeta[k].isPast)

      // 排序后合并
      const sortedKeys = [...pastKeys, ...currentKeys, ...futureKeys]
      return sortedKeys.map(key => ({
        _key: key, league: groupMeta[key].weekday, date: dateMap[key] || '',
        matches: groups[key].sort((a, b) => a.matchNum - b.matchNum)
      }))
    }

    function onToggleGroup(e) {
      const gi = e.currentTarget.dataset.index
      collapsedGroups[gi] = !collapsedGroups[gi]
    }

    function onMatchTap(match) {
      uni.navigateTo({ url: `/pages/analysis/index?matchId=${match.id}` })
    }

    function onAnalyze(match) {
      if (!match) return
      const matchInfo = encodeURIComponent(JSON.stringify({ league: match.league, homeTeam: match.homeTeam, awayTeam: match.awayTeam }))
      uni.navigateTo({ url: `/pages/ai-chat/index?matchId=${match.id}&matchInfo=${matchInfo}` })
    }

    function onCalculator() {
      if (!userStore.checkLoginWithRedirect()) return
      uni.navigateTo({ url: '/pages/calculator/index' })
    }

    function onCalculatorMove() {
      // 记录移动事件
    }

    function onLobsterAI() {
      uni.navigateTo({ url: '/pages/ai-chat/index' })
    }

    return {
      matches, groupedMatches, loading, error, collapsedGroups,
      showCalculator, announcements, calculatorX, calculatorY,
      loadMatches, onToggleGroup, onMatchTap, onAnalyze,
      onCalculator, onCalculatorMove, onLobsterAI
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f4f8 0%, #e8eef3 100%);
  position: relative;
}

/* 公告栏 */
.announcement-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: linear-gradient(90deg, #fff9e6 0%, #fff 100%);
  border-bottom: 1rpx solid #ffe58f;
}

.announcement-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.announcement-scroll-wrapper {
  flex: 1;
  overflow: hidden;
  height: 48rpx;
}

.announcement-content {
  display: flex;
  align-items: center;
  height: 48rpx;
  white-space: nowrap;
}

.announcement-content.marquee {
  animation: marquee 15s linear infinite;
  display: inline-flex;
}

.announcement-content.marquee .announcement-text {
  flex-shrink: 0;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.announcement-text {
  font-size: 26rpx;
  color: #d48806;
  line-height: 48rpx;
  white-space: nowrap;
  flex-shrink: 0;
  padding-right: 60rpx;
}

/* 可拖动计算器按钮 */
.calculator-area {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  pointer-events: none;
}

.calculator-btn {
  width: 180rpx;
  height: 72rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%);
  border-radius: 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(255, 154, 86, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  pointer-events: auto;
}

.calculator-btn:active {
  opacity: 0.9;
}

.calculator-icon {
  font-size: 28rpx;
}

.calculator-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}

/* 加载状态 */
.loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 160rpx 0;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #8c8c8c;
}

/* 比赛列表 */
.match-list {
  padding: 24rpx;
}

/* 周几分组 */
.weekday-group {
  margin-bottom: 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.weekday-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.weekday-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.weekday-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.weekday-date {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.weekday-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.match-count {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.2);
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-weight: 500;
}

.weekday-right {
  display: flex;
  align-items: center;
  gap: 36rpx;
}

/* 龙虾AI问答按钮 */
.lobster-ai-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 10rpx 8rpx 18rpx;
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  border: 2rpx solid #ffc069;
  border-radius: 28rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.12), inset 0 1rpx 0 rgba(255, 255, 255, 0.9);
  transition: all 0.2s;
}

.lobster-ai-btn:active {
  transform: scale(0.95);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.1), inset 0 1rpx 0 rgba(255, 255, 255, 0.9);
}

.lobster-ai-icon {
  font-size: 24rpx;
}

.lobster-ai-text {
  font-size: 23rpx;
  color: #613400;
  font-weight: 700;
}

.ai-vip-tag {
  padding: 4rpx 14rpx;
  font-size: 18rpx;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, #d4a843 0%, #b8860b 100%);
  border-radius: 20rpx;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.2);
  letter-spacing: 2rpx;
}

.toggle-icon {
  width: 18rpx;
  height: 18rpx;
  border-right: 4rpx solid rgba(255, 255, 255, 0.8);
  border-bottom: 4rpx solid rgba(255, 255, 255, 0.8);
  transform: rotate(-135deg);
  transition: transform 0.3s ease;
}

.toggle-icon.collapsed {
  transform: rotate(45deg);
}

/* 比赛列表项 */
.match-items {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  transition: all 0.3s ease;
  opacity: 1;
  max-height: 9999rpx;
}

.match-items.hidden {
  max-height: 0;
  padding: 0 16rpx;
  opacity: 0;
  overflow: hidden;
}

/* 安全区域 */
.safe-area-bottom {
  height: calc(env(safe-area-inset-bottom) + 120rpx);
}
</style>
