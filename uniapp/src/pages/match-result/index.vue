<template>
  <view class="result-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>
    <!-- 错误状态 -->
    <view v-else-if="error" class="error-wrapper">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="onRetry">重试</view>
    </view>
    <!-- 主内容 -->
    <view v-else class="main-content">
      <!-- 页面标题 -->
      <view class="page-header">
        <text v-if="activeTab === 'live'" class="page-title">📺 实时</text>
        <text v-else-if="activeTab === 'result'" class="page-title">⚽ 赛果</text>
        <text v-else class="page-title">📝 历史</text>
        <text v-if="activeTab === 'live'" class="page-desc">查看比赛实时进展</text>
        <text v-else-if="activeTab === 'result'" class="page-desc">查看比赛开奖结果</text>
        <text v-else class="page-desc">查看历史分析记录</text>
      </view>

      <!-- Tab 切换 -->
      <view class="tabs">
        <view class="tab-item" :class="{ active: activeTab === 'live' }" @tap="onTabChange('live')"><text class="tab-text">实时</text></view>
        <view class="tab-item" :class="{ active: activeTab === 'result' }" @tap="onTabChange('result')"><text class="tab-text">赛果</text></view>
        <view v-if="showHistory" class="tab-item" :class="{ active: activeTab === 'history' }" @tap="onTabChange('history')"><text class="tab-text">历史</text></view>
      </view>

      <!-- 比分直播 -->
      <block v-if="activeTab === 'live'">
        <view v-if="liveMatches.length === 0" class="empty-state">
          <text class="empty-icon">📺</text>
          <text class="empty-text">暂无直播</text>
          <text class="empty-tip">当前没有比赛直播</text>
        </view>
        <view v-else class="content-wrapper">
          <view class="refresh-btn" @tap="onRefresh">
            <text class="refresh-icon">🔄</text>
          </view>
          <scroll-view scroll-y class="results-scroll">
            <view v-for="match in liveMatches" :key="match.matchId" class="live-item">
              <view class="live-header">
                <view class="live-league">
                  <text class="league-tag" :style="{ backgroundColor: '#' + (match.displayColor || '667eea') }">{{ match.leagueAbbName }}</text>
                  <text class="live-status">{{ match.matchPhaseTcName || match.matchStatusName }}</text>
                </view>
                <view class="live-time">
                  <text class="live-date">{{ match.displayDate }}</text>
                  <text v-if="match.matchStatus !== 0" class="live-clock">{{ match.displayTime }}</text>
                  <text v-else class="live-clock upcoming">未开赛</text>
                </view>
              </view>
              <view class="live-score-section">
                <view class="live-team home"><text class="live-team-name">{{ match.homeTeamAbbName }}</text></view>
                <view class="live-score-box">
                  <text v-if="match.matchStatus === 0" class="live-score upcoming">未开赛</text>
                  <text v-else class="live-score">{{ match.sectionsNo999 || '-' }}</text>
                  <text v-if="match.sectionsNo1" class="live-half-score">半场 {{ match.sectionsNo1 }}</text>
                  <text v-if="match.matchMinute && match.matchMinute !== '0' && match.matchMinute !== 0" class="live-minute">{{ match.matchMinute }}'</text>
                  <text v-else class="live-minute upcoming">未开赛</text>
                </view>
                <view class="live-team away"><text class="live-team-name">{{ match.awayTeamAbbName }}</text></view>
              </view>
              <!-- 事件时间线 -->
              <view v-if="match.events && match.events.length > 0" class="live-events">
                <view class="events-title">比赛事件</view>
                <view class="timeline-wrap">
                  <view class="timeline-line"></view>
                  <block v-for="(event, idx) in match.events" :key="idx">
                    <view v-if="event._showHalfLine" class="half-separator"><view class="half-separator-line"></view></view>
                    <view class="event-item" :class="event.isHome ? 'home' : 'away'">
                      <block v-if="event.isHome">
                        <view class="event-side home">
                          <view class="event-info"><text class="event-player">{{ event.personEnName }}</text></view>
                          <view class="event-mark">
                            <text v-if="event.eventCode === 'G' || event.eventCode === 'PG'" class="event-icon" :class="{ penalty: event.eventCode === 'PG' }">⚽</text>
                            <text v-else-if="event.eventCode === 'OG'" class="event-icon">🔴</text>
                            <text v-else-if="event.eventCode === 'Y'" class="event-icon">🟨</text>
                            <text v-else-if="event.eventCode === 'R'" class="event-icon">🟥</text>
                            <text v-else class="event-icon dot">●</text>
                            <text class="event-time">{{ event._displayMinute }}'</text>
                          </view>
                        </view>
                        <view class="event-side placeholder"></view>
                      </block>
                      <block v-else>
                        <view class="event-side placeholder"></view>
                        <view class="event-side away">
                          <view class="event-mark">
                            <text class="event-time">{{ event._displayMinute }}'</text>
                            <text v-if="event.eventCode === 'G' || event.eventCode === 'PG'" class="event-icon" :class="{ penalty: event.eventCode === 'PG' }">⚽</text>
                            <text v-else-if="event.eventCode === 'OG'" class="event-icon">🔴</text>
                            <text v-else-if="event.eventCode === 'Y'" class="event-icon">🟨</text>
                            <text v-else-if="event.eventCode === 'R'" class="event-icon">🟥</text>
                            <text v-else class="event-icon dot">●</text>
                          </view>
                          <view class="event-info"><text class="event-player">{{ event.personEnName }}</text></view>
                        </view>
                      </block>
                    </view>
                  </block>
                </view>
              </view>
            </view>
            <view class="bottom-placeholder"></view>
          </scroll-view>
        </view>
      </block>

      <!-- 赛果列表 -->
      <block v-if="activeTab === 'result'">
        <view v-if="results.length === 0" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无赛果</text>
          <text class="empty-tip">还没有比赛结果</text>
        </view>
        <view v-else class="content-wrapper">
          <scroll-view scroll-y class="results-scroll" @scrolltolower="onResultScrollToLower">
            <view v-for="match in results" :key="match.matchId" class="result-item" :class="match.statusClass">
              <view class="result-status-bar"></view>
              <view class="result-header">
                <view class="league-info">
                  <text class="league-tag" :style="{ backgroundColor: '#' + (match.displayColor || '667eea') }">{{ match.leagueAbbName || match.leagueName }}</text>
                  <text class="status-badge" :class="match.statusClass">{{ match.matchStatusName }}</text>
                </view>
                <view class="time-info">
                  <text class="date">{{ match.displayDate }}</text>
                  <text class="time">{{ match.displayTime }}</text>
                </view>
              </view>
              <view class="match-section" @tap="onToggleExpand(match.matchId)">
                <view class="vs-info">
                  <text class="team-name home">{{ match.homeName }}</text>
                  <view class="score-box">
                    <text class="score" :class="{ 'has-result': match.hadResult }">{{ match.fullScore }}</text>
                  </view>
                  <text class="team-name away">{{ match.awayName }}</text>
                </view>
                <view class="expand-btn">
                  <text class="expand-icon" :class="{ expanded: expandedId === match.matchId }">^</text>
                </view>
              </view>
              <view v-if="expandedId === match.matchId" class="odds-compact">
                <view v-if="match.hadResult" class="odds-item">
                  <text class="odds-label">胜平负</text>
                  <text class="odds-result">{{ match.hadCombinationDesc }}</text>
                  <text class="odds-odds">{{ match.hadOdds }}</text>
                </view>
                <view v-if="match.hhadResult" class="odds-item">
                  <text class="odds-label">让球</text>
                  <text class="odds-result">{{ match.hhadCombinationDesc }}</text>
                  <text class="odds-odds">{{ match.hhadOdds }}</text>
                </view>
                <view v-if="match.ttgResult" class="odds-item">
                  <text class="odds-label">总进球</text>
                  <text class="odds-result">{{ match.ttgCombinationDesc }}</text>
                  <text class="odds-odds">{{ match.ttgOdds }}</text>
                </view>
                <view v-if="match.hafuResult" class="odds-item">
                  <text class="odds-label">半全场</text>
                  <text class="odds-result">{{ match.hafuCombinationDesc }}</text>
                  <text class="odds-odds">{{ match.hafuOdds }}</text>
                </view>
                <view v-if="match.crsResult" class="odds-item">
                  <text class="odds-label">比分</text>
                  <text class="odds-result">{{ match.crsCombinationDesc }}</text>
                  <text class="odds-odds">{{ match.crsOdds }}</text>
                </view>
              </view>
            </view>
            <view class="bottom-placeholder"></view>
          </scroll-view>
        </view>
      </block>

      <!-- 历史记录 -->
      <block v-if="activeTab === 'history'">
        <view v-if="historyLoading && historyList.length === 0" class="loading-wrapper">
          <view class="loading-content">
            <view class="loading-spinner"></view>
            <text class="loading-text">加载中...</text>
          </view>
        </view>
        <view v-else-if="historyError" class="empty-state">
          <text class="empty-icon">⚠️</text>
          <text class="empty-text">加载失败</text>
          <text class="empty-tip">{{ historyError }}</text>
          <view class="retry-btn" @tap="loadHistory">重试</view>
        </view>
        <view v-else-if="historyList.length === 0" class="empty-state">
          <text class="empty-icon">📝</text>
          <text class="empty-text">暂无记录</text>
          <text class="empty-tip">你还没有任何分析记录</text>
        </view>
        <view v-else class="history-wrapper">
          <view class="history-sub-tabs">
            <view class="sub-tab-item" :class="{ active: historySubTab === 'list' }" @tap="onHistorySubTabChange('list')"><text class="sub-tab-text">历史记录</text></view>
            <view class="sub-tab-item" :class="{ active: historySubTab === 'models' }" @tap="onHistorySubTabChange('models')"><text class="sub-tab-text">模型统计</text></view>
          </view>
          <!-- 历史列表 -->
          <template v-if="historySubTab === 'list'">
            <view class="stats-bar"><text class="stats-text">共 {{ historyTotal }} 条记录</text></view>
            <scroll-view scroll-y class="history-list" @scrolltolower="onHistoryScrollToLower">
              <history-card v-for="item in historyList" :key="item.id" :title="item.matchName || '分析记录'" :summary="item.summary" :timestamp="item.createTime" :match="item.matchName" @tap="onHistoryItemTap(item)" />
              <view v-if="historyHasMore" class="load-more">
                <view v-if="historyLoading" class="loading-spinner small"></view>
                <text v-else class="load-more-text">上拉加载更多</text>
              </view>
              <view v-else class="no-more"><text class="no-more-text">没有更多了</text></view>
              <view class="bottom-placeholder"></view>
            </scroll-view>
          </template>
          <!-- 模型统计 -->
          <template v-if="historySubTab === 'models'">
            <view v-if="modelsLoading" class="loading-wrapper">
              <view class="loading-content">
                <view class="loading-spinner"></view>
                <text class="loading-text">加载中...</text>
              </view>
            </view>
            <view v-else-if="modelsError" class="empty-state">
              <text class="empty-icon">⚠️</text>
              <text class="empty-text">加载失败</text>
              <text class="empty-tip">{{ modelsError }}</text>
            </view>
            <view v-else-if="models.length === 0 && !modelStats" class="empty-state">
              <text class="empty-icon">📊</text>
              <text class="empty-text">暂无数据</text>
              <text class="empty-tip">还没有模型统计数据</text>
            </view>
            <scroll-view v-else scroll-y class="models-list">
              <template v-if="!modelStats">
                <view v-for="item in models" :key="item.id" class="model-item" @tap="onModelTap(item)">
                  <view class="model-item-header">
                    <view class="model-item-info">
                      <text class="model-item-name">{{ item.modelName || item.name || '模型' }}</text>
                      <text class="model-item-desc">{{ item.description || '模型描述' }}</text>
                    </view>
                    <text class="model-arrow">→</text>
                  </view>
                </view>
              </template>
              <template v-else>
                <view class="report-wrapper">
                  <view class="back-btn" @tap="modelStats = null">← 返回</view>
                  <view class="report-header">
                    <text class="report-title">📊 昨日预测报告</text>
                    <text class="report-model">{{ modelStats.modelName }}</text>
                    <view class="report-date-row">
                      <text class="report-date-label">报告生成时间</text>
                      <text class="report-date">{{ modelStats.statsDate }}</text>
                    </view>
                    <text class="report-note">统计范围：昨日 03:00 - 今日 03:00 的比赛</text>
                  </view>
                  <view class="report-section">
                    <view class="key-metrics">
                      <view class="metric-card accuracy">
                        <text class="metric-value">{{ modelStats.accuracyRate }}%</text>
                        <text class="metric-label">准确率</text>
                      </view>
                      <view class="metric-card">
                        <text class="metric-value">{{ modelStats.correctPredictions }}</text>
                        <text class="metric-label">命中预测</text>
                      </view>
                      <view class="metric-card">
                        <text class="metric-value">{{ modelStats.totalPredictions }}</text>
                        <text class="metric-label">总预测</text>
                      </view>
                    </view>
                  </view>
                  <view class="report-section">
                    <text class="section-title-text">预测分布</text>
                    <view class="prediction-dist">
                      <view class="dist-item">
                        <text class="dist-label">主队胜</text>
                        <view class="dist-bar"><view class="dist-fill" :style="{ width: safePercent(modelStats.homeWinCorrect, modelStats.homeWinCount) + '%' }"></view></view>
                        <text class="dist-value">{{ modelStats.homeWinCorrect }}/{{ modelStats.homeWinCount }}</text>
                      </view>
                      <view class="dist-item">
                        <text class="dist-label">平局</text>
                        <view class="dist-bar"><view class="dist-fill" :style="{ width: safePercent(modelStats.drawCorrect, modelStats.drawCount) + '%' }"></view></view>
                        <text class="dist-value">{{ modelStats.drawCorrect }}/{{ modelStats.drawCount }}</text>
                      </view>
                      <view class="dist-item">
                        <text class="dist-label">客队胜</text>
                        <view class="dist-bar"><view class="dist-fill" :style="{ width: safePercent(modelStats.awayWinCorrect, modelStats.awayWinCount) + '%' }"></view></view>
                        <text class="dist-value">{{ modelStats.awayWinCorrect }}/{{ modelStats.awayWinCount }}</text>
                      </view>
                    </view>
                  </view>
                  <view class="report-section">
                    <text class="section-title-text">数据统计</text>
                    <view class="stats-table">
                      <view class="table-row-item"><text class="table-label">样本数</text><text class="table-value">{{ modelStats.sampleSize }}</text></view>
                    </view>
                  </view>
                </view>
              </template>
              <view class="bottom-placeholder"></view>
            </scroll-view>
          </template>
        </view>
      </block>
    </view>
  </view>
</template>

<script>
import { ref } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import * as matchApi from '@/api/match'
import * as historyApi from '@/api/history'
import HistoryCard from '@/components/HistoryCard.vue'

export default {
  components: { HistoryCard },
  setup() {
    const userStore = useUserStore()
    const loading = ref(true)
    const error = ref(null)
    const activeTab = ref('live')
    const showHistory = ref(true)
    let _isFirstShow = true

    const liveMatches = ref([])
    const results = ref([])
    const expandedId = ref(null)
    const resultPage = ref(1)

    const historyList = ref([])
    const historyLoading = ref(false)
    const historyError = ref(null)
    const historyTotal = ref(0)
    const historyHasMore = ref(true)
    const historyRefreshing = ref(false)
    const historySubTab = ref('list')
    const historyPage = ref(1)

    const models = ref([])
    const modelsLoading = ref(false)
    const modelsError = ref(null)
    const modelStats = ref(null)
    const modelStatsLoading = ref(false)

    // 检查功能开关
    async function checkFeatures() {
      try {
        const result = await matchApi.checkFeatures()
        const show = result === true
        showHistory.value = show
        if (!show && activeTab.value === 'history') {
          activeTab.value = 'result'
          loadResults()
        }
      } catch (e) {
        console.error('检查功能开关失败:', e)
        showHistory.value = false
      }
    }

    onLoad(() => { loading.value = true; checkFeatures(); loadLiveMatches() })

    onShow(() => {
      // 同步 tabBar 选中状态
      // #ifdef MP-WEIXIN
      const pages = getCurrentPages()
      const curPage = pages[pages.length - 1]
      if (curPage && typeof curPage.getTabBar === 'function' && curPage.getTabBar()) {
        curPage.getTabBar().setData({ selectedPath: '/pages/match-result/index' })
      }
      // #endif

      if (_isFirstShow) { _isFirstShow = false; return }
      if (activeTab.value === 'live') loadLiveMatches()
      else if (activeTab.value === 'result') loadResults()
      else if (activeTab.value === 'history') loadHistory()
    })

    // 页面下拉刷新
    onPullDownRefresh(() => {
      if (activeTab.value === 'history') {
        refreshHistory().finally(() => uni.stopPullDownRefresh())
      } else {
        uni.stopPullDownRefresh()
      }
    })

    async function loadLiveMatches() {
      loading.value = true; error.value = null
      try {
        const res = await matchApi.getMatchLive().catch(() => [])
        const matches = res.data || res || []
        liveMatches.value = matches.map(m => {
          const eventList = (m.eventList || []).map(e => {
            const minute = parseInt(e.matchMinute, 10) || 0
            const rawMinute = e.matchMinute || ''
            let _displayMinute = rawMinute
            if (rawMinute && rawMinute.includes('+')) {
              const parts = rawMinute.split('+')
              _displayMinute = '+' + parts[1]
            }
            return { ...e, isHome: e.teamType === 'home', _sortMinute: minute, _displayMinute }
          }).sort((a, b) => a._sortMinute - b._sortMinute)
          // 标记下半场第一条事件
          let halfLineInserted = false
          for (let i = 0; i < eventList.length; i++) {
            if (!halfLineInserted && eventList[i]._sortMinute > 45) {
              eventList[i]._showHalfLine = true
              halfLineInserted = true
            }
          }
          return {
            ...m,
            displayDate: formatDate(m.matchDate),
            displayTime: m.matchTime ? m.matchTime.substring(0, 5) : '--:--',
            displayColor: m.backColor || '667eea',
            events: eventList
          }
        })
        loading.value = false
      } catch (e) { loading.value = false; error.value = e.message || '加载失败' }
    }

    async function loadResults() {
      loading.value = true; error.value = null
      try {
        const res = await matchApi.getMatchResults().catch(() => [])
        const rawResults = res.data || res || []
        results.value = rawResults.map(item => {
          const score = item.crsResult
          return {
            ...item,
            statusClass: getStatusClass(item.matchStatus),
            fullScore: formatScore(score),
            halfScore: formatScore(item.sectionsNo1 || item.halfScore),
            displayDate: formatDate(item.matchDate),
            displayTime: item.matchTime || '--:--',
            displayColor: item.backColor || '667eea'
          }
        })
        loading.value = false
      } catch (e) { loading.value = false; error.value = e.message || '加载失败' }
    }

    async function loadHistory() {
      historyLoading.value = true; historyError.value = null
      try {
        const { historyPageNo, historyPageSize } = { historyPageNo: historyPage.value, historyPageSize: 20 }
        const result = await historyApi.getHistoryList({ pageNo: historyPageNo, pageSize: historyPageSize })
        const { list = [], total = 0 } = result || {}
        // 按时间倒序排列
        if (Array.isArray(list)) {
          list.sort((a, b) => {
            const timeA = new Date(a.createTime || a.matchTime || 0).getTime()
            const timeB = new Date(b.createTime || b.matchTime || 0).getTime()
            return timeB - timeA
          })
        }
        historyList.value = list
        historyTotal.value = total
        historyHasMore.value = list.length >= historyPageSize
      } catch (e) { historyError.value = e.message } finally { historyLoading.value = false }
    }

    async function refreshHistory() {
      historyPage.value = 1
      historyRefreshing.value = true
      await loadHistory()
      historyRefreshing.value = false
    }

    async function loadModels() {
      modelsLoading.value = true; modelsError.value = null; modelStats.value = null
      try {
        const data = await historyApi.getModelList()
        models.value = data.data || data || []
      } catch (e) { modelsError.value = e.message } finally { modelsLoading.value = false }
    }

    async function loadModelStats(modelType) {
      modelStatsLoading.value = true
      try {
        const data = await historyApi.getModelStats(modelType)
        modelStats.value = data[0] || data
      } catch (e) { /* ignore */ } finally { modelStatsLoading.value = false }
    }

    // ====== 辅助函数 ======
    function formatDate(dateStr) {
      if (!dateStr) return '--'
      try {
        const date = new Date(dateStr)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${month}-${day}`
      } catch (e) { return dateStr }
    }
    function getStatusClass(status) {
      const statusMap = { 0: 'upcoming', 1: 'ongoing', 2: 'finished', 6: 'finished' }
      return statusMap[status] || 'unknown'
    }
    function formatScore(score) {
      if (!score) return '-'
      return score
    }

    async function loadMoreHistory() {
      if (!historyHasMore.value || historyLoading.value) return
      const historyPageNo = historyPage.value
      const historyPageSize = 20
      historyLoading.value = true
      try {
        const result = await historyApi.getHistoryList({ pageNo: historyPageNo + 1, pageSize: historyPageSize })
        const { list: newList = [] } = result || {}
        historyList.value = [...historyList.value, ...newList]
        historyPage.value = historyPageNo + 1
        historyHasMore.value = newList.length >= historyPageSize
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally { historyLoading.value = false }
    }

    function onToggleExpand(matchId) {
      expandedId.value = expandedId.value === matchId ? null : matchId
    }
    function onResultScrollToLower() {
      uni.showToast({ title: '没有更多赛果了', icon: 'none', duration: 1500 })
    }
    function onHistoryScrollToLower() {
      loadMoreHistory()
    }
    function onHistoryItemTap(record) {
      const matchId = record && record.matchId
      if (!matchId) return
      uni.navigateTo({ url: `/pages/history-detail/index?id=${matchId}` })
    }
    function onRefresh() {
      if (activeTab.value === 'live') loadLiveMatches()
      else if (activeTab.value === 'result') loadResults()
      else if (activeTab.value === 'history') refreshHistory()
    }
    function onRetry() { loading.value = true; error.value = null; onRefresh() }
    function safePercent(a, b) {
      if (!b || b === 0) return 0
      return Math.round((a / b) * 100)
    }
    function onModelTap(item) {
      const modelType = item.modelType || item.id
      loadModelStats(modelType)
      historySubTab.value = 'models'
    }
    function onHistorySubTabChange(tab) {
      historySubTab.value = tab
      if (tab === 'models') loadModels()
    }
    function onTabChange(tab) {
      if (tab === activeTab.value) return
      activeTab.value = tab
      if (tab === 'result') loadResults()
      else if (tab === 'live') loadLiveMatches()
      else if (tab === 'history') loadHistory()
    }

    return {
      loading, error, activeTab, showHistory,
      liveMatches, results, expandedId,
      historyList, historyLoading, historyError, historyTotal, historyHasMore, historyRefreshing, historySubTab,
      models, modelsLoading, modelsError, modelStats, modelStatsLoading,
      onToggleExpand, onResultScrollToLower, onHistoryScrollToLower, onHistoryItemTap,
      onRefresh, onRetry, safePercent, onModelTap, onHistorySubTabChange, onTabChange
    }
  }
}
</script>

<style scoped>
.result-page { height: 100vh; background: linear-gradient(180deg, #f8f9fb 0%, #f5f7fa 100%); display: flex; flex-direction: column; overflow: hidden; }
.loading-wrapper, .error-wrapper { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 40rpx; }
.loading-spinner { width: 60rpx; height: 60rpx; border: 4rpx solid #f0f0f0; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-spinner.small { width: 32rpx; height: 32rpx; border-width: 3rpx; }
.loading-text, .error-text { margin-top: 20rpx; font-size: 26rpx; color: #666; }
.error-text { margin-bottom: 24rpx; }
.retry-btn { padding: 16rpx 48rpx; background: #667eea; color: #fff; border-radius: 32rpx; font-size: 26rpx; }
.main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* Header */
.page-header { display: flex; flex-direction: column; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32rpx 24rpx; color: #fff; box-shadow: 0 4rpx 16rpx rgba(102,126,234,.2); }
.refresh-btn { position: absolute; right: 30rpx; top: 50%; transform: translateY(-50%); width: 80rpx; height: 80rpx; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.15); z-index: 100; }
.refresh-btn:active { transform: scale(0.95); }
.refresh-icon { font-size: 44rpx; color: #ff6b6b; }
.page-title { font-size: 36rpx; color: #fff; font-weight: 700; margin-bottom: 8rpx; letter-spacing: .5rpx; }
.page-desc { font-size: 24rpx; color: rgba(255,255,255,.8); font-weight: 400; }

/* Tabs */
.tabs { display: flex; background: #fff; border-bottom: 1rpx solid #f0f0f0; }
.tab-item { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24rpx 0; position: relative; }
.tab-text { font-size: 28rpx; color: #666; font-weight: 500; }
.tab-item.active .tab-text { color: #667eea; font-weight: 600; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60rpx; height: 4rpx; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); border-radius: 2rpx; }
.content-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; position: relative; }

/* Empty */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 100rpx 40rpx; color: #999; }
.empty-icon { font-size: 120rpx; margin-bottom: 24rpx; opacity: 0.6; }
.empty-text { font-size: 32rpx; color: #666; font-weight: 600; margin-bottom: 12rpx; }
.empty-tip { font-size: 26rpx; color: #999; text-align: center; }
.results-scroll { flex: 1; height: 0; overflow-y: auto; padding: 16rpx 12rpx 24rpx 12rpx; }

/* Live match cards */
.live-item { background: #fff; border-radius: 16rpx; margin-bottom: 16rpx; overflow: hidden; box-shadow: 0 4rpx 20rpx rgba(0,0,0,.06); border: 1rpx solid #f0f0f0; }
.live-header { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 20rpx; background: linear-gradient(180deg, #fafbfc 0%, #fff 100%); border-bottom: 1rpx solid #eef1f5; }
.live-league { display: flex; align-items: center; gap: 12rpx; }
.league-tag { font-size: 20rpx; color: #fff; padding: 4rpx 14rpx; border-radius: 6rpx; font-weight: 600; letter-spacing: .5rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,.1); }
.live-status { font-size: 20rpx; color: #52c41a; font-weight: 600; background: rgba(82,196,26,.08); padding: 4rpx 12rpx; border-radius: 6rpx; }
.live-time { display: flex; align-items: center; gap: 8rpx; font-size: 24rpx; color: #666; }
.live-clock.upcoming { color: #ff9800; font-weight: 600; }
.live-score-section { display: flex; align-items: center; padding: 28rpx 20rpx; }
.live-team { flex: 1; }
.live-team.home { text-align: right; }
.live-team.away { text-align: left; }
.live-team-name { font-size: 28rpx; color: #333; font-weight: 600; line-height: 1.4; }
.live-score-box { display: flex; flex-direction: column; align-items: center; min-width: 140rpx; padding: 0 16rpx; }
.live-score { font-size: 52rpx; font-weight: 800; color: #ff3b30; font-family: 'Arial','DIN',monospace; letter-spacing: 6rpx; text-shadow: 0 2rpx 8rpx rgba(255,59,48,.15); }
.live-score.upcoming { font-size: 28rpx; color: #999; font-weight: 600; letter-spacing: 0; text-shadow: none; }
.live-half-score { font-size: 20rpx; color: #bbb; margin-top: 6rpx; }
.live-minute { font-size: 24rpx; color: #fff; font-weight: 800; margin-top: 6rpx; background: #52c41a; padding: 6rpx 16rpx; border-radius: 10rpx; letter-spacing: 1rpx; }
.live-minute.upcoming { color: #fff; background: #ff9800; font-weight: 800; }

/* Event timeline */
.live-events { padding: 20rpx 24rpx 24rpx; background: linear-gradient(135deg, rgba(102,126,234,.04) 0%, rgba(118,75,162,.02) 100%); border-top: 1rpx solid #eee; }
.events-title { font-size: 24rpx; color: #888; font-weight: 600; margin-bottom: 20rpx; text-align: center; }
.timeline-wrap { position: relative; }
.timeline-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 4rpx; background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); transform: translateX(-50%); }
.half-separator { display: flex; align-items: center; justify-content: center; height: 20rpx; position: relative; z-index: 2; }
.half-separator-line { width: 60rpx; height: 4rpx; border-radius: 2rpx; background: #d0d0d0; }
.event-item { display: flex; align-items: center; min-height: 56rpx; position: relative; margin-top: 4rpx; }
.event-side { flex: 1; min-width: 0; display: flex; flex-direction: row; align-items: center; gap: 12rpx; padding: 8rpx 0; }
.event-side.home { justify-content: flex-end; padding-right: 32rpx; }
.event-side.home .event-info { align-items: flex-end; }
.event-side.away { justify-content: flex-start; padding-left: 32rpx; }
.event-side.away .event-info { align-items: flex-start; }
.event-side.placeholder { visibility: hidden; }
.event-info { display: flex; flex-direction: column; gap: 2rpx; min-width: 0; flex-shrink: 1; }
.event-icon { flex-shrink: 0; font-size: 32rpx; width: 40rpx; height: 40rpx; display: flex; align-items: center; justify-content: center; z-index: 2; }
.event-icon.dot { font-size: 18rpx; color: #667eea; }
.event-icon.penalty { filter: grayscale(100%); }
.event-mark { flex-shrink: 0; display: flex; align-items: center; gap: 8rpx; z-index: 2; }
.event-time { font-size: 24rpx; color: #fff; font-weight: 800; line-height: 1; background: #52c41a; padding: 4rpx 6rpx; border-radius: 8rpx; min-width: 52rpx; text-align: center; }
.event-player { font-size: 24rpx; color: #333; font-weight: 500; max-width: 160rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Result cards */
.result-item { background: #fff; border-radius: 16rpx; margin-bottom: 16rpx; overflow: hidden; box-shadow: 0 1rpx 8rpx rgba(0,0,0,.04); }
.result-status-bar { height: 3rpx; width: 100%; background: #d9d9d9; }
.result-item.finished .result-status-bar { background: #389e0d; }
.result-item.ongoing .result-status-bar { background: #ff9800; }
.result-item.upcoming .result-status-bar { background: #e0e0e0; }
.result-header { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 20rpx 12rpx; }
.league-info { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.status-badge { font-size: 20rpx; color: #bbb; font-weight: 400; }
.status-badge.finished { color: #389e0d; }
.status-badge.ongoing { color: #ff9800; }
.time-info { display: flex; align-items: center; gap: 8rpx; font-size: 22rpx; color: #888; flex-shrink: 0; }
.match-section { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 20rpx 20rpx; gap: 8rpx; }
.vs-info { display: flex; align-items: center; justify-content: center; flex: 1; gap: 16rpx; }
.team-name { font-size: 26rpx; color: #333; font-weight: 600; flex: 1; line-height: 1.3; word-break: break-all; }
.team-name.home { text-align: right; }
.team-name.away { text-align: left; }
.score-box { display: flex; align-items: center; justify-content: center; min-width: 120rpx; padding: 12rpx 0; flex-shrink: 0; }
.score { font-size: 28rpx; font-weight: 700; font-family: 'Arial','DIN',monospace; letter-spacing: 4rpx; color: #ff3b30; line-height: 1; }
.score.has-result { color: #ff3b30; }
.expand-btn { display: flex; align-items: center; justify-content: center; width: 40rpx; height: 40rpx; flex-shrink: 0; }
.expand-icon { font-size: 18rpx; color: #ccc; transition: transform 0.3s ease; font-weight: 400; }
.expand-icon.expanded { transform: rotate(180deg); color: #999; }
.odds-compact { padding: 16rpx; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10rpx; background: linear-gradient(135deg, rgba(102,126,234,.08) 0%, rgba(118,75,162,.04) 100%); border-top: 2rpx solid rgba(102,126,234,.15); border-radius: 0 0 16rpx 16rpx; }
.odds-item { display: flex; flex-direction: column; gap: 6rpx; padding: 12rpx; background: #fff; border-radius: 10rpx; border: 1rpx solid #e8e8e8; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); text-align: center; }
.odds-label { font-size: 16rpx; color: #999; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
.odds-result { font-size: 18rpx; color: #ff3b30; font-weight: 800; line-height: 1.2; word-break: break-word; }
.odds-odds { font-size: 14rpx; color: #667eea; font-weight: 700; }
.bottom-placeholder { height: 240rpx; }

/* History */
.history-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #f8f9fb; min-height: 0; }
.history-sub-tabs { display: flex; background: #fff; border-bottom: 1rpx solid #f0f0f0; padding: 0 12rpx; }
.sub-tab-item { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16rpx 0; position: relative; }
.sub-tab-text { font-size: 26rpx; color: #666; font-weight: 500; }
.sub-tab-item.active .sub-tab-text { color: #667eea; font-weight: 600; }
.sub-tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 3rpx; background: #667eea; border-radius: 1.5rpx; }
.stats-bar { padding: 16rpx 24rpx; background: #f0f0f0; border-bottom: 1rpx solid #e8e8e8; }
.stats-text { font-size: 24rpx; color: #999; font-weight: 500; }
.history-list { flex: 1; height: 0; padding: 8rpx 12rpx 24rpx 12rpx; }
.load-more { display: flex; align-items: center; justify-content: center; padding: 24rpx 0; gap: 8rpx; }
.load-more-text { font-size: 24rpx; color: #999; }
.no-more { display: flex; align-items: center; justify-content: center; padding: 24rpx 0; }
.no-more-text { font-size: 24rpx; color: #ccc; }
.loading-content { display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.models-list { flex: 1; height: 0; padding: 12rpx 12rpx 24rpx 12rpx; }
.model-item { background: #fff; border-radius: 12rpx; margin-bottom: 12rpx; padding: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); border: 1rpx solid #f0f0f0; transition: all 0.2s ease; }
.model-item:active { transform: translateY(-2rpx); box-shadow: 0 4rpx 12rpx rgba(0,0,0,.1); }
.model-item-header { display: flex; justify-content: space-between; align-items: center; gap: 16rpx; }
.model-item-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.model-item-name { font-size: 26rpx; color: #333; font-weight: 600; }
.model-item-desc { font-size: 22rpx; color: #999; line-height: 1.4; }
.model-arrow { font-size: 24rpx; color: #667eea; font-weight: 600; }

/* Report */
.report-wrapper { padding: 20rpx; }
.back-btn { font-size: 24rpx; color: #667eea; padding: 12rpx 16rpx; margin-bottom: 20rpx; background: rgba(102,126,234,.1); border-radius: 6rpx; display: inline-block; font-weight: 500; }
.report-header { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12rpx; padding: 24rpx; color: #fff; margin-bottom: 24rpx; }
.report-title { font-size: 32rpx; font-weight: 700; display: block; margin-bottom: 12rpx; }
.report-model { font-size: 24rpx; display: block; margin-bottom: 8rpx; opacity: 0.9; }
.report-date-row { display: flex; align-items: center; gap: 8rpx; justify-content: center; margin: 8rpx 0; }
.report-date-label { font-size: 18rpx; opacity: 0.8; }
.report-date { font-size: 20rpx; opacity: 0.9; }
.report-note { font-size: 18rpx; opacity: 0.7; display: block; margin-top: 12rpx; font-style: italic; }
.report-section { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.06); }
.section-title-text { font-size: 24rpx; color: #333; font-weight: 600; margin-bottom: 16rpx; display: block; }
.key-metrics { display: flex; gap: 12rpx; justify-content: space-between; }
.metric-card { flex: 1; background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fb 100%); border-radius: 10rpx; padding: 20rpx; display: flex; flex-direction: column; align-items: center; border: 1rpx solid #e8ebf5; }
.metric-card.accuracy { background: linear-gradient(135deg, #fff0f0 0%, #fff5f5 100%); border-color: #ffe8e8; }
.metric-value { font-size: 32rpx; font-weight: 800; color: #667eea; line-height: 1; margin-bottom: 8rpx; }
.metric-card.accuracy .metric-value { color: #ff3b30; }
.metric-label { font-size: 20rpx; color: #999; }
.prediction-dist { gap: 16rpx; display: flex; flex-direction: column; }
.dist-item { display: flex; align-items: center; gap: 12rpx; }
.dist-label { font-size: 22rpx; color: #333; min-width: 60rpx; font-weight: 500; }
.dist-bar { flex: 1; height: 24rpx; background: #f0f0f0; border-radius: 12rpx; overflow: hidden; }
.dist-fill { height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); transition: width 0.3s ease; }
.dist-value { font-size: 20rpx; color: #667eea; font-weight: 600; min-width: 50rpx; text-align: right; }
.stats-table { gap: 12rpx; display: flex; flex-direction: column; }
.table-row-item { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.table-row-item:last-child { border-bottom: none; }
.table-label { font-size: 22rpx; color: #999; }
.table-value { font-size: 22rpx; color: #333; font-weight: 600; }
</style>
