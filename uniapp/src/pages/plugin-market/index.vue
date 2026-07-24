<template>
  <view class="page-wrapper">
    <!-- 顶部搜索区 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          type="text"
          placeholder="搜索插件名称、描述..."
          :value="searchKeyword"
          @input="onSearchInput"
          confirm-type="search"
          placeholder-class="search-placeholder"
        />
        <text v-if="searchKeyword" class="search-clear" @tap.stop="onClearSearch">✕</text>
      </view>
      <view v-if="searchKeyword" class="search-stats">
        <text class="stats-text">找到 {{ filteredPlugins.length }} 个匹配结果</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-wrap">
      <view class="loading-spinner"></view>
      <text class="loading-text">正在加载插件...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="filteredPlugins.length === 0 && !loading" class="empty-wrap">
      <text class="empty-icon">📦</text>
      <text class="empty-title">暂无可用插件</text>
      <text class="empty-desc">{{ searchKeyword ? '未找到匹配的插件，换个关键词试试' : '插件市场暂时没有可用的因素插件' }}</text>
    </view>

    <!-- 插件列表 -->
    <scroll-view
      v-else
      class="plugin-scroll"
      scroll-y
      enhanced
      :show-scrollbar="true"
    >
      <view class="plugin-list">
        <view
          v-for="(item, idx) in filteredPlugins"
          :key="item.factorCode"
          class="plugin-card"
          :class="{ selected: item.selected }"
          @tap.stop="onToggleSelect(idx)"
        >
          <view class="plugin-card-left">
            <view class="plugin-checkbox" :class="{ checked: item.selected }">
              <text v-if="item.selected">✓</text>
            </view>
          </view>
          <view class="plugin-card-body">
            <view class="plugin-card-head">
              <text class="plugin-card-name">{{ item.factorName }}</text>
              <view v-if="item.category" class="plugin-card-badge">{{ item.category }}</view>
            </view>
            <text v-if="item.description" class="plugin-card-desc">{{ item.description }}</text>
            <view v-if="item.promptTemplate" class="plugin-card-prompt">
              <text class="prompt-label">提示词模版</text>
              <text class="prompt-text">{{ item.promptTemplate }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部安全区 -->
      <view class="scroll-bottom-safe"></view>
    </scroll-view>

    <!-- 底部批量操作栏 -->
    <view v-if="selectedCount > 0" class="bottom-bar" :style="{ paddingBottom: safeAreaBottom }">
      <view class="bottom-bar-left">
        <view class="select-all-btn" :class="{ active: allSelected }" @tap.stop="onToggleSelectAll">
          <view class="select-all-checkbox" :class="{ checked: allSelected }">
            <text v-if="allSelected">✓</text>
          </view>
          <text class="select-all-text">{{ allSelected ? '取消全选' : '全选' }}</text>
        </view>
        <text class="bottom-bar-count">已选 <text class="count-num">{{ selectedCount }}</text> 个插件</text>
      </view>
      <view class="bottom-bar-btn" :class="{ loading: importing }" @tap.stop="onBatchImport">
        <text v-if="!importing">批量引入</text>
        <text v-else>引入中...</text>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import * as agentApi from '@/api/agent'

export default {
  setup() {
    const userStore = useUserStore()
    const agentId = ref('')
    const userId = ref('')
    const plugins = ref([])
    const filteredPlugins = ref([])
    const searchKeyword = ref('')
    const selectedCount = ref(0)
    const allSelected = ref(false)
    const loading = ref(true)
    const importing = ref(false)

    const safeAreaBottom = computed(() => {
      try {
        const info = uni.getSystemInfoSync()
        return `calc(20rpx + ${info.safeAreaInsets?.bottom || 0}px)`
      } catch (e) {
        return '20rpx'
      }
    })

    async function fetchPlugins() {
      loading.value = true
      try {
        const list = await agentApi.getPluginFactors()
        const parsed = (list || []).map(item => ({ ...item, selected: false }))
        plugins.value = parsed
        filteredPlugins.value = parsed
        loading.value = false
        selectedCount.value = 0
        allSelected.value = false
      } catch (e) {
        console.error('加载插件因素失败:', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
        loading.value = false
      }
    }

    function filterPlugins(keyword) {
      if (!keyword) {
        filteredPlugins.value = plugins.value
        return
      }
      const kw = keyword.toLowerCase()
      filteredPlugins.value = plugins.value.filter(item => {
        return (item.factorName && item.factorName.toLowerCase().includes(kw)) ||
               (item.description && item.description.toLowerCase().includes(kw)) ||
               (item.factorCode && item.factorCode.toLowerCase().includes(kw)) ||
               (item.category && item.category.toLowerCase().includes(kw))
      })
    }

    function onSearchInput(e) {
      const keyword = (e.detail.value || '').trim()
      searchKeyword.value = keyword
      filterPlugins(keyword)
    }

    function onClearSearch() {
      searchKeyword.value = ''
      filterPlugins('')
    }

    function onToggleSelect(idx) {
      const item = filteredPlugins.value[idx]
      if (!item) return
      const newVal = !item.selected
      const delta = newVal ? 1 : -1

      filteredPlugins.value[idx] = { ...item, selected: newVal }
      const realIdx = plugins.value.findIndex(p => p.factorCode === item.factorCode)
      if (realIdx >= 0) {
        plugins.value[realIdx] = { ...plugins.value[realIdx], selected: newVal }
      }

      selectedCount.value += delta
      allSelected.value = filteredPlugins.value.length > 0 &&
        filteredPlugins.value.every(p => p.selected)
    }

    function onToggleSelectAll() {
      const newVal = !allSelected.value
      filteredPlugins.value = filteredPlugins.value.map(p => ({ ...p, selected: newVal }))
      plugins.value = plugins.value.map(p => {
        const fp = filteredPlugins.value.find(u => u.factorCode === p.factorCode)
        return fp ? { ...p, selected: newVal } : p
      })
      selectedCount.value = newVal ? filteredPlugins.value.length : 0
      allSelected.value = newVal
    }

    async function onBatchImport() {
      if (importing.value || selectedCount.value === 0) return
      const selectedFactors = plugins.value.filter(f => f.selected)
      if (selectedFactors.length === 0) return

      importing.value = true
      try {
        await agentApi.batchSaveFactors({
          userId: userId.value,
          agentId: agentId.value,
          configs: selectedFactors.map(f => ({
            factorCode: f.factorCode,
            isEnabled: true,
            weight: 1
          }))
        })
        uni.showToast({ title: `已引入 ${selectedFactors.length} 个因素`, icon: 'success' })
        setTimeout(() => {
          const pages = getCurrentPages()
          const prevPage = pages[pages.length - 2]
          if (prevPage && prevPage.$vm && prevPage.$vm.onPluginsImported) {
            prevPage.$vm.onPluginsImported({ count: selectedFactors.length })
          }
          uni.navigateBack()
        }, 800)
      } catch (e) {
        console.error('批量引入因素失败:', e)
        uni.showToast({ title: '引入失败，请重试', icon: 'none' })
        importing.value = false
      }
    }

    onLoad((options) => {
      const { agentId: aId } = options || {}
      const userInfo = userStore.getUserInfo
      if (!userInfo || !userInfo.id) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1200)
        return
      }
      if (!aId) {
        uni.showToast({ title: '缺少智能体信息', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1200)
        return
      }
      userId.value = userInfo.id
      agentId.value = aId
      fetchPlugins()
    })

    return {
      filteredPlugins, searchKeyword, selectedCount, allSelected,
      loading, importing, safeAreaBottom,
      onSearchInput, onClearSearch, onToggleSelect, onToggleSelectAll, onBatchImport
    }
  }
}
</script>

<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
}

/* ========== 搜索栏 ========== */
.search-bar {
  padding: 20rpx 28rpx 16rpx;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 32rpx;
  padding: 0 28rpx;
  height: 72rpx;
  gap: 14rpx;
}

.search-icon {
  font-size: 30rpx;
  line-height: 1;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1e293b;
  height: 72rpx;
  line-height: 72rpx;
}

.search-placeholder {
  color: #94a3b8;
  font-size: 26rpx;
}

.search-clear {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #cbd5e1;
  color: #fff;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.search-clear:active {
  background: #94a3b8;
}

.search-stats {
  margin-top: 16rpx;
}

.stats-text {
  font-size: 24rpx;
  color: #64748b;
}

/* ========== 加载状态 ========== */
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  gap: 28rpx;
}

.loading-spinner {
  width: 56rpx;
  height: 56rpx;
  border: 4rpx solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #94a3b8;
}

/* ========== 空状态 ========== */
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 180rpx;
  padding-left: 40rpx;
  padding-right: 40rpx;
  gap: 16rpx;
}

.empty-icon {
  font-size: 96rpx;
  line-height: 1;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #475569;
}

.empty-desc {
  font-size: 26rpx;
  color: #94a3b8;
  text-align: center;
  line-height: 1.6;
}

/* ========== 列表 ========== */
.plugin-scroll {
  flex: 1;
  overflow: hidden;
}

.plugin-list {
  padding: 16rpx 28rpx 0;
}

.scroll-bottom-safe {
  height: 140rpx;
}

/* ========== 插件卡片 ========== */
.plugin-card {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20rpx;
  padding: 26rpx 22rpx;
  margin-bottom: 16rpx;
  background: #fff;
  border-radius: 18rpx;
  border: 2rpx solid #f1f5f9;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  transition: all 0.2s;
}

.plugin-card:active {
  transform: scale(0.985);
  background: #fafbff;
}

.plugin-card.selected {
  background: #f0f5ff;
  border-color: #2563eb;
  box-shadow: 0 2rpx 12rpx rgba(37, 99, 235, 0.12);
}

.plugin-card-left {
  flex-shrink: 0;
  padding-top: 4rpx;
}

.plugin-checkbox {
  width: 46rpx;
  height: 46rpx;
  border-radius: 12rpx;
  border: 2rpx solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: transparent;
  background: #fff;
  transition: all 0.15s ease;
}

.plugin-checkbox.checked {
  background: linear-gradient(135deg, #2563eb 0%, #6366f1 100%);
  border-color: #2563eb;
  color: #fff;
  box-shadow: 0 2rpx 8rpx rgba(37, 99, 235, 0.35);
}

.plugin-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.plugin-card-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.plugin-card-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
}

.plugin-card-badge {
  font-size: 20rpx;
  color: #6366f1;
  background: #eef2ff;
  padding: 4rpx 14rpx;
  border-radius: 16rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.plugin-card-desc {
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.55;
}

.plugin-card-prompt {
  margin-top: 4rpx;
  padding: 14rpx 18rpx;
  background: #faf5ff;
  border-radius: 12rpx;
  border: 1rpx solid #f3e8ff;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.prompt-label {
  font-size: 20rpx;
  color: #a78bfa;
  font-weight: 600;
}

.prompt-text {
  font-size: 22rpx;
  color: #5b21b6;
  line-height: 1.5;
  word-break: break-all;
}

/* ========== 底部批量操作栏 ========== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 28rpx;
  background: #fff;
  border-top: 1rpx solid #f1f5f9;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
  gap: 20rpx;
}

.bottom-bar-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.select-all-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 20rpx;
  border-radius: 28rpx;
  background: #f1f5f9;
  transition: all 0.2s;
}

.select-all-btn.active {
  background: #eff6ff;
}

.select-all-btn:active {
  opacity: 0.8;
}

.select-all-checkbox {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 2rpx solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: transparent;
  background: #fff;
}

.select-all-checkbox.checked {
  background: linear-gradient(135deg, #2563eb 0%, #6366f1 100%);
  border-color: transparent;
  color: #fff;
}

.select-all-text {
  font-size: 24rpx;
  color: #475569;
  font-weight: 600;
}

.bottom-bar-count {
  font-size: 26rpx;
  color: #64748b;
  font-weight: 600;
}

.count-num {
  color: #2563eb;
  font-weight: 700;
}

.bottom-bar-btn {
  padding: 20rpx 48rpx;
  background: linear-gradient(135deg, #2563eb 0%, #6366f1 100%);
  border-radius: 30rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 4rpx 18rpx rgba(37, 99, 235, 0.35);
  transition: all 0.2s;
  flex-shrink: 0;
}

.bottom-bar-btn:active {
  opacity: 0.85;
  transform: scale(0.97);
}

.bottom-bar-btn.loading {
  opacity: 0.6;
  pointer-events: none;
}
</style>
