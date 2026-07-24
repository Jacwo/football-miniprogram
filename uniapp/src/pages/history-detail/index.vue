<template>
  <view class="detail-page">
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
      @buttonTap="onRetry"
    />

    <!-- 详情内容 -->
    <scroll-view v-else-if="record" class="detail-scroll" scroll-y>
      <!-- 比赛信息卡片 -->
      <view class="match-card">
        <view class="match-header">
          <text class="match-time">{{ record.matchTime }}</text>
          <view class="status-tag" :class="record.matchResult ? 'finished' : 'pending'">
            <text class="status-text">{{ record.matchResult ? '已结束' : '待开赛' }}</text>
          </view>
        </view>

        <!-- 对阵信息 -->
        <view class="match-teams">
          <view class="team home">
            <text class="team-name">{{ record.homeTeam }}</text>
          </view>
          <view class="vs-section">
            <text class="vs">VS</text>
            <text v-if="record.matchResult" class="match-result">{{ record.matchResult }}</text>
          </view>
          <view class="team away">
            <text class="team-name">{{ record.awayTeam }}</text>
          </view>
        </view>

        <!-- 赔率信息 -->
        <view v-if="record.homeWin" class="odds-section">
          <view class="odds-item">
            <text class="odds-label">主胜</text>
            <text class="odds-value">{{ record.homeWin }}</text>
          </view>
          <view class="odds-item">
            <text class="odds-label">平局</text>
            <text class="odds-value">{{ record.draw }}</text>
          </view>
          <view class="odds-item">
            <text class="odds-label">客胜</text>
            <text class="odds-value">{{ record.awayWin }}</text>
          </view>
        </view>

        <!-- AI 预测结果 -->
        <view v-if="record.aiResult || record.aiScore" class="prediction-section">
          <view class="prediction-row">
            <text class="prediction-label">AI 预测结果</text>
            <text class="prediction-value">{{ record.aiResult }}</text>
          </view>
          <view v-if="record.aiScore" class="prediction-row">
            <text class="prediction-label">预测比分</text>
            <text class="prediction-value highlight">{{ record.aiScore }}</text>
          </view>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view v-if="record.afterMatchAnalysis" class="tab-section">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'analysis' }"
          @tap="activeTab = 'analysis'"
        >
          <text class="tab-text">赛前分析</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'afterMatch' }"
          @tap="activeTab = 'afterMatch'"
        >
          <text class="tab-text">赛后复盘</text>
        </view>
      </view>

      <!-- 分析内容 -->
      <view class="content-section">
        <view class="content-header">
          <text class="content-title">{{ activeTab === 'analysis' ? 'AI 赛前分析' : 'AI 赛后复盘' }}</text>
        </view>
        <view class="content-body">
          <MarkdownViewer
            v-if="(activeTab === 'analysis' && record.aiAnalysis) || (activeTab === 'afterMatch' && record.afterMatchAnalysis)"
            :content="activeTab === 'analysis' ? record.aiAnalysis : record.afterMatchAnalysis"
          />
          <view v-else class="empty-content">
            <text class="empty-text">暂无分析内容</text>
          </view>
        </view>
      </view>

      <!-- 时间信息 -->
      <view class="meta-section">
        <text class="meta-text">创建于 {{ record.createTime }}</text>
      </view>

      <!-- 底部占位 -->
      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="record" class="action-bar safe-area-bottom">
      <view class="action-btn" @tap="onShare">
        <text class="action-icon">↗</text>
        <text class="action-text">分享</text>
      </view>
      <view class="action-btn" @tap="onCopy">
        <text class="action-icon">📋</text>
        <text class="action-text">复制</text>
      </view>
      <view class="action-btn danger" @tap="onDelete">
        <text class="action-icon">🗑</text>
        <text class="action-text">删除</text>
      </view>
    </view>
  </view>
</template>

<script>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as historyApi from '@/api/history'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import EmptyState from '@/components/EmptyState.vue'

export default {
  components: { MarkdownViewer, EmptyState },
  setup() {
    const id = ref(null)
    const record = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const activeTab = ref('analysis')

    async function loadDetail(recordId) {
      loading.value = true
      error.value = null
      try {
        const data = await historyApi.getHistoryDetail(recordId)
        record.value = data
        loading.value = false
        if (data.homeTeam && data.awayTeam) {
          uni.setNavigationBarTitle({ title: `${data.homeTeam} VS ${data.awayTeam}` })
        }
      } catch (e) {
        console.error('加载详情失败:', e)
        loading.value = false
        error.value = e.message || '加载失败'
      }
    }

    function onCopy() {
      if (!record.value) return
      const content = activeTab.value === 'analysis'
        ? record.value.aiAnalysis
        : record.value.afterMatchAnalysis
      if (!content) {
        uni.showToast({ title: '暂无内容', icon: 'none' })
        return
      }
      uni.setClipboardData({
        data: content,
        success: () => uni.showToast({ title: '已复制', icon: 'success' })
      })
    }

    function onShare() {
      // trigger share menu
    }

    function onShareAppMessage() {
      const r = record.value
      const title = r ? `${r.homeTeam} VS ${r.awayTeam} 分析` : '足球分析记录'
      return { title, path: `/pages/history-detail/index?id=${id.value}` }
    }

    async function onDelete() {
      const res = await new Promise(resolve => {
        uni.showModal({
          title: '确认删除',
          content: '确定要删除这条记录吗？',
          success: (r) => resolve(r.confirm)
        })
      })
      if (!res) return
      try {
        uni.showLoading({ title: '删除中...' })
        await historyApi.deleteHistory(id.value)
        uni.hideLoading()
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1500)
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    }

    function onRetry() {
      if (id.value) loadDetail(id.value)
    }

    onLoad((options) => {
      const { id: recordId } = options || {}
      if (recordId) {
        id.value = recordId
        loadDetail(recordId)
      } else {
        loading.value = false
        error.value = '缺少记录 ID'
      }
    })

    return { record, loading, error, activeTab, onCopy, onShare, onShareAppMessage, onDelete, onRetry }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

/* 加载状态 */
.loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
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
  border: 4rpx solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #64748b;
}

/* 详情滚动区域 */
.detail-scroll {
  height: 100vh;
  padding-bottom: 140rpx;
}

/* 比赛信息卡片 */
.match-card {
  margin: 24rpx;
  padding: 28rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.match-time {
  font-size: 26rpx;
  color: #64748b;
}

.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  background-color: #f1f5f9;
}

.status-tag.finished {
  background-color: #f0fdf4;
}

.status-tag.pending {
  background-color: #fffbeb;
}

.status-text {
  font-size: 24rpx;
  color: #64748b;
}

.status-tag.finished .status-text {
  color: #22c55e;
}

.status-tag.pending .status-text {
  color: #f59e0b;
}

/* 对阵信息 */
.match-teams {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}

.team {
  flex: 1;
}

.team.home {
  text-align: left;
}

.team.away {
  text-align: right;
}

.team-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #1e293b;
}

.vs-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 0 32rpx;
}

.vs {
  font-size: 28rpx;
  color: #94a3b8;
  font-weight: 500;
}

.match-result {
  font-size: 32rpx;
  font-weight: 700;
  color: #3b82f6;
}

/* 赔率信息 */
.odds-section {
  display: flex;
  justify-content: space-around;
  padding: 24rpx 0;
  margin-top: 20rpx;
  background-color: #f8fafc;
  border-radius: 12rpx;
}

.odds-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.odds-label {
  font-size: 24rpx;
  color: #94a3b8;
}

.odds-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #1e293b;
}

/* AI 预测 */
.prediction-section {
  margin-top: 24rpx;
  padding: 20rpx;
  background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
  border-radius: 12rpx;
}

.prediction-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}

.prediction-label {
  font-size: 26rpx;
  color: #64748b;
}

.prediction-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #3b82f6;
}

.prediction-value.highlight {
  color: #10b981;
}

/* Tab 切换 */
.tab-section {
  display: flex;
  margin: 24rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 8rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.tab-item {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20rpx;
  border-radius: 12rpx;
  transition: all 0.2s ease;
}

.tab-item.active {
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
}

.tab-text {
  font-size: 28rpx;
  color: #64748b;
  font-weight: 500;
}

.tab-item.active .tab-text {
  color: #ffffff;
}

/* 内容区域 */
.content-section {
  margin: 24rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.content-header {
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #f1f5f9;
}

.content-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1e293b;
}

.content-body {
  padding: 24rpx 28rpx;
}

.empty-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #94a3b8;
}

/* 元信息 */
.meta-section {
  padding: 24rpx 48rpx;
  text-align: center;
}

.meta-text {
  font-size: 24rpx;
  color: #94a3b8;
}

/* 底部占位 */
.bottom-placeholder {
  height: 140rpx;
}

/* 操作栏 */
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-around;
  padding: 20rpx 24rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #f1f5f9;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 40rpx;
  transition: all 0.2s ease;
}

.action-btn:active {
  opacity: 0.7;
  transform: scale(0.96);
}

.action-icon {
  font-size: 40rpx;
}

.action-text {
  font-size: 24rpx;
  color: #64748b;
}

.action-btn.danger .action-text {
  color: #ef4444;
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
