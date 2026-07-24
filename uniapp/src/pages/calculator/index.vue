<template>
  <view class="calculator-page">
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
      <!-- 专题页标题 -->
      <view v-if="source === 'topic'" class="page-title-bar">
        <text class="page-title">{{ pageTitle }}</text>
        <text class="page-subtitle">{{ matches.length }}场比赛</text>
      </view>

      <!-- Tab切换 -->
      <view class="tab-header">
        <view :class="['tab-item', currentTab === 'play' ? 'active' : '']" @tap="onSwitchTab('play')">
          <text class="tab-text">{{ pageTitle }}</text>
        </view>
        <view :class="['tab-item', currentTab === 'records' ? 'active' : '']" @tap="onSwitchTab('records')">
          <text class="tab-text">我的记录</text>
          <text v-if="records.length > 0" class="record-badge">{{ records.length }}</text>
        </view>
      </view>

      <!-- 足球计算器 -->
      <view v-if="currentTab === 'play'" class="tab-content">
        <scroll-view class="match-scroll" scroll-y enhanced :show-scrollbar="false">
          <view v-for="match in matches" :key="match.matchId" class="match-card">
            <!-- 比赛信息头 -->
            <view class="card-header">
              <text class="match-num">{{ match.matchNumStr }}</text>
              <text class="league-name">{{ match.leagueAbbName }}</text>
              <text class="match-time">{{ match.matchTime }}</text>
              <text v-if="match.bettingSingle == 1 || match.bettingSingle === true" class="single-tag">单</text>
            </view>

            <!-- 对阵信息 -->
            <view class="team-row">
              <text class="team-name home">{{ match.homeTeamAbbName }}</text>
              <text class="vs-text">VS</text>
              <text class="team-name away">{{ match.awayTeamAbbName }}</text>
            </view>

            <!-- AI帮选 -->
            <view
              v-if="match.aiResult || match.aiLetResult"
              :class="['ai-recommend', isAiSelected(match) ? 'ai-selected' : '']"
              @tap="onAiRecommendTap(match)"
            >
              <view class="ai-bar-inner">
                <text class="ai-bar-icon">✨</text>
                <text class="ai-bar-text">AI帮选 · 一键勾选推荐结果</text>
                <text class="ai-bar-arrow">→</text>
              </view>
            </view>

            <!-- 赔率区域 -->
            <view class="odds-wrapper">
              <view class="odds-left">
                <!-- 胜平负 -->
                <view class="odds-section">
                  <view class="odds-inline-row">
                    <text class="section-title">胜平负</text>
                    <view :class="['odds-group', match.bettingSingle == 1 || match.bettingSingle === true ? 'single' : '', !match.hadH && !match.hadD && !match.hadA ? 'had-disabled' : '']">
                      <text v-if="match.bettingSingle == 1 || match.bettingSingle === true" class="single-corner">单</text>
                      <view
                        v-for="opt in hadOptions"
                        :key="opt.val"
                        :class="['odds-item', !match[opt.field] ? 'disabled' : '', selectedMap[match.matchId + '_had_' + opt.val] ? 'active' : '']"
                        @tap="onSelectOption(match.matchId, 'had', opt.val, match[opt.field])"
                      >
                        <text class="odds-label">{{ opt.label }}</text>
                        <text class="odds-value">{{ match[opt.field] || '未受注' }}</text>
                      </view>
                    </view>
                  </view>
                </view>

                <!-- 让球胜平负 -->
                <view class="odds-section last">
                  <view class="odds-inline-row">
                    <text class="section-title">让球<text class="goalline">({{ match.hhadGoalLine }})</text></text>
                    <view :class="['odds-group', match.bettingAllUp == 1 || match.bettingAllUp === true ? 'single' : '']">
                      <text v-if="match.bettingAllUp == 1 || match.bettingAllUp === true" class="single-corner">单</text>
                      <view
                        v-for="opt in hhadOptions"
                        :key="opt.val"
                        :class="['odds-item', !match[opt.field] ? 'disabled' : '', selectedMap[match.matchId + '_hhad_' + opt.val] ? 'active' : '']"
                        @tap="onSelectOption(match.matchId, 'hhad', opt.val, match[opt.field])"
                      >
                        <text class="odds-label">{{ opt.label }}</text>
                        <text class="odds-value">{{ match[opt.field] || '-' }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>

              <!-- 右侧更多玩法 -->
              <view class="card-right" @tap="onMorePlays(match)">
                <text class="more-text">更</text>
                <text class="more-text">多</text>
              </view>
            </view>

            <!-- 选中标记 -->
            <view v-if="(selections[match.matchId] || []).length > 0" class="selected-badge">
              已选{{ selections[match.matchId].length }}项
            </view>
          </view>

          <view class="bottom-placeholder"></view>
        </scroll-view>
      </view>

      <!-- 我的记录 -->
      <view v-if="currentTab === 'records'" class="tab-content records-content">
        <view v-if="recordsLoading" class="records-loading">
          <view class="loading-spinner"></view>
          <text class="loading-text">加载中...</text>
        </view>
        <view v-else-if="records.length === 0" class="records-empty">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无记录</text>
          <text class="empty-tip">保存足球计算器方案后记录将显示在这里</text>
        </view>
        <scroll-view v-else scroll-y class="records-scroll">
          <view
            v-for="(record, index) in records"
            :key="record.id"
            class="record-swipe-wrapper"
          >
            <view
              :class="['record-swipe-inner',
                record.status === 1 ? 'win' : (record.status === 2 ? 'lose' : 'pending'),
                record._swiped ? 'swiped' : ''
              ]"
              :data-index="index"
              @touchstart="onTouchStart($event, index)"
              @touchmove="onTouchMove($event, index)"
              @touchend="onTouchEnd($event, index)"
            >
              <view class="record-card" @tap="onRecordTap(record)">
                <view class="record-date-box">
                  <text class="date-month">{{ record.monthDay }}</text>
                  <text class="date-time">{{ record.hourMinute }}</text>
                </view>
                <view class="record-content">
                  <view :class="['record-status-tag', record.status === 1 ? 'win' : (record.status === 2 ? 'lose' : 'pending')]">
                    <text class="status-text">{{ record.statusDesc }}</text>
                  </view>
                  <view class="record-title-row">
                    <text class="record-matches">{{ record.matchCount }}场比赛</text>
                    <text class="record-pass">{{ record.passTypesStr }}</text>
                  </view>
                  <view class="record-amount-row">
                    <text class="record-amount">¥{{ record.totalAmount }}</text>
                    <text v-if="record.status === 1 && record.bonus > 0" class="record-bonus">中奖 ¥{{ record.bonus }}</text>
                  </view>
                </view>
              </view>
              <view class="record-delete-btn" @tap.stop="onDeleteRecord(record.id, index)">
                <text class="delete-text">删除</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 底部操作栏 -->
      <view v-if="currentTab === 'play'" class="bottom-bar">
        <view v-if="availablePassTypes.length > 0" class="pass-type-row">
          <view
            v-for="pt in availablePassTypes"
            :key="pt.value"
            :class="['pass-btn', selectedPassTypesMap[pt.value] ? 'active' : '']"
            @tap="onSelectPassType(pt.value)"
          >{{ pt.label }}</view>
        </view>
        <view v-else class="pass-type-empty">
          <text class="empty-tip-text">请先选择比赛</text>
        </view>

        <view class="amount-row">
          <view class="multiple-box">
            <text class="label">倍数</text>
            <view class="stepper">
              <view class="stepper-btn" @tap="onMultipleMinus">-</view>
              <input class="stepper-input" type="number" :value="multipleInput" @input="onMultipleInput" @blur="onMultipleBlur" />
              <view class="stepper-btn" @tap="onMultiplePlus">+</view>
            </view>
          </view>
          <view class="amount-info">
            <text class="amount-label">{{ totalBets }}注 / {{ totalAmount }}元</text>
            <text v-if="totalBets > 0" class="bonus-text">预计奖金: {{ minBonus }}-{{ maxBonus }}元</text>
          </view>
          <view :class="['submit-btn', totalBets > 0 ? '' : 'disabled']" @tap="onSubmit">保存</view>
        </view>
      </view>
    </view>

    <!-- 更多玩法弹窗 -->
    <view v-if="showMorePlays" class="popup-mask" @tap="onCloseMorePlays" @touchmove.stop.prevent>
      <view class="popup-content" @tap.stop @touchmove.stop.prevent>
        <view class="popup-header">
          <view class="popup-title-wrap">
            <text v-if="currentMatch" class="popup-title">{{ currentMatch.homeTeamAbbName }} VS {{ currentMatch.awayTeamAbbName }}</text>
            <text v-if="currentMatch" class="popup-time">{{ currentMatch.matchTime }}</text>
          </view>
          <view class="popup-close" @tap="onCloseMorePlays">×</view>
        </view>

        <text class="popup-tip">红色框选项可投单关</text>

        <view v-if="currentMatch" class="popup-body">
          <!-- 胜平负 -->
          <view class="play-row">
            <view class="play-label had-label">0</view>
            <view :class="['play-options', currentMatch.bettingSingle == 1 || currentMatch.bettingSingle === true ? 'single-group' : '', !currentMatch.hadH && !currentMatch.hadD && !currentMatch.hadA ? 'had-disabled' : '']">
              <view
                v-for="opt in popupHadOptions"
                :key="opt.val"
                :class="['opt-item', !currentMatch[opt.field] ? 'disabled' : '', selectedMap[currentMatch.matchId + '_had_' + opt.val] ? 'active' : '']"
                @tap="onSelectOption(currentMatch.matchId, 'had', opt.val, currentMatch[opt.field])"
              >
                <text v-if="opt.val === 'H' && (currentMatch.bettingSingle == 1 || currentMatch.bettingSingle === true)" class="single-corner">单</text>
                <text class="opt-text">{{ opt.label }}</text>
                <text class="opt-odds">{{ currentMatch[opt.field] || '未受注' }}</text>
              </view>
            </view>
          </view>

          <!-- 让球胜平负 -->
          <view class="play-row">
            <view class="play-label hhad-label">{{ currentMatch.hhadGoalLine }}</view>
            <view :class="['play-options', currentMatch.bettingAllUp == 1 || currentMatch.bettingAllUp === true ? 'single-group' : '']">
              <view
                v-for="opt in popupHhadOptions"
                :key="opt.val"
                :class="['opt-item', !currentMatch[opt.field] ? 'disabled' : '', selectedMap[currentMatch.matchId + '_hhad_' + opt.val] ? 'active' : '']"
                @tap="onSelectOption(currentMatch.matchId, 'hhad', opt.val, currentMatch[opt.field])"
              >
                <text v-if="opt.val === 'H' && (currentMatch.bettingAllUp == 1 || currentMatch.bettingAllUp === true)" class="single-corner">单</text>
                <text class="opt-text">{{ opt.label }}</text>
                <text class="opt-odds">{{ currentMatch[opt.field] || '-' }}</text>
              </view>
            </view>
          </view>

          <!-- 比分 -->
          <view class="play-row crs-row">
            <view class="play-label crs-label">比分</view>
            <view class="play-options crs-options single-group">
              <view class="crs-grid">
                <view
                  v-for="score in crsWinScores"
                  :key="score.key"
                  :class="['crs-item', selectedMap[currentMatch.matchId + '_crs_' + score.key] ? 'active' : '']"
                  @tap="onSelectScore(currentMatch.matchId, score.key, currentMatch[score.field])"
                >
                  <text v-if="score.key === '1:0'" class="single-corner">单</text>
                  <text class="crs-name">{{ score.key }}</text>
                  <text class="crs-odds">{{ currentMatch[score.field] }}</text>
                </view>
              </view>
              <view class="crs-grid">
                <view
                  v-for="score in crsDrawScores"
                  :key="score.key"
                  :class="['crs-item', selectedMap[currentMatch.matchId + '_crs_' + score.key] ? 'active' : '']"
                  @tap="onSelectScore(currentMatch.matchId, score.key, currentMatch[score.field])"
                >
                  <text class="crs-name">{{ score.key }}</text>
                  <text class="crs-odds">{{ currentMatch[score.field] }}</text>
                </view>
              </view>
              <view class="crs-grid">
                <view
                  v-for="score in crsLoseScores"
                  :key="score.key"
                  :class="['crs-item', selectedMap[currentMatch.matchId + '_crs_' + score.key] ? 'active' : '']"
                  @tap="onSelectScore(currentMatch.matchId, score.key, currentMatch[score.field])"
                >
                  <text class="crs-name">{{ score.key }}</text>
                  <text class="crs-odds">{{ currentMatch[score.field] }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 总进球 -->
          <view class="play-row">
            <view class="play-label ttg-label">总进球</view>
            <view class="play-options ttg-options single-group">
              <view
                v-for="goal in ttgOptions"
                :key="goal.key"
                :class="['opt-item', selectedMap[currentMatch.matchId + '_ttg_' + goal.key] ? 'active' : '']"
                @tap="onSelectGoal(currentMatch.matchId, goal.key, currentMatch[goal.field])"
              >
                <text v-if="goal.key === '0'" class="single-corner">单</text>
                <text class="opt-text">{{ goal.label }}</text>
                <text class="opt-odds">{{ currentMatch[goal.field] }}</text>
              </view>
            </view>
          </view>

          <!-- 半全场 -->
          <view class="play-row">
            <view class="play-label hafu-label">半全场</view>
            <view v-if="hafuNoOdds" class="play-options hafu-no-odds">
              <text class="no-odds-text">未受注</text>
            </view>
            <view v-else class="play-options hafu-options single-group">
              <view
                v-for="hf in hafuOptions"
                :key="hf.key"
                :class="['opt-item', selectedMap[currentMatch.matchId + '_hafu_' + hf.key] ? 'active' : '']"
                @tap="onSelectHafu(currentMatch.matchId, hf.key, currentMatch[hf.field])"
              >
                <text v-if="hf.key === 'HH'" class="single-corner">单</text>
                <text class="opt-text">{{ hf.label }}</text>
                <text class="opt-odds">{{ currentMatch[hf.field] }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="popup-footer">
          <view class="popup-btn-cancel" @tap="onCloseMorePlays">取消</view>
          <view class="popup-btn-confirm" @tap="onCloseMorePlays">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, reactive, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import * as matchApi from '@/api/match'

const POSITION_MAP = { '胜': 'H', '主胜': 'H', '平': 'D', '平局': 'D', '负': 'A', '主负': 'A', '客胜': 'A' }
const HHAD_MAP = { '让胜': 'H', '让平': 'D', '让负': 'A' }

const TYPE_MAX_PASS = { crs: 4, hafu: 4, ttg: 6 }

export default {
  setup() {
    const userStore = useUserStore()
    const currentTab = ref('play')
    const pageTitle = ref('足球计算器')
    const matches = ref([])
    const loading = ref(true)
    const error = ref(null)
    const source = ref('')

    // 选择和过关方式
    const selections = reactive({})
    const selectedMap = reactive({})
    const selectedCount = computed(() => Object.keys(selections).length)

    const allPassTypes = [
      { value: 'single', label: '单关', min: 1, max: 1 },
      { value: '2_1', label: '2串1', min: 2, max: 8 },
      { value: '3_1', label: '3串1', min: 3, max: 8 },
      { value: '4_1', label: '4串1', min: 4, max: 8 },
      { value: '5_1', label: '5串1', min: 5, max: 8 },
      { value: '6_1', label: '6串1', min: 6, max: 8 },
      { value: '7_1', label: '7串1', min: 7, max: 8 },
      { value: '8_1', label: '8串1', min: 8, max: 8 }
    ]
    const availablePassTypes = ref([])
    const selectedPassTypes = ref([])
    const selectedPassTypesMap = reactive({})
    const multiple = ref(1)
    const multipleInput = ref('1')
    const totalBets = ref(0)
    const totalAmount = ref(0)
    const minBonus = ref(0)
    const maxBonus = ref(0)

    // 弹窗
    const showMorePlays = ref(false)
    const currentMatch = ref(null)
    const hafuNoOdds = ref(false)

    // 记录
    const records = ref([])
    const recordsLoading = ref(false)
    let touchStartX = 0
    let touchStartY = 0
    let touchStartTime = 0
    let _hasNavigated = false
    let _isFirstShow = true

    // 三级选项
    const hadOptions = [
      { label: '胜', val: 'H', field: 'hadH' },
      { label: '平', val: 'D', field: 'hadD' },
      { label: '负', val: 'A', field: 'hadA' }
    ]
    const hhadOptions = [
      { label: '胜', val: 'H', field: 'hhadH' },
      { label: '平', val: 'D', field: 'hhadD' },
      { label: '负', val: 'A', field: 'hhadA' }
    ]
    const popupHadOptions = [
      { label: '胜', val: 'H', field: 'hadH' },
      { label: '平', val: 'D', field: 'hadD' },
      { label: '负', val: 'A', field: 'hadA' }
    ]
    const popupHhadOptions = [
      { label: '胜', val: 'H', field: 'hhadH' },
      { label: '平', val: 'D', field: 'hhadD' },
      { label: '负', val: 'A', field: 'hhadA' }
    ]
    const crsWinScores = [
      { key: '1:0', field: 'crsS01s00' }, { key: '2:0', field: 'crsS02s00' }, { key: '2:1', field: 'crsS02s01' },
      { key: '3:0', field: 'crsS03s00' }, { key: '3:1', field: 'crsS03s01' }, { key: '3:2', field: 'crsS03s02' },
      { key: '4:0', field: 'crsS04s00' }, { key: '4:1', field: 'crsS04s01' }, { key: '4:2', field: 'crsS04s02' },
      { key: '5:0', field: 'crsS05s00' }, { key: '5:1', field: 'crsS05s01' }, { key: '5:2', field: 'crsS05s02' },
      { key: '胜其他', field: 'crsS1sh' }
    ]
    const crsDrawScores = [
      { key: '0:0', field: 'crsS00s00' }, { key: '1:1', field: 'crsS01s01' }, { key: '2:2', field: 'crsS02s02' },
      { key: '3:3', field: 'crsS03s03' }, { key: '平其他', field: 'crsS1sd' }
    ]
    const crsLoseScores = [
      { key: '0:1', field: 'crsS00s01' }, { key: '0:2', field: 'crsS00s02' }, { key: '1:2', field: 'crsS01s02' },
      { key: '0:3', field: 'crsS00s03' }, { key: '1:3', field: 'crsS01s03' }, { key: '2:3', field: 'crsS02s03' },
      { key: '0:4', field: 'crsS00s04' }, { key: '1:4', field: 'crsS01s04' }, { key: '2:4', field: 'crsS02s04' },
      { key: '0:5', field: 'crsS00s05' }, { key: '1:5', field: 'crsS01s05' }, { key: '2:5', field: 'crsS02s05' },
      { key: '负其他', field: 'crsS1sa' }
    ]
    const ttgOptions = [
      { key: '0', label: '0', field: 'ttgS0' }, { key: '1', label: '1', field: 'ttgS1' },
      { key: '2', label: '2', field: 'ttgS2' }, { key: '3', label: '3', field: 'ttgS3' },
      { key: '4', label: '4', field: 'ttgS4' }, { key: '5', label: '5', field: 'ttgS5' },
      { key: '6', label: '6', field: 'ttgS6' }, { key: '7', label: '7+', field: 'ttgS7' }
    ]
    const hafuOptions = [
      { key: 'HH', label: '胜胜', field: 'hafuHh' }, { key: 'HD', label: '胜平', field: 'hafuHd' },
      { key: 'HA', label: '胜负', field: 'hafuHa' }, { key: 'DH', label: '平胜', field: 'hafuDh' },
      { key: 'DD', label: '平平', field: 'hafuDd' }, { key: 'DA', label: '平负', field: 'hafuDa' },
      { key: 'AH', label: '负胜', field: 'hafuAh' }, { key: 'AD', label: '负平', field: 'hafuAd' },
      { key: 'AA', label: '负负', field: 'hafuAa' }
    ]

    // === Helpers ===
    function parseOdds(val) {
      if (typeof val === 'number') return val
      if (typeof val === 'string') return parseFloat(val) || 0
      return 0
    }

    function parseAiRecommend(match) {
      match.aiHadValue = POSITION_MAP[match.aiResult] || null
      match.aiHhadValue = HHAD_MAP[match.aiLetResult] || null
      match.aiHadOdds = null
      match.aiHhadOdds = null
      if (match.aiHadValue === 'H') match.aiHadOdds = match.hadH
      else if (match.aiHadValue === 'D') match.aiHadOdds = match.hadD
      else if (match.aiHadValue === 'A') match.aiHadOdds = match.hadA
      if (match.aiHhadValue === 'H') match.aiHhadOdds = match.hhadH
      else if (match.aiHhadValue === 'D') match.aiHhadOdds = match.hhadD
      else if (match.aiHhadValue === 'A') match.aiHhadOdds = match.hhadA
      return match
    }

    function formatTime(timeStr) {
      if (!timeStr) return ''
      const d = new Date(timeStr)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    function formatTimeInfo(timeStr) {
      if (!timeStr) return { monthDay: '', hourMinute: '' }
      const d = new Date(timeStr)
      return {
        monthDay: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        hourMinute: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      }
    }

    function formatPassTypes(arr) {
      if (!arr || !Array.isArray(arr)) return ''
      const map = { single: '单关', '2_1': '2串1', '3_1': '3串1', '4_1': '4串1', '5_1': '5串1', '6_1': '6串1', '7_1': '7串1', '8_1': '8串1' }
      return arr.map(p => map[p] || p).join('/')
    }

    function canOptionSingleBet(match, sel) {
      if (!match) return false
      if (sel.type === 'crs' || sel.type === 'ttg' || sel.type === 'hafu') return true
      if (sel.type === 'had') return match.bettingSingle == 1 || match.bettingSingle === true
      if (sel.type === 'hhad') return match.bettingAllUp == 1 || match.bettingAllUp === true
      return false
    }

    function canSingleBet(matchId, sel) {
      const m = matches.value.find(x => String(x.matchId) === String(matchId))
      return canOptionSingleBet(m, sel)
    }

    function checkSingleAvailable(selectionsObj) {
      const ids = Object.keys(selectionsObj)
      if (ids.length === 0) return false
      for (const mid of ids) {
        const m = matches.value.find(x => String(x.matchId) === String(mid))
        for (const sel of (selectionsObj[mid] || [])) {
          if (!canOptionSingleBet(m, sel)) return false
        }
      }
      return true
    }

    function getMaxPassByPlayTypes(selectionsObj) {
      let max = 8
      for (const mid of Object.keys(selectionsObj)) {
        for (const item of (selectionsObj[mid] || [])) {
          const limit = TYPE_MAX_PASS[item.type]
          if (limit !== undefined && limit < max) max = limit
        }
        if (max <= 4) break
      }
      return max
    }

    function calcAvailablePassTypes(selectionsObj) {
      const ids = Object.keys(selectionsObj)
      if (ids.length === 0) return { available: [], selected: [], map: {} }
      const singleAvail = checkSingleAvailable(selectionsObj)
      const maxPass = getMaxPassByPlayTypes(selectionsObj)
      const available = []
      allPassTypes.forEach(pt => {
        if (pt.value === 'single') {
          if (singleAvail) available.push(pt)
        } else {
          if (ids.length >= pt.min && pt.min <= maxPass) available.push(pt)
        }
      })
      const validSelected = selectedPassTypes.value.filter(pt => available.some(a => a.value === pt))
      const map = {}
      validSelected.forEach(pt => { map[pt] = true })
      return { available, selected: validSelected, map }
    }

    // 组合数学
    function getCombinations(arr, m) {
      if (m === 1) return arr.map(item => [item])
      if (m === arr.length) return [arr]
      const result = []
      for (let i = 0; i <= arr.length - m; i++) {
        const sub = getCombinations(arr.slice(i + 1), m - 1)
        sub.forEach(s => result.push([arr[i], ...s]))
      }
      return result
    }

    function getPlayTypePaths(matchIds, matchPlayTypes) {
      if (matchIds.length === 0) return [{}]
      const [first, ...rest] = matchIds
      const firstTypes = Object.keys(matchPlayTypes[first])
      const restPaths = getPlayTypePaths(rest, matchPlayTypes)
      const result = []
      firstTypes.forEach(pt => {
        restPaths.forEach(rp => result.push({ ...rp, [first]: pt }))
      })
      return result
    }

    function getOddsCombinationsForPath(matchIds, pathSelections) {
      if (matchIds.length === 0) return [[]]
      const [first, ...rest] = matchIds
      const firstOdds = pathSelections[first].map(s => s.odds).filter(o => o > 0)
      if (firstOdds.length === 0) firstOdds.push(1)
      const restCombos = getOddsCombinationsForPath(rest, pathSelections)
      const result = []
      firstOdds.forEach(o => {
        restCombos.forEach(rc => result.push([o, ...rc]))
      })
      return result
    }

    function calculatePassTypeBets(passType, matchIds, selectionsObj) {
      if (passType === 'single') {
        let count = 0, bonusResults = []
        matchIds.forEach(mid => {
          (selectionsObj[mid] || []).forEach(sel => {
            if (canSingleBet(mid, sel)) {
              count++
              if (sel.odds > 0) bonusResults.push(sel.odds)
            }
          })
        })
        return { count, bonusResults }
      }
      const [m] = passType.split('_').map(Number)
      if (matchIds.length < m) return { count: 0, bonusResults: [] }
      const matchPlayTypes = {}
      matchIds.forEach(mid => {
        matchPlayTypes[mid] = {}
        (selectionsObj[mid] || []).forEach(sel => {
          if (!matchPlayTypes[mid][sel.type]) matchPlayTypes[mid][sel.type] = []
          matchPlayTypes[mid][sel.type].push(sel)
        })
      })
      const paths = getPlayTypePaths(matchIds, matchPlayTypes)
      let totalCount = 0, bonusResults = []
      paths.forEach(path => {
        const pathSelections = {}
        matchIds.forEach(mid => { pathSelections[mid] = matchPlayTypes[mid][path[mid]] })
        const combos = getCombinations(matchIds, m)
        combos.forEach(combo => {
          let comboCount = 1
          combo.forEach(mid => { comboCount *= pathSelections[mid].length })
          totalCount += comboCount
          const oddsCombos = getOddsCombinationsForPath(combo, pathSelections)
          oddsCombos.forEach(ol => {
            const product = ol.reduce((p, o) => p * o, 1)
            if (product > 0) bonusResults.push(product)
          })
        })
      })
      return { count: totalCount, bonusResults }
    }

    function calcBetsRaw(selectionsObj, passTypes) {
      const ids = Object.keys(selectionsObj)
      if (ids.length === 0 || !passTypes || passTypes.length === 0) {
        return { totalBets: 0, totalAmount: 0, minBonus: 0, maxBonus: 0 }
      }
      let totalBetsV = 0, allBonusResults = []
      passTypes.forEach(pt => {
        const r = calculatePassTypeBets(pt, ids, selectionsObj)
        totalBetsV += r.count
        allBonusResults = allBonusResults.concat(r.bonusResults)
      })
      const mult = multiple.value
      // min bonus
      let minB = 0
      const valid = allBonusResults.filter(r => r > 0)
      if (valid.length > 0) minB = Math.min(...valid) * 2 * mult
      // max bonus
      let maxB = 0
      const hit = {}
      ids.forEach(mid => {
        const all = selectionsObj[mid] || []
        if (all.length === 0) return
        hit[mid] = all.reduce((max, opt) => opt.odds > max.odds ? opt : max, all[0])
      })
      passTypes.forEach(pt => {
        maxB += calcMaxBonusForPassType(pt, ids, selectionsObj, hit) * 2 * mult
      })
      const amt = totalBetsV * mult * 2
      return { totalBets: totalBetsV, totalAmount: amt, minBonus: minB.toFixed(2), maxBonus: maxB.toFixed(2) }
    }

    function calcMaxBonusForPassType(passType, matchIds, selectionsObj, hitSelections) {
      if (passType === 'single') {
        let bonus = 0
        matchIds.forEach(mid => {
          const hitOpt = hitSelections[mid]
          if (hitOpt && hitOpt.odds > 0) bonus += hitOpt.odds
        })
        return bonus
      }
      const [m] = passType.split('_').map(Number)
      if (matchIds.length < m) return 0
      const matchPlayTypes = {}
      matchIds.forEach(mid => {
        matchPlayTypes[mid] = {}
        (selectionsObj[mid] || []).forEach(sel => {
          if (!matchPlayTypes[mid][sel.type]) matchPlayTypes[mid][sel.type] = []
          matchPlayTypes[mid][sel.type].push(sel)
        })
      })
      const paths = getPlayTypePaths(matchIds, matchPlayTypes)
      let total = 0
      paths.forEach(path => {
        const pathSelections = {}
        matchIds.forEach(mid => { pathSelections[mid] = matchPlayTypes[mid][path[mid]] })
        const hitStatus = {}
        matchIds.forEach(mid => {
          const hitOpt = hitSelections[mid]
          hitStatus[mid] = (pathSelections[mid] || []).some(o => o.type === hitOpt.type && o.value === hitOpt.value)
        })
        const combos = getCombinations(matchIds, m)
        combos.forEach(combo => {
          if (!combo.every(mid => hitStatus[mid])) return
          total += combo.reduce((p, mid) => p * hitSelections[mid].odds, 1)
        })
      })
      return total
    }

    function buildFullOptions(matchId, selectedOpts) {
      const m = matches.value.find(x => String(x.matchId) === String(matchId))
      if (!m) return selectedOpts.map(o => ({ ...o, checked: true }))
      const result = []
      const hasHad = selectedOpts.some(o => o.type === 'had')
      const hasHhad = selectedOpts.some(o => o.type === 'hhad')
      if (hasHad) {
        result.push(
          { type: 'had', value: 'H', odds: m.hadH, checked: selectedOpts.some(s => s.type === 'had' && s.value === 'H') },
          { type: 'had', value: 'D', odds: m.hadD, checked: selectedOpts.some(s => s.type === 'had' && s.value === 'D') },
          { type: 'had', value: 'A', odds: m.hadA, checked: selectedOpts.some(s => s.type === 'had' && s.value === 'A') }
        )
      }
      if (hasHhad) {
        result.push(
          { type: 'hhad', value: 'H', odds: m.hhadH, goalLine: m.hhadGoalLine, checked: selectedOpts.some(s => s.type === 'hhad' && s.value === 'H') },
          { type: 'hhad', value: 'D', odds: m.hhadD, goalLine: m.hhadGoalLine, checked: selectedOpts.some(s => s.type === 'hhad' && s.value === 'D') },
          { type: 'hhad', value: 'A', odds: m.hhadA, goalLine: m.hhadGoalLine, checked: selectedOpts.some(s => s.type === 'hhad' && s.value === 'A') }
        )
      }
      selectedOpts.forEach(o => {
        if (o.type !== 'had' && o.type !== 'hhad') result.push({ ...o, checked: true })
      })
      return result
    }

    function applyCalcResult(result) {
      availablePassTypes.value = result.available
      selectedPassTypes.value = result.selected
      for (const k of Object.keys(selectedPassTypesMap)) delete selectedPassTypesMap[k]
      Object.assign(selectedPassTypesMap, result.map)
      const betResult = calcBetsRaw(selections, result.selected)
      totalBets.value = betResult.totalBets
      totalAmount.value = betResult.totalAmount
      minBonus.value = betResult.minBonus
      maxBonus.value = betResult.maxBonus
    }

    // === Actions ===
    function isAiSelected(match) {
      const k1 = match.matchId + '_had_' + match.aiHadValue
      const k2 = match.matchId + '_hhad_' + match.aiHhadValue
      return selectedMap[k1] || selectedMap[k2]
    }

    function onSelectOption(matchId, type, value, odds) {
      if (odds === null || odds === '' || odds === undefined) return
      toggleSelection(matchId, type, value, parseOdds(odds))
    }

    function toggleSelection(matchId, type, value, odds) {
      const key = `${matchId}_${type}_${value}`
      if (selections[matchId]) {
        const idx = selections[matchId].findIndex(s => s.type === type && s.value === value)
        if (idx > -1) {
          selections[matchId].splice(idx, 1)
          if (selections[matchId].length === 0) delete selections[matchId]
          delete selectedMap[key]
        } else {
          if (!selections[matchId] && Object.keys(selections).length >= 8) {
            uni.showToast({ title: '最多选择8场比赛', icon: 'none', duration: 1500 })
            return
          }
          if (!selections[matchId]) selections[matchId] = []
          selections[matchId].push({ type, value, odds })
          selectedMap[key] = true
        }
      } else {
        if (Object.keys(selections).length >= 8) {
          uni.showToast({ title: '最多选择8场比赛', icon: 'none', duration: 1500 })
          return
        }
        selections[matchId] = [{ type, value, odds }]
        selectedMap[key] = true
      }
      applyCalcResult(calcAvailablePassTypes(selections))
    }

    function onAiRecommendTap(match) {
      const userInfo = userStore.getUserInfo()
      if (!userInfo || !userInfo.isVip) {
        uni.showModal({
          title: 'VIP专属功能',
          content: 'AI帮选是会员专属功能，开通会员即可使用',
          confirmText: '开通会员',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/vip/index' })
          }
        })
        return
      }
      const hadKey = match.matchId + '_had_' + match.aiHadValue
      const hhadKey = match.matchId + '_hhad_' + match.aiHhadValue
      const isSelected = selectedMap[hadKey] || selectedMap[hhadKey]
      if (isSelected) {
        if (!selections[match.matchId]) selections[match.matchId] = []
        delete selectedMap[hadKey]
        delete selectedMap[hhadKey]
        selections[match.matchId] = selections[match.matchId].filter(
          s => !(s.type === 'had' && s.value === match.aiHadValue) && !(s.type === 'hhad' && s.value === match.aiHhadValue)
        )
        if (selections[match.matchId].length === 0) delete selections[match.matchId]
      } else {
        if (!selections[match.matchId] && Object.keys(selections).length >= 8) {
          uni.showToast({ title: '最多选择8场比赛', icon: 'none', duration: 1500 })
          return
        }
        if (!selections[match.matchId]) selections[match.matchId] = []
        if (match.aiHadValue && match.aiHadOdds != null && match.aiHadOdds !== '') {
          if (!selections[match.matchId].some(s => s.type === 'had' && s.value === match.aiHadValue)) {
            selections[match.matchId].push({ type: 'had', value: match.aiHadValue, odds: parseOdds(match.aiHadOdds) })
          }
          selectedMap[hadKey] = true
        }
        if (match.aiHhadValue && match.aiHhadOdds != null && match.aiHhadOdds !== '') {
          if (!selections[match.matchId].some(s => s.type === 'hhad' && s.value === match.aiHhadValue)) {
            selections[match.matchId].push({ type: 'hhad', value: match.aiHhadValue, odds: parseOdds(match.aiHhadOdds) })
          }
          selectedMap[hhadKey] = true
        }
      }
      applyCalcResult(calcAvailablePassTypes(selections))
    }

    function onMorePlays(match) {
      if (!match) return
      const fields = ['hafuHh', 'hafuHd', 'hafuHa', 'hafuDh', 'hafuDd', 'hafuDa', 'hafuAh', 'hafuAd', 'hafuAa']
      const allNull = fields.every(f => match[f] == null || match[f] === '' || match[f] === undefined)
      currentMatch.value = match
      hafuNoOdds.value = allNull
      showMorePlays.value = true
    }

    function onCloseMorePlays() {
      showMorePlays.value = false
      currentMatch.value = null
    }

    function onSelectScore(matchId, score, odds) {
      toggleSelection(matchId, 'crs', score, parseOdds(odds))
    }

    function onSelectGoal(matchId, goal, odds) {
      toggleSelection(matchId, 'ttg', goal, parseOdds(odds))
    }

    function onSelectHafu(matchId, hafu, odds) {
      toggleSelection(matchId, 'hafu', hafu, parseOdds(odds))
    }

    function onSelectPassType(value) {
      const sp = selectedPassTypes.value
      const idx = sp.indexOf(value)
      if (idx > -1) {
        sp.splice(idx, 1)
        delete selectedPassTypesMap[value]
      } else {
        sp.push(value)
        selectedPassTypesMap[value] = true
      }
      const betResult = calcBetsRaw(selections, sp)
      totalBets.value = betResult.totalBets
      totalAmount.value = betResult.totalAmount
      minBonus.value = betResult.minBonus
      maxBonus.value = betResult.maxBonus
    }

    function onMultipleInput(e) {
      const v = e.detail.value
      multipleInput.value = v
      const n = parseInt(v)
      if (n > 0) {
        multiple.value = Math.min(5000, n)
        const betResult = calcBetsRaw(selections, selectedPassTypes.value)
        totalAmount.value = betResult.totalAmount
        minBonus.value = betResult.minBonus
        maxBonus.value = betResult.maxBonus
      }
    }

    function onMultipleBlur(e) {
      let v = parseInt(e.detail.value) || 1
      v = Math.max(1, Math.min(5000, v))
      multiple.value = v
      multipleInput.value = String(v)
      const betResult = calcBetsRaw(selections, selectedPassTypes.value)
      totalAmount.value = betResult.totalAmount
      minBonus.value = betResult.minBonus
      maxBonus.value = betResult.maxBonus
    }

    function onMultipleMinus() {
      const v = Math.max(1, multiple.value - 1)
      multiple.value = v
      multipleInput.value = String(v)
      const betResult = calcBetsRaw(selections, selectedPassTypes.value)
      totalAmount.value = betResult.totalAmount
      minBonus.value = betResult.minBonus
      maxBonus.value = betResult.maxBonus
    }

    function onMultiplePlus() {
      const v = Math.min(5000, multiple.value + 1)
      multiple.value = v
      multipleInput.value = String(v)
      const betResult = calcBetsRaw(selections, selectedPassTypes.value)
      totalAmount.value = betResult.totalAmount
      minBonus.value = betResult.minBonus
      maxBonus.value = betResult.maxBonus
    }

    async function onSubmit() {
      if (Object.keys(selections).length === 0) {
        uni.showToast({ title: '请至少选择一场比赛', icon: 'none' })
        return
      }
      if (selectedPassTypes.value.length === 0) {
        uni.showToast({ title: '请选择过关方式', icon: 'none' })
        return
      }
      const userInfo = userStore.getUserInfo()
      if (!userInfo || !userInfo.id) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      const saveData = {
        userId: userInfo.id,
        selections: Object.keys(selections).map(mid => ({
          matchId: parseInt(mid),
          options: buildFullOptions(mid, selections[mid])
        })),
        passTypes: selectedPassTypes.value,
        multiple: multiple.value,
        totalBets: totalBets.value
      }
      try {
        uni.showLoading({ title: '提交中...' })
        await matchApi.saveCalculatorSelection(saveData)
        uni.hideLoading()
        uni.showToast({ title: '保存成功', icon: 'success', duration: 1500 })

        // 清空选择
        for (const k of Object.keys(selections)) delete selections[k]
        for (const k of Object.keys(selectedMap)) delete selectedMap[k]
        selectedPassTypes.value = []
        for (const k of Object.keys(selectedPassTypesMap)) delete selectedPassTypesMap[k]
        availablePassTypes.value = []
        multiple.value = 1
        multipleInput.value = '1'
        totalBets.value = 0
        totalAmount.value = 0
        minBonus.value = 0
        maxBonus.value = 0

        await loadRecords()
        currentTab.value = 'records'
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '提交失败', icon: 'none' })
      }
    }

    // === 记录相关 ===
    async function loadRecords() {
      if (!userStore.checkLoginWithRedirect()) return
      recordsLoading.value = true
      try {
        const userInfo = userStore.getUserInfo()
        const res = await matchApi.getCalculatorRecords(userInfo.id)
        const raw = res.data || res || []
        records.value = raw.map(item => {
          const ti = formatTimeInfo(item.createTime)
          return {
            ...item,
            matchCount: item.matchDetails ? item.matchDetails.length : 0,
            passTypesStr: formatPassTypes(item.passTypes),
            createTimeStr: formatTime(item.createTime),
            monthDay: ti.monthDay,
            hourMinute: ti.hourMinute,
            _swiped: false
          }
        })
      } catch (e) {
        console.error('加载记录失败:', e)
      } finally {
        recordsLoading.value = false
      }
    }

    function onRecordTap(record) {
      if (record._swiped) {
        records.value.forEach(r => r._swiped = false)
        return
      }
      if (!record || !record.id) return
      _hasNavigated = true
      uni.navigateTo({ url: `/pages/calculator-detail/index?id=${record.id}` })
    }

    function onTouchStart(e, index) {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      touchStartTime = Date.now()
    }

    function onTouchMove(e, index) {
      const deltaX = e.touches[0].clientX - touchStartX
      const deltaY = e.touches[0].clientY - touchStartY
      if (Math.abs(deltaX) < Math.abs(deltaY)) return
      records.value.forEach((r, i) => {
        if (i !== index) r._swiped = false
      })
      if (deltaX < -50) {
        records.value[index]._swiped = true
      } else if (deltaX > 50) {
        records.value[index]._swiped = false
      }
    }

    function onTouchEnd(e, index) {
      // 不做额外处理
    }

    async function onDeleteRecord(id, index) {
      const res = await new Promise(resolve => {
        uni.showModal({
          title: '确认删除',
          content: '确定要删除这条记录吗？',
          success: (r) => resolve(r.confirm)
        })
      })
      if (!res) return
      try {
        uni.showLoading({ title: '删除中...', mask: true })
        await matchApi.deleteCalculatorRecord(id)
        uni.hideLoading()
        records.value = records.value.filter((_, i) => i !== index)
        uni.showToast({ title: '删除成功', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    }

    // === 加载比赛 ===
    async function loadMatches() {
      loading.value = true
      error.value = null
      try {
        const res = await matchApi.getCalculatorMatches()
        const raw = res.data || res || []
        matches.value = raw.map(m => parseAiRecommend(m))
      } catch (e) {
        error.value = e.message || '加载失败'
      } finally {
        loading.value = false
      }
    }

    function onRetry() { loadMatches() }

    function onSwitchTab(tab) {
      if (tab === currentTab.value) return
      if (tab === 'records' && !userStore.checkLoginWithRedirect()) return
      currentTab.value = tab
      if (tab === 'records') loadRecords()
    }

    // === Lifecycle ===
    onLoad((options) => {
      if (options?.matches) {
        try {
          const hotMatches = JSON.parse(decodeURIComponent(options.matches))
          matches.value = hotMatches.map(m => parseAiRecommend(m))
          loading.value = false
          source.value = options.source || ''
          pageTitle.value = '热门比赛模拟'
          return
        } catch (e) { console.error('解析比赛数据失败:', e) }
      }
      loadMatches()
    })

    onShow(() => {
      if (_hasNavigated) { _hasNavigated = false; return }
      if (_isFirstShow) { _isFirstShow = false; return }
      if (currentTab.value === 'records') loadRecords()
    })

    return {
      currentTab, pageTitle, matches, loading, error, source,
      selections, selectedMap, selectedCount,
      availablePassTypes, selectedPassTypes, selectedPassTypesMap,
      multiple, multipleInput, totalBets, totalAmount, minBonus, maxBonus,
      showMorePlays, currentMatch, hafuNoOdds,
      records, recordsLoading,
      hadOptions, hhadOptions,
      popupHadOptions, popupHhadOptions,
      crsWinScores, crsDrawScores, crsLoseScores,
      ttgOptions, hafuOptions,
      isAiSelected,
      onSelectOption, onAiRecommendTap, onMorePlays, onCloseMorePlays,
      onSelectScore, onSelectGoal, onSelectHafu,
      onSelectPassType, onMultipleInput, onMultipleBlur, onMultipleMinus, onMultiplePlus,
      onSubmit,
      onRecordTap, onTouchStart, onTouchMove, onTouchEnd, onDeleteRecord,
      onSwitchTab, onRetry
    }
  }
}
</script>

<style scoped>
.calculator-page {
  height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading-wrapper, .error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}

.loading-spinner {
  width: 60rpx; height: 60rpx;
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
  margin-top: 24rpx;
  padding: 16rpx 48rpx;
  background: #667eea;
  color: #fff;
  border-radius: 32rpx;
  font-size: 26rpx;
}

/* 专题标题 */
.page-title-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 32rpx 16rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.page-title { font-size: 32rpx; font-weight: 700; color: #fff; }
.page-subtitle { font-size: 22rpx; color: rgba(255,255,255,0.8); margin-top: 6rpx; }

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Tab */
.tab-header {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28rpx 0;
  position: relative;
}
.tab-text { font-size: 28rpx; color: #666; font-weight: 500; }
.tab-item.active .tab-text { color: #333; font-weight: 600; }
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: 48rpx; height: 4rpx;
  background: #667eea;
  border-radius: 2rpx;
}
.record-badge {
  margin-left: 8rpx;
  padding: 2rpx 10rpx;
  background: #ff6b6b;
  color: #fff;
  font-size: 20rpx;
  border-radius: 16rpx;
  font-weight: 500;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.match-scroll {
  flex: 1;
  height: 0;
  padding: 12rpx;
}

/* 比赛卡片 */
.match-card {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  padding: 12rpx 14rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  position: relative;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 6rpx;
}
.match-num {
  font-size: 20rpx;
  color: #fff;
  background: #667eea;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-weight: 600;
}
.league-name { font-size: 22rpx; color: #ff9800; font-weight: 500; }
.match-time { font-size: 20rpx; color: #999; }
.single-tag {
  margin-left: auto;
  font-size: 18rpx;
  color: #fff;
  background: #ff6b6b;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  font-weight: 500;
}
.team-row {
  display: flex;
  align-items: center;
  padding: 4rpx 0;
  margin-bottom: 6rpx;
}
.team-name { font-size: 26rpx; font-weight: 600; color: #333; }
.team-name.home { flex: 1; text-align: center; }
.team-name.away { flex: 1; text-align: center; }
.vs-text { font-size: 20rpx; color: #999; padding: 0 12rpx; }

/* AI帮选 */
.ai-recommend {
  margin-bottom: 8rpx;
  padding: 6rpx 14rpx;
  background: linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%);
  border: 1rpx dashed #667eea;
  border-radius: 8rpx;
  animation: aiBorderPulse 2s ease-in-out infinite;
}
.ai-recommend.ai-selected {
  background: linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%);
  border-style: solid;
  border-color: rgba(102,126,234,0.5);
  animation: none;
}
@keyframes aiBorderPulse {
  0%, 100% { border-color: rgba(102,126,234,0.35); }
  50% { border-color: rgba(102,126,234,0.7); }
}
.ai-bar-inner { display: flex; align-items: center; gap: 8rpx; }
.ai-bar-icon { font-size: 20rpx; }
.ai-bar-text { flex: 1; font-size: 20rpx; color: #667eea; font-weight: 500; }
.ai-bar-arrow { font-size: 18rpx; color: #667eea; }

/* 赔率 */
.odds-wrapper { display: flex; }
.odds-left { flex: 1; }
.card-right {
  width: 44rpx;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  margin-left: 10rpx;
}
.more-text { font-size: 22rpx; color: #fff; font-weight: 500; line-height: 1.6; }

.odds-section { margin-bottom: 8rpx; }
.odds-section.last { margin-bottom: 0; }

.section-title {
  font-size: 22rpx;
  color: #333;
  font-weight: 600;
  width: 100rpx;
  flex-shrink: 0;
}
.goalline { color: #667eea; font-weight: 500; }
.odds-inline-row { display: flex; align-items: center; gap: 12rpx; }

.odds-group {
  display: flex;
  flex: 1;
  border-radius: 8rpx;
  overflow: hidden;
  position: relative;
  border: 2rpx solid #e8e8e8;
}
.odds-group.single { border: none; }
.odds-group.single .odds-item { border: 2rpx solid #c41d1d; margin-right: -2rpx; }
.odds-group.single .odds-item:last-child { margin-right: 0; }

.single-corner {
  position: absolute;
  top: -2rpx; left: -2rpx;
  font-size: 16rpx;
  color: #fff;
  background: #c41d1d;
  padding: 2rpx 8rpx;
  border-radius: 6rpx 0 6rpx 0;
  font-weight: 600;
  z-index: 1;
}

.odds-item {
  flex: 1;
  padding: 10rpx 4rpx;
  background: #f5f7fa;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  position: relative;
}
.odds-item:not(:last-child) { border-right: 1rpx solid #e8e8e8; }
.odds-item.active { background: linear-gradient(135deg, #c41d1d 0%, #d32f2f 100%); }
.odds-item.disabled { opacity: 0.55; background: #e8e8e8; }
.odds-item.disabled .odds-value { color: #999; }
.odds-label { font-size: 24rpx; color: #333; font-weight: 600; width: 32rpx; text-align: center; flex-shrink: 0; }
.odds-item.active .odds-label { color: #fff; }
.odds-value { font-size: 22rpx; font-weight: 500; color: #999; min-width: 72rpx; text-align: center; flex-shrink: 0; }
.odds-item.active .odds-value { color: rgba(255,255,255,0.9); }

.selected-badge {
  position: absolute;
  top: 8rpx; right: 8rpx;
  background: #ff6b6b;
  color: #fff;
  font-size: 18rpx;
  padding: 4rpx 10rpx;
  border-radius: 12rpx;
}

.bottom-placeholder { height: 220rpx; }

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06);
  padding: 12rpx 16rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
}
.pass-type-row { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 10rpx; }
.pass-btn {
  padding: 8rpx 16rpx;
  background: #f5f7fa;
  border-radius: 6rpx;
  font-size: 22rpx;
  color: #666;
  border: 2rpx solid transparent;
}
.pass-btn.active {
  background: #e53935;
  border-color: #e53935;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(229,57,53,0.4);
}
.pass-type-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 0;
  margin-bottom: 10rpx;
}
.empty-tip-text { font-size: 24rpx; color: #999; }

.amount-row { display: flex; align-items: center; gap: 12rpx; }
.multiple-box { display: flex; align-items: center; gap: 8rpx; }
.multiple-box .label { font-size: 24rpx; color: #666; }
.stepper { display: flex; align-items: center; background: #f5f7fa; border-radius: 6rpx; }
.stepper-btn {
  width: 48rpx; height: 48rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; color: #ff6b6b; font-weight: 600;
}
.stepper-input {
  width: 100rpx; height: 48rpx;
  text-align: center;
  font-size: 24rpx; font-weight: 600;
  color: #333;
  background: #fff;
  border: none;
}
.amount-info { flex: 1; display: flex; flex-direction: column; gap: 2rpx; }
.amount-label { font-size: 24rpx; color: #333; font-weight: 500; }
.bonus-text { font-size: 20rpx; color: #ff6b6b; }
.submit-btn {
  padding: 16rpx 32rpx;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8c8c 100%);
  border-radius: 8rpx;
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
}
.submit-btn.disabled { background: #ccc; }

/* 弹窗 */
.popup-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}
.popup-content {
  width: 100%;
  max-height: 92vh;
  background: #fff;
  border-radius: 20rpx 20rpx 0 0;
  display: flex;
  flex-direction: column;
}
.popup-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  position: relative;
}
.popup-title-wrap { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.popup-title { font-size: 28rpx; font-weight: 600; color: #333; }
.popup-time { font-size: 22rpx; color: #999; }
.popup-close {
  position: absolute;
  right: 24rpx; top: 50%;
  transform: translateY(-50%);
  width: 48rpx; height: 48rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 40rpx; color: #999;
}
.popup-tip {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #f5222d;
  padding: 6rpx 0;
}
.popup-body {
  flex: 1;
  padding: 4rpx 12rpx;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.play-row { display: flex; align-items: stretch; margin-bottom: 4rpx; }
.play-label {
  width: 46rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
  border-radius: 6rpx 0 0 6rpx;
  flex-shrink: 0;
  letter-spacing: 4rpx;
}
.had-label { background: #c0c4cc; }
.hhad-label { background: #f5222d; }
.crs-label { background: #70aeec; }
.ttg-label { background: #f88282; }
.hafu-label { background: #f8cd7c; }

.play-options { flex: 1; display: flex; flex-wrap: wrap; gap: 4rpx; padding-left: 4rpx; }

.opt-item {
  flex: 1; min-width: 0;
  padding: 8rpx 4rpx;
  border-radius: 6rpx;
  display: flex; flex-direction: column; align-items: center;
  gap: 2rpx;
  border: 2rpx solid #e8e8e8;
  position: relative; overflow: hidden;
}
.opt-item.disabled { opacity: 0.55; pointer-events: none; }
.play-options.single-group { gap: 0; }
.play-options.single-group .opt-item {
  border: 2rpx solid #f5222d;
  border-radius: 0;
  margin-right: -2rpx;
}
.play-options.single-group .opt-item:last-child { margin-right: 0; }
.opt-item.active { background: linear-gradient(135deg, #c41d1d 0%, #d32f2f 100%); border-color: #c41d1d; }
.opt-item.active .single-corner { background: rgba(0,0,0,0.3); }
.opt-text { font-size: 22rpx; color: #333; font-weight: 600; }
.opt-item.active .opt-text { color: #fff; }
.opt-odds { font-size: 18rpx; color: #999; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.opt-item.active .opt-odds { color: rgba(255,255,255,0.9); }

/* 比分 */
.crs-options { display: flex; flex-direction: column; flex-wrap: nowrap; gap: 2rpx; }
.crs-grid { display: flex; flex-wrap: wrap; gap: 4rpx; }
.crs-item {
  width: calc((100% - 16rpx) / 5);
  padding: 6rpx 2rpx;
  border-radius: 6rpx;
  display: flex; flex-direction: column; align-items: center;
  gap: 2rpx;
  border: 2rpx solid #e8e8e8;
  position: relative; overflow: hidden;
}
.crs-item.active { background: linear-gradient(135deg, #c41d1d 0%, #d32f2f 100%); border-color: #c41d1d; }
.crs-item.active .single-corner { background: rgba(0,0,0,0.3); }
.crs-name { font-size: 20rpx; color: #333; font-weight: 600; }
.crs-item.active .crs-name { color: #fff; }
.crs-odds { font-size: 16rpx; color: #999; font-weight: 500; }
.crs-item.active .crs-odds { color: rgba(255,255,255,0.9); }

/* 单关一体边框 - 比分 */
.crs-options.single-group { gap: 0; }
.crs-options.single-group .crs-grid { gap: 0; overflow: hidden; }
.crs-options.single-group .crs-item {
  border: 2rpx solid #f5222d;
  border-radius: 0;
  margin-right: -2rpx;
  margin-top: -2rpx;
}

/* 总进球 */
.ttg-options .opt-item { width: calc((100% - 16rpx) / 4); flex: none; }
.ttg-options.single-group { gap: 0; }
.ttg-options.single-group .opt-item {
  border: 2rpx solid #f5222d;
  border-radius: 0;
  margin-right: -2rpx;
  margin-bottom: -2rpx;
}
.ttg-options.single-group .opt-item:last-child { margin-right: 0; }

/* 半全场 */
.hafu-options { gap: 8rpx; }
.hafu-options .opt-item { width: calc((100% - 16rpx) / 3); flex: none; }
.hafu-options.single-group { gap: 0; }
.hafu-options.single-group .opt-item {
  border: 2rpx solid #f5222d;
  border-radius: 0;
  margin-right: -2rpx;
  margin-bottom: -2rpx;
}
.hafu-options.single-group .opt-item:last-child { margin-right: 0; }

.hafu-no-odds { flex: 1; display: flex; align-items: center; justify-content: center; padding-left: 4rpx; }
.no-odds-text { font-size: 24rpx; color: #999; font-weight: 500; }
.had-disabled { background: #f2f2f2; border-radius: 8rpx; }

.popup-footer {
  display: flex; gap: 16rpx;
  padding: 12rpx 20rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}
.popup-btn-cancel, .popup-btn-confirm {
  flex: 1; padding: 16rpx;
  border-radius: 10rpx;
  text-align: center;
  font-size: 28rpx; font-weight: 600;
}
.popup-btn-cancel { background: #f0f0f0; color: #666; }
.popup-btn-confirm { background: linear-gradient(135deg, #f5222d 0%, #ff6a88 100%); color: #fff; }

/* 记录列表 */
.records-content { background: linear-gradient(180deg, #f8f9fb 0%, #f5f7fa 100%); }
.records-loading {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 120rpx 0;
}
.records-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 100rpx 40rpx; color: #999;
}
.empty-icon { font-size: 100rpx; margin-bottom: 32rpx; opacity: 0.5; }
.empty-text { font-size: 32rpx; color: #666; font-weight: 500; margin-bottom: 16rpx; }
.empty-tip { font-size: 26rpx; color: #999; text-align: center; }

.records-scroll { flex: 1; height: 0; padding: 20rpx 16rpx 24rpx; }

.record-swipe-wrapper { margin-bottom: 20rpx; overflow: hidden; border-radius: 16rpx; }
.record-swipe-inner { display: flex; transition: transform 0.2s ease; }
.record-swipe-inner.swiped { transform: translateX(-140rpx); }

.record-card {
  flex-shrink: 0;
  width: 100%;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
  overflow: hidden;
  display: flex;
}
.record-date-box {
  width: 100rpx;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 20rpx 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  flex-shrink: 0;
}
.date-month { font-size: 28rpx; color: #fff; font-weight: 700; }
.date-time { font-size: 22rpx; color: rgba(255,255,255,0.85); margin-top: 4rpx; }
.record-content { flex: 1; padding: 16rpx 20rpx; position: relative; }

.record-status-tag {
  position: absolute;
  top: 0; right: 0;
  padding: 8rpx 14rpx;
  border-radius: 0 16rpx 0 12rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.record-status-tag .status-text { font-size: 22rpx; color: #fff; font-weight: 600; }
.record-status-tag.win { background: linear-gradient(135deg, #c41d1d 0%, #d32f2f 100%); }
.record-status-tag.pending { background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%); }
.record-status-tag.lose { background: linear-gradient(135deg, #9e9e9e 0%, #bdbdbd 100%); }

.record-title-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.record-matches { font-size: 30rpx; color: #333; font-weight: 700; }
.record-pass {
  font-size: 22rpx; color: #667eea;
  background: rgba(102,126,234,0.12);
  padding: 4rpx 12rpx; border-radius: 6rpx;
  font-weight: 600;
}
.record-amount-row { display: flex; align-items: center; gap: 16rpx; }
.record-amount { font-size: 26rpx; color: #666; }
.record-bonus { font-size: 26rpx; color: #c41d1d; font-weight: 700; }

.record-delete-btn {
  flex-shrink: 0;
  width: 140rpx;
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  display: flex; align-items: center; justify-content: center;
  border-radius: 0 16rpx 16rpx 0;
}
.delete-text { color: #fff; font-size: 28rpx; font-weight: 600; }
</style>
