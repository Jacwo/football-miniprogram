<template>
  <view class="detail-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-ball">⚽</view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error-wrapper">
      <view class="error-icon">😵</view>
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="onRetry">重新加载</view>
    </view>

    <!-- 主内容 -->
    <view v-else class="main-content">
      <scroll-view class="content-scroll" scroll-y enhanced :show-scrollbar="false">
        <!-- 拼团奖励内容列表 -->
        <view v-if="group.contents && group.contents.length > 0" class="reward-list-card">
          <view class="reward-list-header">
            <text class="reward-list-title">🎁 拼团成功即可获得</text>
          </view>
          <view v-for="(content, i) in group.contents" :key="i" class="reward-item">
            <view class="reward-item-icon">📄</view>
            <text class="reward-item-name">{{ content }}</text>
          </view>
        </view>

        <!-- 核心拼团卡片 -->
        <view class="group-core-card">
          <!-- 倒计时 -->
          <view v-if="!isCompleted && remainingTime && remainingTime !== '已过期'" class="countdown-row">
            <text class="countdown-label">距离结束还剩</text>
            <view class="countdown-boxes">
              <view class="cd-box"><text class="cd-num">{{ countdownParts[0] || '00' }}</text></view>
              <text class="cd-colon">:</text>
              <view class="cd-box"><text class="cd-num">{{ countdownParts[1] || '00' }}</text></view>
              <text class="cd-colon">:</text>
              <view class="cd-box"><text class="cd-num">{{ countdownParts[2] || '00' }}</text></view>
            </view>
          </view>
          <view v-else-if="isExpired || remainingTime === '已过期'" class="countdown-row expired">
            <text class="countdown-label">该拼团已过期</text>
          </view>
          <view v-else-if="isCompleted" class="countdown-row completed">
            <text class="countdown-label">拼团已成功！</text>
          </view>

          <!-- 状态装饰文字 -->
          <view class="status-line">
            <view class="status-deco"></view>
            <text class="status-text" :class="isCompleted ? 'success' : (isExpired || remainingTime === '已过期' ? 'expired' : '')">
              {{ isCompleted ? '拼团成功！' : (isExpired || remainingTime === '已过期' ? '拼团已过期' : '拼团进行中！') }}
            </text>
            <view class="status-deco"></view>
          </view>

          <!-- 成员头像区 -->
          <view class="members-row">
            <view v-for="(slot, idx) in slotList" :key="idx" class="member-avatar-wrap" :class="idx < group.currentSize ? 'joined' : 'empty'">
              <block v-if="idx < group.currentSize && group.members && group.members[idx]">
                <view class="avatar-circle" :class="{ 'is-leader': group.members[idx].userId === group.leaderId }">
                  <text class="avatar-text">{{ group.members[idx].userName[0] }}</text>
                </view>
                <text v-if="group.members[idx].userId === group.leaderId" class="avatar-tag">团长</text>
                <text v-else class="avatar-name">{{ group.members[idx].userName }}</text>
              </block>
              <block v-else>
                <view class="avatar-circle empty">
                  <text class="avatar-text">?</text>
                </view>
                <text class="avatar-name empty">待加入</text>
              </block>
            </view>
          </view>

          <!-- 按钮区 -->
          <view class="btn-row">
            <button v-if="!isCompleted && !isExpired && remainingTime !== '已过期'" class="btn-outline" open-type="share">
              <text>分享</text>
            </button>
            <button
              v-if="canJoin && !isJoined && !isLeader"
              class="btn-primary pulse"
              :loading="joining"
              @tap="onJoinGroup"
            >
              <text>{{ joining ? '加入中...' : '邀请好友来拼团' }}</text>
            </button>
            <button
              v-else-if="isLeader && isCompleted && group.rewardDistributed === 0"
              class="btn-primary"
              :loading="claiming"
              @tap="onClaimReward"
            >
              <text>{{ claiming ? '领取中...' : '领取积分' }}</text>
            </button>
            <view v-else-if="isJoined && !isLeader" class="btn-disabled"><text>已加入</text></view>
            <view v-else-if="!canJoin && !isCompleted && !isJoined && !isLeader" class="btn-disabled"><text>人数已满</text></view>
            <view v-else-if="isCompleted && group.rewardDistributed === 1" class="btn-disabled"><text>已完成</text></view>
            <view v-else-if="isLeader && !isCompleted" class="btn-disabled"><text>等待加入</text></view>
            <view v-if="isExpired || remainingTime === '已过期'" class="btn-disabled"><text>已过期</text></view>
          </view>
        </view>

        <!-- 拼团详情 -->
        <view class="info-card">
          <view class="info-title">拼团详情</view>
          <view class="info-row">
            <text class="info-label">团长</text>
            <view class="info-value leader">
              <view class="leader-avatar-mini">{{ group.leaderName ? group.leaderName[0] : '' }}</view>
              <text>{{ group.leaderName }}</text>
            </view>
          </view>
          <view class="info-row">
            <text class="info-label">成团人数</text>
            <text class="info-value">{{ group.groupSize }} 人</text>
          </view>
          <view class="info-row">
            <text class="info-label">当前人数</text>
            <text class="info-value highlight">{{ group.currentSize }}/{{ group.groupSize }} 人</text>
          </view>
          <view class="info-row">
            <text class="info-label">发起时间</text>
            <text class="info-value">{{ group.createTime }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">过期时间</text>
            <text class="info-value">{{ group.expireTime }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">奖励积分</text>
            <view class="info-value">
              <text class="reward-badge">+{{ group.groupSize }}</text>
            </view>
          </view>
        </view>

        <!-- 拼团说明 -->
        <view class="info-card">
          <view class="info-title">拼团说明</view>
          <view class="rule-text">· 人数满 <text class="rule-highlight">{{ group.groupSize }}</text> 人即可获得积分奖励</view>
          <view class="rule-text">· 每个拼团有效期 <text class="rule-highlight">12小时</text></view>
          <view class="rule-text">· 完成拼团全部成员可获得相应积分</view>
          <view class="rule-text">· 可以邀请好友加入拼团</view>
          <view class="rule-text">· 已参团用户三天内不可再次参团</view>
        </view>

        <!-- 大家都在领 -->
        <view v-if="hotGroups && hotGroups.length > 0" class="hot-section">
          <view class="hot-header">
            <view class="hot-deco left"></view>
            <text class="hot-title">大家都在领</text>
            <view class="hot-deco right"></view>
          </view>
          <view class="hot-tabs">
            <view
              v-for="(tab, i) in hotGroups"
              :key="i"
              class="hot-tab"
              :class="{ active: hotActiveIndex === i }"
              @tap="hotActiveIndex = i"
            >
              {{ tab.name }}
            </view>
          </view>
        </view>

        <view class="bottom-safe"></view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { ref, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import * as groupbuyApi from '@/api/groupbuy'

export default {
  setup() {
    const userStore = useUserStore()
    const groupId = ref(null)
    const group = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const joining = ref(false)
    const claiming = ref(false)
    const isLeader = ref(false)
    const isJoined = ref(false)
    const canJoin = ref(false)
    const remainingTime = ref('')
    const countdownParts = ref(['00', '00', '00'])
    const isCompleted = ref(false)
    const isExpired = ref(false)
    const slotList = ref([])
    const hotGroups = ref([])
    const hotActiveIndex = ref(0)
    let countdownTimer = null

    function pad(n) { return String(n).padStart(2, '0') }

    function startCountdown() {
      if (countdownTimer) clearInterval(countdownTimer)

      const update = () => {
        if (!group.value || !group.value.expireTime) return
        try {
          const now = Date.now()
          let expireTime = typeof group.value.expireTime === 'number'
            ? group.value.expireTime
            : new Date(group.value.expireTime).getTime()
          if (expireTime < 10000000000) expireTime *= 1000

          const remaining = expireTime - now
          if (remaining <= 0) {
            clearInterval(countdownTimer)
            remainingTime.value = '已过期'
            countdownParts.value = ['00', '00', '00']
            return
          }

          const h = Math.floor(remaining / 3600000)
          const m = Math.floor((remaining % 3600000) / 60000)
          const s = Math.floor((remaining % 60000) / 1000)
          remainingTime.value = `${h}时${m}分${s}秒`
          countdownParts.value = [pad(h), pad(m), pad(s)]
        } catch (e) {
          console.error('倒计时计算失败:', e)
        }
      }

      update()
      countdownTimer = setInterval(update, 1000)
    }

    async function loadGroupDetail(id) {
      loading.value = true
      error.value = null
      try {
        const result = await groupbuyApi.getGroupBuyDetail(id)
        let detail = result
        if (result && result.data) detail = result.data
        if (!detail) throw new Error('获取拼团详情失败')

        const userInfo = userStore.getUserInfo
        const leader = detail.leaderId === (userInfo && userInfo.id)
        let joined = leader
        if (!joined && detail.members && Array.isArray(detail.members)) {
          joined = detail.members.some(m => m.userId === (userInfo && userInfo.id))
        }

        const joinable = detail.currentSize < detail.groupSize && detail.status === 0 && !joined
        const completed = detail.currentSize >= detail.groupSize

        let expired = false
        if (detail.expireTime) {
          let expTime = typeof detail.expireTime === 'number' ? detail.expireTime : new Date(detail.expireTime).getTime()
          if (expTime < 10000000000) expTime *= 1000
          expired = Date.now() >= expTime
        }
        if (detail.status !== undefined && detail.status !== 0) expired = true

        group.value = detail
        isLeader.value = leader
        isJoined.value = joined
        canJoin.value = joinable
        isCompleted.value = completed
        isExpired.value = expired
        remainingTime.value = expired ? '已过期' : ''
        countdownParts.value = ['00', '00', '00']
        slotList.value = Array.from({ length: detail.groupSize }, (_, i) => i)
        loading.value = false

        startCountdown()
        loadHotGroups()
      } catch (e) {
        console.error('加载拼团详情失败:', e)
        loading.value = false
        error.value = e.message || '加载失败'
      }
    }

    async function onJoinGroup() {
      if (joining.value || !canJoin.value) return
      const userInfo = userStore.getUserInfo
      if (!userInfo) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
      joining.value = true
      try {
        uni.showLoading({ title: '加入中...' })
        await groupbuyApi.joinGroupBuy(group.value.id, userInfo.id)
        uni.hideLoading()
        uni.showToast({ title: '加入成功', icon: 'success', duration: 1500 })
        setTimeout(() => loadGroupDetail(group.value.id), 1000)
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '加入失败', icon: 'none' })
      } finally {
        joining.value = false
      }
    }

    async function onClaimReward() {
      if (claiming.value || !isLeader.value || !isCompleted.value) return
      const userInfo = userStore.getUserInfo
      if (!userInfo) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
      claiming.value = true
      try {
        uni.showLoading({ title: '领取中...' })
        await groupbuyApi.claimReward(group.value.id, userInfo.id)
        uni.hideLoading()
        uni.showToast({ title: `成功领取${group.value.groupSize}积分`, icon: 'success', duration: 2000 })
        setTimeout(() => loadGroupDetail(group.value.id), 2000)
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '领取失败', icon: 'none' })
      } finally {
        claiming.value = false
      }
    }

    async function loadHotGroups() {
      try {
        const result = await groupbuyApi.getHotGroups()
        if (result && result.data && Array.isArray(result.data)) {
          hotGroups.value = result.data
          hotActiveIndex.value = 0
        }
      } catch (e) { /* 静默 */ }
    }

    function onRetry() {
      if (groupId.value) loadGroupDetail(groupId.value)
    }

    onLoad((options) => {
      const id = options.id
      if (!id) { loading.value = false; error.value = '参数错误'; return }
      groupId.value = id
      loadGroupDetail(id)
    })

    onShow(() => {
      if (error.value && groupId.value) loadGroupDetail(groupId.value)
    })

    onUnmounted(() => {
      if (countdownTimer) clearInterval(countdownTimer)
    })

    return {
      group, loading, error, joining, claiming,
      isLeader, isJoined, canJoin, remainingTime, countdownParts,
      isCompleted, isExpired, slotList, hotGroups, hotActiveIndex,
      onJoinGroup, onClaimReward, onRetry
    }
  }
}
</script>

<style scoped>
.detail-page {
  height: 100vh;
  background: linear-gradient(180deg, #FFF5EB 0%, #FFF0E0 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 24rpx;
}

.loading-ball {
  width: 80rpx;
  height: 80rpx;
  font-size: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ballBounce 0.8s ease-in-out infinite;
}

@keyframes ballBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-16rpx); }
}

.loading-text { font-size: 26rpx; color: #999; }

.error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20rpx;
}

.error-icon { font-size: 80rpx; }
.error-text { font-size: 26rpx; color: #999; }

.retry-btn {
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  color: #fff;
  border-radius: 40rpx;
  font-size: 26rpx;
  font-weight: 600;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-scroll {
  flex: 1;
  height: 0;
  padding: 20rpx;
  box-sizing: border-box;
}

.reward-list-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(255, 140, 66, 0.08);
  position: relative;
  overflow: hidden;
}

.reward-list-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 24rpx;
  bottom: 24rpx;
  width: 6rpx;
  background: linear-gradient(180deg, #FF8C42, #FF6B35);
  border-radius: 0 4rpx 4rpx 0;
}

.reward-list-header { margin-bottom: 16rpx; padding-left: 16rpx; }
.reward-list-title { font-size: 28rpx; font-weight: 700; color: #333; }

.reward-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 16rpx;
  border-bottom: 1rpx dashed #F0E6DC;
}

.reward-item:last-child { border-bottom: none; }
.reward-item-icon { font-size: 32rpx; flex-shrink: 0; }
.reward-item-name { font-size: 26rpx; color: #555; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.group-core-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 24rpx rgba(255, 140, 66, 0.1);
  position: relative;
  overflow: hidden;
}

.group-core-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 8rpx;
  background: linear-gradient(90deg, #FF8C42, #FF6B35, #FF8C42);
}

.countdown-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
  flex-wrap: wrap;
}

.countdown-label { font-size: 28rpx; font-weight: 600; color: #333; }
.countdown-boxes { display: flex; align-items: center; gap: 8rpx; }

.cd-box {
  min-width: 64rpx;
  height: 64rpx;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 107, 53, 0.3);
}

.cd-num {
  font-size: 32rpx;
  font-weight: 800;
  color: #fff;
  font-family: 'Courier New', monospace;
  padding: 0 8rpx;
}

.cd-colon { font-size: 32rpx; font-weight: 800; color: #FF6B35; }
.countdown-row.completed .countdown-label { color: #22c55e; font-size: 32rpx; }
.countdown-row.expired .countdown-label { color: #ef4444; }

.status-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-bottom: 32rpx;
}

.status-deco {
  flex: 1;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, #FF8C42, transparent);
  max-width: 120rpx;
}

.status-text { font-size: 30rpx; font-weight: 700; color: #FF6B35; flex-shrink: 0; }
.status-text.success { color: #22c55e; }
.status-text.expired { color: #999; }

.members-row {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
  flex-wrap: wrap;
}

.member-avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  position: relative;
}

.avatar-circle {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.avatar-circle:not(.empty):not(.is-leader) { background: linear-gradient(135deg, #E8E8E8, #D0D0D0); }
.avatar-circle.is-leader { background: linear-gradient(135deg, #FF8C42, #FF6B35); box-shadow: 0 4rpx 16rpx rgba(255, 107, 53, 0.35); }
.avatar-circle.empty { background: #F5F0EB; border: 2rpx dashed #DDD5CC; }

.avatar-text { font-size: 36rpx; font-weight: 700; color: #fff; }
.avatar-circle.empty .avatar-text { color: #CCC; font-size: 28rpx; }

.avatar-tag {
  position: absolute;
  bottom: -8rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 2rpx 12rpx;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  color: #fff;
  font-size: 18rpx;
  font-weight: 600;
  border-radius: 10rpx;
  white-space: nowrap;
}

.avatar-name {
  font-size: 22rpx;
  color: #666;
  max-width: 100rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.avatar-name.empty { color: #BBB; }

.btn-row {
  display: flex;
  gap: 20rpx;
  justify-content: center;
}

.btn-row button,
.btn-row .btn-disabled {
  flex: 1;
  height: 84rpx;
  border-radius: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  margin: 0;
  padding: 0;
}

.btn-row button::after { border: none; }

.btn-outline {
  background: #fff;
  border: 2rpx solid #FF8C42 !important;
  color: #FF6B35;
}

.btn-outline text { color: #FF6B35; font-size: 28rpx; font-weight: 600; }

.btn-primary {
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 53, 0.3);
}

.btn-primary text { color: #fff; font-size: 28rpx; font-weight: 600; }

.btn-primary.pulse { animation: btnPulse 1.5s ease-in-out infinite; }

@keyframes btnPulse {
  0%, 100% { box-shadow: 0 8rpx 24rpx rgba(255, 107, 53, 0.3); }
  50% { box-shadow: 0 8rpx 32rpx rgba(255, 107, 53, 0.5); transform: scale(1.02); }
}

.btn-disabled { background: #F0EBE5; color: #BBB; }
.btn-disabled text { color: #BBB; font-size: 28rpx; font-weight: 600; }

.info-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.info-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 20rpx;
  position: relative;
  padding-left: 20rpx;
}

.info-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6rpx;
  bottom: 6rpx;
  width: 6rpx;
  background: linear-gradient(180deg, #FF8C42, #FF6B35);
  border-radius: 3rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F0EB;
}

.info-row:last-child { border-bottom: none; }
.info-label { font-size: 26rpx; color: #888; }

.info-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.info-value.highlight { color: #FF6B35; font-weight: 700; }

.leader-avatar-mini {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #fff;
  font-weight: 700;
}

.reward-badge {
  padding: 4rpx 16rpx;
  background: linear-gradient(135deg, #FFF0E5, #FFE5D6);
  border: 1rpx solid #FF8C42;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 800;
  color: #FF6B35;
}

.rule-text { font-size: 26rpx; color: #666; line-height: 2; }
.rule-highlight { color: #FF6B35; font-weight: 700; }

.hot-section { margin-top: 8rpx; }

.hot-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.hot-deco {
  width: 40rpx;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, #FF8C42);
}

.hot-deco.right { background: linear-gradient(90deg, #FF8C42, transparent); }
.hot-title { font-size: 28rpx; font-weight: 700; color: #333; }

.hot-tabs {
  display: flex;
  gap: 16rpx;
  overflow-x: auto;
  padding-bottom: 8rpx;
}

.hot-tab {
  flex-shrink: 0;
  padding: 10rpx 24rpx;
  background: #fff;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #666;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.hot-tab.active { background: linear-gradient(135deg, #FF8C42, #FF6B35); color: #fff; }

.bottom-safe { height: 40rpx; }
</style>
