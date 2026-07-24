<template>
  <view class="hall-page">
    <!-- 顶部区域 -->
    <view class="top-section" :style="{ paddingTop: statusBarHeight + 6 + 'px' }">
      <view class="page-header">
        <view class="header-content">
          <view class="title-section">
            <text class="page-title">大厅</text>
          </view>
        </view>
      </view>
      <!-- Tab 切换 -->
      <view v-if="showDragon" class="tab-header">
        <view class="tab-bg" :style="{ transform: currentTab === 'discovery' ? 'translateX(100%)' : 'translateX(0)' }"></view>
        <view class="tab-item" :class="{ active: currentTab === 'hall' }" @tap="onTabChange('hall')">
          <view class="tab-icon icon-doc">
            <view class="doc-line l1"></view>
            <view class="doc-line l2"></view>
            <view class="doc-line l3"></view>
          </view>
          <text class="tab-text">分享方案</text>
        </view>
        <view class="tab-item" :class="{ active: currentTab === 'discovery' }" @tap="onTabChange('discovery')">
          <view class="tab-icon icon-trend">
            <view class="trend-up"></view>
          </view>
          <text class="tab-text">数据发现</text>
        </view>
      </view>
    </view>

    <!-- 分享大厅 Tab -->
    <view v-if="currentTab === 'hall' && showDragon" class="tab-content">
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
      <view v-else-if="error" class="error-wrapper">
        <text class="error-text">{{ error }}</text>
        <view class="retry-btn" @tap="loadData">重试</view>
      </view>
      <view v-else class="main-content">
        <!-- 排行榜区域 -->
        <view v-if="rankList.length > 0 || bonusRankList.length > 0" class="rank-section">
          <view class="rank-header">
            <view class="rank-type-switcher">
              <view class="rank-type-btn" :class="{ active: rankType === 'winRate' }" @tap="rankType = 'winRate'">
                <text>🏆 胜率榜</text>
              </view>
              <view class="rank-type-btn" :class="{ active: rankType === 'bonus' }" @tap="rankType = 'bonus'">
                <text>💰 金额榜</text>
              </view>
            </view>
            <text class="rank-toggle" @tap="rankExpanded = !rankExpanded">{{ rankExpanded ? '收起' : '展开' }}</text>
          </view>
          <view v-if="rankType === 'winRate'" class="rank-list" :class="{ collapsed: !rankExpanded }">
            <view v-for="(item, index) in rankList" :key="item.userName || index" class="rank-item" @tap="onRankUserTap(item)">
              <view class="rank-medal">
                <text v-if="index === 0">🥇</text>
                <text v-else-if="index === 1">🥈</text>
                <text v-else>🥉</text>
              </view>
              <view class="rank-avatar">
                <image v-if="item.avatar" class="avatar-img" :src="item.avatar" mode="aspectFill" />
                <view v-else class="avatar-fallback">{{ (item.userName || '?')[0] }}</view>
              </view>
              <view class="rank-user">
                <view class="rank-name-row">
                  <text class="rank-name">{{ item.userName }}</text>
                  <view v-if="item.topMedal" class="rank-medal-icon" :class="item.topMedal.colorClass" @tap.stop="onMedalTap(item.topMedal)">
                    <text>{{ item.topMedal.icon }}</text>
                  </view>
                </view>
                <text class="rank-stats">{{ item.winRecords }}中/{{ item.totalRecords }}单</text>
              </view>
              <view class="rank-rate">
                <text class="rate-num">{{ item.winRate }}%</text>
              </view>
            </view>
            <view v-if="rankList.length === 0" class="rank-empty"><text>暂无数据</text></view>
          </view>
          <view v-if="rankType === 'bonus'" class="rank-list" :class="{ collapsed: !rankExpanded }">
            <view v-for="(item, index) in bonusRankList" :key="item.userName || index" class="rank-item" @tap="onRankUserTap(item)">
              <view class="rank-medal">
                <text v-if="index === 0">🥇</text>
                <text v-else-if="index === 1">🥈</text>
                <text v-else>🥉</text>
              </view>
              <view class="rank-avatar">
                <image v-if="item.avatar" class="avatar-img" :src="item.avatar" mode="aspectFill" />
                <view v-else class="avatar-fallback">{{ (item.userName || '?')[0] }}</view>
              </view>
              <view class="rank-user">
                <view class="rank-name-row">
                  <text class="rank-name">{{ item.userName }}</text>
                  <view v-if="item.topMedal" class="rank-medal-icon" :class="item.topMedal.colorClass" @tap.stop="onMedalTap(item.topMedal)">
                    <text>{{ item.topMedal.icon }}</text>
                  </view>
                </view>
                <text class="rank-stats">{{ item.winRecords }}次中奖</text>
              </view>
              <view class="rank-bonus">
                <text class="bonus-num">¥{{ item.totalBonusStr }}</text>
              </view>
            </view>
            <view v-if="bonusRankList.length === 0" class="rank-empty"><text>暂无中奖数据</text></view>
          </view>
        </view>

        <view v-if="recommendations.length === 0" class="empty-state">
          <text class="empty-icon">📭</text>
          <text class="empty-text">暂无分享方案</text>
          <text class="empty-tip">分享你的中奖方案给大家吧</text>
        </view>

        <scroll-view v-else scroll-y class="recommendations-scroll">
          <view v-for="item in recommendations" :key="item.id" class="scheme-item" :class="getStatusClass(item.status)" @tap="onRecordTap(item)">
            <view class="scheme-user-section">
              <view class="user-avatar-wrapper">
                <image v-if="item.userStats && item.userStats.avatar" class="user-avatar" :src="item.userStats.avatar" mode="aspectFill" />
                <view v-else class="user-avatar-fallback">{{ (item.userStats?.userName || '?')[0] }}</view>
              </view>
              <view class="user-meta">
                <view class="user-header">
                  <view class="user-name-medals">
                    <text class="user-name">{{ item.userStats?.userName }}</text>
                    <view v-if="item.userStats?.topMedal" class="user-medal-item" :class="item.userStats.topMedal.colorClass" @tap.stop="onMedalTap(item.userStats.topMedal)">
                      <text class="medal-icon">{{ item.userStats.topMedal.icon }}</text>
                    </view>
                  </view>
                  <view class="badge" :class="getBadgeClass(item.status)">
                    <view class="badge-icon">{{ getStatusIcon(item.status) }}</view>
                    <view class="badge-text">{{ item.statusDesc }}</view>
                  </view>
                </view>
                <view class="user-stats-grid">
                  <view class="stat-item">
                    <view class="stat-value">{{ item.matchCount }}场</view>
                    <view class="stat-label">已选场次</view>
                  </view>
                  <view class="stat-item">
                    <view class="stat-value amount-highlight">{{ item.totalAmount }}</view>
                    <view class="stat-label">{{ item.status === 1 ? '中奖金额' : '投注金额' }}</view>
                  </view>
                  <view class="stat-item stat-label-win-rate">
                    <view class="stat-value">{{ item.winRate }}%</view>
                    <view class="stat-label">历史胜率</view>
                  </view>
                </view>
                <view class="plan-tags-row">
                  <view class="plan-play-tag">{{ item.passTypesStr }}</view>
                  <view class="plan-note">· {{ item.totalBets }}注</view>
                  <view class="open-record" @tap.stop="onRecordTap(item)">→查看方案</view>
                </view>
              </view>
            </view>
            <view class="scheme-arrow">›</view>
          </view>
          <view class="bottom-placeholder"></view>
        </scroll-view>

        <!-- 单关计划悬浮按钮 -->
        <view v-if="showDragon" class="dragon-floating-btn" :style="{ left: (dragPosition.x || 20) + 'px', top: (dragPosition.y || 300) + 'px' }" @tap="onDragonAnalysis" @touchstart="onDragStart" @touchmove="onDragMove" @touchend="onDragEnd">
          <view class="dragon-btn-inner">
            <view class="dragon-btn-glow"></view>
            <view class="dragon-icon-circle">
              <text class="dragon-icon-text">⚡</text>
            </view>
            <text class="dragon-label">单关计划</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 数据发现 Tab -->
    <view v-if="currentTab === 'discovery'" class="tab-content discovery-tab">
      <view v-if="leaguesLoading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载联赛中...</text>
      </view>
      <view v-else-if="leaguesError" class="error-wrapper">
        <text class="error-text">{{ leaguesError }}</text>
        <view class="retry-btn" @tap="loadLeagues">重试</view>
      </view>
      <scroll-view v-else scroll-y class="discovery-scroll">
        <view class="league-section">
          <view v-if="hotLeagues.length > 0" class="league-category">
            <view class="category-header">
              <text class="category-icon">🔥</text>
              <text class="category-title">热门联赛</text>
            </view>
            <view class="league-grid">
              <view v-for="item in hotLeagues" :key="item.id" class="league-card" :class="{ active: selectedLeague && selectedLeague.id === item.id }" @tap="onSelectLeague(item)">
                <image v-if="item.logoUrl" class="league-logo" :src="item.logoUrl" mode="aspectFit" />
                <view v-else class="league-logo-placeholder">{{ item.firstChar || '?' }}</view>
                <text class="league-name">{{ item.leagueAbbrCnName || item.leagueName }}</text>
              </view>
            </view>
          </view>
          <view v-if="otherLeagues.length > 0" class="league-category">
            <view class="category-header" @tap="otherLeaguesExpanded = !otherLeaguesExpanded">
              <text class="category-icon">⚽</text>
              <text class="category-title">全部联赛</text>
              <text class="category-count">{{ otherLeagues.length }}个</text>
              <view class="category-toggle" :class="{ expanded: otherLeaguesExpanded }">
                <text>›</text>
              </view>
            </view>
            <view class="league-grid" :class="{ collapsed: !otherLeaguesExpanded }">
              <view v-for="item in otherLeagues" :key="item.id" class="league-card" :class="{ active: selectedLeague && selectedLeague.id === item.id }" @tap="onSelectLeague(item)">
                <image v-if="item.logoUrl" class="league-logo" :src="item.logoUrl" mode="aspectFit" />
                <view v-else class="league-logo-placeholder">{{ item.firstChar || '?' }}</view>
                <text class="league-name">{{ item.leagueAbbrCnName || item.leagueName }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="selectedLeague" class="season-section">
          <view class="section-title">{{ selectedLeague.leagueName }} - 赛季</view>
          <view v-if="seasonsLoading" class="season-loading">
            <view class="mini-spinner"></view><text>加载赛季...</text>
          </view>
          <scroll-view v-else scroll-x enhanced :show-scrollbar="false" class="season-scroll">
            <view class="season-list">
              <view v-for="item in seasons" :key="item.seasonId || item.id" class="season-item" :class="{ active: selectedSeason && (selectedSeason.id === item.id || selectedSeason.seasonId === item.seasonId) }" @tap="onSelectSeason(item)">
                <text class="season-name">{{ item.seasonName }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
        <view v-if="selectedSeason" class="standing-section">
          <view class="standing-type-tabs">
            <view class="type-tab" :class="{ active: standingType === 'total' }" @tap="standingType = 'total'"><text>总积分榜</text></view>
            <view class="type-tab" :class="{ active: standingType === 'home' }" @tap="standingType = 'home'"><text>主场</text></view>
            <view class="type-tab" :class="{ active: standingType === 'away' }" @tap="standingType = 'away'"><text>客场</text></view>
          </view>
          <view v-if="standingsLoading" class="standing-loading">
            <view class="mini-spinner"></view><text>加载排名...</text>
          </view>
          <view v-else-if="standings.length > 0" class="standing-table">
            <view class="table-header">
              <text class="col-rank">名</text>
              <text class="col-team">球队</text>
              <text class="col-played">场</text>
              <text class="col-win">胜</text>
              <text class="col-draw">平</text>
              <text class="col-loss">负</text>
              <text class="col-gf">进</text>
              <text class="col-ga">失</text>
              <text class="col-gd">净</text>
              <text class="col-pts">分</text>
            </view>
            <view class="table-body">
              <view v-for="(item, index) in standings" :key="item.id || index" class="table-row" :class="{ 'top-zone': index < 4, 'bottom-zone': index >= standings.length - 3 }">
                <text class="col-rank" :class="{ 'rank-top': index < 4 }">{{ item.ranking }}</text>
                <text class="col-team">{{ item.teamAbbrCnName }}</text>
                <text class="col-played">{{ item.totalLegCnt }}</text>
                <text class="col-win">{{ item.winGoalMatchCnt }}</text>
                <text class="col-draw">{{ item.drawMatchCnt }}</text>
                <text class="col-loss">{{ item.lossGoalMatchCnt }}</text>
                <text class="col-gf">{{ item.goalCnt }}</text>
                <text class="col-ga">{{ item.lossGoalCnt }}</text>
                <text class="col-gd" :class="{ positive: item.netGoal > 0, negative: item.netGoal < 0 }">{{ item.netGoal > 0 ? '+' : '' }}{{ item.netGoal }}</text>
                <text class="col-pts">{{ item.points }}</text>
              </view>
            </view>
          </view>
          <view v-else class="standing-empty"><text>暂无排名数据</text></view>
        </view>
        <view v-if="!selectedLeague" class="discovery-tip">
          <text class="tip-icon">📊</text>
          <text class="tip-text">请选择联赛查看积分榜</text>
        </view>
        <view class="safe-bottom"></view>
      </scroll-view>
    </view>

    <!-- 勋章介绍弹窗 -->
    <view v-if="showMedalPopup" class="medal-info-mask" @tap="showMedalPopup = false">
      <view class="medal-info-popup" @tap.stop>
        <view class="medal-info-icon">{{ currentMedal.icon }}</view>
        <view class="medal-info-title-row">
          <text class="medal-info-badge" :class="currentMedal.badgeClass || 'badge-default'">{{ currentMedal.badgeText }}</text>
          <text class="medal-info-name">{{ currentMedal.medalName || '勋章' }}</text>
        </view>
        <text class="medal-info-desc">{{ currentMedal.medalMeaning || '' }}</text>
        <view class="medal-info-close" @tap="showMedalPopup = false">知道了</view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, reactive } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import * as matchApi from '@/api/match'
import * as userApi from '@/api/user'
import * as leagueApi from '@/api/league'
import EmptyState from '@/components/EmptyState.vue'

export default {
  components: { EmptyState },
  setup() {
    const statusBarHeight = ref(20)
    onLoad(() => {
      try {
        const sysInfo = uni.getSystemInfoSync()
        statusBarHeight.value = sysInfo.statusBarHeight || 20
        const windowWidth = sysInfo.windowWidth
        const windowHeight = sysInfo.windowHeight
        dragPosition.x = windowWidth - 122 - 20
        dragPosition.y = windowHeight - 60 - 100
      } catch (e) {}
      checkFeaturesFn()
      loadData()
    })

    onShow(() => {
      // 同步 tabBar 选中状态
      // #ifdef MP-WEIXIN
      const pages = getCurrentPages()
      const curPage = pages[pages.length - 1]
      if (curPage && typeof curPage.getTabBar === 'function' && curPage.getTabBar()) {
        curPage.getTabBar().setData({ selectedPath: '/pages/calculator-hall/index' })
      }
      // #endif
    })

    const currentTab = ref('hall')
    const showDragon = ref(true)
    const loading = ref(true)
    const error = ref(null)
    const recommendations = ref([])
    const rankList = ref([])
    const bonusRankList = ref([])
    const rankType = ref('winRate')
    const rankExpanded = ref(false)
    const dragPosition = reactive({ x: 20, y: 280 })
    let dragStart = { x: 0, y: 0 }
    let isDragging = false

    const leaguesLoading = ref(true)
    const leaguesError = ref(null)
    const hotLeagues = ref([])
    const otherLeagues = ref([])
    const otherLeaguesExpanded = ref(false)
    const selectedLeague = ref(null)
    const seasons = ref([])
    const seasonsLoading = ref(false)
    const selectedSeason = ref(null)
    const standings = ref([])
    const standingsLoading = ref(false)
    const standingType = ref('total')

    const showMedalPopup = ref(false)
    const currentMedal = ref({})

    async function checkFeaturesFn() {
      try {
        const result = await matchApi.checkFeatures()
        const dragonEnabled = result === true
        showDragon.value = dragonEnabled
        if (!dragonEnabled) {
          currentTab.value = 'discovery'
          loadLeagues()
        }
      } catch (e) {
        // 接口异常时默认开启大厅，避免因网络问题白屏
        showDragon.value = true
      }
    }

    function onTabChange(tab) {
      if (tab === currentTab.value) return
      currentTab.value = tab
      if (tab === 'discovery' && hotLeagues.value.length === 0 && otherLeagues.value.length === 0) {
        loadLeagues()
      }
    }

    async function loadData() {
      loading.value = true; error.value = null
      try {
        const res = await matchApi.getCalculatorRecommendList()
        const rawRecords = (res && res.data) || (Array.isArray(res) ? res : [])

        // 按用户ID分组，统计用户战绩和中奖金额
        const userStatsMap = {}
        rawRecords.forEach(item => {
          const userId = item.userId || item.oduserId
          if (!userId) return
          if (!userStatsMap[userId]) {
            userStatsMap[userId] = {
              oduserId: userId,
              userName: item.userName || `用户${userId}`,
              avatar: item.avatar || '',
              totalRecords: 0,
              winRecords: 0,
              pendingRecords: 0,
              totalBonus: 0
            }
          }
          const stat = userStatsMap[userId]
          if (item.status === 1) {
            stat.winRecords++
            stat.totalRecords++
            stat.totalBonus += parseFloat(item.actualBonus) || 0
          } else if (item.status === 2) {
            stat.totalRecords++
          } else {
            stat.pendingRecords++
          }
        })

        // 获取每个用户的勋章
        const userIds = Object.keys(userStatsMap)
        await Promise.all(userIds.map(async (userId) => {
          try {
            const medals = await userApi.getUserMedals(userId).catch(() => [])
            const medalList = Array.isArray(medals) ? medals : (medals && medals.data) || []
            const acquiredMedals = medalList
              .filter(m => m.acquireTime && m.acquireTime !== 'null' && m.acquireTime !== '')
              .sort((a, b) => (b.level || 0) - (a.level || 0))
            const topMedal = acquiredMedals.length > 0 ? acquiredMedals[0] : null
            if (topMedal) {
              userStatsMap[userId].topMedal = {
                ...topMedal,
                icon: getMedalIcon(topMedal.level),
                colorClass: getMedalColorClass(topMedal.level),
                levelBadge: getMedalLevelName(topMedal.level)
              }
            }
          } catch (e) {
            userStatsMap[userId].topMedal = null
          }
        }))

        // 构建推荐列表
        recommendations.value = rawRecords.map(item => {
          const userId = item.userId || item.oduserId
          const userStat = userStatsMap[userId] || { userName: '', avatar: '', topMedal: null }
          const totalRecords = userStat.totalRecords || 0
          const winRate = totalRecords > 0 ? Math.round((userStat.winRecords / totalRecords) * 100) : 0
          const matchCount = item.matchDetails ? item.matchDetails.length : (item.matchCount || 0)
          return {
            ...item,
            matchCount,
            passTypesStr: item.passTypesStr || formatPassTypes(item.passTypes),
            userStats: userStat,
            winRate
          }
        })

        // 胜率排行榜 top 3
        rankList.value = Object.values(userStatsMap)
          .filter(u => u.totalRecords >= 1)
          .map(u => ({
            ...u,
            winRate: u.totalRecords > 0 ? Math.round((u.winRecords / u.totalRecords) * 100) : 0
          }))
          .sort((a, b) => {
            if (b.winRate !== a.winRate) return b.winRate - a.winRate
            return b.winRecords - a.winRecords
          })
          .slice(0, 3)

        // 中奖金额排行榜 top 3
        bonusRankList.value = Object.values(userStatsMap)
          .filter(u => u.totalBonus > 0)
          .map(u => ({
            ...u,
            totalBonusStr: formatBonus(u.totalBonus)
          }))
          .sort((a, b) => b.totalBonus - a.totalBonus)
          .slice(0, 3)

        // 上报中奖统计
        for (const userId of userIds) {
          const stat = userStatsMap[userId]
          if (stat.totalBonus > 0) {
            matchApi.saveBonusStats({ userId, bonusList: [], totalBonus: stat.totalBonus }).catch(() => {})
          }
        }
      } catch (e) { error.value = e.message || '加载失败' }
      finally { loading.value = false }
    }

    function onRetry() { loadData() }

    async function loadLeagues() {
      leaguesLoading.value = true; leaguesError.value = null
      try {
        const leagues = await leagueApi.getLeagueList().catch(() => [])
        const activeLeagues = (leagues || [])
          .filter(item => item.status === 1)
          .map(item => ({
            ...item,
            firstChar: (item.leagueAbbrCnName || item.leagueName || '').substring(0, 1)
          }))
        hotLeagues.value = activeLeagues
          .filter(item => item.leagueCategory === 'hot')
          .sort((a, b) => (a.displaySort || 999) - (b.displaySort || 999))
        otherLeagues.value = activeLeagues
          .filter(item => item.leagueCategory !== 'hot')
          .sort((a, b) => (a.displaySort || 999) - (b.displaySort || 999))
      } catch (e) { leaguesError.value = e.message || '加载失败' }
      finally { leaguesLoading.value = false }
    }

    async function onSelectLeague(league) {
      selectedLeague.value = league
      selectedSeason.value = null
      standings.value = []
      if (!league?.id) return
      seasonsLoading.value = true
      try {
        const seasonsList = await leagueApi.getSeasonList(league.id).catch(() => [])
        seasons.value = (seasonsList || [])
          .filter(item => item.status === 1)
          .sort((a, b) => (b.seasonYear || 0) - (a.seasonYear || 0))
      } catch (e) {} finally { seasonsLoading.value = false }
    }

    async function onSelectSeason(season) {
      selectedSeason.value = season
      standingsLoading.value = true
      standings.value = []
      try {
        const standingsList = await leagueApi.getStanding(selectedLeague.value.id, season.seasonId || season.id).catch(() => [])
        const allStandings = (standingsList || []).filter(item => item.status === 1)
        standings.value = allStandings.filter(item => item.tableType === standingType.value)
          .sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
      } catch (e) {} finally { standingsLoading.value = false }
    }

    // ========== 辅助函数 ==========
    function getMedalIcon(level) {
      const iconMap = { 1: '🌱', 2: '🎊', 3: '💎', 4: '🎁', 5: '☀️', 6: '🏆', 7: '👑' }
      return iconMap[level] || '🏅'
    }
    function getMedalColorClass(level) {
      const colorMap = { 1: 'medal-green', 2: 'medal-blue', 3: 'medal-purple', 4: 'medal-pink', 5: 'medal-orange', 6: 'medal-gold', 7: 'medal-rainbow' }
      return colorMap[level] || 'medal-default'
    }
    function getMedalLevelName(level) {
      const nameMap = { 1: '一级', 2: '二级', 3: '三级', 4: '四级', 5: '五级', 6: '六级', 7: '七级' }
      return nameMap[level] || ''
    }
    function getMedalBadgeClass(level) {
      const classMap = { 1: 'badge-level-1', 2: 'badge-level-2', 3: 'badge-level-3', 4: 'badge-level-4', 5: 'badge-level-5', 6: 'badge-level-6', 7: 'badge-level-7' }
      return classMap[level] || 'badge-default'
    }
    function formatPassTypes(passTypes) {
      if (!passTypes || !Array.isArray(passTypes)) return ''
      const map = { single: '单关', '2_1': '2串1', '3_1': '3串1', '4_1': '4串1', '5_1': '5串1', '6_1': '6串1', '7_1': '7串1', '8_1': '8串1' }
      return passTypes.map(p => map[p] || p).join('/')
    }
    function formatBonus(bonus) {
      if (bonus >= 10000) return (bonus / 10000).toFixed(2) + '万'
      return bonus.toFixed(2)
    }

    function getStatusClass(status) {
      if (status === 1) return 'status-won'
      if (status === 2) return 'status-lost'
      return 'status-pending'
    }
    function getBadgeClass(status) {
      if (status === 1) return 'tag-won'
      if (status === 2) return 'tag-lost'
      return 'tag-pending'
    }
    function getStatusIcon(status) {
      if (status === 1) return '✓'
      if (status === 2) return '✗'
      return '⏳'
    }

    function onRecordTap(item) {
      uni.navigateTo({ url: `/pages/calculator-detail/index?id=${item.id}` })
    }
    function onRankUserTap(item) {
      uni.navigateTo({ url: `/pages/user-schemes/index?userId=${item.oduserId || item.userId}&userName=${item.userName}` })
    }
    function onMedalTap(medal) {
      currentMedal.value = {
        ...medal,
        badgeText: 'Lv.' + medal.level,
        badgeClass: getMedalBadgeClass(medal.level)
      }
      showMedalPopup.value = true
    }
    function onDragonAnalysis() {
      if (isDragging) return
      uni.navigateTo({ url: '/pages/dragon-analysis/index' })
    }
    function onDragStart(e) {
      const touch = e.touches[0]
      dragStart = { x: touch.clientX - dragPosition.x, y: touch.clientY - dragPosition.y }
    }
    function onDragMove(e) {
      isDragging = true
      const touch = e.touches[0]
      const winWidth = uni.getSystemInfoSync().windowWidth
      dragPosition.x = Math.max(0, Math.min(winWidth - 190, touch.clientX - dragStart.x))
      dragPosition.y = Math.max(80, Math.min(uni.getSystemInfoSync().windowHeight - 160, touch.clientY - dragStart.y))
    }
    function onDragEnd() { setTimeout(() => { isDragging = false }, 100) }
    function onRetry() { loadData() }

    return {
      statusBarHeight, currentTab, showDragon, loading, error, recommendations, rankList, bonusRankList,
      rankType, rankExpanded, dragPosition, onDragStart, onDragMove, onDragEnd,
      leaguesLoading, leaguesError, hotLeagues, otherLeagues, otherLeaguesExpanded,
      selectedLeague, seasons, seasonsLoading, selectedSeason, standings, standingsLoading, standingType,
      showMedalPopup, currentMedal,
      getStatusClass, getBadgeClass, getStatusIcon,
      loadData, loadLeagues, onSelectLeague, onSelectSeason, onRecordTap, onRankUserTap,
      onMedalTap, onDragonAnalysis, onRetry, onTabChange, checkFeaturesFn
    }
  }
}
</script>

<style scoped>
.hall-page { height: 100vh; background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); display: flex; flex-direction: column; overflow: hidden; }
.page-header { padding: 20rpx 32rpx; padding-right: 200rpx; }
.header-content { display: flex; align-items: center; justify-content: space-between; }
.title-section { display: flex; align-items: center; }
.page-title { font-size: 33rpx; color: #fff; font-weight: 700; letter-spacing: 1rpx; text-shadow: 0 2rpx 8rpx rgba(0,0,0,.15); }

.tab-header { position: relative; display: flex; margin: 0 36rpx 20rpx; padding: 5rpx; background: rgba(255,255,255,.15); border-radius: 44rpx; backdrop-filter: blur(10px); }
.tab-bg { position: absolute; top: 5rpx; left: 5rpx; width: calc(50% - 5rpx); height: calc(100% - 10rpx); background: #fff; border-radius: 44rpx; transition: transform 0.3s ease; box-shadow: 0 3rpx 12rpx rgba(0,0,0,.09); }
.tab-item { position: relative; flex: 1; display: flex; align-items: center; justify-content: center; gap: 7rpx; padding: 17rpx 0; z-index: 1; }
.tab-icon { display: flex; align-items: center; justify-content: center; width: 36rpx; height: 28rpx; }
.icon-doc { flex-direction: column; gap: 4rpx; padding: 4rpx 0; }
.doc-line { height: 4rpx; border-radius: 2rpx; background: rgba(255,255,255,.7); transition: all 0.3s; }
.doc-line.l1 { width: 22rpx; } .doc-line.l2 { width: 18rpx; } .doc-line.l3 { width: 14rpx; }
.tab-item.active .doc-line { background: #667eea; }
.icon-trend { position: relative; }
.trend-up { width: 0; height: 0; border-left: 10rpx solid transparent; border-right: 10rpx solid transparent; border-bottom: 22rpx solid rgba(255,255,255,.7); position: relative; transition: all 0.3s; }
.tab-item.active .trend-up { border-bottom-color: #667eea; }
.tab-text { font-size: 26rpx; color: rgba(255,255,255,.8); font-weight: 500; transition: all 0.3s; }
.tab-item.active .tab-text { color: #667eea; font-weight: 700; }

.tab-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #f0f2f5; border-radius: 40rpx 40rpx 0 0; padding-top: 24rpx; }
.discovery-tab { border-radius: 40rpx 40rpx 0 0; padding-top: 24rpx; }
.loading-wrapper, .error-wrapper { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 40rpx; }
.loading-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid rgba(102,126,234,.2); border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text, .error-text { margin-top: 20rpx; font-size: 28rpx; color: #666; }
.retry-btn { margin-top: 24rpx; padding: 16rpx 48rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border-radius: 50rpx; font-size: 28rpx; font-weight: 500; box-shadow: 0 4rpx 16rpx rgba(102,126,234,.3); }

.main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.rank-section { background: #fff; margin: 0 24rpx 24rpx; border-radius: 24rpx; overflow: hidden; box-shadow: 0 4rpx 20rpx rgba(0,0,0,.06); }
.rank-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20rpx 24rpx; display: flex; justify-content: space-between; align-items: center; }
.rank-type-switcher { display: flex; gap: 12rpx; }
.rank-type-btn { padding: 10rpx 20rpx; border-radius: 50rpx; background: rgba(255,255,255,.2); transition: all 0.3s; }
.rank-type-btn text { font-size: 24rpx; color: rgba(255,255,255,.8); font-weight: 500; }
.rank-type-btn.active { background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.1); }
.rank-type-btn.active text { color: #667eea; font-weight: 700; }
.rank-toggle { font-size: 24rpx; color: rgba(255,255,255,.9); padding: 8rpx 16rpx; }
.rank-list { padding: 16rpx; max-height: 500rpx; overflow: hidden; transition: max-height 0.3s ease; }
.rank-list.collapsed { max-height: 0; padding: 0 16rpx; }
.rank-item { display: flex; align-items: center; padding: 16rpx 8rpx; border-bottom: 1rpx solid #f5f5f5; }
.rank-item:last-child { border-bottom: none; }
.rank-medal { width: 48rpx; font-size: 32rpx; text-align: center; }
.rank-avatar { width: 56rpx; height: 56rpx; margin-right: 16rpx; }
.avatar-img { width: 56rpx; height: 56rpx; border-radius: 50%; background: #f0f0f0; }
.avatar-fallback { width: 56rpx; height: 56rpx; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; }
.rank-user { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.rank-name-row { display: flex; align-items: center; gap: 8rpx; }
.rank-name { font-size: 28rpx; color: #333; font-weight: 600; }
.rank-medal-icon { width: 42rpx; height: 42rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; background: transparent; }
.rank-stats { font-size: 20rpx; color: #999; }
.rank-rate { min-width: 80rpx; text-align: right; }
.rate-num { font-size: 28rpx; font-weight: 700; color: #ff6b6b; }
.rank-bonus { min-width: 100rpx; text-align: right; }
.bonus-num { font-size: 26rpx; font-weight: 700; color: #ff6b6b; }
.rank-empty { padding: 40rpx; text-align: center; color: #999; font-size: 26rpx; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 120rpx 40rpx; }
.empty-icon { font-size: 140rpx; margin-bottom: 32rpx; opacity: 0.6; }
.empty-text { font-size: 36rpx; color: #666; font-weight: 600; margin-bottom: 16rpx; }
.empty-tip { font-size: 28rpx; color: #999; text-align: center; }

.recommendations-scroll { flex: 1; height: 0; padding: 0 24rpx 24rpx; }
.scheme-item { background: #fff; border-radius: 24rpx; padding: 0; box-shadow: 0 4rpx 20rpx rgba(0,0,0,.05); transition: all 0.3s ease; position: relative; overflow: hidden; margin-bottom: 24rpx; display: flex; align-items: stretch; }
.scheme-item:active { box-shadow: 0 8rpx 32rpx rgba(0,0,0,.1); transform: translateY(-2rpx); }
.scheme-item::after { content: ''; position: absolute; top: 0; left: 0; width: 6rpx; height: 100%; }
.scheme-item.status-pending::after { background: linear-gradient(180deg, #52c41a 0%, #73d13d 100%); }
.scheme-item.status-won::after { background: linear-gradient(180deg, #ff4d4f 0%, #ff7875 100%); }
.scheme-item.status-lost::after { background: linear-gradient(180deg, #999 0%, #bfbfbf 100%); }
.scheme-user-section { display: flex; align-items: flex-start; gap: 16rpx; padding: 24rpx; padding-right: 64rpx; position: relative; flex: 1; min-width: 0; }
.user-avatar-wrapper { flex-shrink: 0; }
.user-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #f0f0f0; border: 3rpx solid #e8e8e8; }
.user-avatar-fallback { width: 56rpx; height: 56rpx; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; border: 3rpx solid rgba(102,126,234,.3); }
.user-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.user-header { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.user-name-medals { display: flex; align-items: center; gap: 8rpx; }
.user-name { font-size: 32rpx; color: #333; font-weight: 700; }
.user-medal-item { width: 36rpx; height: 36rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: transparent; }
.user-medal-item .medal-icon { font-size: 24rpx; }
.badge { display: flex; align-items: center; gap: 4rpx; padding: 8rpx 16rpx; border-radius: 50rpx; font-size: 22rpx; font-weight: 600; flex-shrink: 0; }
.tag-pending { background: rgba(82,196,26,.1); color: #52c41a; }
.tag-won { background: rgba(255,77,79,.1); color: #ff4d4f; }
.tag-lost { background: rgba(153,153,153,.1); color: #999; }
.badge-icon { font-size: 18rpx; margin-right: 2rpx; }
.badge-text { font-size: 22rpx; }
.user-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; margin-top: 8rpx; }
.stat-item { background: #f8f9fb; border-radius: 16rpx; padding: 20rpx 12rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx; }
.stat-value { font-weight: 700; font-size: 36rpx; color: #333; line-height: 1; }
.stat-value.win-color { color: #ff6b6b; }
.stat-value.lose-color { color: #999; }
.stat-value.rate-color { color: #667eea; }
.stat-label { font-size: 22rpx; color: #999; line-height: 1; }
.stat-label-win-rate { background: linear-gradient(135deg, #fff9e6 0%, #fff1cc 100%); }
.stat-label-win-rate .stat-value { color: #fa8c16; }
.amount-highlight { color: #fa8c16; font-weight: 800; }
.plan-tags-row { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; }
.plan-play-tag { background: linear-gradient(135deg, #eef2ff 0%, #e6eaff 100%); color: #667eea; padding: 10rpx 20rpx; border-radius: 50rpx; font-size: 24rpx; font-weight: 600; }
.plan-note { font-size: 26rpx; color: #999; }
.open-record { font-size: 26rpx; color: #667eea; font-weight: 600; margin-left: auto; }
.scheme-arrow { position: absolute; right: 24rpx; top: 50%; transform: translateY(-50%); font-size: 36rpx; color: #d9d9d9; font-weight: 300; }
.bottom-placeholder { height: calc(env(safe-area-inset-bottom) + 120rpx); }

.dragon-floating-btn { position: fixed; width: 190rpx; height: 80rpx; z-index: 99; display: flex; align-items: center; justify-content: center; animation: btn-float 3s ease-in-out infinite; transition: filter 0.3s ease; }
.dragon-floating-btn:active { filter: drop-shadow(0 3rpx 12rpx rgba(139,92,246,.35)) drop-shadow(0 0 20rpx rgba(168,85,247,.2)); animation: none; }
@keyframes btn-float { 0%,100% { filter: drop-shadow(0 6rpx 24rpx rgba(139,92,246,.5)) drop-shadow(0 0 40rpx rgba(168,85,247,.3)); } 50% { filter: drop-shadow(0 10rpx 32rpx rgba(139,92,246,.6)) drop-shadow(0 0 50rpx rgba(168,85,247,.45)); } }
.dragon-btn-inner { position: relative; width: 100%; height: 100%; display: flex; align-items: center; gap: 10rpx; padding: 0 34rpx 0 12rpx; background: linear-gradient(135deg, #0c0a1d 0%, #1a103c 35%, #1e1748 70%, #0f0d28 100%); border-radius: 40rpx; box-shadow: 0 0 0 2rpx rgba(147,112,219,.4), 0 0 12rpx rgba(139,92,246,.3), inset 0 2rpx 0 rgba(255,255,255,.1); overflow: hidden; transition: transform 0.2s ease, box-shadow 0.3s ease; }
.dragon-btn-inner::before { content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent); transform: skewX(-25deg); animation: shimmer-sweep 3s ease-in-out infinite; z-index: 2; pointer-events: none; }
.dragon-btn-inner::after { content: ''; position: absolute; top: 0; left: 16rpx; right: 16rpx; height: 38%; background: linear-gradient(180deg, rgba(255,255,255,.09) 0%, rgba(255,255,255,0) 100%); border-radius: 40rpx 40rpx 0 0; z-index: 1; pointer-events: none; }
.dragon-btn-inner:active { transform: scale(0.94); }
@keyframes shimmer-sweep { 0% { left: -100%; } 60% { left: 150%; } 100% { left: 150%; } }
.dragon-btn-glow { position: absolute; bottom: -6rpx; left: 14rpx; right: 14rpx; height: 14rpx; background: linear-gradient(135deg, #a78bfa, #7c3aed); border-radius: 0 0 40rpx 40rpx; opacity: 0.4; filter: blur(8rpx); z-index: -1; animation: glow-pulse 2.5s ease-in-out infinite; }
@keyframes glow-pulse { 0%,100% { opacity: .3; filter: blur(8rpx); } 50% { opacity: .6; filter: blur(12rpx); } }
.dragon-icon-circle { position: relative; width: 56rpx; height: 56rpx; flex-shrink: 0; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #8b5cf6 50%, #a855f7 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 16rpx rgba(102,126,234,.45), inset 0 1rpx 2rpx rgba(255,255,255,.3); animation: icon-glow 2.5s ease-in-out infinite; z-index: 3; }
@keyframes icon-glow { 0%,100% { box-shadow: 0 4rpx 16rpx rgba(102,126,234,.45), inset 0 1rpx 2rpx rgba(255,255,255,.3); } 50% { box-shadow: 0 8rpx 32rpx rgba(102,126,234,.65), inset 0 1rpx 2rpx rgba(255,255,255,.4); } }
.dragon-icon-text { font-size: 30rpx; line-height: 1; z-index: 1; }
.dragon-label { font-size: 26rpx; font-weight: 700; color: #e0e7ff; letter-spacing: 1rpx; white-space: nowrap; line-height: 1; z-index: 3; text-shadow: 0 0 8rpx rgba(139,92,246,.4), 0 1rpx 2rpx rgba(0,0,0,.5); }

/* 数据发现 */
.discovery-scroll { flex: 1; height: 0; padding: 0 24rpx 24rpx; }
.league-section { display: flex; flex-direction: column; gap: 24rpx; }
.league-category { background: #fff; border-radius: 24rpx; padding: 24rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,.04); }
.category-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 20rpx; padding-bottom: 16rpx; border-bottom: 1rpx solid #f0f0f0; }
.category-icon { font-size: 32rpx; }
.category-title { font-size: 28rpx; font-weight: 700; color: #333; }
.category-count { font-size: 24rpx; color: #999; margin-left: auto; }
.category-toggle { width: 36rpx; height: 36rpx; display: flex; align-items: center; justify-content: center; margin-left: 8rpx; transition: transform 0.3s; }
.category-toggle text { font-size: 32rpx; color: #999; font-weight: 500; }
.category-toggle.expanded { transform: rotate(90deg); }
.league-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16rpx; }
.league-grid.collapsed { display: none; }
.league-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16rpx 8rpx; background: #f8f9fb; border-radius: 16rpx; border: 3rpx solid transparent; transition: all 0.2s; min-height: 100rpx; }
.league-card:active { transform: scale(0.96); }
.league-card.active { background: linear-gradient(135deg, rgba(102,126,234,.1) 0%, rgba(118,75,162,.08) 100%); border-color: #667eea; box-shadow: 0 4rpx 12rpx rgba(102,126,234,.2); }
.league-logo { width: 48rpx; height: 48rpx; margin-bottom: 8rpx; border-radius: 10rpx; }
.league-logo-placeholder { width: 48rpx; height: 48rpx; margin-bottom: 8rpx; border-radius: 10rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-size: 24rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; }
.league-name { font-size: 20rpx; color: #333; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; line-height: 1.2; }
.league-card.active .league-name { color: #667eea; font-weight: 600; }

.section-title { font-size: 28rpx; font-weight: 700; color: #333; margin-bottom: 16rpx; }
.season-section { background: #fff; border-radius: 24rpx; padding: 24rpx; margin-top: 24rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,.04); }
.season-loading { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 24rpx; font-size: 24rpx; color: #999; }
.mini-spinner { width: 32rpx; height: 32rpx; border: 3rpx solid #f0f0f0; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; }
.season-scroll { white-space: nowrap; }
.season-list { display: inline-flex; gap: 12rpx; padding: 4rpx 0; }
.season-item { display: inline-flex; align-items: center; padding: 14rpx 24rpx; background: #f5f7fa; border-radius: 50rpx; border: 2rpx solid transparent; transition: all 0.3s; }
.season-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-color: #667eea; }
.season-item.active .season-name { color: #fff; font-weight: 600; }
.season-name { font-size: 24rpx; color: #666; white-space: nowrap; }

.standing-section { background: #fff; border-radius: 24rpx; padding: 24rpx; margin-top: 24rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,.04); }
.standing-type-tabs { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.type-tab { flex: 1; text-align: center; padding: 16rpx 0; background: #f5f7fa; border-radius: 12rpx; font-size: 26rpx; color: #666; transition: all 0.3s; }
.type-tab.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-weight: 600; box-shadow: 0 4rpx 12rpx rgba(102,126,234,.3); }
.standing-loading { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 60rpx; font-size: 24rpx; color: #999; }
.standing-table { overflow-x: auto; }
.table-header { display: flex; align-items: center; padding: 16rpx 8rpx; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12rpx; margin-bottom: 8rpx; }
.table-header text { font-size: 22rpx; color: #fff; font-weight: 500; text-align: center; }
.table-body { display: flex; flex-direction: column; }
.table-row { display: flex; align-items: center; padding: 16rpx 8rpx; border-bottom: 1rpx solid #f5f5f5; }
.table-row:last-child { border-bottom: none; }
.table-row.top-zone { background: rgba(102,126,234,.05); }
.table-row.bottom-zone { background: rgba(255,77,79,.03); }
.table-row text { font-size: 24rpx; color: #333; text-align: center; }
.col-rank { flex: 0.8; font-weight: 600; }
.col-rank.rank-top { color: #667eea; font-weight: 700; }
.col-team { flex: 1.5; text-align: left !important; padding-left: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-played, .col-win, .col-draw, .col-loss, .col-gf, .col-ga, .col-gd { flex: 1; }
.col-pts { flex: 1.1; font-weight: 700; color: #667eea !important; }
.col-gd.positive { color: #52c41a !important; }
.col-gd.negative { color: #ff4d4f !important; }
.standing-empty { display: flex; align-items: center; justify-content: center; padding: 60rpx; font-size: 26rpx; color: #999; }
.discovery-tip { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 40rpx; }
.tip-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.tip-text { font-size: 28rpx; color: #999; }
.safe-bottom { height: calc(env(safe-area-inset-bottom) + 100rpx); }

/* 勋章弹窗 */
.medal-info-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.medal-info-popup { width: 520rpx; background: linear-gradient(180deg, #f8f4ff 0%, #ffffff 60%); border-radius: 24rpx; padding: 48rpx 40rpx 40rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 16rpx 48rpx rgba(124,58,237,.12); border: 2rpx solid rgba(124,58,237,.08); }
.medal-info-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.medal-info-title-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.medal-info-badge { font-size: 22rpx; color: #fff; padding: 4rpx 12rpx; border-radius: 14rpx; font-weight: 700; line-height: 1.3; flex-shrink: 0; }
.medal-info-name { font-size: 34rpx; font-weight: 700; color: #333; margin-bottom: 12rpx; }
.medal-info-desc { font-size: 26rpx; color: #666; text-align: center; line-height: 1.6; margin-bottom: 36rpx; }
.medal-info-close { width: 240rpx; height: 72rpx; line-height: 72rpx; text-align: center; background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%); color: #fff; border-radius: 36rpx; font-size: 28rpx; font-weight: 500; }

.badge-default { background: linear-gradient(135deg, #8c8c8c 0%, #595959 100%); }

/* 角标等级颜色 */
.badge-level-1 { background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%); }
.badge-level-2 { background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); }
.badge-level-3 { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); }
.badge-level-4 { background: linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%); }
.badge-level-5 { background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%); }
.badge-level-6 { background: linear-gradient(135deg, #f5222d 0%, #cf1322 100%); }
.badge-level-7 { background: linear-gradient(135deg, #f5222d 0%, #1890ff 33%, #52c41a 66%, #fa8c16 100%); }

/* 勋章颜色 */
.medal-green { background: transparent; }
.medal-blue { background: transparent; }
.medal-purple { background: transparent; }
.medal-pink { background: transparent; }
.medal-orange { background: transparent; }
.medal-gold { background: transparent; }
.medal-rainbow { background: transparent; }
.medal-default { background: transparent; }

.amount-highlight { color: #fa8c16; font-weight: 800; }

/* 胜率榜样式 */
.stat-value.win-color { color: #ff6b6b; }
.stat-value.lose-color { color: #999; }
.stat-value.rate-color { color: #667eea; }
.stat-label-win-rate .stat-label { color: #8b6914; }
</style>
