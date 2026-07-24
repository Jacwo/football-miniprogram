<template>
  <view class="topic-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>
    <!-- 错误状态 -->
    <view v-else-if="error" class="error-wrapper">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="loadData">重试</view>
    </view>
    <!-- 主内容 -->
    <scroll-view v-else scroll-y class="topic-scroll" enable-back-to-top :refresher-enabled="true" :refresher-triggered="isRefreshing" @refresherrefresh="onScrollRefresh">
      <!-- 轮播图 -->
      <view v-if="carouselItems.length > 0" class="swiper-section">
        <swiper class="event-swiper" indicator-dots autoplay circular indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#ffffff">
          <swiper-item v-for="(item, idx) in carouselItems" :key="item._key || idx">
            <view class="swiper-item" @tap="onEventCardTap(item)">
              <image class="swiper-image" :src="item.imageUrl" mode="aspectFill" />
              <view class="swiper-overlay"></view>
              <view v-if="item.name" class="swiper-info">
                <text class="swiper-title">{{ item.name }}</text>
                <text v-if="item.desc" class="swiper-desc">{{ item.desc }}</text>
              </view>
            </view>
          </swiper-item>
        </swiper>
      </view>
      <!-- 热门比赛 -->
      <view v-if="hotMatches.length > 0" class="section">
        <view class="section-bar">
          <view class="section-bar-left">
            <view class="section-bar-dot"></view>
            <text class="section-bar-title">热门比赛</text>
            <text class="section-bar-extra">{{ hotMatches.length }}场</text>
          </view>
          <view class="vip-banner-inline" @tap="goToVip">
            <text class="vip-banner-inline-icon">🎁</text>
            <text class="vip-banner-inline-text">开通会员畅享VIP特权</text>
          </view>
        </view>
        <view class="match-list vip-style">
          <match-card v-for="item in hotMatches" :key="item.id" :match="item" :show-ai-analysis="showAiAnalysis" :clickable="true" :force-vip-style="false" @tap="onHotMatchTap(item)" @analyze="onAiAnalyze" />
        </view>
      </view>
      <!-- 热门专题 -->
      <view v-if="majorEvents.length > 0" class="section">
        <view class="section-bar">
          <view class="section-bar-left">
            <view class="section-bar-dot hot"></view>
            <text class="section-bar-title">热门专题</text>
            <view class="section-bar-badge hot">HOT</view>
          </view>
        </view>
        <view class="event-cards">
          <view v-for="item in majorEvents" :key="item.id" class="hot-zone-card full-width" @tap="onEventCardTap(item)">
            <view class="hot-zone-header">
              <text class="hot-zone-icon">🏆</text>
              <text class="hot-zone-title">{{ item.topicName }}</text>
              <view v-if="item.isActive" class="hot-zone-badge live">进行中</view>
              <view v-else class="hot-zone-badge">即将开赛</view>
            </view>
            <view v-if="item.imageUrl" class="hot-zone-cover">
              <image class="hot-zone-img" :src="item.imageUrl" mode="aspectFill" />
            </view>
            <view class="hot-zone-info">
              <text v-if="item.topicDesc" class="zone-desc">{{ item.topicDesc }}</text>
              <text v-if="item.showStartDate && item.showEndDate" class="zone-date">{{ item.showStartDate }} - {{ item.showEndDate }}</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 热门赛事 -->
      <view v-if="hotLeagues.length > 0" class="section">
        <view class="section-bar">
          <view class="section-bar-left">
            <view class="section-bar-dot hot"></view>
            <text class="section-bar-title">热门赛事</text>
            <view class="section-bar-badge hot">HOT</view>
          </view>
        </view>
        <view class="topic-grid">
          <view v-for="item in hotLeagues" :key="item.leagueId || item.topicId || item.id" class="topic-card" @tap="onTopicTap(item)">
            <view class="topic-cover">
              <image class="topic-cover-img" :src="item.imageUrl || item.carouselImageUrl" mode="aspectFill" />
              <view v-if="item.isActive" class="topic-cover-tag hot">进行中</view>
              <view v-else-if="item.isFinished" class="topic-cover-tag finished">已结束</view>
              <view v-else class="topic-cover-tag">即将开赛</view>
            </view>
            <view class="topic-body">
              <view class="topic-title-row">
                <text class="topic-name-inline">{{ item.leagueNameShort || item.leagueName }}</text>
                <text v-if="item.showStartDate && item.showEndDate" class="topic-date-inline">{{ item.showStartDate }} - {{ item.showEndDate }}</text>
              </view>
              <text v-if="item.topicDesc || item.leagueDesc" class="topic-desc">{{ item.topicDesc || item.leagueDesc }}</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 热门专题（selectTopics 精选专题未开始） -->
      <view v-if="selectTopics.length > 0" class="section">
        <view class="section-bar">
          <view class="section-bar-left">
            <view class="section-bar-dot hot"></view>
            <text class="section-bar-title">精选专题</text>
            <view class="section-bar-badge hot">NEW</view>
          </view>
        </view>
        <view class="topic-grid">
          <view v-for="item in selectTopics" :key="item.id" class="topic-card" @tap="onTopicTap(item)">
            <view class="topic-cover">
              <image class="topic-cover-img" :src="item.imageUrl" mode="aspectFill" />
              <view class="topic-cover-tag">即将开赛</view>
            </view>
            <view class="topic-body">
              <text class="topic-name">{{ item.topicName }}</text>
              <text v-if="item.topicDesc" class="topic-desc">{{ item.topicDesc }}</text>
              <text v-if="item.showStartDate && item.showEndDate" class="topic-date">{{ item.showStartDate }} - {{ item.showEndDate }}</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 热门专题（hotTopics 进行中） -->
      <view v-if="hotTopics.length > 0" class="section">
        <view class="section-bar">
          <view class="section-bar-left">
            <view class="section-bar-dot hot"></view>
            <text class="section-bar-title">热门专题</text>
            <view class="section-bar-badge hot">HOT</view>
          </view>
        </view>
        <view class="topic-grid">
          <view v-for="item in hotTopics" :key="item.id" class="topic-card" @tap="onTopicTap(item)">
            <view class="topic-cover">
              <image class="topic-cover-img" :src="item.imageUrl" mode="aspectFill" />
              <view v-if="item.isActive" class="topic-cover-tag hot">进行中</view>
              <view v-else class="topic-cover-tag">已结束</view>
            </view>
            <view class="topic-body">
              <text class="topic-name">{{ item.topicName }}</text>
              <text v-if="item.topicDesc" class="topic-desc">{{ item.topicDesc }}</text>
              <text v-if="item.showStartDate && item.showEndDate" class="topic-date">{{ item.showStartDate }} - {{ item.showEndDate }}</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 空状态 -->
      <view v-if="hotMatches.length === 0 && majorEvents.length === 0 && hotLeagues.length === 0 && hotTopics.length === 0 && selectTopics.length === 0 && !loading" class="empty-state">
        <text class="empty-emoji">📋</text>
        <text class="empty-title">暂无专题内容</text>
        <text class="empty-sub">精彩内容正在筹备中</text>
      </view>
      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import * as topicApi from '@/api/topic'
import * as matchApi from '@/api/match'
import MatchCard from '@/components/MatchCard.vue'

export default {
  components: { MatchCard },
  setup() {
    const userStore = useUserStore()
    const loading = ref(true)
    const error = ref(null)
    const isRefreshing = ref(false)
    const showAiAnalysis = ref(false)
    const carouselItems = ref([])
    const hotMatches = ref([])
    const majorEvents = ref([])
    const hotLeagues = ref([])
    const hotTopics = ref([])
    const selectTopics = ref([])

    onLoad(() => { loadData(); checkFeatures() })

    onShow(() => {
      // 同步 tabBar 选中状态
      // #ifdef MP-WEIXIN
      const pages = getCurrentPages()
      const curPage = pages[pages.length - 1]
      if (curPage && typeof curPage.getTabBar === 'function' && curPage.getTabBar()) {
        curPage.getTabBar().setData({ selectedPath: '/pages/topic/topic' })
      }
      // #endif

      // 从 login 返回后处理待分析比赛
      const app = getApp()
      if (app.globalData?.pendingAnalysisMatch && userStore.isLoggedIn?.()) {
        const pendingMatch = app.globalData.pendingAnalysisMatch
        app.globalData.pendingAnalysisMatch = null
        setTimeout(() => triggerAnalysisForMatch(pendingMatch), 500)
      }
    })

    async function checkFeatures() {
      try {
        const result = await matchApi.checkFeatures()
        showAiAnalysis.value = result === true
      } catch (e) {
        console.error('检查功能开关失败:', e)
        showAiAnalysis.value = false
      }
    }

    function transformMatchList(matches) {
      return matches.map(item => ({
        id: item.matchId,
        matchNumStr: item.matchNumStr || '',
        league: item.leagueAbbName || '',
        leagueColor: item.leagueColor || '667eea',
        homeTeam: item.homeTeamAbbName || '',
        awayTeam: item.awayTeamAbbName || '',
        homeTeamRank: item.homeTeamRank || '',
        awayTeamRank: item.awayTeamRank || '',
        homeScore: item.homeScore,
        awayScore: item.awayScore,
        isFinished: item.homeScore !== undefined && item.awayScore !== undefined,
        matchTime: item.matchTime || '',
        fullMatchTime: item.matchDate ? `${item.matchDate} ${item.matchTime || ''}` : (item.fullMatchTime || ''),
        odds: { home: item.homeWin || '-', draw: item.draw || '-', away: item.awayWin || '-', goalLine: item.goalLine, hhome: item.hhomeWin || item.hhome || '-', hdraw: item.hdraw || '-', haway: item.hawayWin || item.haway || '-' },
        _originalMatch: item
      }))
    }

    function formatShowDate(dateStr) {
      if (!dateStr) return ''
      try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return dateStr
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
      } catch (e) { return dateStr }
    }

    async function loadData() {
      loading.value = true
      error.value = null
      try {
        const data = await topicApi.getTopicHome()
        const safeData = data || {}

        // 轮播图
        carouselItems.value = (data.carouselItems || data.carousel || []).map((item, i) => ({
          ...item, _key: item.id || `carousel_${i}`, imageUrl: item.carouselImageUrl || item.imageUrl, name: item._name || item.topicName || '', desc: item._desc || ''
        }))

        // majorEvents 按开始时间分类
        const now = new Date()
        const processedEvents = (data.majorEvents || data.events || []).map(item => {
          const startDate = item.startDate ? new Date(item.startDate) : null
          const endDate = item.endDate ? new Date(item.endDate) : null
          let isActive = false
          if (startDate && startDate <= now) isActive = !endDate || endDate >= now
          return { ...item, isActive, showStartDate: formatShowDate(item.startDate), showEndDate: formatShowDate(item.endDate) }
        })
        majorEvents.value = processedEvents.filter(e => e.isActive)
        selectTopics.value = processedEvents.filter(e => !e.isActive)

        // 热门赛事
        hotLeagues.value = (data.hotLeagues || data.leagues || []).map(item => {
          const startDate = item.startDate ? new Date(item.startDate) : null
          const endDate = item.endDate ? new Date(item.endDate) : null
          let matchStatus = 'upcoming'
          if (startDate && now >= startDate) {
            if (endDate && now > endDate) matchStatus = 'finished'
            else matchStatus = 'active'
          }
          return {
            ...item, isActive: matchStatus === 'active', isFinished: matchStatus === 'finished',
            showStartDate: formatShowDate(item.startDate), showEndDate: formatShowDate(item.endDate),
            leagueNameShort: (item.leagueName || '').substring(0, 8) + ((item.leagueName || '').length > 8 ? '...' : '')
          }
        })

        hotTopics.value = (data.hotTopics || data.topics || []).map(t => ({
          ...t, showStartDate: itemShowDate(t.startDate || t.beginDate, t.endDate || t.finishDate)
        }))

        // 热门比赛 - 来自 getTopicHome 返回值
        const matchList = data.hotMatches || []
        hotMatches.value = transformMatchList(matchList.slice(0, 10))
      } catch (e) {
        error.value = e.message || '加载失败'
      } finally {
        loading.value = false
        isRefreshing.value = false
      }
    }

    function itemShowDate(start, end) {
      if (!start && !end) return ''
      const s = typeof start === 'string' ? start : ''
      const e = typeof end === 'string' ? end : ''
      return s && e ? `${s} - ${e}` : (s || e)
    }

    function onScrollRefresh() {
      isRefreshing.value = true
      loadData()
    }

    function onHotMatchTap(match) {
      if (!match?.id) return
      if (!userStore.isLoggedIn?.()) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }
      uni.navigateTo({ url: `/pages/analysis/index?matchId=${match.id}` })
    }

    function onAiAnalyze(match) {
      if (!userStore.isLoggedIn?.()) {
        const app = getApp()
        app.globalData = app.globalData || {}
        app.globalData.pendingAnalysisMatch = match._originalMatch || match
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }
      const matchInfo = encodeURIComponent(JSON.stringify({
        league: match.league, homeTeam: match.homeTeam, awayTeam: match.awayTeam
      }))
      uni.navigateTo({ url: `/pages/ai-analysis/index?matchId=${match.id}&matchInfo=${matchInfo}` })
    }

    function triggerAnalysisForMatch(targetMatch) {
      if (!targetMatch || !targetMatch.matchId) return
      const originalMatch = targetMatch
      const matchInfo = encodeURIComponent(JSON.stringify({
        league: originalMatch.leagueAbbName || originalMatch.league,
        homeTeam: originalMatch.homeTeamAbbName || originalMatch.homeTeam,
        awayTeam: originalMatch.awayTeamAbbName || originalMatch.awayTeam
      }))
      uni.navigateTo({ url: `/pages/ai-analysis/index?matchId=${originalMatch.matchId}&matchInfo=${matchInfo}` })
    }

    function onEventCardTap(item) {
      const id = item._id || item.id
      const jump = item.jump || item.url
      const name = item._name || item.topicName || item.leagueName
      if (!id && !jump) return
      if (jump) {
        if (jump.startsWith('/pages')) { uni.navigateTo({ url: jump }) }
        else if (jump.startsWith('http')) { uni.setClipboardData({ data: jump }); uni.showToast({ title: '链接已复制', icon: 'none' }) }
        return
      }
      const imageUrl = item.carouselImageUrl || item.imageUrl
      const params = `topicId=${id}` + (name ? `&topicName=${encodeURIComponent(name)}` : '') + (imageUrl ? `&imageUrl=${encodeURIComponent(imageUrl)}` : '')
      uni.navigateTo({ url: `/pages/topic-detail/index?${params}` })
    }

    function onTopicTap(item) {
      const id = item.topicId || item.id
      const name = item.leagueName || item.topicName || item.leagueNameShort || ''
      const imageUrl = item.imageUrl || item.carouselImageUrl || ''
      if (!id) return
      const params = `topicId=${id}&topicName=${encodeURIComponent(name)}&imageUrl=${encodeURIComponent(imageUrl)}`
      uni.navigateTo({ url: `/pages/topic-detail/index?${params}` })
    }

    function goToVip() {
      uni.navigateTo({ url: '/pages/vip/index' })
    }

    return { loading, error, isRefreshing, showAiAnalysis, carouselItems, hotMatches, majorEvents, hotLeagues, hotTopics, selectTopics, loadData, onScrollRefresh, onHotMatchTap, onAiAnalyze, onEventCardTap, onTopicTap, goToVip }
  }
}
</script>

<style scoped>
.topic-page { height: 100vh; background: linear-gradient(180deg, #f0f4f8 0%, #e8eef3 100%); display: flex; flex-direction: column; position: relative; }
.loading-wrapper, .error-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.loading-spinner { width: 56rpx; height: 56rpx; border: 4rpx solid #f0f0f0; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { margin-top: 16rpx; font-size: 24rpx; color: #8c8c8c; }
.error-text { font-size: 24rpx; color: #ff4d4f; text-align: center; padding: 0 40rpx; margin-bottom: 24rpx; }
.retry-btn { padding: 14rpx 48rpx; background: #667eea; color: #fff; border-radius: 16rpx; font-size: 24rpx; font-weight: 500; }
.retry-btn:active { opacity: 0.85; }
.topic-scroll { flex: 1; height: 0; padding: 24rpx; box-sizing: border-box; }
.swiper-section { margin-bottom: 32rpx; border-radius: 16rpx; overflow: hidden; }
.event-swiper { height: 420rpx; }
.swiper-item { position: relative; width: 100%; height: 420rpx; }
.swiper-image { width: 100%; height: 100%; }
.swiper-overlay { position: absolute; left: 0; right: 0; bottom: 0; height: 60%; background: linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 100%); }
.swiper-info { position: absolute; left: 0; right: 0; bottom: 0; padding: 24rpx; }
.swiper-title { font-size: 32rpx; color: #fff; font-weight: 700; line-height: 1.3; }
.swiper-desc { font-size: 22rpx; color: rgba(255,255,255,.85); margin-top: 6rpx; line-height: 1.3; }

.section { margin-bottom: 32rpx; }
.section-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; padding: 0 4rpx; }
.section-bar-left { display: flex; align-items: center; flex-shrink: 0; }
.section-bar-dot { width: 8rpx; height: 28rpx; border-radius: 4rpx; background: linear-gradient(180deg, #667eea, #764ba2); margin-right: 12rpx; }
.section-bar-dot.hot { background: linear-gradient(180deg, #ff4d4f, #faad14); }
.section-bar-title { font-size: 28rpx; color: #333; font-weight: 700; }
.section-bar-extra { font-size: 22rpx; color: #999; margin-left: auto; }
.section-bar-badge { margin-left: 12rpx; font-size: 18rpx; font-weight: 700; padding: 2rpx 10rpx; border-radius: 9999rpx; color: #fff; background: #ff4d4f; }

.vip-banner-inline { display: flex; align-items: center; gap: 8rpx; padding: 10rpx 20rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 30rpx; max-width: 50%; }
.vip-banner-inline:active { opacity: 0.9; }
.vip-banner-inline-icon { font-size: 24rpx; flex-shrink: 0; }
.vip-banner-inline-text { font-size: 22rpx; color: #fff; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.match-list { display: flex; flex-direction: column; gap: 20rpx; }
.match-list.vip-style { background: linear-gradient(135deg, rgba(102,126,234,.08) 0%, rgba(118,75,162,.08) 100%); border-radius: 16rpx; padding: 16rpx; border: 2rpx solid rgba(102,126,234,.15); }

.event-cards { display: flex; flex-direction: column; gap: 20rpx; }
.hot-zone-card.full-width { flex: none; width: 100%; box-sizing: border-box; }
.hot-zone-card { flex: 1; background: linear-gradient(135deg, #fff5f5 0%, #fff 100%); border-radius: 20rpx; padding: 24rpx; border: 2rpx solid #ffe0e0; min-height: 280rpx; }
.hot-zone-card.upcoming { background: linear-gradient(135deg, #f0f7ff 0%, #fff 100%); border-color: #d6e4ff; }
.hot-zone-cover { width: 100%; height: 200rpx; border-radius: 12rpx; overflow: hidden; margin: 16rpx 0; }
.hot-zone-img { width: 100%; height: 100%; }
.hot-zone-header { display: flex; align-items: center; gap: 10rpx; margin-bottom: 16rpx; }
.hot-zone-icon { font-size: 32rpx; }
.hot-zone-title { font-size: 26rpx; color: #333; font-weight: 700; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hot-zone-badge { font-size: 18rpx; font-weight: 700; padding: 4rpx 12rpx; border-radius: 9999rpx; color: #fff; background: #ff4d4f; }
.hot-zone-badge.live { background: linear-gradient(135deg, #ff4d4f, #ff6a88); }
.hot-zone-info { display: flex; flex-direction: row; align-items: center; gap: 12rpx; }
.zone-desc { font-size: 22rpx; color: #666; line-height: 1.4; flex: 1; }
.zone-date { font-size: 20rpx; color: #1890ff; font-weight: 600; flex-shrink: 0; }

.topic-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.topic-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.03); }
.topic-card:active { opacity: 0.9; }
.topic-cover { position: relative; width: 100%; height: 180rpx; }
.topic-cover-img { width: 100%; height: 100%; }
.topic-cover-tag { position: absolute; top: 12rpx; right: 12rpx; font-size: 18rpx; font-weight: 600; color: #fff; padding: 4rpx 14rpx; border-radius: 9999rpx; background: rgba(0,0,0,.45); }
.topic-cover-tag.hot { background: #ff4d4f; }
.topic-cover-tag.finished { background: #999; }
.topic-body { padding: 16rpx; display: flex; flex-direction: column; gap: 6rpx; }
.topic-name { font-size: 24rpx; color: #333; font-weight: 700; line-height: 1.3; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.topic-desc { font-size: 20rpx; color: #999; line-height: 1.3; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.topic-date { font-size: 20rpx; color: #1890ff; font-weight: 500; }
.topic-title-row { white-space: nowrap; overflow: hidden; }
.topic-name-inline { font-size: 24rpx; color: #333; font-weight: 700; }
.topic-date-inline { font-size: 20rpx; color: #1890ff; font-weight: 500; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 40rpx 0; }
.empty-emoji { font-size: 100rpx; margin-bottom: 20rpx; opacity: 0.6; }
.empty-title { font-size: 28rpx; color: #666; font-weight: 600; margin-bottom: 8rpx; }
.empty-sub { font-size: 24rpx; color: #999; }
.bottom-space { height: 120rpx; }
</style>
