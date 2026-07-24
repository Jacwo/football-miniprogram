<template>
  <view class="activity-page">
    <!-- 加载状态 -->
    <view class="loading-wrapper" v-if="loading">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view class="error-wrapper" v-else-if="error">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @click="loadGroups">重新加载</view>
    </view>

    <template v-else>
      <!-- 头部 -->
      <view class="header">
        <view class="header-title">拼团活动</view>
        <view class="header-subtitle">凑齐人数即可获得奖励</view>
        <view class="create-btn" @click="onOpenCreateModal">发起拼团</view>
      </view>

      <!-- 标签栏 -->
      <view class="tab-bar">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'created' }"
          @click="activeTab = 'created'"
        >我发起的</view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'joined' }"
          @click="activeTab = 'joined'"
        >我加入的</view>
      </view>

      <!-- 空状态 -->
      <view class="empty-wrapper" v-if="filteredGroups.length === 0">
        <view class="empty-icon">📭</view>
        <text class="empty-text">{{ activeTab === 'created' ? '还没有发起拼团' : '还没有加入拼团' }}</text>
        <view class="empty-action" v-if="activeTab === 'created'" @click="onOpenCreateModal">发起拼团</view>
      </view>

      <!-- 拼团列表 -->
      <scroll-view class="group-list" scroll-y v-else>
        <view class="group-card" v-for="group in filteredGroups" :key="group.id" @click="onGroupTap(group)">
          <view class="card-header">
            <view class="card-status" :class="group.role === 'creator' ? 'creator' : 'joiner'">
              {{ group.role === 'creator' ? '我发起的' : '已加入' }}
            </view>
            <view class="card-state-badge" :class="group.isExpired ? 'expired' : group.isCompleted ? 'done' : 'active'">
              {{ group.isExpired ? '已过期' : group.isCompleted ? '已完成' : '进行中' }}
            </view>
          </view>

          <!-- 团长信息 -->
          <view class="leader-row">
            <view class="leader-avatar">{{ group.leaderName?.[0] || '团' }}</view>
            <view class="leader-info">
              <text class="leader-name">{{ group.leaderName || '团长' }}</text>
              <text class="leader-label">团长</text>
            </view>
          </view>

          <!-- 标题和进度 -->
          <view class="card-title">{{ group.title || '拼团' }}</view>
          <view class="progress-section">
            <view class="progress-bar">
              <view class="progress-fill" :style="{ width: group.progressPercent + '%' }"></view>
            </view>
            <view class="progress-text">{{ group.currentCount }}/{{ group.totalCount }}人</view>
          </view>

          <!-- 成员头像 -->
          <view class="member-row">
            <view class="member-avatar" v-for="(member, i) in group.memberAvatars?.slice(0, 5)" :key="i">
              {{ member?.[0] || '?' }}
            </view>
            <view class="member-more" v-if="group.memberAvatars?.length > 5">
              +{{ group.memberAvatars.length - 5 }}
            </view>
          </view>

          <!-- 底部操作 -->
          <view class="card-footer">
            <view class="footer-reward">
              <text class="reward-icon">🎁</text>
              <text class="reward-text">{{ group.rewardPoints || 0 }}积分</text>
            </view>
            <view class="footer-action" :class="group.actionClass">
              {{ group.actionText }}
            </view>
          </view>
        </view>
      </scroll-view>
    </template>

    <!-- 创建拼团弹窗 -->
    <view class="modal-overlay" v-if="showCreateModal" @click="onCloseCreateModal">
      <view class="modal-content" @click.stop>
        <view class="modal-title">发起拼团</view>
        <view class="modal-body">
          <view class="modal-label">选择人数</view>
          <view class="size-grid">
            <view
              class="size-btn"
              :class="{ active: selectedSize === size }"
              v-for="size in [2, 3, 5, 10]"
              :key="size"
              @click="selectedSize = size"
            >{{ size }}人团</view>
          </view>
          <view class="modal-label">说明</view>
          <view class="modal-desc">
            发起拼团后，需要 {{ selectedSize }} 人加入即可完成。
            完成后每人都可获得积分奖励。
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel" @click="onCloseCreateModal">取消</view>
          <view class="modal-btn confirm" @click="onConfirmCreate" :class="{ loading: creating }">
            {{ creating ? '创建中...' : '确认创建' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as groupbuyApi from '@/api/groupbuy'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const loading = ref(true)
const error = ref(null)
const groups = ref([])
const activeTab = ref('created')
const showCreateModal = ref(false)
const selectedSize = ref(2)
const creating = ref(false)

const filteredGroups = computed(() => {
  if (activeTab.value === 'created') {
    return groups.value.filter(g => g.role === 'creator')
  }
  return groups.value.filter(g => g.role === 'joiner')
})

onLoad(() => {
  loadGroups()
})

async function loadGroups() {
  loading.value = true
  error.value = null
  try {
    const res = await groupbuyApi.getMyGroupList()
    const list = res.data || res || []
    groups.value = updateGroupDisplay(list)
    loading.value = false
  } catch (e) {
    console.error('加载拼团列表失败:', e)
    error.value = '加载失败'
    loading.value = false
  }
}

function updateGroupDisplay(list) {
  return list.map(g => {
    const currentCount = g.currentCount || g.memberCount || 0
    const totalCount = g.totalCount || g.groupSize || 2
    const progressPercent = Math.min(Math.round((currentCount / totalCount) * 100), 100)
    const isExpired = g.status === 'expired' || g.isExpired
    const isCompleted = currentCount >= totalCount

    let actionText = '等待中'
    let actionClass = ''
    if (isCompleted) {
      actionText = '已完成'
      actionClass = 'done'
    } else if (isExpired) {
      actionText = '已过期'
      actionClass = 'expired'
    } else {
      actionText = `还差${totalCount - currentCount}人`
      actionClass = 'active'
    }

    const memberAvatars = (g.members || []).map(m =>
      typeof m === 'string' ? m : (m.nickName || m.name || m.userName || '')
    )

    return {
      ...g,
      currentCount,
      totalCount,
      progressPercent,
      isExpired,
      isCompleted,
      actionText,
      actionClass,
      memberAvatars
    }
  })
}

function onOpenCreateModal() {
  selectedSize.value = 2
  showCreateModal.value = true
}

function onCloseCreateModal() {
  showCreateModal.value = false
}

async function onConfirmCreate() {
  if (creating.value) return
  creating.value = true
  try {
    await groupbuyApi.createGroupBuy({ groupSize: selectedSize.value })
    showCreateModal.value = false
    uni.showToast({ title: '创建成功', icon: 'success' })
    loadGroups()
  } catch (e) {
    console.error('创建失败:', e)
    uni.showToast({ title: e.message || '创建失败', icon: 'error' })
  }
  creating.value = false
}

function onGroupTap(group) {
  uni.navigateTo({ url: `/pages/groupbuy-detail/index?id=${group.id}` })
}
</script>

<style scoped>
.activity-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF5EB 0%, #FFF0E0 30%, #f5f7fa 100%);
}

.loading-wrapper, .error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 400rpx 80rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #f0f0f0;
  border-top-color: #FF8C42;
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
  margin-top: 30rpx;
  padding: 16rpx 48rpx;
  background: #FF8C42;
  color: #fff;
  border-radius: 40rpx;
  font-size: 26rpx;
}

/* 头部 */
.header {
  padding: 40rpx 32rpx 28rpx;
  text-align: center;
}

.header-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 10rpx;
}

.header-subtitle {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 30rpx;
}

.create-btn {
  display: inline-block;
  padding: 16rpx 56rpx;
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 40rpx;
  box-shadow: 0 8rpx 20rpx rgba(255, 140, 66, 0.3);
}

/* 标签栏 */
.tab-bar {
  display: flex;
  margin: 0 24rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 4rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #666;
  border-radius: 10rpx;
  transition: all 0.2s;
}

.tab-item.active {
  background: #FF8C42;
  color: #fff;
  font-weight: 600;
}

/* 空状态 */
.empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 30rpx;
}

.empty-action {
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
  color: #fff;
  border-radius: 40rpx;
  font-size: 26rpx;
}

/* 拼团列表 */
.group-list {
  padding: 20rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
  height: calc(100vh - 380rpx);
}

.group-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18rpx;
}

.card-status {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
  font-weight: 600;
}

.card-status.creator {
  background: rgba(255, 140, 66, 0.12);
  color: #FF8C42;
}

.card-status.joiner {
  background: rgba(102, 126, 234, 0.12);
  color: #667eea;
}

.card-state-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.card-state-badge.active {
  background: rgba(82, 196, 26, 0.12);
  color: #52c41a;
}

.card-state-badge.done {
  background: rgba(102, 126, 234, 0.12);
  color: #667eea;
}

.card-state-badge.expired {
  background: rgba(153, 153, 153, 0.12);
  color: #999;
}

.leader-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 14rpx;
}

.leader-avatar {
  width: 56rpx;
  height: 56rpx;
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
}

.leader-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.leader-label {
  font-size: 20rpx;
  color: #FF8C42;
  margin-left: 10rpx;
  padding: 2rpx 10rpx;
  background: rgba(255, 140, 66, 0.1);
  border-radius: 4rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.progress-bar {
  flex: 1;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF8C42 0%, #FF6B35 100%);
  border-radius: 6rpx;
  transition: width 0.3s;
}

.progress-text {
  font-size: 24rpx;
  color: #FF8C42;
  font-weight: 600;
  min-width: 80rpx;
  text-align: right;
}

.member-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.member-avatar {
  width: 52rpx;
  height: 52rpx;
  background: linear-gradient(135deg, #FFA94D 0%, #FF8C42 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20rpx;
  font-weight: 600;
}

.member-more {
  width: 52rpx;
  height: 52rpx;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 20rpx;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5f5f5;
}

.footer-reward {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.reward-icon {
  font-size: 28rpx;
}

.reward-text {
  font-size: 24rpx;
  color: #FF8C42;
  font-weight: 600;
}

.footer-action {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

.footer-action.active {
  background: rgba(255, 140, 66, 0.1);
  color: #FF8C42;
}

.footer-action.done {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.footer-action.expired {
  background: rgba(153, 153, 153, 0.1);
  color: #999;
}

/* 创建弹窗 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  width: 600rpx;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 32rpx;
}

.modal-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 16rpx;
  font-weight: 600;
}

.size-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.size-btn {
  text-align: center;
  padding: 20rpx 0;
  background: #f8f9fc;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #666;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.size-btn.active {
  border-color: #FF8C42;
  color: #FF8C42;
  background: rgba(255, 140, 66, 0.06);
  font-weight: 600;
}

.modal-desc {
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
  background: #f8f9fc;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 32rpx;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.modal-btn.cancel {
  background: #f2f3f5;
  color: #666;
}

.modal-btn.confirm {
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
  color: #fff;
}

.modal-btn.confirm.loading {
  opacity: 0.7;
}
</style>
