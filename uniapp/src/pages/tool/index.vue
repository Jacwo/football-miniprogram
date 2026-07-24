<template>
  <view class="tool-page">
    <!-- 数据概览 -->
    <view class="data-section">
      <view class="section-title">本地数据</view>
      <view class="data-list">
        <view class="data-item">
          <text class="data-label">对话消息</text>
          <text class="data-value">{{ dataInfo.messages }} 条</text>
        </view>
        <view class="data-item">
          <text class="data-label">用户设置</text>
          <text class="data-value">{{ dataInfo.settings }} 项</text>
        </view>
      </view>
    </view>

    <!-- 同步状态 -->
    <view class="sync-section">
      <view class="section-title">云端同步</view>
      <view class="sync-status">
        <view class="status-icon" :class="syncStatus">
          <text v-if="syncStatus === 'idle'">☁️</text>
          <text v-else-if="syncStatus === 'syncing'">🔄</text>
          <text v-else-if="syncStatus === 'success'">✅</text>
          <text v-else>❌</text>
        </view>
        <view class="status-info">
          <text v-if="syncStatus === 'idle'" class="status-text">点击下方按钮开始同步</text>
          <text v-else-if="syncStatus === 'syncing'" class="status-text">正在同步...</text>
          <text v-else-if="syncStatus === 'success'" class="status-text">同步成功</text>
          <text v-else class="status-text">同步失败</text>
          <text v-if="lastSyncTime" class="last-sync">上次同步：{{ lastSyncTime }}</text>
        </view>
      </view>
      <view class="sync-btn" :class="{ disabled: syncStatus === 'syncing' }" @tap="onSync">
        <text class="sync-btn-text">{{ syncStatus === 'syncing' ? '同步中...' : '立即同步' }}</text>
      </view>
    </view>

    <!-- 数据管理 -->
    <view class="manage-section">
      <view class="section-title">数据管理</view>
      <view class="manage-list">
        <view class="manage-item" @tap="onExport">
          <view class="manage-left">
            <text class="manage-icon">📤</text>
            <view class="manage-info">
              <text class="manage-title">导出数据</text>
              <text class="manage-desc">将数据复制到剪贴板</text>
            </view>
          </view>
          <text class="manage-arrow">›</text>
        </view>
        <view class="manage-item" @tap="onImport">
          <view class="manage-left">
            <text class="manage-icon">📥</text>
            <view class="manage-info">
              <text class="manage-title">导入数据</text>
              <text class="manage-desc">从剪贴板导入数据</text>
            </view>
          </view>
          <text class="manage-arrow">›</text>
        </view>
        <view class="manage-item danger" @tap="onClearLocal">
          <view class="manage-left">
            <text class="manage-icon">🗑️</text>
            <view class="manage-info">
              <text class="manage-title">清除本地数据</text>
              <text class="manage-desc">删除所有本地存储的数据</text>
            </view>
          </view>
          <text class="manage-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 提示信息 -->
    <view class="tips-section">
      <view class="tips-title">温馨提示</view>
      <view class="tips-content">
        <text class="tips-text">· 同步功能需要登录后使用</text>
        <text class="tips-text">· 导出的数据可用于设备迁移</text>
        <text class="tips-text">· 清除数据后无法恢复，请谨慎操作</text>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'

export default {
  setup() {
    const userStore = useUserStore()
    const syncStatus = ref('idle')
    const lastSyncTime = ref(null)
    const dataInfo = reactive({
      messages: 0,
      history: 0,
      settings: 0
    })

    function loadDataInfo() {
      try {
        const messages = uni.getStorageSync('ai-chat-messages') || []
        const settings = uni.getStorageSync('user-settings') || {}
        dataInfo.messages = messages.length
        dataInfo.history = 0
        dataInfo.settings = Object.keys(settings).length
      } catch (e) {
        console.error('加载数据信息失败:', e)
      }
    }

    function loadLastSyncTime() {
      try {
        const time = uni.getStorageSync('last-sync-time')
        if (time) lastSyncTime.value = time
      } catch (e) {
        console.error('加载同步时间失败:', e)
      }
    }

    function simulateSync() {
      return new Promise((resolve) => {
        setTimeout(resolve, 2000)
      })
    }

    async function onSync() {
      if (!userStore.getIsLoggedIn) {
        uni.showModal({
          title: '未登录',
          content: '请先登录后再进行数据同步',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({ url: '/pages/login/login' })
            }
          }
        })
        return
      }

      syncStatus.value = 'syncing'

      try {
        await simulateSync()
        const now = new Date().toLocaleString()
        uni.setStorageSync('last-sync-time', now)
        syncStatus.value = 'success'
        lastSyncTime.value = now
        uni.showToast({ title: '同步成功', icon: 'success' })
        setTimeout(() => { syncStatus.value = 'idle' }, 3000)
      } catch (e) {
        console.error('同步失败:', e)
        syncStatus.value = 'error'
        uni.showToast({ title: '同步失败', icon: 'none' })
        setTimeout(() => { syncStatus.value = 'idle' }, 3000)
      }
    }

    function onExport() {
      try {
        const messages = uni.getStorageSync('ai-chat-messages') || []
        const settings = uni.getStorageSync('user-settings') || {}
        const exportData = {
          version: '1.0.0',
          exportTime: new Date().toISOString(),
          data: { messages, settings }
        }
        uni.setClipboardData({
          data: JSON.stringify(exportData),
          success: () => {
            uni.showToast({ title: '数据已复制到剪贴板', icon: 'none', duration: 2000 })
          }
        })
      } catch (e) {
        uni.showToast({ title: '导出失败', icon: 'none' })
      }
    }

    function onImport() {
      uni.showModal({
        title: '导入数据',
        content: '请将导出的数据粘贴到剪贴板，然后点击确认',
        success: (res) => {
          if (res.confirm) doImport()
        }
      })
    }

    async function doImport() {
      try {
        const { data } = await new Promise((resolve, reject) => {
          uni.getClipboardData({ success: resolve, fail: reject })
        })
        const importData = JSON.parse(data)
        if (!importData.version || !importData.data) {
          throw new Error('数据格式不正确')
        }
        if (importData.data.messages) {
          uni.setStorageSync('ai-chat-messages', importData.data.messages)
        }
        if (importData.data.settings) {
          uni.setStorageSync('user-settings', importData.data.settings)
        }
        loadDataInfo()
        uni.showToast({ title: '导入成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '导入失败：数据格式不正确', icon: 'none' })
      }
    }

    function onClearLocal() {
      uni.showModal({
        title: '确认清除',
        content: '确定要清除所有本地数据吗？此操作不可恢复。',
        confirmColor: '#ff4d4f',
        success: (res) => {
          if (res.confirm) {
            const token = uni.getStorageSync('token')
            const userInfo = uni.getStorageSync('userInfo')
            uni.clearStorageSync()
            if (token) uni.setStorageSync('token', token)
            if (userInfo) uni.setStorageSync('userInfo', userInfo)
            loadDataInfo()
            uni.showToast({ title: '已清除', icon: 'success' })
          }
        }
      })
    }

    onLoad(() => {
      loadDataInfo()
      loadLastSyncTime()
    })

    return {
      syncStatus, lastSyncTime, dataInfo,
      onSync, onExport, onImport, onClearLocal
    }
  }
}
</script>

<style scoped>
.tool-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
}

.section-title {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

/* 数据概览 */
.data-section {
  margin-bottom: 24rpx;
}

.data-list {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.data-item:last-child {
  border-bottom: none;
}

.data-label {
  font-size: 28rpx;
  color: #333;
}

.data-value {
  font-size: 28rpx;
  color: #1890ff;
  font-weight: 500;
}

/* 同步区域 */
.sync-section {
  margin-bottom: 24rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.sync-section .section-title {
  margin-bottom: 24rpx;
  padding-left: 0;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background-color: #fafafa;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.status-icon {
  font-size: 48rpx;
}

.status-icon.syncing {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.status-text {
  font-size: 28rpx;
  color: #333;
}

.last-sync {
  font-size: 24rpx;
  color: #999;
}

.sync-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24rpx;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  border-radius: 40rpx;
}

.sync-btn.disabled {
  opacity: 0.6;
}

.sync-btn-text {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 500;
}

/* 数据管理 */
.manage-section {
  margin-bottom: 24rpx;
}

.manage-list {
  background-color: #ffffff;
  border-radius: 16rpx;
}

.manage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.manage-item:last-child {
  border-bottom: none;
}

.manage-item:active {
  background-color: #f9f9f9;
}

.manage-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.manage-icon {
  font-size: 40rpx;
}

.manage-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.manage-title {
  font-size: 28rpx;
  color: #333;
}

.manage-item.danger .manage-title {
  color: #ff4d4f;
}

.manage-desc {
  font-size: 24rpx;
  color: #999;
}

.manage-arrow {
  font-size: 32rpx;
  color: #ccc;
}

/* 提示信息 */
.tips-section {
  padding: 24rpx;
}

.tips-title {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.tips-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tips-text {
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
}
</style>
