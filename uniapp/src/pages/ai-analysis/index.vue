<template>
  <view class="ai-analysis-page">
    <!-- 比赛信息头部 -->
    <view v-if="matchInfo" class="match-header">
      <view class="header-top">
        <text class="league">{{ matchInfo.league }}</text>
      </view>
      <view class="teams">
        <text class="team">{{ matchInfo.homeTeam }}</text>
        <text class="vs">VS</text>
        <text class="team">{{ matchInfo.awayTeam }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-animation">
        <view class="loading-dot"></view>
        <view class="loading-dot"></view>
        <view class="loading-dot"></view>
      </view>
      <text class="loading-text">AI 正在分析中...</text>
      <text class="loading-tip">请稍候，这可能需要30秒钟</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error-wrapper">
      <view class="error-icon">!</view>
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="onRetry">重新分析</view>
    </view>

    <!-- 分析结果 -->
    <view v-else-if="analysisResult || streaming" class="result-wrapper">
      <!-- 生成时间 -->
      <view v-if="generateTime && !streaming" class="generate-time-bar">
        <text class="time-icon">🕐</text>
        <text class="time-text">生成时间: {{ generateTime }}</text>
      </view>

      <!-- 流式传输状态提示 -->
      <view v-if="streaming" class="streaming-bar">
        <view class="streaming-indicator">
          <view class="streaming-dot"></view>
          <view class="streaming-dot"></view>
          <view class="streaming-dot"></view>
        </view>
        <text class="streaming-text">AI 正在生成分析...</text>
      </view>

      <!-- 操作栏 -->
      <view class="action-bar">
        <view
          :class="['refresh-btn', isVip ? 'vip' : 'disabled', streaming ? 'loading' : '']"
          @tap="onGetLatestAnalysis"
        >
          <view v-if="!streaming" class="vip-badge">VIP</view>
          <view v-if="streaming" class="loading-spinner-mini"></view>
          <text>{{ streaming ? '生成中...' : '获取最新' }}</text>
        </view>
        <view v-if="!streaming" class="action-btn" @tap="onCopy">
          <text>复制</text>
        </view>
        <button v-if="!streaming" class="action-btn" open-type="share">
          <text>分享</text>
        </button>
        <view v-if="isAdmin && !streaming" class="action-btn delete-btn" @tap="onDelete">
          <text>删除</text>
        </view>
      </view>

      <!-- 内容区域 -->
      <view class="content-card">
        <view v-if="streaming && !analysisResult" class="stream-waiting">
          <text class="waiting-text">等待AI响应...</text>
        </view>

        <typing-text
          v-if="streaming && analysisResult"
          :text="analysisResult"
          :typing="true"
          :speed="30"
          :show-cursor="true"
          @complete="onTypingComplete"
        />

        <markdown-viewer
          v-if="!streaming && analysisResult"
          :content="analysisResult"
        />
      </view>

      <view class="safe-bottom"></view>
    </view>
  </view>
</template>

<script>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { post } from '@/api/index'
import * as analysisApi from '@/api/analysis'
import * as matchApi from '@/api/match'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import TypingText from '@/components/TypingText.vue'

const getStorageSync = (key) => {
  try { return uni.getStorageSync(key) } catch (e) { return null }
}

export default {
  components: { MarkdownViewer, TypingText },
  setup() {
    const matchInfo = ref(null)
    const matchId = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const streaming = ref(false)
    const analysisResult = ref('')
    const generateTime = ref('')
    const isVip = ref(false)
    const isAdmin = ref(false)

    onLoad((options) => {
      if (options?.matchId) {
        matchId.value = options.matchId
        loadMatchInfo(options.matchId)
        startAnalysis(options.matchId)
      }
      const userInfo = getStorageSync('userInfo')
      if (userInfo) {
        isVip.value = userInfo.isVip === true
        isAdmin.value = userInfo.role === 'admin' || userInfo.role === 'superadmin'
      }
    })

    async function loadMatchInfo(mid) {
      try {
        const res = await matchApi.getMatchDetail(mid)
        if (res) {
          matchInfo.value = {
            league: res.leagueAbbName || res.league || '',
            homeTeam: res.homeTeamAbbName || res.homeTeam || '',
            awayTeam: res.awayTeamAbbName || res.awayTeam || '',
          }
        }
      } catch (e) {
        console.error('加载比赛信息失败:', e)
      }
    }

    async function startAnalysis(mid) {
      loading.value = true
      error.value = null
      streaming.value = false
      analysisResult.value = ''
      generateTime.value = ''

      try {
        const m = mid || matchId.value
        const result = await post(`/api/match/analysis/${m}`, {}, { showLoading: false })
        const analysisText = result.aiAnalysis || result.content || result.analysis || ''

        if (!analysisText) {
          loading.value = false
          error.value = '暂无分析结果'
          return
        }

        analysisResult.value = analysisText
        // 格式化生成时间
        if (result.timestamp) {
          generateTime.value = formatTimestamp(result.timestamp)
        } else {
          generateTime.value = formatTime(new Date())
        }
        loading.value = false
      } catch (e) {
        loading.value = false
        error.value = e.message || '分析失败，请重试'
      }
    }

    function onGetLatestAnalysis() {
      if (streaming.value) return
      startAnalysis()
    }

    function onRetry() {
      startAnalysis()
    }

    function onCopy() {
      if (!analysisResult.value) return
      uni.setClipboardData({
        data: analysisResult.value,
        success: () => {
          uni.showToast({ title: '已复制', icon: 'success', duration: 1500 })
        },
      })
    }

    function onDelete() {
      uni.showModal({
        title: '确认删除',
        content: matchInfo.value
          ? `确定要删除 ${matchInfo.value.homeTeam} vs ${matchInfo.value.awayTeam} 的分析结果吗？`
          : '确定要删除此分析结果吗？',
        confirmText: '删除',
        confirmColor: '#ff4444',
        success: async (res) => {
          if (res.confirm) {
            try {
              uni.showLoading({ title: '删除中...' })
              await analysisApi.deleteAnalysis(matchId.value)
              uni.hideLoading()
              uni.showToast({ title: '删除成功', icon: 'success', duration: 2000 })
              setTimeout(() => { uni.navigateBack() }, 1000)
            } catch (error) {
              uni.hideLoading()
              uni.showToast({ title: error.message || '删除失败', icon: 'none', duration: 2000 })
            }
          }
        },
      })
    }

    function onTypingComplete() {
      streaming.value = false
    }

    function formatTime(date) {
      const M = String(date.getMonth() + 1).padStart(2, '0')
      const D = String(date.getDate()).padStart(2, '0')
      const h = String(date.getHours()).padStart(2, '0')
      const m = String(date.getMinutes()).padStart(2, '0')
      return `${M}-${D} ${h}:${m}`
    }

    function formatTimestamp(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    }

    return {
      matchInfo, loading, error, streaming, analysisResult,
      generateTime, isVip, isAdmin,
      onRetry, onGetLatestAnalysis, onCopy, onDelete, onTypingComplete,
    }
  },
}
</script>

<style scoped>
.ai-analysis-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f4f8 0%, #e8eef3 100%);
}

/* 比赛信息头部 */
.match-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32rpx;
  color: #fff;
}
.header-top {
  text-align: center;
  margin-bottom: 16rpx;
}
.league {
  font-size: 26rpx;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.15);
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
  display: inline-block;
}
.teams {
  display: flex;
  align-items: center;
  justify-content: center;
}
.team {
  font-size: 36rpx;
  font-weight: 600;
}
.vs {
  font-size: 26rpx;
  opacity: 0.7;
  margin: 0 24rpx;
}

/* 加载状态 */
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}
.loading-animation {
  display: flex;
  margin-bottom: 40rpx;
}
.loading-dot {
  width: 24rpx;
  height: 24rpx;
  background: #667eea;
  border-radius: 50%;
  margin: 0 8rpx;
  animation: bounce 1.4s ease-in-out infinite both;
}
.loading-dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dot:nth-child(2) { animation-delay: -0.16s; }
.loading-dot:nth-child(3) { animation-delay: 0s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
.loading-text {
  font-size: 34rpx;
  color: #333;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.loading-tip {
  font-size: 26rpx;
  color: #999;
}

/* 错误状态 */
.error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}
.error-icon {
  width: 100rpx;
  height: 100rpx;
  background: #ff4d4f;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
  font-weight: bold;
  margin-bottom: 32rpx;
}
.error-text {
  font-size: 30rpx;
  color: #666;
  margin-bottom: 40rpx;
  text-align: center;
}
.retry-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 24rpx 72rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
}

/* 结果区域 */
.result-wrapper {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 生成时间栏 */
.generate-time-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 18rpx 24rpx;
  background: #fff;
  margin: 24rpx 24rpx 0;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.time-icon { font-size: 28rpx; }
.time-text { font-size: 24rpx; color: #888; }

/* 流式传输状态栏 */
.streaming-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  margin: 24rpx 24rpx 0;
  border-radius: 12rpx;
  border: 1rpx solid rgba(102, 126, 234, 0.2);
}
.streaming-indicator { display: flex; gap: 6rpx; }
.streaming-dot {
  width: 12rpx;
  height: 12rpx;
  background: #667eea;
  border-radius: 50%;
  animation: streamPulse 1.4s ease-in-out infinite;
}
.streaming-dot:nth-child(1) { animation-delay: 0s; }
.streaming-dot:nth-child(2) { animation-delay: 0.2s; }
.streaming-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes streamPulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}
.streaming-text {
  font-size: 26rpx;
  color: #667eea;
  font-weight: 500;
}

/* 操作栏 */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 20rpx 24rpx;
  gap: 16rpx;
}
.refresh-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  font-weight: 500;
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
  margin-right: auto;
}
.refresh-btn:active { opacity: 0.9; transform: scale(0.98); }
.refresh-btn.vip {
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  box-shadow: 0 4rpx 12rpx rgba(255, 140, 0, 0.3);
}
.refresh-btn.disabled {
  background: linear-gradient(135deg, #bbb 0%, #999 100%);
  box-shadow: none;
}
.refresh-btn.disabled:active { transform: none; }
.refresh-btn.loading { opacity: 0.8; }
.vip-badge {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: #fff;
  font-size: 18rpx;
  font-weight: bold;
  padding: 4rpx 10rpx;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(238, 90, 36, 0.4);
}
.loading-spinner-mini {
  width: 24rpx;
  height: 24rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.action-btn {
  background: #fff;
  padding: 12rpx 28rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  color: #666;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  border: none;
  line-height: 1.4;
}
.action-btn::after { display: none; }
.action-btn:active { opacity: 0.8; }
.delete-btn { color: #ff4444; }

/* 内容卡片 */
.content-card {
  background: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  min-height: 200rpx;
}
.stream-waiting {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}
.waiting-text { font-size: 28rpx; color: #999; }
.safe-bottom {
  height: calc(env(safe-area-inset-bottom) + 40rpx);
}
</style>
