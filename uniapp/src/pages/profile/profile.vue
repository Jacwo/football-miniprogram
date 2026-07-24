<template>
  <view class="profile-page">
    <!-- 用户信息区域 -->
    <view class="user-section">
      <!-- 已登录 -->
      <view v-if="isLoggedIn && userInfo" class="user-info" @tap="onEditProfile">
        <image class="avatar" :src="userInfo.avatar || '/static/images/logo.png'" mode="aspectFill" />
        <view class="info">
          <view class="name-row">
            <text class="name">{{ userInfo.userName || '用户' }}</text>
            <!-- 首次改名奖励 -->
            <view v-if="userInfo.hasRenamed === false" class="rename-badge">
              <text>✏️ 改名送3积分</text>
            </view>
            <!-- VIP图标 -->
            <view v-if="userInfo.isVip" class="vip-badge" @tap.stop="onVipBadgeTap">
              <view class="vip-diamond"></view>
              <text class="vip-label">VIP</text>
            </view>
            <!-- 最高等级勋章 -->
            <view v-if="topMedal && !userInfo.isVip" class="top-medal-wrapper" @tap.stop="onTopMedalTap">
              <view class="top-medal-item" :class="topMedal.colorClass">
                <text class="top-medal-icon">{{ topMedal.icon }}</text>
              </view>
              <view class="top-medal-tooltip">累计中奖{{ topMedal.bonusDesc }}</view>
            </view>
          </view>
          <text class="phone">{{ userInfo.phone || '' }}</text>
          <text v-if="userInfo.isVip && vipExpireTimeStr" class="vip-expire">会员到期: {{ vipExpireTimeStr }}</text>
        </view>
        <view class="edit-arrow">›</view>
      </view>

      <!-- 积分与签到卡片 -->
      <view v-if="isLoggedIn && userInfo" class="cards-row">
        <!-- 积分卡片 -->
        <view class="points-card" @tap="onPointDetail">
          <view class="points-bg-decoration"></view>
          <view class="points-content">
            <view class="points-icon-wrapper">
              <text class="points-icon">💎</text>
            </view>
            <view class="points-info">
              <text class="points-label">我的积分</text>
              <text class="points-value">{{ userInfo.point || 0 }}</text>
            </view>
          </view>
          <view class="points-arrow">›</view>
        </view>

        <!-- 签到卡片 -->
        <view class="sign-card" :class="{ signed: userInfo.signToday }" @tap="onSign">
          <view class="sign-bg-decoration"></view>
          <view class="sign-content">
            <view class="sign-icon-wrapper">
              <text class="sign-icon">{{ userInfo.signToday ? '✓' : '📅' }}</text>
            </view>
            <view class="sign-info">
              <text class="sign-label">{{ userInfo.signToday ? '今日已签到' : '每日签到' }}</text>
              <text class="sign-reward">{{ userInfo.signToday ? '明天再来' : (userInfo.isVip ? '+10积分' : '+1积分') }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 我的勋章入口 -->
      <view v-if="isLoggedIn && userInfo && medals.length > 0" class="medal-entry" @tap="onOpenMedalPopup">
        <view class="medal-entry-left">
          <view class="medal-entry-icon">🏅</view>
          <view class="medal-entry-info">
            <text class="medal-entry-title">我的勋章</text>
            <text class="medal-entry-desc">已获得 {{ acquiredCount }} 枚勋章</text>
          </view>
        </view>
        <view class="medal-entry-preview">
          <view v-for="(item, i) in acquiredMedals.slice(0, 4)" :key="item.medalId" class="preview-medal" :class="item.colorClass">
            <text>{{ item.icon }}</text>
          </view>
        </view>
        <view class="medal-entry-arrow">›</view>
      </view>

      <!-- 任务中心 - 仅在有未完成任务时显示 -->
      <view v-if="isLoggedIn && userInfo && !userInfo.phone" class="task-section">
        <view class="task-header">
          <text class="task-title">任务中心</text>
          <text class="task-subtitle">完成任务领积分</text>
        </view>
        <view class="task-list">
          <view class="task-item" @tap="onBindPhone">
            <view class="task-left">
              <view class="task-icon-wrapper">
                <text class="task-icon">📱</text>
              </view>
              <view class="task-info">
                <text class="task-name">完善手机号</text>
                <text class="task-desc">绑定手机号，账号更安全</text>
              </view>
            </view>
            <view class="task-right">
              <text class="task-reward">+5积分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 龙虾 AI智能问答 -->
      <view v-if="isLoggedIn && userInfo && showAIChat" class="lobster-card" @tap="onLobsterChat">
        <view class="lobster-card-left">
          <view class="lobster-icon-wrapper">
            <text>🦞</text>
          </view>
          <view class="lobster-card-info">
            <text class="lobster-card-title">龙虾 · AI智能问答</text>
            <text class="lobster-card-desc">VIP限时免费，点击体验</text>
          </view>
        </view>
        <view class="lobster-card-right">
          <view class="lobster-tag">限时免费</view>
          <text class="lobster-card-arrow">›</text>
        </view>
      </view>

      <!-- 会员中心与积分充值 -->
      <view v-if="isLoggedIn && userInfo && showVipButton" class="vip-entry-section">
        <view class="vip-entry-card" @tap="onVipCenter">
          <view class="vip-entry-left">
            <view class="vip-entry-icon-wrapper">
              <view class="vip-entry-diamond"></view>
            </view>
            <view class="vip-entry-info">
              <text class="vip-entry-title">{{ userInfo.isVip ? '会员中心' : '升级为会员' }}</text>
              <text class="vip-entry-desc">{{ userInfo.isVip ? '管理会员权益' : '解锁全部最新AI分析' }}</text>
            </view>
          </view>
          <view class="vip-entry-arrow">›</view>
        </view>
        <view class="credits-entry-card" @tap="onCredits">
          <view class="credits-entry-left">
            <view class="credits-icon-box">
              <text class="credits-icon">💎</text>
            </view>
            <view class="credits-info">
              <text class="credits-title">积分充值</text>
              <text class="credits-desc">解锁AI分析</text>
            </view>
          </view>
          <view class="credits-entry-arrow">›</view>
        </view>
      </view>

      <!-- 拼团活动 -->
      <view v-if="isLoggedIn && userInfo" class="activity-section">
        <view class="activity-card" @tap="onActivityCenter">
          <view class="activity-left">
            <view class="activity-icon-wrapper">
              <text class="activity-icon">🎉</text>
            </view>
            <view class="activity-info">
              <text class="activity-title">拼团得积分</text>
              <text class="activity-desc">邀请好友拼团，完成得积分</text>
            </view>
          </view>
          <view class="activity-arrow">›</view>
        </view>
      </view>

      <!-- 未登录 -->
      <view v-else class="login-prompt" @tap="onLogin">
        <image class="avatar default" src="/static/images/logo.png" mode="aspectFill" />
        <view class="info">
          <text class="login-text">点击登录</text>
          <text class="login-desc">登录后享受更多服务</text>
        </view>
        <view class="arrow">›</view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <!-- 分享给好友 -->
      <button class="menu-item" open-type="share">
        <view class="menu-item-inner">
          <view class="menu-icon-box menu-icon-share">📤</view>
          <view class="menu-info">
            <text class="menu-title">分享给好友</text>
            <text class="menu-desc">邀请好友一起使用</text>
          </view>
        </view>
        <text class="menu-arrow">›</text>
      </button>

      <!-- 联系客服 -->
      <button class="menu-item" open-type="contact">
        <view class="menu-item-inner">
          <view class="menu-icon-box menu-icon-service">💬</view>
          <view class="menu-info">
            <text class="menu-title">联系客服</text>
            <text class="menu-desc">24小时在线客服</text>
          </view>
        </view>
        <text class="menu-arrow">›</text>
      </button>

      <!-- 其他菜单项 -->
      <view v-for="item in menuList" :key="item.action" class="menu-item" @tap="onMenuTap(item)">
        <view class="menu-item-inner">
          <view class="menu-icon-box" :class="'menu-icon-' + item.action">{{ item.icon }}</view>
          <view class="menu-info">
            <text class="menu-title">{{ item.title }}</text>
            <text class="menu-desc">{{ item.desc }}</text>
          </view>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 其他操作 -->
    <view class="menu-section">
      <view class="menu-item" @tap="onClearCache">
        <view class="menu-item-inner">
          <view class="menu-icon-box menu-icon-clear">🧹</view>
          <view class="menu-info">
            <text class="menu-title">清除缓存</text>
            <text class="menu-desc">释放存储空间</text>
          </view>
        </view>
        <text class="menu-arrow">›</text>
      </view>

      <view v-if="isLoggedIn" class="menu-item menu-item-logout" @tap="onLogout">
        <view class="menu-item-inner">
          <view class="menu-icon-box menu-icon-logout">🚪</view>
          <view class="menu-info">
            <text class="menu-title logout-title">退出登录</text>
            <text class="menu-desc">安全退出当前账号</text>
          </view>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 版本信息 -->
    <view class="version-section">
      <text class="version-text">Version {{ version }}</text>
    </view>

    <!-- 底部安全区域 -->
    <view class="safe-area-bottom"></view>

    <!-- 绑定手机号弹窗 -->
    <view v-if="showPhonePopup" class="popup-mask" @tap="onClosePhonePopup">
      <view class="popup-content" @tap.stop="">
        <view class="popup-header">
          <text class="popup-title">绑定手机号</text>
          <view class="popup-close" @tap="onClosePhonePopup">×</view>
        </view>
        <view class="popup-body">
          <view class="popup-tip">绑定手机号可获得 <text class="highlight">5积分</text> 奖励</view>
          <view class="input-group">
            <text class="input-prefix">+86</text>
            <input class="input-field" type="number" maxlength="11" placeholder="请输入手机号" v-model="bindPhone" />
          </view>
          <view class="input-group">
            <input class="input-field code-input" type="number" maxlength="6" placeholder="请输入验证码" v-model="bindCode" />
            <view class="send-code-btn" :class="{ disabled: bindCountdown > 0 || sendingBindCode }" @tap="onSendBindCode">
              <text v-if="bindCountdown > 0">{{ bindCountdown }}s</text>
              <text v-else-if="sendingBindCode">发送中</text>
              <text v-else>获取验证码</text>
            </view>
          </view>
        </view>
        <view class="popup-footer">
          <view class="popup-btn cancel" @tap="onClosePhonePopup">取消</view>
          <view class="popup-btn confirm" :class="{ loading: bindLoading }" @tap="onConfirmBindPhone">
            {{ bindLoading ? '绑定中...' : '确认绑定' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 修改用户名弹窗 -->
    <view v-if="showNamePopup" class="popup-mask" @tap="onCloseNamePopup">
      <view class="popup-content" @tap.stop="">
        <view class="popup-header">
          <text class="popup-title">修改用户名</text>
          <view class="popup-close" @tap="onCloseNamePopup">×</view>
        </view>
        <view class="popup-body">
          <view class="popup-tip">输入新的用户名</view>
          <view class="input-group">
            <input class="input-field" type="text" maxlength="20" placeholder="请输入用户名（不超过20个字符）" v-model="newUserName" />
          </view>
        </view>
        <view class="popup-footer">
          <view class="popup-btn cancel" @tap="onCloseNamePopup">取消</view>
          <view class="popup-btn confirm" :class="{ loading: updateNameLoading }" @tap="onConfirmUpdateName">
            {{ updateNameLoading ? '修改中...' : '确认修改' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 我的勋章弹窗 -->
    <view v-if="showMedalPopup" class="medal-popup-mask" @tap="onCloseMedalPopup">
      <view class="medal-popup-container" @tap.stop="">
        <view class="medal-popup-header">
          <view class="medal-popup-close" @tap="onCloseMedalPopup">
            <text class="close-icon">×</text>
          </view>
          <view class="medal-popup-title-area">
            <text class="medal-popup-title">🏅 我的勋章</text>
          </view>
          <view class="medal-stats-row">
            <view class="stat-badge">
              <text class="stat-badge-num">{{ medals.length }}</text>
              <text class="stat-badge-label">全部</text>
            </view>
            <view class="stat-badge acquired">
              <text class="stat-badge-num">{{ acquiredCount }}</text>
              <text class="stat-badge-label">已获得</text>
            </view>
            <view class="stat-badge worn">
              <text class="stat-badge-num">{{ wornMedals.length }}</text>
              <text class="stat-badge-label">佩戴中</text>
            </view>
          </view>
        </view>

        <scroll-view class="medal-popup-scroll" scroll-y enhanced :show-scrollbar="false">
          <view class="medal-grid-list">
            <view v-for="item in medals" :key="item.medalId" class="medal-grid-item" :class="item.isAcquired ? 'acquired' : 'locked'" @tap="onMedalTap(item)">
              <view class="medal-icon-box" :class="item.colorClass">
                <text class="medal-icon-text">{{ item.icon }}</text>
                <view v-if="item.isAcquired" class="medal-shine"></view>
              </view>
              <view v-if="item.isWorn" class="medal-tag worn">佩戴中</view>
              <view v-else-if="!item.isAcquired" class="medal-tag lock">🔒</view>
              <text class="medal-name">{{ item.medalName }}</text>
              <text class="medal-desc">{{ item.medalMeaning }}</text>
            </view>
          </view>
          <view class="medal-footer-tip">
            <text>点击已解锁勋章查看详情</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import * as userApi from '@/api/user'
import * as matchApi from '@/api/match'

export default {
  setup() {
    const userStore = useUserStore()
    const medals = ref([])
    const wornMedals = ref([])
    const acquiredMedals = ref([])
    const topMedal = ref(null)
    const showMedalPopup = ref(false)
    const showVipButton = ref(false)
    const showAIChat = ref(false)
    const showPhonePopup = ref(false)
    const showNamePopup = ref(false)
    const bindPhone = ref('')
    const bindCode = ref('')
    const bindCountdown = ref(0)
    const sendingBindCode = ref(false)
    const bindLoading = ref(false)
    const newUserName = ref('')
    const updateNameLoading = ref(false)
    const version = '2.0.0'

    const userInfo = computed(() => userStore.getUserInfo)
    const isLoggedIn = computed(() => userStore.getIsLoggedIn)
    const acquiredCount = computed(() => acquiredMedals.value.length)
    const vipExpireTimeStr = computed(() => {
      if (!userInfo.value?.isVip || !userInfo.value?.vipExpireTime) return ''
      const d = new Date(userInfo.value.vipExpireTime)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })

    const menuList = [
      { icon: '📄', title: '用户协议', desc: '查看用户协议', action: 'agreement' },
      { icon: '🔒', title: '隐私政策', desc: '查看隐私政策', action: 'privacy' },
      { icon: 'ℹ️', title: '关于我们', desc: '了解AI足球智能体', action: 'about' }
    ]

    onShow(async () => {
      // 同步 tabBar 选中状态
      // #ifdef MP-WEIXIN
      const pages = getCurrentPages()
      const curPage = pages[pages.length - 1]
      if (curPage && typeof curPage.getTabBar === 'function' && curPage.getTabBar()) {
        curPage.getTabBar().setData({ selectedPath: '/pages/profile/profile' })
      }
      // #endif

      await updateUserState()
      loadUserMedals()
      checkFeatures()
    })

    async function updateUserState() {
      if (!isLoggedIn.value) return
      try {
        if (userInfo.value?.id) {
          const latest = await userApi.getUserInfoById(userInfo.value.id)
          if (latest) userStore.updateLocalUserInfo(latest)
        } else {
          const result = await userApi.getUserInfo()
          if (result) userStore.updateLocalUserInfo(result)
        }
      } catch (e) { /* 静默 */ }
      try {
        const uid = userInfo.value?.id
        if (uid) {
          const isVip = await userApi.checkVip(uid)
          if (typeof isVip === 'boolean') userStore.updateLocalUserInfo({ isVip })
        }
      } catch (e) { /* 静默 */ }
    }

    async function loadUserMedals() {
      if (!isLoggedIn.value || !userInfo.value?.id) {
        medals.value = []; acquiredMedals.value = []; wornMedals.value = []; topMedal.value = null
        return
      }
      try {
        const data = await userApi.getUserMedals(userInfo.value.id)
        const list = Array.isArray(data) ? data : (data?.data || [])
        const acquired = list.filter(m => (m.acquireTime && m.acquireTime !== 'null' && m.acquireTime !== ''))
        const topLevel = acquired.length > 0 ? Math.max(...acquired.map(m => m.level || 0)) : 0
        const processed = list.map(m => {
          const isAcquired = !!(m.acquireTime && m.acquireTime !== 'null' && m.acquireTime !== '')
          const isWorn = isAcquired && m.level === topLevel
          const colorClass = isAcquired ? getMedalColorClass(m.level) : 'medal-locked'
          return { ...m, icon: getMedalIcon(m.level), colorClass, isAcquired, isWorn }
        })
        medals.value = processed
        acquiredMedals.value = processed.filter(m => m.isAcquired)
        wornMedals.value = processed.filter(m => m.isWorn)
        const top = wornMedals.value[0] || null
        if (top) top.bonusDesc = getMedalBonusDesc(top.level)
        topMedal.value = top
      } catch (e) { medals.value = [] }
    }

    function getMedalIcon(level) {
      const iconMap = { 1: '🌱', 2: '🎊', 3: '💎', 4: '🎁', 5: '☀️', 6: '🏆', 7: '👑' }
      return iconMap[level] || '🏅'
    }
    function getMedalColorClass(level) {
      const colorMap = { 1: 'medal-green', 2: 'medal-blue', 3: 'medal-purple', 4: 'medal-pink', 5: 'medal-orange', 6: 'medal-gold', 7: 'medal-rainbow' }
      return colorMap[level] || 'medal-default'
    }
    function getMedalBonusDesc(level) {
      const bonusMap = { 1: '100元', 2: '1,000元', 3: '10,000元', 4: '20,000元', 5: '30,000元', 6: '50,000元', 7: '100,000元' }
      return bonusMap[level] || ''
    }

    async function checkFeatures() {
      try {
        const result = await matchApi.checkFeatures()
        showVipButton.value = result === true
        showAIChat.value = result === true
      } catch (e) {
        // 接口异常时默认开启，避免页面功能缺失
        showVipButton.value = true
        showAIChat.value = true
      }
    }

    function onLogin() { uni.navigateTo({ url: '/pages/login/login' }) }
    function onLogout() {
      uni.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '退出中...' })
            await userStore.logout()
            uni.hideLoading()
            uni.showToast({ title: '已退出', icon: 'success' })
            medals.value = []; acquiredMedals.value = []; wornMedals.value = []; topMedal.value = null
          }
        }
      })
    }

    async function onSign() {
      if (!isLoggedIn.value) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
      if (userInfo.value?.signToday) { uni.showToast({ title: '今日已签到', icon: 'none' }); return }
      try {
        uni.showLoading({ title: '签到中...' })
        await userApi.userSign(userInfo.value.id)
        uni.hideLoading()
        uni.showToast({ title: `签到成功，获得${userInfo.value.isVip ? '10' : '1'}积分`, icon: 'success' })
        setTimeout(() => updateUserState(), 1500)
      } catch (e) { uni.hideLoading(); uni.showToast({ title: e.message || '签到失败', icon: 'none' }) }
    }

    function onPointDetail() { uni.navigateTo({ url: '/pages/point-detail/index' }) }
    function onCredits() { uni.navigateTo({ url: '/pages/credits/index' }) }
    function onVipCenter() {
      if (!isLoggedIn.value) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
      uni.navigateTo({ url: '/pages/vip/index' })
    }
    function onLobsterChat() { uni.navigateTo({ url: '/pages/ai-chat/index' }) }
    function onActivityCenter() {
      if (!isLoggedIn.value) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
      uni.navigateTo({ url: '/pages/activity/index' })
    }
    function onOpenMedalPopup() { if (!isLoggedIn.value) { uni.showToast({ title: '请先登录', icon: 'none' }); return }; showMedalPopup.value = true }
    function onCloseMedalPopup() { showMedalPopup.value = false }
    function onMedalTap(item) {
      if (!item.isAcquired) { uni.showToast({ title: '勋章尚未解锁', icon: 'none' }); return }
      const timeStr = item.acquireTime ? (() => {
        const d = new Date(item.acquireTime)
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      })() : '未知'
      uni.showModal({ title: item.medalName, content: `${item.medalMeaning}\n\n获得时间: ${timeStr}`, showCancel: false, confirmText: '知道了' })
    }
    function onVipBadgeTap() {
      const info = userInfo.value
      if (info && info.isVip && info.vipExpireTime) {
        const d = new Date(info.vipExpireTime)
        const expireStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        uni.showModal({ title: '会员信息', content: `您已是会员\n\n到期时间: ${expireStr}`, showCancel: false, confirmText: '知道了' })
      }
    }
    function onTopMedalTap() {
      if (topMedal.value) uni.showToast({ title: `累计中奖${topMedal.value.bonusDesc}`, icon: 'none', duration: 2000 })
    }
    function onEditProfile() {
      if (!isLoggedIn.value) { onLogin(); return }
      showNamePopup.value = true
      newUserName.value = userInfo.value?.userName || ''
    }
    function onCloseNamePopup() { showNamePopup.value = false }
    async function onConfirmUpdateName() {
      if (!newUserName.value.trim()) { uni.showToast({ title: '请输入用户名', icon: 'none' }); return }
      if (!isLoggedIn.value || !userInfo.value?.id) return
      updateNameLoading.value = true
      try {
        await userApi.updateUserName(userInfo.value.id, newUserName.value.trim())
        const latest = await userApi.getUserInfoById(userInfo.value.id)
        if (latest) userStore.updateLocalUserInfo(latest)
        uni.showToast({ title: '修改成功', icon: 'success' })
        showNamePopup.value = false
      } catch (e) { uni.showToast({ title: e.message || '修改失败', icon: 'none' }) }
      updateNameLoading.value = false
    }

    function onBindPhone() {
      if (userInfo.value?.phone) { uni.showToast({ title: '手机号已绑定', icon: 'none' }); return }
      showPhonePopup.value = true
      bindPhone.value = ''
      bindCode.value = ''
      bindCountdown.value = 0
    }
    function onClosePhonePopup() { showPhonePopup.value = false }
    function onSendBindCode() {
      if (bindCountdown.value > 0 || sendingBindCode.value) return
      if (!bindPhone.value || bindPhone.value.length !== 11) { uni.showToast({ title: '请输入正确的手机号', icon: 'none' }); return }
      sendingBindCode.value = true
      // TODO: 调用发送验证码API
      setTimeout(() => { sendingBindCode.value = false; bindCountdown.value = 60
        const timer = setInterval(() => { bindCountdown.value--; if (bindCountdown.value <= 0) clearInterval(timer) }, 1000)
      }, 500)
    }
    async function onConfirmBindPhone() {
      if (!bindPhone.value || !bindCode.value) { uni.showToast({ title: '请输入手机号和验证码', icon: 'none' }); return }
      bindLoading.value = true
      // TODO: 调用绑定手机号API
      setTimeout(() => { bindLoading.value = false; showPhonePopup.value = false
        uni.showToast({ title: '绑定成功', icon: 'success' })
        setTimeout(() => updateUserState(), 1500)
      }, 1000)
    }

    function onMenuTap(item) {
      if (item.action === 'agreement') uni.navigateTo({ url: '/pages/agreement/index?type=user' })
      else if (item.action === 'privacy') uni.navigateTo({ url: '/pages/agreement/index?type=privacy' })
      else if (item.action === 'about') uni.showModal({ title: '关于我们', content: 'AI足球智能体是一款专业的足球比赛分析工具。', showCancel: false })
    }

    function onClearCache() {
      uni.showModal({
        title: '清除缓存',
        content: '确定要清除所有缓存数据吗？',
        success: (res) => {
          if (res.confirm) {
            const token = uni.getStorageSync('token')
            const info = uni.getStorageSync('userInfo')
            uni.clearStorageSync()
            if (token) uni.setStorageSync('token', token)
            if (info) uni.setStorageSync('userInfo', info)
            uni.showToast({ title: '缓存已清除', icon: 'success' })
          }
        }
      })
    }

    return {
      userInfo, isLoggedIn, medals, wornMedals, acquiredMedals, topMedal,
      acquiredCount, vipExpireTimeStr, showMedalPopup, showVipButton, showAIChat,
      showPhonePopup, showNamePopup, bindPhone, bindCode, bindCountdown,
      sendingBindCode, bindLoading, newUserName, updateNameLoading,
      version, menuList,
      onLogin, onLogout, onSign, onPointDetail, onCredits, onVipCenter,
      onLobsterChat, onActivityCenter, onOpenMedalPopup, onCloseMedalPopup,
      onMedalTap, onVipBadgeTap, onTopMedalTap, onEditProfile, onCloseNamePopup, onConfirmUpdateName,
      onBindPhone, onClosePhonePopup, onSendBindCode, onConfirmBindPhone,
      onMenuTap, onClearCache
    }
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  width: 100%;
  background-color: #f5f5f5;
  position: relative;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* 用户信息区域 */
.user-section {
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  padding: 40rpx 24rpx 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.user-info,
.login-prompt {
  display: flex;
  align-items: center;
}

.user-info {
  position: relative;
  transition: all 0.3s ease;
}

.user-info:active {
  opacity: 0.8;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: #f0f0f0;
  margin-right: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  border: 4rpx solid #ffffff;
}

.avatar.default {
  opacity: 0.6;
}

.avatar-placeholder {
  background-color: #e8e8e8;
}

.avatar-text {
  font-size: 48rpx;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.name {
  font-size: 36rpx;
  font-weight: 500;
  color: #333;
}

/* VIP徽章 */
.vip-badge {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 14rpx 6rpx 10rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ffb347 50%, #ff8c00 100%);
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(255, 140, 0, 0.4);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.vip-badge::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: vipShine 2s infinite;
}

@keyframes vipShine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

.vip-diamond {
  width: 20rpx;
  height: 20rpx;
  position: relative;
  flex-shrink: 0;
}

.vip-diamond::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10rpx solid transparent;
  border-right: 10rpx solid transparent;
  border-bottom: 8rpx solid #fff;
}

.vip-diamond::after {
  content: '';
  position: absolute;
  top: 8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10rpx solid transparent;
  border-right: 10rpx solid transparent;
  border-top: 12rpx solid #fff;
}

.vip-label {
  font-size: 20rpx;
  color: #fff;
  font-weight: bold;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
}

.vip-expire {
  font-size: 22rpx;
  color: #ff8c00;
  display: block;
}

.rename-badge {
  display: flex;
  align-items: center;
  height: 36rpx;
  line-height: 36rpx;
  padding: 0 12rpx;
  background: linear-gradient(135deg, #FFF5EB 0%, #FFF0E0 100%);
  border: 2rpx solid #FFD4A8;
  border-radius: 18rpx;
  font-size: 20rpx;
  color: #CC5500;
  white-space: nowrap;
}

/* 最高等级勋章 */
.top-medal-wrapper {
  position: relative;
  flex-shrink: 0;
}

.top-medal-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: transparent;
}

.top-medal-icon {
  font-size: 26rpx;
  line-height: 1;
}

.top-medal-tooltip {
  position: absolute;
  top: 56rpx;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 20rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;
}

.top-medal-tooltip::before {
  content: '';
  position: absolute;
  top: -8rpx;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
  border-bottom: 8rpx solid rgba(0, 0, 0, 0.8);
}

.phone {
  font-size: 26rpx;
  color: #999;
}

.edit-arrow {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40rpx;
  color: #ccc;
  font-weight: 300;
}

/* 未登录状态 */
.login-text {
  font-size: 32rpx;
  color: #333;
}

.login-desc {
  font-size: 24rpx;
  color: #999;
}

.arrow {
  font-size: 36rpx;
  color: #ccc;
}

/* 卡片行 */
.cards-row {
  margin-top: 20rpx;
  display: flex;
  gap: 16rpx;
}

/* 积分卡片 */
.points-card {
  position: relative;
  flex: 1;
  padding: 24rpx 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.2);
  overflow: hidden;
  transition: all 0.3s ease;
}

.points-card:active {
  transform: translateY(2rpx);
  box-shadow: 0 6rpx 20rpx rgba(102, 126, 234, 0.3);
}

.points-bg-decoration {
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 120rpx;
  height: 120rpx;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
  border-radius: 50%;
}

.points-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.points-icon-wrapper {
  width: 56rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.points-icon {
  font-size: 28rpx;
}

.points-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.points-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.points-value {
  font-size: 40rpx;
  color: #ffffff;
  font-weight: 700;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1;
  text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
}

.points-arrow {
  position: absolute;
  right: 16rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 36rpx;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 300;
}

/* 签到卡片 */
.sign-card {
  position: relative;
  flex: 1;
  padding: 24rpx 20rpx;
  background: linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%);
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(255, 154, 86, 0.2);
  overflow: hidden;
  transition: all 0.3s;
}

.sign-card:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.sign-card.signed {
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
  box-shadow: 0 4rpx 16rpx rgba(127, 140, 141, 0.15);
}

.sign-card.signed:active {
  transform: none;
}

.sign-bg-decoration {
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 120rpx;
  height: 120rpx;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
  border-radius: 50%;
}

.sign-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.sign-icon-wrapper {
  width: 56rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sign-icon {
  font-size: 28rpx;
}

.sign-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.sign-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.sign-reward {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 700;
  text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
}

/* 龙虾 AI对话卡片 */
.lobster-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  margin: 0 24rpx 16rpx;
  background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
  border-radius: 16rpx;
  border: 1rpx solid #fde68a;
}

.lobster-card:active {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.lobster-card-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.lobster-icon-wrapper {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border-radius: 16rpx;
  font-size: 32rpx;
}

.lobster-card-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.lobster-card-title {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}

.lobster-card-desc {
  font-size: 22rpx;
  color: #ea580c;
  font-weight: 500;
}

.lobster-card-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.lobster-tag {
  font-size: 20rpx;
  color: #fff;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-weight: 600;
}

.lobster-card-arrow {
  font-size: 32rpx;
  color: #d97706;
}

/* 会员中心入口 */
.vip-entry-section {
  padding: 20rpx 20rpx;
  margin-bottom: 0;
}

.vip-entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(198, 40, 40, 0.25);
  transition: all 0.3s;
}

.vip-entry-card:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.vip-entry-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.vip-entry-icon-wrapper {
  width: 56rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vip-entry-diamond {
  width: 28rpx;
  height: 28rpx;
  position: relative;
}

.vip-entry-diamond::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 14rpx solid transparent;
  border-right: 14rpx solid transparent;
  border-bottom: 10rpx solid #fff;
}

.vip-entry-diamond::after {
  content: '';
  position: absolute;
  top: 10rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 14rpx solid transparent;
  border-right: 14rpx solid transparent;
  border-top: 18rpx solid #fff;
}

.vip-entry-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
}

.vip-entry-title {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
  display: block;
}

.vip-entry-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
}

.vip-entry-arrow {
  font-size: 36rpx;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 300;
}

/* 积分充值入口 */
.credits-entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.25);
  transition: all 0.3s;
  margin-top: 16rpx;
}

.credits-entry-card:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.credits-entry-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.credits-icon-box {
  width: 48rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.credits-icon {
  font-size: 24rpx;
}

.credits-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
}

.credits-title {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
  display: block;
}

.credits-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
}

.credits-entry-arrow {
  font-size: 36rpx;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 300;
}

/* 我的勋章入口 */
.medal-entry {
  margin-top: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  transition: all 0.3s;
}

.medal-entry:active {
  background: #f9f9f9;
}

.medal-entry-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.medal-entry-icon {
  font-size: 40rpx;
}

.medal-entry-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.medal-entry-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.medal-entry-desc {
  font-size: 24rpx;
  color: #999;
}

.medal-entry-preview {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 8rpx;
  margin-right: 12rpx;
}

.preview-medal {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  background: transparent;
}

.medal-entry-arrow {
  font-size: 36rpx;
  color: #ccc;
}

/* 任务中心 */
.task-section {
  margin-top: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.task-header {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.task-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.task-subtitle {
  font-size: 22rpx;
  color: #999;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: linear-gradient(135deg, #fff9e6 0%, #fff5d6 100%);
  border-radius: 12rpx;
  border: 1rpx solid #ffe58f;
}

.task-item:active {
  opacity: 0.9;
}

.task-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.task-icon-wrapper {
  width: 56rpx;
  height: 56rpx;
  background: #fff;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.task-icon {
  font-size: 28rpx;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.task-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.task-desc {
  font-size: 22rpx;
  color: #999;
}

.task-right {
  flex-shrink: 0;
}

.task-reward {
  font-size: 26rpx;
  color: #fa8c16;
  font-weight: 600;
  padding: 8rpx 20rpx;
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  border-radius: 20rpx;
}

/* 拼团活动 */
.activity-section {
  margin-top: 20rpx;
  background: transparent;
  border-radius: 0;
  padding: 0 24rpx;
}

.activity-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 28rpx;
  background: linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%);
  border-radius: 24rpx;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 8rpx 28rpx rgba(255, 154, 86, 0.3);
}

.activity-card:active {
  transform: translateY(-4rpx) scale(1.02);
  box-shadow: 0 16rpx 40rpx rgba(255, 154, 86, 0.4);
}

.activity-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
}

.activity-icon-wrapper {
  width: 72rpx;
  height: 72rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.activity-icon {
  font-size: 40rpx;
}

.activity-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.activity-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5rpx;
}

.activity-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
}

.activity-arrow {
  font-size: 40rpx;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 300;
  flex-shrink: 0;
}

/* 菜单区域 */
.menu-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  margin: 0 20rpx 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  width: 100%;
  box-sizing: border-box;
  background-color: transparent;
  text-align: left;
  font-size: inherit;
  line-height: inherit;
  margin: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  border-radius: 0;
}

.menu-item::after {
  border: none;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background-color: #f5f7fa;
}

.menu-item-logout {
  border-bottom: none;
}

.menu-item-logout:active {
  background-color: #fff5f5;
}

.menu-item-inner {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
}

.menu-icon-box {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  flex-shrink: 0;
}

.menu-icon-share { background: #e8f5e9; }
.menu-icon-contact { background: #e3f2fd; }
.menu-icon-agreement { background: #fff3e0; }
.menu-icon-privacy { background: #fce4ec; }
.menu-icon-about { background: #f3e5f5; }
.menu-icon-clear { background: #f5f5f5; }
.menu-icon-logout { background: #ffebee; }

.menu-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
}

.menu-title {
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 500;
}

.logout-title {
  color: #ff4d4f;
}

.menu-desc {
  font-size: 22rpx;
  color: #999;
}

.menu-arrow {
  font-size: 28rpx;
  color: #c0c0c0;
  flex-shrink: 0;
}

/* 版本信息 */
.version-section {
  padding: 40rpx;
  text-align: center;
}

.version-text {
  font-size: 24rpx;
  color: #ccc;
}

/* 弹窗样式 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-content {
  width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.popup-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #999;
}

.popup-body {
  padding: 32rpx;
}

.popup-tip {
  font-size: 26rpx;
  color: #666;
  text-align: center;
  margin-bottom: 32rpx;
}

.popup-tip .highlight {
  color: #fa8c16;
  font-weight: 600;
}

.input-group {
  display: flex;
  align-items: center;
  height: 88rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 0 20rpx;
  margin-bottom: 20rpx;
}

.input-prefix {
  font-size: 28rpx;
  color: #333;
  padding-right: 16rpx;
  border-right: 1rpx solid #e8e8e8;
  margin-right: 16rpx;
}

.input-field {
  flex: 1;
  height: 100%;
  font-size: 28rpx;
  color: #333;
}

.code-input {
  flex: 1;
}

.send-code-btn {
  flex-shrink: 0;
  padding: 12rpx 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #fff;
}

.send-code-btn.disabled {
  background: #e8e8e8;
  color: #999;
}

.popup-footer {
  display: flex;
  border-top: 1rpx solid #f5f5f5;
}

.popup-btn {
  flex: 1;
  padding: 28rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
}

.popup-btn.cancel {
  color: #666;
  border-right: 1rpx solid #f5f5f5;
}

.popup-btn.confirm {
  color: #667eea;
}

.popup-btn.confirm.loading {
  color: #999;
}

.popup-btn:active {
  background: #f9f9f9;
}

/* 勋章弹窗 */
.medal-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.medal-popup-container {
  width: 100%;
  height: 75vh;
  background: linear-gradient(180deg, #FFF5EB 0%, #ffffff 100%);
  border-radius: 40rpx 40rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.medal-popup-header {
  position: relative;
  padding: 32rpx 32rpx 24rpx;
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
}

.medal-popup-close {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  width: 56rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.close-icon {
  font-size: 36rpx;
  color: #fff;
  line-height: 1;
}

.medal-popup-title-area {
  text-align: center;
  margin-bottom: 24rpx;
}

.medal-popup-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.medal-stats-row {
  display: flex;
  justify-content: center;
  gap: 24rpx;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 32rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  min-width: 120rpx;
}

.stat-badge.acquired {
  background: rgba(82, 196, 26, 0.3);
}

.stat-badge.worn {
  background: rgba(255, 107, 107, 0.3);
}

.stat-badge-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.stat-badge-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4rpx;
}

.medal-popup-scroll {
  flex: 1;
  height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}

.medal-grid-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.medal-grid-item {
  position: relative;
  width: calc(50% - 12rpx);
  padding: 28rpx 20rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s;
  box-sizing: border-box;
  margin-bottom: 24rpx;
}

.medal-grid-item:active {
  transform: scale(0.97);
}

.medal-grid-item.locked {
  background: #f5f5f5;
}

.medal-icon-box {
  position: relative;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
  background: transparent;
}

.medal-icon-text {
  font-size: 64rpx;
  z-index: 1;
}

.medal-grid-item.locked .medal-icon-box {
  background: transparent !important;
}

.medal-grid-item.locked .medal-icon-text {
  filter: grayscale(100%);
  opacity: 0.3;
}

.medal-tag {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.medal-tag.worn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  color: #fff;
  font-weight: 500;
}

.medal-tag.lock {
  background: rgba(0, 0, 0, 0.06);
  font-size: 18rpx;
  padding: 4rpx 8rpx;
}

.medal-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 6rpx;
  text-align: center;
}

.medal-grid-item.locked .medal-name {
  color: #999;
}

.medal-desc {
  font-size: 22rpx;
  color: #888;
  text-align: center;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.medal-grid-item.locked .medal-desc {
  color: #bbb;
}

.medal-footer-tip {
  text-align: center;
  padding: 32rpx 0 calc(32rpx + env(safe-area-inset-bottom));
  color: #bbb;
  font-size: 24rpx;
}

.safe-area-bottom {
  height: env(safe-area-inset-bottom);
}
</style>
