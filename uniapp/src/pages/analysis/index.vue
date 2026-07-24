<template>
  <view class="analysis-page">
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
      title="加载失败"
      :description="error"
      button-text="重试"
      @button-tap="onRetry"
    />

    <!-- 主内容 -->
    <block v-else-if="match">
      <!-- 比赛信息头部 -->
      <view class="match-header">
        <view class="league-row">
          <text class="league">{{ match.league }}</text>
          <text class="time">{{ match.fullMatchTime }}</text>
        </view>
        <view class="teams-row">
          <view class="team-info">
            <text class="team-name">{{ match.homeTeam }}</text>
            <text v-if="match.homeTeamRank" class="team-rank">[{{ match.homeTeamRank }}]</text>
          </view>
          <view class="vs-info">
            <text class="vs">VS</text>
          </view>
          <view class="team-info">
            <text class="team-name">{{ match.awayTeam }}</text>
            <text v-if="match.awayTeamRank" class="team-rank">[{{ match.awayTeamRank }}]</text>
          </view>
        </view>
        <view v-if="match.odds" class="odds-row">
          <view class="odds-item">
            <text class="odds-label">主胜</text>
            <text class="odds-value">{{ match.odds.home || '-' }}</text>
          </view>
          <view class="odds-item">
            <text class="odds-label">平局</text>
            <text class="odds-value">{{ match.odds.draw || '-' }}</text>
          </view>
          <view class="odds-item">
            <text class="odds-label">客胜</text>
            <text class="odds-value">{{ match.odds.away || '-' }}</text>
          </view>
        </view>
      </view>

      <!-- 标签页导航 -->
      <scroll-view scroll-x class="tabs-nav" :show-scrollbar="false">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-item', { active: activeTab === tab.key }]"
          @tap="onTabChange(tab.key)"
        >
          <text class="tab-text">{{ tab.name }}</text>
        </view>
      </scroll-view>

      <!-- 标签页内容 -->
      <view class="tabs-content">
        <!-- 排名 -->
        <view v-if="activeTab === 'table'" class="tab-panel">
          <view v-if="tabLoading.table" class="loading-tip">
            <view class="loading-spinner small"></view>
            <text>加载中...</text>
          </view>
          <view v-else-if="!tableData || (!tableData.total && !tableData.home && !tableData.away)" class="empty-tip">
            <text>暂无排名数据</text>
          </view>
          <view v-else class="table-content">
            <view class="table-type-switcher">
              <view
                v-for="t in [{ key: 'total', name: '全部' }, { key: 'home', name: '主' }, { key: 'away', name: '客' }]"
                :key="t.key"
                :class="['type-btn', { active: tableType === t.key }]"
                @tap="tableType = t.key"
              >
                <text>{{ t.name }}</text>
              </view>
            </view>
            <view class="table-wrapper">
              <view class="table-header">
                <text class="col rank">排行</text>
                <text class="col team">队名</text>
                <text class="col matches">赛</text>
                <text class="col win">胜</text>
                <text class="col draw">平</text>
                <text class="col loss">负</text>
                <text class="col goals">进</text>
                <text class="col ga">失</text>
                <text class="col points">积分</text>
              </view>
              <view class="table-body">
                <view
                  v-for="(item, idx) in currentTableData"
                  :key="idx"
                  :class="['table-row', item.teamType === 'home' ? 'home-team' : item.teamType === 'away' ? 'away-team' : '']"
                >
                  <text class="col rank">{{ item.ranking }}</text>
                  <view class="col team">
                    <text v-if="item.teamType" :class="['team-marker', item.teamType]">{{ item.teamType === 'home' ? '主' : '客' }}</text>
                    <text class="t-name">{{ item.teamAbbrCnName }}</text>
                  </view>
                  <text class="col matches">{{ item.winGoalMatchCnt + item.drawMatchCnt + item.lossGoalMatchCnt }}</text>
                  <text class="col win">{{ item.winGoalMatchCnt }}</text>
                  <text class="col draw">{{ item.drawMatchCnt }}</text>
                  <text class="col loss">{{ item.lossGoalMatchCnt }}</text>
                  <text class="col goals">{{ item.goalCnt }}</text>
                  <text class="col ga">{{ item.lossGoalCnt }}</text>
                  <text class="col points">{{ item.points }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 最近比赛 -->
        <view v-if="activeTab === 'recent'" class="tab-panel">
          <view v-if="tabLoading.recent" class="loading-tip">
            <view class="loading-spinner small"></view>
            <text>加载中...</text>
          </view>
          <view v-else-if="!recentData" class="empty-tip">
            <text>暂无最近比赛数据</text>
          </view>
          <view v-else class="recent-content">
            <view v-if="recentData.home" class="team-section">
              <view class="section-header">
                <text class="s-team-name">{{ recentData.home.statistics.teamShortName }}</text>
                <text class="team-subtitle">最近5场</text>
              </view>
              <view class="stats-row">
                <view class="stat-item">
                  <text class="stat-value">{{ recentData.home.statistics.winProbability }}</text>
                  <text class="stat-label">胜率</text>
                </view>
                <view class="stat-item">
                  <text class="stat-value">{{ recentData.home.statistics.goalCnt }}</text>
                  <text class="stat-label">进球</text>
                </view>
                <view class="stat-item">
                  <text class="stat-value">{{ recentData.home.statistics.lossGoalCnt }}</text>
                  <text class="stat-label">失球</text>
                </view>
                <view class="stat-item">
                  <text class="stat-value">{{ recentData.home.statistics.netGoal }}</text>
                  <text class="stat-label">净胜球</text>
                </view>
              </view>
              <view class="match-list">
                <view
                  v-for="(m, idx) in recentData.home.matchList"
                  :key="idx"
                  class="match-item"
                  @tap="onMatchTap(m)"
                >
                  <view class="match-date">{{ m.matchDate }}</view>
                  <view class="match-info">
                    <text class="match-team">{{ m.homeTeamShortName }}</text>
                    <view :class="['match-score', m.teamMatchResult === 'home' ? 'win' : m.teamMatchResult === 'away' ? 'loss' : 'draw']">
                      {{ m.fullCourtGoal }}
                    </view>
                    <text class="match-team">{{ m.awayTeamShortName }}</text>
                  </view>
                  <text class="match-league">{{ m.tournamentShortName }}</text>
                </view>
              </view>
            </view>
            <view v-if="recentData.away" class="team-section">
              <view class="section-header">
                <text class="s-team-name">{{ recentData.away.statistics.teamShortName }}</text>
                <text class="team-subtitle">最近5场</text>
              </view>
              <view class="stats-row">
                <view class="stat-item">
                  <text class="stat-value">{{ recentData.away.statistics.winProbability }}</text>
                  <text class="stat-label">胜率</text>
                </view>
                <view class="stat-item">
                  <text class="stat-value">{{ recentData.away.statistics.goalCnt }}</text>
                  <text class="stat-label">进球</text>
                </view>
                <view class="stat-item">
                  <text class="stat-value">{{ recentData.away.statistics.lossGoalCnt }}</text>
                  <text class="stat-label">失球</text>
                </view>
                <view class="stat-item">
                  <text class="stat-value">{{ recentData.away.statistics.netGoal }}</text>
                  <text class="stat-label">净胜球</text>
                </view>
              </view>
              <view class="match-list">
                <view
                  v-for="(m, idx) in recentData.away.matchList"
                  :key="idx"
                  class="match-item"
                  @tap="onMatchTap(m)"
                >
                  <view class="match-date">{{ m.matchDate }}</view>
                  <view class="match-info">
                    <text class="match-team">{{ m.homeTeamShortName }}</text>
                    <view :class="['match-score', m.teamMatchResult === 'home' ? 'win' : m.teamMatchResult === 'away' ? 'loss' : 'draw']">
                      {{ m.fullCourtGoal }}
                    </view>
                    <text class="match-team">{{ m.awayTeamShortName }}</text>
                  </view>
                  <text class="match-league">{{ m.tournamentShortName }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 历史交锋 -->
        <view v-if="activeTab === 'history'" class="tab-panel">
          <view v-if="tabLoading.history" class="loading-tip">
            <view class="loading-spinner small"></view>
            <text>加载中...</text>
          </view>
          <view v-else-if="historyData.length === 0" class="empty-tip">
            <text>暂无历史交锋数据</text>
          </view>
          <view v-else class="history-list">
            <view v-for="(item, idx) in historyData" :key="idx" class="history-item">
              <view class="item-header">
                <text class="item-date">{{ item.matchDate }}</text>
              </view>
              <view class="item-teams">
                <text class="item-team">{{ item.homeTeam }}</text>
                <text class="item-score">{{ item.score }}</text>
                <text class="item-team">{{ item.awayTeam }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- xG 数据 -->
        <view v-if="activeTab === 'xg'" class="tab-panel">
          <view v-if="tabLoading.xg" class="loading-tip">
            <view class="loading-spinner small"></view>
            <text>加载中...</text>
          </view>
          <view v-else-if="!xgData" class="empty-tip">
            <text>暂无 xG 数据</text>
          </view>
          <view v-else class="xg-content">
            <view v-if="xgData.home" class="xg-team">
              <view class="xg-header">
                <text class="xg-team-name">{{ xgData.home.teamName }}</text>
              </view>
              <view class="xg-stats">
                <view class="stat-row">
                  <text class="s-label">比赛场次</text>
                  <text class="s-value">{{ xgData.home.matches }}</text>
                </view>
                <view class="stat-row">
                  <text class="s-label">胜/平/负</text>
                  <text class="s-value">{{ xgData.home.wins }}/{{ xgData.home.draws }}/{{ xgData.home.loses }}</text>
                </view>
                <view class="stat-row">
                  <text class="s-label">进球/失球</text>
                  <text class="s-value">{{ xgData.home.goals }}/{{ xgData.home.ga }}</text>
                </view>
                <view class="stat-row">
                  <text class="s-label">预期进球 (xG)</text>
                  <text class="s-value highlight">{{ xgData.home.xg }}</text>
                </view>
                <view class="stat-row">
                  <text class="s-label">预期失球 (xGA)</text>
                  <text class="s-value">{{ xgData.home.xga }}</text>
                </view>
              </view>
            </view>
            <view v-if="xgData.away" class="xg-team">
              <view class="xg-header">
                <text class="xg-team-name">{{ xgData.away.teamName }}</text>
              </view>
              <view class="xg-stats">
                <view class="stat-row">
                  <text class="s-label">比赛场次</text>
                  <text class="s-value">{{ xgData.away.matches }}</text>
                </view>
                <view class="stat-row">
                  <text class="s-label">胜/平/负</text>
                  <text class="s-value">{{ xgData.away.wins }}/{{ xgData.away.draws }}/{{ xgData.away.loses }}</text>
                </view>
                <view class="stat-row">
                  <text class="s-label">进球/失球</text>
                  <text class="s-value">{{ xgData.away.goals }}/{{ xgData.away.ga }}</text>
                </view>
                <view class="stat-row">
                  <text class="s-label">预期进球 (xG)</text>
                  <text class="s-value highlight">{{ xgData.away.xg }}</text>
                </view>
                <view class="stat-row">
                  <text class="s-label">预期失球 (xGA)</text>
                  <text class="s-value">{{ xgData.away.xga }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 相似比赛 -->
        <view v-if="activeTab === 'similar'" class="tab-panel">
          <view v-if="tabLoading.similar" class="loading-tip">
            <view class="loading-spinner small"></view>
            <text>加载中...</text>
          </view>
          <view v-else-if="similarData.length === 0" class="empty-tip">
            <text>暂无相似比赛数据</text>
          </view>
          <view v-else class="similar-list">
            <view v-for="(item, idx) in similarData" :key="idx" class="similar-item">
              <view class="item-header">
                <text class="item-league">{{ item.league }}</text>
              </view>
              <view class="item-teams">
                <text class="item-team">{{ item.homeTeam }}</text>
                <text class="item-score">{{ item.score }}</text>
                <text class="item-team">{{ item.awayTeam }}</text>
              </view>
              <view class="item-odds">
                <text class="odds">{{ item.h }}</text>
                <text class="odds">{{ item.d }}</text>
                <text class="odds">{{ item.a }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 情报 -->
        <view v-if="activeTab === 'information'" class="tab-panel">
          <view v-if="tabLoading.information" class="loading-tip">
            <view class="loading-spinner small"></view>
            <text>加载中...</text>
          </view>
          <view v-else-if="!informationData" class="empty-tip">
            <text>暂无情报数据</text>
          </view>
          <view v-else class="information-content">
            <view :class="['info-section', isVip ? 'vip-section' : '']">
              <view class="info-header">
                <text class="info-title">比赛情报</text>
                <view v-if="isVip" class="vip-info-tag">
                  <view class="vip-info-diamond"></view>
                  <text>VIP免费</text>
                </view>
                <text v-else class="info-tag">热门</text>
              </view>
              <view :class="['info-body', !informationUnlocked ? 'masked' : '']">
                <view class="info-text">{{ informationData }}</view>
                <view v-if="!informationUnlocked" class="info-mask">
                  <view class="mask-content">
                    <text class="mask-icon">🔒</text>
                    <text class="mask-text">情报内容已隐藏</text>
                    <view class="unlock-btn" @tap="onUnlockInformation">
                      <text class="unlock-btn-text">消耗1积分解锁</text>
                    </view>
                    <view class="vip-unlock-tip">
                      <text>或</text>
                      <text class="vip-link" @tap="goToVip">开通会员免费查看</text>
                    </view>
                    <text class="mask-tip">当前积分: {{ userPoints }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 赔率变化 -->
        <view v-if="activeTab === 'odds'" class="tab-panel">
          <view v-if="tabLoading.odds" class="loading-tip">
            <view class="loading-spinner small"></view>
            <text>加载中...</text>
          </view>
          <view v-else-if="oddsData.length === 0" class="empty-tip">
            <text>暂无赔率变化数据</text>
          </view>
          <view v-else class="odds-list">
            <view class="odds-table-header">
              <text class="col">时间</text>
              <text class="col">主胜</text>
              <text class="col">平局</text>
              <text class="col">客胜</text>
            </view>
            <view v-for="(item, idx) in oddsData" :key="idx" class="odds-table-row">
              <text class="col time">{{ item.updateDate }} {{ item.updateTime }}</text>
              <text class="col">{{ item.h }}</text>
              <text class="col">{{ item.d }}</text>
              <text class="col">{{ item.a }}</text>
            </view>
          </view>
        </view>

        <!-- 必发 -->
        <view v-if="activeTab === 'betfair'" class="tab-panel">
          <view v-if="tabLoading.betfair" class="loading-tip">
            <view class="loading-spinner small"></view>
            <text>加载中...</text>
          </view>
          <view v-else-if="bifaSummary.length === 0 && bifaDetail.length === 0 && bifaTrend.length === 0" class="empty-tip">
            <text>暂无必发数据</text>
          </view>
          <view v-else class="betfair-content">
            <!-- 交易汇总卡片 -->
            <view v-if="bifaSummaryCards" class="bifa-section">
              <view class="bifa-section-title">交易汇总</view>
              <view class="bifa-summary-cards">
                <view v-for="card in ['home', 'draw', 'away']" :key="card" :class="['bifa-summary-card', card]">
                  <view class="bifa-card-head">{{ card === 'home' ? '主胜' : card === 'draw' ? '平局' : '客胜' }}</view>
                  <view class="bifa-card-stats">
                    <view v-if="bifaSummaryCards[card].odds" class="bifa-card-stat">
                      <text class="bifa-card-label">赔率</text>
                      <text class="bifa-card-val odds">{{ bifaSummaryCards[card].odds }}</text>
                    </view>
                    <view v-if="bifaSummaryCards[card].volume" class="bifa-card-stat">
                      <text class="bifa-card-label">交易量</text>
                      <text class="bifa-card-val">{{ bifaSummaryCards[card].volume }}</text>
                    </view>
                    <view v-if="bifaSummaryCards[card].ratio" class="bifa-card-stat">
                      <text class="bifa-card-label">比例</text>
                      <text class="bifa-card-val">{{ bifaSummaryCards[card].ratio }}</text>
                    </view>
                    <view v-if="bifaSummaryCards[card].profitLoss" class="bifa-card-stat">
                      <text class="bifa-card-label">盈亏</text>
                      <text class="bifa-card-val">{{ bifaSummaryCards[card].profitLoss }}</text>
                    </view>
                  </view>
                </view>
              </view>
              <!-- 冷热指数 -->
              <view v-if="bifaSummaryCards.home.hotIndex || bifaSummaryCards.draw.hotIndex || bifaSummaryCards.away.hotIndex" class="bifa-hot-row">
                <view v-for="card in ['home', 'draw', 'away']" :key="card" class="bifa-hot-item">
                  <text class="bifa-hot-label">{{ card === 'home' ? '主胜冷热' : card === 'draw' ? '平局冷热' : '客胜冷热' }}</text>
                  <text :class="['bifa-hot-val', (bifaSummaryCards[card].hotIndex || 0) > 0 ? 'hot' : 'cold']">
                    {{ bifaSummaryCards[card].hotIndex || 0 }}
                  </text>
                </view>
              </view>
              <!-- 盈亏指数 -->
              <view v-if="bifaSummaryCards.home.plIndex || bifaSummaryCards.draw.plIndex || bifaSummaryCards.away.plIndex" class="bifa-pl-row">
                <view v-for="card in ['home', 'draw', 'away']" :key="card" class="bifa-pl-item">
                  <text class="bifa-pl-label">{{ card === 'home' ? '主胜盈亏指数' : card === 'draw' ? '平局盈亏指数' : '客胜盈亏指数' }}</text>
                  <text class="bifa-pl-val">{{ bifaSummaryCards[card].plIndex || '-' }}</text>
                </view>
              </view>
            </view>

            <!-- 大额明细 -->
            <view v-if="bifaDetail.length > 0" class="bifa-section">
              <view class="bifa-section-title">大额明细</view>
              <view class="bifa-detail-table">
                <view class="bifa-table-hd">
                  <text class="bifa-th side">方向</text>
                  <text class="bifa-th odds">赔率</text>
                  <text class="bifa-th amount">金额</text>
                  <text class="bifa-th per">占比</text>
                  <text class="bifa-th time">时间</text>
                </view>
                <view class="bifa-table-bd">
                  <view v-for="(item, idx) in bifaDetail" :key="idx" class="bifa-tr">
                    <view class="bifa-td side">
                      <text :class="['bifa-side-tag', getSideTag(item.side)]">{{ getSideLabel(item.side) }}</text>
                    </view>
                    <text class="bifa-td odds">{{ item.odds || '-' }}</text>
                    <text class="bifa-td amount">{{ item.amount || '-' }}</text>
                    <text class="bifa-td per">{{ item.per != null ? item.per : '-' }}</text>
                    <text class="bifa-td time">{{ item._dataTime || '-' }}</text>
                  </view>
                </view>
              </view>
            </view>

            <!-- 走势数据 -->
            <view v-if="bifaTrendGrouped.length > 0" class="bifa-section">
              <view class="bifa-section-title">走势数据</view>
              <view class="bifa-trend-table">
                <view class="bifa-table-hd">
                  <text class="bifa-th time">时间</text>
                  <text class="bifa-th amount">主胜金额</text>
                  <text class="bifa-th amount">平局金额</text>
                  <text class="bifa-th amount">客胜金额</text>
                </view>
                <view class="bifa-table-bd">
                  <view v-for="(item, idx) in bifaTrendGrouped" :key="idx" class="bifa-tr">
                    <text class="bifa-td time">{{ item.dataTime || '-' }}</text>
                    <text class="bifa-td amount">{{ item.homeAmount || '-' }}</text>
                    <text class="bifa-td amount">{{ item.drawAmount || '-' }}</text>
                    <text class="bifa-td amount">{{ item.awayAmount || '-' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </block>

    <!-- 底部安全区域 -->
    <view class="safe-area-bottom"></view>
  </view>
</template>

<script>
import { ref, computed, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as matchApi from '@/api/match'
import * as analysisApi from '@/api/analysis'
import * as userApi from '@/api/user'
import EmptyState from '@/components/EmptyState.vue'

const getStorageSync = (key) => {
  try { return uni.getStorageSync(key) } catch (e) { return null }
}

export default {
  components: { EmptyState },
  setup() {
    const matchId = ref(null)
    const match = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const isVip = ref(false)
    const userPoints = ref(0)

    // Tab 定义
    const allTabs = [
      { key: 'recent', name: '战绩' },
      { key: 'table', name: '排名' },
      { key: 'history', name: '交锋' },
      { key: 'information', name: '情报' },
      { key: 'xg', name: 'XG' },
      { key: 'similar', name: '同赔' },
      { key: 'odds', name: '指数' },
      { key: 'betfair', name: '必发' },
    ]
    const tabs = ref([])
    const activeTab = ref('recent')
    const loadedTabs = reactive({})
    const tabLoading = reactive({})

    // 各标签页数据
    const recentData = ref(null)
    const historyData = ref([])
    const tableData = ref({ total: [], home: [], away: [] })
    const tableType = ref('total')
    const xgData = ref(null)
    const informationData = ref(null)
    const similarData = ref([])
    const oddsData = ref([])
    const bifaSummary = ref([])
    const bifaDetail = ref([])
    const bifaTrend = ref([])
    const bifaSummaryCards = ref(null)
    const bifaTrendGrouped = ref([])
    const informationUnlocked = ref(false)

    // 计算当前排名数据
    const currentTableData = computed(() => {
      if (!tableData.value) return []
      return tableData.value[tableType.value] || []
    })

    onLoad((options) => {
      if (options?.matchId) {
        matchId.value = options.matchId
        loadMatchDetail(options.matchId)
        checkFeatures()
        loadUserPoints()
        checkInformationUnlockStatus(options.matchId)
      } else {
        loading.value = false
        error.value = '缺少比赛 ID'
      }
    })

    // 加载用户积分和VIP状态
    function loadUserPoints() {
      const userInfo = getStorageSync('userInfo')
      const vip = userInfo && userInfo.isVip === true
      isVip.value = vip
      userPoints.value = (userInfo && userInfo.point) || 0
      if (vip) informationUnlocked.value = true
    }

    // 检查情报解锁状态
    async function checkInformationUnlockStatus(mid) {
      const userInfo = getStorageSync('userInfo')
      if (!userInfo || !userInfo.id) {
        informationUnlocked.value = false
        isVip.value = false
        return
      }
      const vip = userInfo.isVip === true
      if (vip) {
        informationUnlocked.value = true
        isVip.value = true
        return
      }
      try {
        const result = await userApi.checkInformationUnlock(mid, userInfo.id)
        informationUnlocked.value = (result && result.unlocked) || result === true
        isVip.value = false
      } catch (e) {
        informationUnlocked.value = false
        isVip.value = false
      }
    }

    // 检查功能开关
    async function checkFeatures() {
      try {
        const result = await matchApi.checkFeatures()
        const showInformation = result === true
        const filtered = showInformation ? [...allTabs] : allTabs.filter(t => t.key !== 'information')
        let tab = activeTab.value
        if (!filtered.find(t => t.key === tab)) {
          tab = filtered[0] ? filtered[0].key : ''
        }
        tabs.value = filtered
        if (tab !== activeTab.value) {
          activeTab.value = tab
          loadTabData(tab)
        }
      } catch (e) {
        tabs.value = [...allTabs]
      }
      loadTabData('recent')
    }

    // 加载比赛详情
    async function loadMatchDetail(mid) {
      loading.value = true
      try {
        const res = await matchApi.getMatchDetail(mid)
        const m = res ? {
          id: res.matchId || res.id,
          matchNumStr: res.matchNumStr,
          league: res.leagueAbbName || res.league,
          homeTeam: res.homeTeamAbbName || res.homeTeam,
          homeTeamFull: res.homeTeamAllName,
          homeTeamRank: res.homeTeamRank,
          awayTeam: res.awayTeamAbbName || res.awayTeam,
          awayTeamFull: res.awayTeamAllName,
          awayTeamRank: res.awayTeamRank,
          status: res.matchStatus || res.status,
          fullMatchTime: res.fullMatchTime || `${res.matchDate} ${res.matchTime}`,
          odds: res.odds || {
            home: res.homeWin,
            draw: res.draw,
            away: res.awayWin,
          },
        } : null
        match.value = m
        loading.value = false
        if (m) {
          uni.setNavigationBarTitle({ title: `${m.homeTeam} vs ${m.awayTeam}` })
        }
      } catch (e) {
        loading.value = false
        error.value = e.message || '加载失败'
      }
    }

    // 切换标签页
    function onTabChange(key) {
      if (key === activeTab.value) return
      activeTab.value = key
      if (!loadedTabs[key]) {
        loadTabData(key)
      }
    }

    // 加载标签页数据
    async function loadTabData(key) {
      if (loadedTabs[key] || tabLoading[key]) return
      tabLoading[key] = true
      const mid = matchId.value

      try {
        switch (key) {
          case 'recent': {
            const data = await analysisApi.getRecentMatches(mid)
            recentData.value = data || null
            break
          }
          case 'table':
            await loadTableData(mid)
            break
          case 'history': {
            const data = await analysisApi.getHistoryData(mid)
            historyData.value = data || []
            break
          }
          case 'xg': {
            const result = await analysisApi.getXgData(mid)
            xgData.value = (result && result.data) || result
            break
          }
          case 'information': {
            const result = await analysisApi.getInformationData(mid)
            informationData.value = result
            break
          }
          case 'similar': {
            const data = await analysisApi.getSimilarData(mid)
            similarData.value = data || []
            break
          }
          case 'odds': {
            const result = await analysisApi.getOddsData(mid)
            oddsData.value = (result && result.history) || result || []
            break
          }
          case 'betfair': {
            const [summaryRes, detailRes, trendRes] = await Promise.all([
              analysisApi.getBifaSummary(mid),
              analysisApi.getBifaDetail(mid),
              analysisApi.getBifaTrend(mid),
            ])
            const summaryList = summaryRes || []
            const detailList = (detailRes || []).map(item => ({
              ...item,
              _dataTime: formatBifaTime(item.dataTime),
            }))
            const trendList = trendRes || []
            bifaSummary.value = summaryList
            bifaDetail.value = detailList
            bifaTrend.value = trendList
            bifaSummaryCards.value = buildBifaSummaryCards(summaryList)
            bifaTrendGrouped.value = buildBifaTrendGrouped(trendList)
            break
          }
        }
        loadedTabs[key] = true
      } catch (e) {
        console.error(`加载 ${key} 数据失败:`, e)
      } finally {
        tabLoading[key] = false
      }
    }

    // 加载排名数据
    async function loadTableData(mid) {
      try {
        const result = await matchApi.getTableData(mid)
        const data = { total: [], home: [], away: [] }
        const m = match.value
        const homeTeamName = (m && m.homeTeam) || ''
        const awayTeamName = (m && m.awayTeam) || ''

        const markTeamType = (item) => {
          let teamType = ''
          if (homeTeamName && item.teamAbbrCnName && item.teamAbbrCnName.includes(homeTeamName)) {
            teamType = 'home'
          } else if (awayTeamName && item.teamAbbrCnName && item.teamAbbrCnName.includes(awayTeamName)) {
            teamType = 'away'
          } else if (homeTeamName && item.teamAbbrCnName && homeTeamName.includes(item.teamAbbrCnName)) {
            teamType = 'home'
          } else if (awayTeamName && item.teamAbbrCnName && awayTeamName.includes(item.teamAbbrCnName)) {
            teamType = 'away'
          }
          return { ...item, teamType }
        }

        if (result && Array.isArray(result)) {
          data.total = result.filter(item => item.tableType === 'total').map(markTeamType).sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
          data.home = result.filter(item => item.tableType === 'home').map(markTeamType).sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
          data.away = result.filter(item => item.tableType === 'away').map(markTeamType).sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
        }
        tableData.value = data
      } catch (e) {
        console.error('加载排名数据失败:', e)
      }
    }

    // 构建必发汇总三卡片数据
    function buildBifaSummaryCards(list) {
      if (!list || !list.length) return null
      const home = list.find(item => item.itemName && (item.itemName.includes('主') || item.itemName === 'home'))
      const draw = list.find(item => item.itemName && (item.itemName.includes('和') || item.itemName === 'draw'))
      const away = list.find(item => item.itemName && (item.itemName.includes('客') || item.itemName === 'away'))
      return { home: home || {}, draw: draw || {}, away: away || {} }
    }

    // 格式化必发时间
    function formatBifaTime(val) {
      if (!val && val !== 0) return '-'
      const str = String(val)
      if (/^\d{10,13}$/.test(str)) {
        const ts = Number(str)
        const d = new Date(str.length === 10 ? ts * 1000 : ts)
        if (!isNaN(d.getTime())) {
          const M = String(d.getMonth() + 1).padStart(2, '0')
          const D = String(d.getDate()).padStart(2, '0')
          const h = String(d.getHours()).padStart(2, '0')
          const m = String(d.getMinutes()).padStart(2, '0')
          return `${M}-${D} ${h}:${m}`
        }
      }
      return str
    }

    // 构建必发送势分组数据
    function buildBifaTrendGrouped(list) {
      if (!list || !list.length) return []
      const map = new Map()
      list.forEach(item => {
        const rawKey = item.dataTime || ''
        const displayKey = formatBifaTime(rawKey)
        if (!map.has(rawKey)) {
          map.set(rawKey, { dataTime: displayKey, homeAmount: '-', drawAmount: '-', awayAmount: '-' })
        }
        const entry = map.get(rawKey)
        if (item.side && (item.side.includes('主') || item.side === 'home')) {
          entry.homeAmount = item.amount || '-'
        } else if (item.side && (item.side.includes('和') || item.side === 'draw')) {
          entry.drawAmount = item.amount || '-'
        } else if (item.side && (item.side.includes('客') || item.side === 'away')) {
          entry.awayAmount = item.amount || '-'
        }
      })
      return Array.from(map.values())
    }

    // 获取方向标签
    function getSideTag(side) {
      if (!side) return ''
      if (side === '主' || side === 'home') return 'home'
      if (side === '和' || side === 'draw') return 'draw'
      if (side === '客' || side === 'away') return 'away'
      return ''
    }

    function getSideLabel(side) {
      if (!side) return '-'
      if (side === '主' || side === 'home') return '主'
      if (side === '和' || side === 'draw') return '平'
      if (side === '客' || side === 'away') return '客'
      return side
    }

    // 比赛点击
    function onMatchTap(match) {
      if (!match || !match.sportteryMatchId) return
      uni.navigateTo({ url: `/pages/analysis/index?matchId=${match.sportteryMatchId}` })
    }

    // 重试
    function onRetry() {
      if (matchId.value) loadMatchDetail(matchId.value)
    }

    // 解锁情报
    function onUnlockInformation() {
      const userInfo = getStorageSync('userInfo')
      if (!userInfo || !userInfo.id) {
        uni.showModal({
          title: '提示',
          content: '请先登录后再解锁情报',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/login/login' })
          },
        })
        return
      }
      if (userInfo.isVip) {
        informationUnlocked.value = true
        return
      }
      const points = (userInfo && userInfo.point) || 0
      if (points < 1) {
        uni.showModal({
          title: '积分不足',
          content: `解锁情报需要消耗 1 积分，您当前积分为 ${points}。\n\n开通会员可免费查看所有情报！`,
          confirmText: '开通会员',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/vip/index' })
          },
        })
        return
      }
      uni.showModal({
        title: '解锁AI分析',
        content: '本次分析将消耗1积分是否继续？\n提示：开通会员可查看所有情报',
        confirmText: '确认',
        cancelText: '取消',
        success: async (res) => {
          if (res.confirm) await doUnlockInformation(userInfo.id, 1)
        },
      })
    }

    async function doUnlockInformation(userId, points) {
      try {
        uni.showLoading({ title: `消耗${points}积分中...`, mask: true })
        await userApi.deductPointForInformation(userId, points, matchId.value)
        const latestUserInfo = await userApi.getUserInfoById(userId)
        if (latestUserInfo) {
          uni.setStorageSync('userInfo', latestUserInfo)
        }
        uni.hideLoading()
        informationUnlocked.value = true
        userPoints.value = (latestUserInfo && latestUserInfo.point) || 0
        uni.showToast({ title: '解锁成功', icon: 'success', duration: 1500 })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '解锁失败，请重试', icon: 'error', duration: 2000 })
      }
    }

    // 跳转VIP
    function goToVip() {
      uni.navigateTo({ url: '/pages/vip/index' })
    }

    return {
      matchId,
      match,
      loading,
      error,
      isVip,
      userPoints,
      tabs,
      activeTab,
      tabLoading,
      recentData,
      historyData,
      tableData,
      tableType,
      currentTableData,
      xgData,
      informationData,
      similarData,
      oddsData,
      bifaSummary,
      bifaDetail,
      bifaTrend,
      bifaSummaryCards,
      bifaTrendGrouped,
      informationUnlocked,
      onRetry,
      onTabChange,
      onMatchTap,
      onUnlockInformation,
      goToVip,
      getSideTag,
      getSideLabel,
    }
  },
}
</script>

<style scoped>
.analysis-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f4f8 0%, #e8eef3 100%);
}

/* 加载 */
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
.loading-spinner.small {
  width: 40rpx;
  height: 40rpx;
  border-width: 3rpx;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-text {
  font-size: 28rpx;
  color: #8c8c8c;
}

/* 比赛信息头部 */
.match-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32rpx;
  color: #fff;
}
.league-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.league {
  font-size: 26rpx;
  background: rgba(255, 255, 255, 0.2);
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
}
.time {
  font-size: 26rpx;
  opacity: 0.9;
}
.teams-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
}
.team-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.team-name {
  font-size: 36rpx;
  font-weight: 600;
  text-align: center;
}
.team-rank {
  font-size: 24rpx;
  opacity: 0.8;
}
.vs-info {
  padding: 0 24rpx;
}
.vs {
  font-size: 26rpx;
  opacity: 0.7;
}
.odds-row {
  display: flex;
  justify-content: space-around;
  padding: 20rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12rpx;
  margin-top: 20rpx;
}
.odds-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.odds-label {
  font-size: 22rpx;
  opacity: 0.8;
}
.odds-value {
  font-size: 30rpx;
  font-weight: 600;
}

/* 标签页导航 */
.tabs-nav {
  display: flex;
  background: #fff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 8rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  white-space: nowrap;
}
.tab-item {
  flex-shrink: 0;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  transition: all 0.3s;
}
.tab-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.tab-text {
  font-size: 26rpx;
  color: #666;
}
.tab-item.active .tab-text {
  color: #fff;
  font-weight: 500;
}

/* 标签页内容 */
.tabs-content {
  padding: 0 24rpx 24rpx;
}
.tab-panel {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

/* 加载 & 空提示 */
.loading-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16rpx;
  padding: 60rpx;
  color: #999;
  font-size: 26rpx;
}
.empty-tip {
  text-align: center;
  padding: 60rpx;
  color: #999;
  font-size: 26rpx;
}

/* 历史交锋 & 相似比赛 列表 */
.history-list,
.similar-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.history-item,
.similar-item {
  padding: 20rpx;
  background: #f8f9fc;
  border-radius: 12rpx;
}
.item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.item-league {
  font-size: 24rpx;
  color: #667eea;
  font-weight: 500;
}
.item-date {
  font-size: 22rpx;
  color: #999;
}
.item-teams {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item-team {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}
.item-team:last-child {
  text-align: right;
}
.item-score {
  font-size: 32rpx;
  font-weight: 600;
  color: #667eea;
  padding: 0 20rpx;
}
.item-odds {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #e0e0e0;
}
.item-odds .odds {
  font-size: 26rpx;
  color: #666;
  font-weight: 500;
}

/* 最近比赛 */
.recent-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.team-section {
  background: #f8f9fc;
  border-radius: 12rpx;
  padding: 24rpx;
}
.section-header {
  display: flex;
  align-items: baseline;
  margin-bottom: 20rpx;
  padding-bottom: 12rpx;
  border-bottom: 2rpx solid #e8eaed;
}
.s-team-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a2e;
  margin-right: 12rpx;
}
.team-subtitle {
  font-size: 22rpx;
  color: #999;
}
.stats-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 24rpx;
  padding: 20rpx;
  background: #fff;
  border-radius: 10rpx;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.stat-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #667eea;
}
.stat-label {
  font-size: 22rpx;
  color: #999;
}
.match-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.match-item {
  background: #fff;
  padding: 16rpx;
  border-radius: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.match-item:active {
  background: #f0f0f0;
  transform: scale(0.98);
}
.match-date {
  font-size: 22rpx;
  color: #999;
}
.match-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.match-team {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}
.match-team:first-child {
  text-align: left;
}
.match-team:last-child {
  text-align: right;
}
.match-score {
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  font-weight: 600;
  margin: 0 12rpx;
  white-space: nowrap;
}
.match-score.win {
  background: #e8f5e9;
  color: #4caf50;
}
.match-score.loss {
  background: #ffebee;
  color: #f44336;
}
.match-score.draw {
  background: #fff3e0;
  color: #ff9800;
}
.match-league {
  font-size: 22rpx;
  color: #999;
  text-align: center;
}

/* xG 数据 */
.xg-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.xg-team {
  background: #f8f9fc;
  border-radius: 12rpx;
  padding: 20rpx;
}
.xg-header {
  margin-bottom: 16rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #eee;
}
.xg-team-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.xg-stats {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.stat-row {
  display: flex;
  justify-content: space-between;
}
.s-label {
  font-size: 26rpx;
  color: #666;
}
.s-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}
.s-value.highlight {
  color: #667eea;
  font-weight: 600;
}

/* 赔率表格 */
.odds-list {
  overflow-x: auto;
}
.odds-table-header,
.odds-table-row {
  display: flex;
  padding: 16rpx 0;
}
.odds-table-header {
  background: #f8f9fc;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
}
.odds-table-row {
  border-bottom: 1rpx solid #f0f0f0;
}
.col {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #333;
}
.col.time {
  flex: 1.5;
  font-size: 24rpx;
  color: #999;
}

/* 情报 */
.information-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.info-section {
  background: #f8f9fc;
  border-radius: 12rpx;
  overflow: hidden;
}
.info-section.vip-section {
  border: 2rpx solid transparent;
  background: linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #ffd700, #ff8c00) border-box;
}
.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.info-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
.info-tag {
  font-size: 22rpx;
  color: #fff;
  background: rgba(255, 255, 255, 0.25);
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}
.vip-info-tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  padding: 6rpx 14rpx;
  border-radius: 20rpx;
}
.vip-info-tag text {
  font-size: 20rpx;
  color: #fff;
  font-weight: bold;
}
.vip-info-diamond {
  width: 16rpx;
  height: 16rpx;
  position: relative;
}
.vip-info-diamond::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
  border-bottom: 6rpx solid #fff;
}
.vip-info-diamond::after {
  content: '';
  position: absolute;
  top: 6rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
  border-top: 10rpx solid #fff;
}
.info-body {
  position: relative;
  padding: 24rpx;
  min-height: 200rpx;
}
.info-body.masked {
  overflow: hidden;
  max-height: 300rpx;
}
.info-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
}
.info-mask {
  position: absolute;
  top: 80rpx;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.8) 20%,
    rgba(255, 255, 255, 0.95) 40%,
    rgba(255, 255, 255, 1) 60%
  );
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 24rpx;
  z-index: 10;
}
.mask-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.mask-icon {
  font-size: 48rpx;
}
.mask-text {
  font-size: 26rpx;
  color: #666;
}
.unlock-btn {
  margin-top: 8rpx;
  padding: 18rpx 56rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.4);
}
.unlock-btn:active {
  opacity: 0.9;
  transform: scale(0.98);
}
.unlock-btn-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 500;
}
.mask-tip {
  font-size: 22rpx;
  color: #999;
}
.vip-unlock-tip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}
.vip-unlock-tip text {
  font-size: 24rpx;
  color: #999;
}
.vip-link {
  color: #ff8c00 !important;
  font-weight: 500;
}

/* 排名表格 */
.table-content {
  display: flex;
  flex-direction: column;
}
.table-type-switcher {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.type-btn {
  flex: 1;
  padding: 12rpx 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  text-align: center;
  transition: all 0.3s;
}
.type-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.type-btn text {
  font-size: 26rpx;
  font-weight: 500;
  color: #666;
}
.type-btn.active text {
  color: #fff;
}
.table-wrapper {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 10rpx;
  overflow: hidden;
}
.table-header {
  display: flex;
  background: #f8f9fa;
  border-bottom: 2rpx solid #e8e8e8;
  padding: 12rpx 0;
}
.table-header .col {
  font-size: 22rpx;
  color: #666;
  font-weight: 600;
  text-align: center;
  padding: 8rpx;
}
.table-header .col.rank { flex: 0.6; }
.table-header .col.team { flex: 1.5; text-align: left; padding-left: 16rpx; }
.table-header .col.matches, .table-header .col.win, .table-header .col.draw,
.table-header .col.loss, .table-header .col.goals, .table-header .col.ga, .table-header .col.points {
  flex: 0.7;
}
.table-body {
  display: flex;
  flex-direction: column;
}
.table-row {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  align-items: center;
}
.table-row:last-child { border-bottom: none; }
.table-row.home-team { background: rgba(255, 107, 107, 0.08); }
.table-row.away-team { background: rgba(79, 172, 254, 0.08); }
.table-row .col {
  font-size: 24rpx;
  color: #333;
  text-align: center;
  padding: 0 8rpx;
}
.table-row .col.rank { flex: 0.6; font-weight: 600; color: #667eea; }
.table-row .col.team {
  flex: 1.5;
  text-align: left;
  padding-left: 16rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.t-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.team-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28rpx;
  height: 28rpx;
  border-radius: 4rpx;
  font-size: 18rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.team-marker.home { background: linear-gradient(135deg, #ff6b6b 0%, #ff8c8c 100%); color: #fff; }
.team-marker.away { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #fff; }
.table-row .col.matches, .table-row .col.win, .table-row .col.draw,
.table-row .col.loss, .table-row .col.goals, .table-row .col.ga {
  flex: 0.7; font-size: 22rpx; color: #666;
}
.table-row .col.points { flex: 0.7; font-weight: 600; color: #ff6b6b; }

/* 必发 */
.betfair-content {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.bifa-section {
  background: #f8f9fc;
  border-radius: 16rpx;
  padding: 24rpx;
}
.bifa-section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 20rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #667eea;
  line-height: 1.2;
}
.bifa-summary-cards {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.bifa-summary-card {
  flex: 1;
  border-radius: 14rpx;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}
.bifa-card-head {
  text-align: center;
  padding: 14rpx 0;
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
}
.bifa-summary-card.home .bifa-card-head { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); }
.bifa-summary-card.draw .bifa-card-head { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.bifa-summary-card.away .bifa-card-head { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.bifa-card-stats {
  padding: 16rpx 14rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.bifa-card-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.bifa-card-label { font-size: 22rpx; color: #999; }
.bifa-card-val { font-size: 24rpx; color: #333; font-weight: 600; }
.bifa-card-val.odds { color: #667eea; }

.bifa-hot-row { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.bifa-hot-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx;
  background: #fff;
  border-radius: 10rpx;
}
.bifa-hot-label { font-size: 22rpx; color: #999; }
.bifa-hot-val { font-size: 30rpx; font-weight: 700; }
.bifa-hot-val.hot { color: #ff6b6b; }
.bifa-hot-val.cold { color: #4facfe; }

.bifa-pl-row { display: flex; gap: 12rpx; }
.bifa-pl-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx;
  background: #fff;
  border-radius: 10rpx;
}
.bifa-pl-label { font-size: 22rpx; color: #999; }
.bifa-pl-val { font-size: 26rpx; color: #333; font-weight: 600; }

.bifa-detail-table, .bifa-trend-table {
  border-radius: 12rpx;
  overflow: hidden;
  background: #fff;
}
.bifa-table-hd { display: flex; background: #eef1f8; padding: 16rpx 12rpx; }
.bifa-th { flex: 1; text-align: center; font-size: 22rpx; color: #888; font-weight: 600; }
.bifa-th.side { flex: 0.8; }
.bifa-th.time { flex: 1.4; }
.bifa-th.amount { flex: 1.2; }
.bifa-th.odds, .bifa-th.per { flex: 0.9; }
.bifa-table-bd { display: flex; flex-direction: column; }
.bifa-tr { display: flex; align-items: center; padding: 14rpx 12rpx; border-bottom: 1rpx solid #f0f0f0; }
.bifa-tr:last-child { border-bottom: none; }
.bifa-td { flex: 1; text-align: center; font-size: 24rpx; color: #333; }
.bifa-td.side { flex: 0.8; display: flex; justify-content: center; }
.bifa-td.time { flex: 1.4; font-size: 22rpx; color: #999; }
.bifa-td.amount { flex: 1.2; font-weight: 500; }
.bifa-td.odds { flex: 0.9; color: #667eea; font-weight: 600; }
.bifa-td.per { flex: 0.9; color: #666; }
.bifa-side-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  border-radius: 10rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}
.bifa-side-tag.home { background: #ff6b6b; }
.bifa-side-tag.draw { background: #4facfe; }
.bifa-side-tag.away { background: #43e97b; color: #333; }

/* 安全区域 */
.safe-area-bottom {
  height: calc(env(safe-area-inset-bottom) + 40rpx);
}
</style>
