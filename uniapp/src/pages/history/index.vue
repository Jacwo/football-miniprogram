<template>
  <view class="history-page">
    <!-- 统计信息 -->
    <view v-if="list.length > 0" class="stats-bar">
      <text class="stats-text">共 {{ total }} 条记录</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && list.length === 0" class="loading-wrapper">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <empty-state
      v-else-if="error"
      type="error"
      :title="error || '加载失败'"
      button-text="重试"
      @button-tap="onRetry"
    />

    <!-- 空状态 -->
    <empty-state
      v-else-if="!loading && list.length === 0"
      type="empty"
      title="暂无记录"
      description="你还没有任何分析记录"
    />

    <!-- 历史列表 -->
    <scroll-view v-else scroll-y class="history-list" @scrolltolower="onReachBottom">
      <history-card
        v-for="item in list"
        :key="item.id"
        :record="item"
        @tap="onItemTap(item)"
        @delete="onDelete"
      />

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more">
        <view v-if="loadingMore" class="loading-spinner small"></view>
        <text v-else class="load-more-text">上拉加载更多</text>
      </view>

      <!-- 没有更多 -->
      <view v-else class="no-more">
        <text class="no-more-text">没有更多了</text>
      </view>
    </scroll-view>

    <!-- 底部安全区域 -->
    <view class="safe-area-bottom"></view>
  </view>
</template>

<script>
import { ref, onUnmounted } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import * as historyApi from '@/api/history'
import HistoryCard from '@/components/HistoryCard.vue'
import EmptyState from '@/components/EmptyState.vue'

export default {
  components: { HistoryCard, EmptyState },
  setup() {
    const userStore = useUserStore()
    const list = ref([])
    const loading = ref(true)
    const loadingMore = ref(false)
    const error = ref(null)
    const hasMore = ref(true)
    const pageNo = ref(1)
    const pageSize = 20
    const total = ref(0)
    let _isFirstShow = true
    let _hasNavigated = false

    // 加载历史记录
    async function loadHistory(isRefresh = false) {
      if (isRefresh) {
        pageNo.value = 1
      }
      loading.value = true
      error.value = null

      try {
        const result = await historyApi.getHistoryList({ pageNo: pageNo.value, pageSize })
        const data = result?.data || result || {}
        const newList = data.list || data || []

        // 按时间倒序
        if (Array.isArray(newList)) {
          newList.sort((a, b) => {
            const timeA = new Date(a.createTime || a.matchTime || 0).getTime()
            const timeB = new Date(b.createTime || b.matchTime || 0).getTime()
            return timeB - timeA
          })
        }

        if (pageNo.value === 1) {
          list.value = newList
        } else {
          list.value = [...list.value, ...newList]
        }

        total.value = data.total || 0
        hasMore.value = newList.length >= pageSize
        loading.value = false
      } catch (e) {
        console.error('加载历史记录失败:', e)
        error.value = e.message || '加载失败'
        loading.value = false
      }
    }

    // 刷新
    async function refreshHistory() {
      pageNo.value = 1
      await loadHistory(true)
    }

    // 加载更多
    async function loadMore() {
      if (!hasMore.value || loading.value || loadingMore.value) return
      loadingMore.value = true
      pageNo.value++

      try {
        const result = await historyApi.getHistoryList({ pageNo: pageNo.value, pageSize })
        const data = result?.data || result || {}
        const newList = data.list || data || []

        if (Array.isArray(newList)) {
          newList.sort((a, b) => {
            const timeA = new Date(a.createTime || a.matchTime || 0).getTime()
            const timeB = new Date(b.createTime || b.matchTime || 0).getTime()
            return timeB - timeA
          })
        }

        list.value = [...list.value, ...newList]
        hasMore.value = newList.length >= pageSize
      } catch (e) {
        console.error('加载更多失败:', e)
        pageNo.value--
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        loadingMore.value = false
      }
    }

    // 点击记录 -> 跳转详情
    function onItemTap(e) {
      const record = typeof e === 'object' ? e : {}
      if (!userStore.checkLoginWithRedirect()) return
      const matchId = record.matchId
      _hasNavigated = true
      uni.navigateTo({
        url: `/pages/history-detail/index?id=${matchId}`
      })
    }

    function onDelete() {
      // 由 HistoryCard 处理删除，这里刷新列表
      refreshHistory()
    }

    function onRetry() {
      loadHistory()
    }

    function onReachBottom() {
      loadMore()
    }

    // 下拉刷新
    onPullDownRefresh(() => {
      refreshHistory().finally(() => {
        uni.stopPullDownRefresh()
      })
    })

    onLoad(() => {
      _isFirstShow = true
      loadHistory()
    })

    onShow(() => {
      if (typeof this?.getTabBar === 'function' && this?.getTabBar()) {
        this.getTabBar().setData({ selectedPath: '/pages/history/index' })
      }
      if (_hasNavigated) {
        _hasNavigated = false
        return
      }
      if (_isFirstShow) {
        _isFirstShow = false
        return
      }
      if (list.value.length > 0) {
        refreshHistory()
      }
    })

    return {
      list, loading, loadingMore, error, hasMore, total,
      onItemTap, onDelete, onRetry, onReachBottom
    }
  }
}
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

/* 统计信息 */
.stats-bar {
  padding: 24rpx 32rpx;
  background-color: #ffffff;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.stats-text {
  font-size: 26rpx;
  color: #64748b;
}

/* 加载 */
.loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
  flex-direction: column;
  gap: 24rpx;
}
.loading-spinner {
  width: 64rpx; height: 64rpx;
  border: 4rpx solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.loading-spinner.small {
  width: 40rpx; height: 40rpx;
  border-width: 3rpx;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 28rpx; color: #64748b; }

/* 列表 */
.history-list {
  padding: 24rpx;
}

/* 加载更多 */
.load-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32rpx;
}
.load-more-text { font-size: 26rpx; color: #94a3b8; }

/* 没有更多 */
.no-more {
  display: flex;
  justify-content: center;
  padding: 32rpx;
}
.no-more-text { font-size: 26rpx; color: #cbd5e1; }

/* 安全区域 */
.safe-area-bottom {
  height: env(safe-area-inset-bottom);
}
</style>
