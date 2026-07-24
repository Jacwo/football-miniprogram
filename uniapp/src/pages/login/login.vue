<template>
  <view class="login-page">
    <!-- Logo 区域 -->
    <view class="logo-section">
      <image class="logo-img" src="/static/images/logo.png" mode="aspectFit" />
      <text class="app-name">AI足球智能体</text>
      <text class="app-desc">智能 AI 分析，助你决策</text>
    </view>

    <!-- 登录表单 -->
    <view class="form-section">
      <!-- 登录方式切换 Tab -->
      <view class="login-tabs">
        <view
          class="tab-item"
          :class="{ active: loginMode === 'wx' }"
          @tap="onSwitchMode"
          data-mode="wx"
        >
          <text class="tab-text">微信登录</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: loginMode === 'phone' }"
          @tap="onSwitchMode"
          data-mode="phone"
        >
          <text class="tab-text">手机号登录</text>
        </view>
      </view>

      <!-- 微信登录模式 -->
      <block v-if="loginMode === 'wx'">
        <view class="wx-login-section">
          <text class="wx-login-tip">一键授权，无需填写手机号</text>
          <button
            class="wx-login-btn"
            :class="{ loading: wxLoading }"
            :disabled="wxLoading"
            @tap="onWxLogin"
          >
            <view class="wx-icon-wrapper">
              <text class="wx-icon-emoji">💬</text>
            </view>
            <text class="wx-btn-text">{{ wxLoading ? '登录中...' : '微信一键登录' }}</text>
          </button>
        </view>
      </block>

      <!-- 手机号登录模式 -->
      <block v-if="loginMode === 'phone'">
        <!-- 手机号 -->
        <view class="form-item">
          <view class="input-wrapper">
            <text class="input-prefix">+86</text>
            <input
              class="input"
              type="number"
              maxlength="11"
              placeholder="请输入手机号"
              placeholder-class="placeholder"
              :value="phone"
              @input="onPhoneInput"
            />
          </view>
        </view>

        <!-- 验证码 -->
        <view class="form-item">
          <view class="input-wrapper code-wrapper">
            <input
              class="input code-input"
              type="number"
              maxlength="6"
              placeholder="请输入验证码"
              placeholder-class="placeholder"
              :value="code"
              @input="onCodeInput"
            />
            <view
              class="send-code-btn"
              :class="{ disabled: countdown > 0 || sendingCode }"
              @tap="onSendCode"
            >
              <text class="send-code-text" v-if="countdown > 0">{{ countdown }}s</text>
              <text class="send-code-text" v-else-if="sendingCode">发送中...</text>
              <text class="send-code-text" v-else>获取验证码</text>
            </view>
          </view>
        </view>

        <!-- 登录按钮 -->
        <view class="login-btn-wrapper">
          <button
            class="login-btn"
            :class="{ loading: loading }"
            :disabled="loading"
            @tap="onLogin"
          >
            <text class="btn-text">{{ loading ? '登录中...' : '登录 / 注册' }}</text>
          </button>
        </view>
      </block>

      <!-- 协议勾选（两种模式共用） -->
      <view class="agreement-section">
        <checkbox-group @change="onAgreeChange">
          <label class="agreement-label">
            <checkbox value="agreed" :checked="agreed" color="#1890ff" />
            <text class="agreement-text">我已阅读并同意</text>
            <text class="link" @tap.stop="onViewAgreement">《用户协议》</text>
            <text class="agreement-text">和</text>
            <text class="link" @tap.stop="onViewPrivacy">《隐私政策》</text>
          </label>
        </checkbox-group>
      </view>
    </view>

    <!-- 底部提示 -->
    <view class="footer-section">
      <text class="footer-text">未注册用户登录后将自动创建账号</text>
    </view>
  </view>
</template>

<script>
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'

export default {
  setup() {
    const userStore = useUserStore()
    const loginMode = ref('wx')
    const phone = ref('')
    const code = ref('')
    const agreed = ref(false)
    const countdown = ref(0)
    const loading = ref(false)
    const sendingCode = ref(false)
    const wxLoading = ref(false)
    let countdownTimer = null
    let navigateTimer = null

    onLoad(() => {
      if (userStore.getIsLoggedIn) navigateBack()
    })

    onUnload(() => {
      if (countdownTimer) clearInterval(countdownTimer)
      if (navigateTimer) {
        clearTimeout(navigateTimer)
        navigateTimer = null
      }
    })

    function onSwitchMode(e) {
      const mode = e.currentTarget.dataset.mode
      if (mode !== loginMode.value) loginMode.value = mode
    }

    function onPhoneInput(e) { phone.value = e.detail.value }
    function onCodeInput(e) { code.value = e.detail.value }

    function onAgreeChange(e) {
      agreed.value = e.detail.value.length > 0
    }

    function validatePhone(phoneVal) {
      return /^1[3-9]\d{9}$/.test(phoneVal)
    }

    async function onSendCode() {
      if (sendingCode.value || countdown.value > 0) return
      if (!validatePhone(phone.value)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
        return
      }
      sendingCode.value = true
      try {
        const result = await userStore.sendSms(phone.value)
        if (result.success) {
          uni.showToast({ title: '验证码已发送', icon: 'success' })
          startCountdown()
        } else {
          uni.showToast({ title: result.message || '发送失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '发送失败', icon: 'none' })
      } finally {
        sendingCode.value = false
      }
    }

    function startCountdown() {
      countdown.value = 60
      countdownTimer = setInterval(() => {
        if (countdown.value <= 1) {
          clearInterval(countdownTimer)
          countdown.value = 0
        } else {
          countdown.value--
        }
      }, 1000)
    }

    async function onLogin() {
      if (!validatePhone(phone.value)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
        return
      }
      if (!code.value || code.value.length < 4) {
        uni.showToast({ title: '请输入验证码', icon: 'none' })
        return
      }
      if (!agreed.value) {
        uni.showToast({ title: '请先同意用户协议', icon: 'none' })
        return
      }
      loading.value = true
      try {
        const result = await userStore.login(phone.value, code.value)
        if (result.success) {
          uni.showToast({ title: '登录成功', icon: 'success' })
          navigateTimer = setTimeout(() => {
            const app = getApp()
            if (app?.globalData?.pendingAnalysisMatch) {
              uni.switchTab({ url: '/pages/index/index' })
            } else {
              navigateBack()
            }
          }, 1000)
        } else {
          uni.showToast({ title: result.message || '登录失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '登录失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    }

    async function onWxLogin() {
      if (!agreed.value) {
        uni.showToast({ title: '请先同意用户协议', icon: 'none' })
        return
      }
      wxLoading.value = true
      try {
        const profileRes = await new Promise((resolve) => {
          uni.getUserProfile
            ? uni.getUserProfile({
                desc: '用于完善用户资料',
                success: (r) => resolve(r.userInfo),
                fail: () => resolve({ nickName: '微信用户', avatarUrl: '', gender: 0 })
              })
            : resolve({ nickName: '微信用户', avatarUrl: '', gender: 0 })
        })
        const result = await userStore.wxLogin(profileRes)
        if (result.success) {
          uni.showToast({ title: '登录成功', icon: 'success' })
          navigateTimer = setTimeout(() => {
            const app = getApp()
            if (app?.globalData?.pendingAnalysisMatch) {
              uni.switchTab({ url: '/pages/index/index' })
            } else {
              navigateBack()
            }
          }, 1000)
        } else {
          uni.showToast({ title: result.message || '登录失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '登录失败', icon: 'none' })
      } finally {
        wxLoading.value = false
      }
    }

    function navigateBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    }

    function onViewAgreement() {
      uni.navigateTo({ url: '/pages/agreement/index?type=user' })
    }

    function onViewPrivacy() {
      uni.navigateTo({ url: '/pages/agreement/index?type=privacy' })
    }

    return {
      loginMode, phone, code, agreed, countdown, loading, sendingCode, wxLoading,
      onSwitchMode, onPhoneInput, onCodeInput, onAgreeChange,
      onSendCode, onLogin, onWxLogin, onViewAgreement, onViewPrivacy
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  padding: 0 48rpx;
}

/* ============ Logo 区域 ============ */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  padding-bottom: 80rpx;
}

.logo-img {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 24rpx;
}

.app-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 12rpx;
}

.app-desc {
  font-size: 28rpx;
  color: #999;
}

/* ============ 表单区域 ============ */
.form-section {
  flex: 1;
}

/* ============ 登录方式切换 Tab ============ */
.login-tabs {
  display: flex;
  background: #f5f7fa;
  border-radius: 40rpx;
  padding: 6rpx;
  margin-bottom: 40rpx;
}

.tab-item {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 36rpx;
  transition: all 0.25s ease;
}

.tab-item.active {
  background: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.tab-text {
  font-size: 28rpx;
  color: #999;
  font-weight: 500;
}

.tab-item.active .tab-text {
  color: #333;
  font-weight: 600;
}

/* ============ 手机号输入 ============ */
.form-item {
  margin-bottom: 32rpx;
}

.input-wrapper {
  display: flex;
  align-items: center;
  height: 100rpx;
  padding: 0 24rpx;
  background-color: #f5f7fa;
  border-radius: 16rpx;
  transition: background 0.2s;
}

.input-wrapper:focus-within {
  background-color: #eef2ff;
}

.input-prefix {
  font-size: 32rpx;
  color: #333;
  margin-right: 16rpx;
  padding-right: 16rpx;
  border-right: 2rpx solid #e8e8e8;
}

.input {
  flex: 1;
  height: 100%;
  font-size: 32rpx;
  color: #333;
}

.placeholder {
  color: #ccc;
}

.code-wrapper {
  justify-content: space-between;
}

.code-input {
  flex: 1;
}

/* ============ 发送验证码按钮 ============ */
.send-code-btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 28rpx;
  margin-left: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(79, 172, 254, 0.25);
}

.send-code-btn.disabled {
  background: #e8e8e8;
}

.send-code-text {
  font-size: 26rpx;
  color: #ffffff;
}

.send-code-btn.disabled .send-code-text {
  color: #999;
}

/* ============ 登录按钮 ============ */
.login-btn-wrapper {
  margin-top: 48rpx;
}

.login-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
  box-shadow: 0 10rpx 28rpx rgba(79, 172, 254, 0.35);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.login-btn::after {
  border: none;
}

.login-btn:active {
  transform: scale(0.97);
  box-shadow: 0 4rpx 14rpx rgba(79, 172, 254, 0.3);
}

.login-btn.loading {
  opacity: 0.75;
}

.btn-text {
  font-size: 34rpx;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 3rpx;
}

/* ============ 微信登录 ============ */
.wx-login-section {
  margin-top: 24rpx;
  position: relative;
}

.wx-login-tip {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #bbb;
  margin-bottom: 32rpx;
}

.wx-login-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
  box-shadow: 0 10rpx 28rpx rgba(7, 193, 96, 0.35);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

/* 微信按钮光泽扫过 */
.wx-login-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  transform: skewX(-20deg);
  animation: wxShine 3s infinite;
}

@keyframes wxShine {
  0% { left: -100%; }
  50%, 100% { left: 160%; }
}

.wx-login-btn::after {
  border: none;
}

.wx-login-btn:active {
  transform: scale(0.97);
  box-shadow: 0 4rpx 14rpx rgba(7, 193, 96, 0.3);
}

.wx-login-btn.loading {
  opacity: 0.75;
}

.wx-icon-wrapper {
  width: 56rpx;
  height: 56rpx;
  background: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  box-shadow: 0 3rpx 12rpx rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.wx-icon-emoji {
  font-size: 30rpx;
  line-height: 1;
}

.wx-btn-text {
  font-size: 34rpx;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 3rpx;
}

/* ============ 协议区域 ============ */
.agreement-section {
  margin-top: 36rpx;
  display: flex;
  justify-content: center;
}

.agreement-label {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.agreement-text {
  font-size: 24rpx;
  color: #999;
}

.link {
  font-size: 24rpx;
  color: #1890ff;
}

/* ============ 底部 ============ */
.footer-section {
  padding: 48rpx 0;
  text-align: center;
}

.footer-text {
  font-size: 24rpx;
  color: #ccc;
}
</style>
