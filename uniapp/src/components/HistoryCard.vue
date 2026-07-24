<template>
  <view class="history-card" @tap="onTap">
    <view class="card-content">
      <!-- 顶部：时间 + 状态 -->
      <view class="card-header">
        <text class="match-time">{{ formattedTime }}</text>
        <view class="status-tag" :class="statusClass">
          <text class="status-text">{{ statusLabel }}</text>
        </view>
      </view>

      <!-- 比赛对阵 -->
      <view v-if="homeTeam || awayTeam" class="match-teams">
        <view class="team home">
          <text class="team-name">{{ homeTeam || '' }}</text>
        </view>
        <view class="vs-section">
          <text v-if="!result" class="vs">VS</text>
          <text v-else class="match-result">{{ result }}</text>
        </view>
        <view class="team away">
          <text class="team-name">{{ awayTeam || '' }}</text>
        </view>
      </view>

      <!-- 赔率 -->
      <view v-if="odds" class="odds-row">
        <view class="odds-item">
          <text class="odds-label">胜</text>
          <text class="odds-value">{{ odds.home || '-' }}</text>
        </view>
        <view class="odds-item">
          <text class="odds-label">平</text>
          <text class="odds-value">{{ odds.draw || '-' }}</text>
        </view>
        <view class="odds-item">
          <text class="odds-label">负</text>
          <text class="odds-value">{{ odds.away || '-' }}</text>
        </view>
      </view>

      <!-- AI 预测 -->
      <view v-if="aiPrediction" class="ai-section">
        <view class="ai-prediction">
          <text class="ai-label">🤖 AI预测</text>
          <text class="ai-result">{{ aiPrediction }}</text>
          <text v-if="aiScore" class="ai-score">置信度 {{ aiScore }}</text>
        </view>
      </view>

      <!-- 预览内容 -->
      <view v-if="summary" class="preview">
        <text class="preview-text">{{ summary }}</text>
      </view>

      <!-- 底部 -->
      <view class="card-footer">
        <text class="time">{{ formattedTime }}</text>
        <view class="action-area">
          <text class="detail-text">查看详情</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed } from 'vue'
import { getRelativeTime } from '@/utils/date'

export default {
  name: 'HistoryCard',
  props: {
    title: { type: String, default: '' },
    summary: { type: String, default: '' },
    timestamp: { type: String, default: '' },
    match: { type: String, default: '' },
    showTags: { type: Boolean, default: true },
    homeTeam: { type: String, default: '' },
    awayTeam: { type: String, default: '' },
    result: { type: String, default: '' },
    odds: { type: Object, default: null },
    aiPrediction: { type: String, default: '' },
    aiScore: { type: [String, Number], default: '' },
    status: { type: String, default: '' },
    statusLabel: { type: String, default: '' }
  },
  emits: ['tap'],
  setup(props, { emit }) {
    const formattedTime = computed(() => {
      return props.timestamp ? getRelativeTime(props.timestamp) : ''
    })

    const statusClass = computed(() => {
      return props.status || ''
    })

    function onTap() { emit('tap') }

    return { formattedTime, statusClass, onTap }
  }
}
</script>

<style scoped>
.history-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 顶部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.match-time {
  font-size: 24rpx;
  color: #999;
}

.status-tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background-color: #f5f5f5;
}

.status-tag.finished {
  background-color: #f6ffed;
}

.status-tag.pending {
  background-color: #fff7e6;
}

.status-text {
  font-size: 22rpx;
  color: #666;
}

.status-tag.finished .status-text {
  color: #52c41a;
}

.status-tag.pending .status-text {
  color: #fa8c16;
}

/* 比赛对阵 */
.match-teams {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
}

.team {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.team.home {
  align-items: flex-start;
}

.team.away {
  align-items: flex-end;
}

.team-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1e293b;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vs-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 0 24rpx;
}

.vs {
  font-size: 24rpx;
  color: #94a3b8;
  font-weight: 500;
}

.match-result {
  font-size: 28rpx;
  font-weight: 600;
  color: #3b82f6;
}

/* 赔率 */
.odds-row {
  display: flex;
  justify-content: space-around;
  padding: 16rpx 0;
  background-color: #f8fafc;
  border-radius: 12rpx;
}

.odds-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.odds-label {
  font-size: 22rpx;
  color: #94a3b8;
}

.odds-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #1e293b;
}

/* AI 预测 */
.ai-section {
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
  border-radius: 12rpx;
}

.ai-prediction {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.ai-label {
  font-size: 24rpx;
  color: #64748b;
}

.ai-result {
  font-size: 28rpx;
  font-weight: 600;
  color: #3b82f6;
}

.ai-score {
  font-size: 26rpx;
  color: #10b981;
  font-weight: 500;
}

/* 预览内容 */
.preview {
  padding-top: 8rpx;
}

.preview-text {
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f1f5f9;
}

.time {
  font-size: 24rpx;
  color: #94a3b8;
}

.action-area {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.detail-text {
  font-size: 24rpx;
  color: #3b82f6;
}

.arrow {
  font-size: 28rpx;
  color: #3b82f6;
}
</style>
