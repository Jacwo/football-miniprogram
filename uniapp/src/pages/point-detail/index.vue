<template>
  <view class="detail-page">
    <!-- 加载状态 -->
    <view v-if="loading && details.length === 0" class="loading-wrapper">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error && details.length === 0" class="error-wrapper">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="onRetry">重试</view>
    </view>

    <!-- 主内容 -->
    <view v-else class="main-content">
      <!-- 页面头部 -->
      <view class="page-header">
        <text class="page-title">💎 积分明细</text>
        <text class="page-desc">查看积分变动历史</text>
      </view>

      <!-- 筛选类型 -->
      <scroll-view class="type-filter" scroll-x>
        <view
          v-for="item in typeOptions"
          :key="item.value"
          class="filter-item"
          :class="{ active: selectedType === item.value }"
          @tap="onTypeChange(item.value)"
        >
          <text class="filter-label">{{ item.label }}</text>
        </view>
      </scroll-view>

      <!-- 空状态 -->
      <view v-if="details.length === 0" class="empty-state">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无数据</text>
        <text class="empty-tip">还没有积分变动记录</text>
      </view>

      <!-- 明细列表 -->
      <scroll-view v-else class="details-scroll" scroll-y @scrolltolower="onLoadMore">
        <view v-for="item in details" :key="item.id" class="detail-item">
          <view class="item-left">
            <view class="item-icon">
              <text>{{ getTypeIcon(item.changeType) }}</text>
            </view>
            <view class="item-info">
              <text class="item-type">{{ item.changeTypeDesc }}</text>
              <text class="item-time">{{ item.displayTime }}</text>
            </view>
          </view>

          <view class="item-right">
            <text class="item-change" :class="item.changeClass">{{ item.displayChange }}</text>
            <text class="item-after">结余 {{ item.pointAfter }}</text>
          </view>
        </view>

        <!-- 加载中提示 -->
        <view v-if="loading && details.length > 0" class="loading-more">
          <text>加载中...</text>
        </view>

        <!-- 已加载全部 -->
        <view v-else-if="!hasMore && details.length > 0" class="end-tip">
          <text>已加载全部</text>
        </view>

        <!-- 底部占位 -->
        <view class="bottom-placeholder"></view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import * as userApi from '@/api/user'

const typeMap = {
  'DEDUCT_MATCH': '赛事扣除',
  'DEDUCT_INFO': '情报扣除',
  'SIGN': '签到',
  'SYSTEM_OFFER': '后台发放',
  'REGISTER': '注册赠送',
  'BIND_PHONE': '绑定手机',
  'GROUP_BUY_LEADER': '拼团团长奖励',
  'GROUP_BUY_MEMBER': '拼团团员奖励',
  'FIRST_RENAME': '首次改名奖励',
}

const typeOptions = [
  { label: '全部', value: '' },
  { label: '签到', value: 'SIGN' },
  { label: '赛事解锁', value: 'DEDUCT_MATCH' },
  { label: '后台充值', value: 'SYSTEM_OFFER' },
  { label: '情报解锁', value: 'DEDUCT_INFO' },
  { label: '注册赠送', value: 'REGISTER' },
  { label: '绑定手机', value: 'BIND_PHONE' },
  { label: '团长奖励', value: 'GROUP_BUY_LEADER' },
  { label: '团员奖励', value: 'GROUP_BUY_MEMBER' }
]

export default {
  setup() {
    const userStore = useUserStore()
    const details = ref([])
    const loading = ref(true)
    const error = ref(null)
    const pageNum = ref(1)
    const pageSize = 20
    const hasMore = ref(true)
    const selectedType = ref('')

    function formatTime(timeStr) {
      if (!timeStr) return ''
      const date = new Date(timeStr)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${minute}`
    }

    function getTypeIcon(changeType) {
      const iconMap = {
        'DEDUCT_MATCH': '📊', 'DEDUCT_INFO': '🔍', 'SIGN': '📅',
        'REGISTER': '🎁', 'BIND_PHONE': '📱'
      }
      return iconMap[changeType] || '💎'
    }

    async function loadDetails(isLoadMore = false) {
      const userInfo = userStore.getUserInfo
      if (!userInfo || !userInfo.id) {
        loading.value = false
        error.value = '请先登录'
        return
      }

      if (!isLoadMore) {
        loading.value = true
        pageNum.value = 1
      }

      try {
        const currentPageNum = isLoadMore ? pageNum.value + 1 : 1
        const timestamp = Date.now()
        const res = await userApi.getPointDetailList(
          userInfo.id, selectedType.value, currentPageNum, pageSize, timestamp
        )
        const newDetails = res || []

        const processed = newDetails.map(item => ({
          ...item,
          changeTypeDesc: typeMap[item.changeType] || item.changeType,
          displayTime: formatTime(item.createTime),
          displayChange: item.pointChange > 0 ? `+${item.pointChange}` : String(item.pointChange),
          changeClass: item.pointChange > 0 ? 'gain' : 'loss'
        }))

        details.value = isLoadMore ? [...details.value, ...processed] : processed
        loading.value = false
        error.value = null
        pageNum.value = isLoadMore ? pageNum.value + 1 : 1
        hasMore.value = processed.length === pageSize
      } catch (err) {
        console.error('加载积分明细失败:', err)
        loading.value = false
        error.value = err.message || '加载失败'
      }
    }

    function onTypeChange(type) {
      selectedType.value = type
      pageNum.value = 1
      details.value = []
      loadDetails()
    }

    function onLoadMore() {
      if (hasMore.value && !loading.value) {
        loadDetails(true)
      }
    }

    function onRetry() {
      loadDetails()
    }

    onLoad(() => {
      loadDetails()
    })

    return {
      details, loading, error, hasMore, selectedType,
      typeOptions, getTypeIcon,
      loadDetails, onTypeChange, onLoadMore, onRetry
    }
  }
}
</script>

<style scoped>
.detail-page {
  height: 100vh;
  background: linear-gradient(180deg, #f8f9fb 0%, #f5f7fa 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading-wrapper,
.error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text,
.error-text {
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

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 页面头部 */
.page-header {
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32rpx 24rpx;
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.2);
}

.page-title {
  font-size: 36rpx;
  color: #fff;
  font-weight: 700;
  margin-bottom: 8rpx;
  letter-spacing: 0.5rpx;
}

.page-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
}

/* 筛选类型 */
.type-filter {
  background: #fff;
  padding: 16rpx 12rpx;
  border-bottom: 1rpx solid #f0f0f0;
  display: flex;
  gap: 8rpx;
  white-space: nowrap;
}

.filter-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 20rpx;
  background: #f0f0f0;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #666;
  font-weight: 600;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.filter-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 100rpx 40rpx;
  color: #999;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 24rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.empty-tip {
  font-size: 26rpx;
  color: #999;
  text-align: center;
}

/* 明细列表 */
.details-scroll {
  flex: 1;
  height: 0;
  padding: 16rpx 12rpx 24rpx 12rpx;
}

/* 明细项 */
.detail-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.detail-item:active {
  transform: translateY(2rpx);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.item-icon {
  width: 48rpx;
  height: 48rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  flex-shrink: 0;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.item-type {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}

.item-time {
  font-size: 22rpx;
  color: #999;
  font-weight: 400;
}

.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.item-change {
  font-size: 28rpx;
  font-weight: 800;
  font-family: 'Arial', 'Courier New', monospace;
  letter-spacing: 1rpx;
}

.item-change.gain {
  color: #52c41a;
}

.item-change.loss {
  color: #ff6b6b;
}

.item-after {
  font-size: 20rpx;
  color: #999;
  font-weight: 500;
}

/* 加载提示 */
.loading-more,
.end-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24rpx;
  color: #999;
  font-size: 24rpx;
  font-weight: 500;
}

.bottom-placeholder {
  height: 20rpx;
}
</style>
