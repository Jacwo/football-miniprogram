<template>
  <view class="credits-page">
    <!-- 头部 -->
    <view class="header">
      <view class="header-content">
        <view class="header-top">
          <text class="header-title">积分充值</text>
          <view class="credits-balance" v-if="userInfo">
            <text class="balance-icon">💎</text>
            <text class="balance-value">{{ userInfo?.credits || userInfo?.points || 0 }}</text>
          </view>
        </view>
        <text class="header-desc">让您的分析更强大</text>
      </view>
    </view>

    <!-- 套餐选择 -->
    <view class="section">
      <view class="section-title">选择充值套餐</view>
      <view class="package-loading" v-if="pkgLoading">
        <view class="loading-spinner"></view>
        <text>加载套餐...</text>
      </view>
      <view class="package-list" v-else>
        <view
          class="package-card"
          :class="{ selected: selectedPkg?.id === pkg.id, popular: pkg.popular }"
          v-for="pkg in packages"
          :key="pkg.id"
          @click="onSelectPackage(pkg)"
        >
          <view class="popular-badge" v-if="pkg.popular">热销</view>
          <view class="pkg-points">{{ pkg.points }}</view>
          <view class="pkg-unit">积分</view>
          <view class="pkg-price">¥{{ pkg.price }}</view>
        </view>
      </view>
    </view>

    <!-- 积分用途 -->
    <view class="section">
      <view class="section-title">积分用途</view>
      <view class="usage-list">
        <view class="usage-item" v-for="item in usageList" :key="item.title">
          <view class="usage-icon">{{ item.icon }}</view>
          <view class="usage-info">
            <view class="usage-title">{{ item.title }}</view>
            <view class="usage-desc">{{ item.desc }}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 充值按钮 -->
    <view class="btn-area">
      <view class="recharge-btn" @click="onConfirmPurchase" :class="{ disabled: !selectedPkg }">
        立即充值
      </view>
    </view>
    <view class="bottom-placeholder"></view>

    <!-- 支付方式选择弹窗 -->
    <view class="action-overlay" v-if="showActionSheet" @click="showActionSheet = false">
      <view class="action-sheet" @click.stop>
        <view class="action-title">选择支付方式</view>
        <view class="action-item" @click="doWechatPay">
          <view class="action-icon wechat">💳</view>
          <view class="action-info">
            <view class="action-name">微信支付</view>
            <view class="action-desc">微信扫码支付</view>
          </view>
        </view>
        <view class="action-item" @click="doCustomerService">
          <view class="action-icon">💬</view>
          <view class="action-info">
            <view class="action-name">客服充值</view>
            <view class="action-desc">联系客服充值</view>
          </view>
        </view>
        <view class="action-cancel" @click="showActionSheet = false">取消</view>
      </view>
    </view>

    <!-- 客服充值弹窗 -->
    <view class="cs-overlay" v-if="showCsPopup" @click="showCsPopup = false">
      <view class="cs-popup" @click.stop>
        <view class="cs-close" @click="showCsPopup = false">✕</view>
        <view class="cs-title">联系客服充值</view>
        <view class="cs-info">
          <text>请扫描下方二维码联系客服</text>
          <text class="cs-pkg-info">充值套餐: {{ selectedPkg?.points }}积分 / ¥{{ selectedPkg?.price }}</text>
        </view>
        <image class="cs-qrcode-img" src="https://ai-football.cn/me.png" mode="widthFix"></image>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as userApi from '@/api/user'
import * as skuApi from '@/api/sku'
import * as payApi from '@/api/pay'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const userInfo = ref(null)
const packages = ref([])
const pkgLoading = ref(true)
const selectedPkg = ref(null)
const showActionSheet = ref(false)
const showCsPopup = ref(false)

const usageList = [
  { icon: '🤖', title: 'AI分析', desc: '消耗积分获取AI智能分析结果' },
  { icon: '📊', title: '赛事情报', desc: '查看比赛详细情报数据' },
  { icon: '💬', title: '客服咨询', desc: '积分消费相关问题咨询' }
]

// 降级套餐数据
const fallbackPackages = [
  { id: 1, points: 10, price: 1, popular: false },
  { id: 2, points: 50, price: 5, popular: false },
  { id: 3, points: 120, price: 10, popular: true },
  { id: 4, points: 200, price: 15, popular: false }
]

onLoad(() => {
  loadUserInfo()
  loadSkuList()
})

async function loadUserInfo() {
  try {
    if (userStore.userInfo) {
      userInfo.value = userStore.userInfo
    } else {
      const res = await userApi.getUserInfo()
      userInfo.value = res.data || res
    }
  } catch (e) {
    console.error('加载用户信息失败:', e)
  }
}

async function loadSkuList() {
  pkgLoading.value = true
  try {
    const res = await skuApi.getSkuList({ category: 2 })
    const list = res.data || res || []
    if (list && list.length > 0) {
      packages.value = list.map(item => ({
        id: item.id,
        points: item.points || item.credits,
        price: item.price ? (item.price / 100) : 0,
        popular: item.isPopular || item.popular || false
      }))
    } else {
      packages.value = fallbackPackages
    }
  } catch (e) {
    console.error('加载套餐失败:', e)
    packages.value = fallbackPackages
  }
  pkgLoading.value = false
}

function onSelectPackage(pkg) {
  selectedPkg.value = pkg
}

function onConfirmPurchase() {
  if (!selectedPkg.value) {
    uni.showToast({ title: '请选择套餐', icon: 'none' })
    return
  }
  showActionSheet.value = true
}

async function doWechatPay() {
  showActionSheet.value = false
  uni.showLoading({ title: '支付中...' })
  try {
    // 1. wx.login 获取 code
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({ success: resolve, fail: reject })
    })
    // 2. 创建 JSAPI 订单
    const res = await payApi.createWxJsapiPay({
      skuId: selectedPkg.value.id,
      amount: Math.round(selectedPkg.value.price * 100),
      code: loginRes.code,
      userId: userInfo.value?.id
    })
    const data = res.data || res
    // 3. 调起支付
    const payRes = await new Promise((resolve, reject) => {
      uni.requestPayment({
        timeStamp: data.timeStamp,
        nonceStr: data.nonceStr,
        package: data.packageValue || data.package,
        signType: data.signType || 'RSA',
        paySign: data.paySign,
        success: resolve,
        fail: reject
      })
    })
    uni.hideLoading()
    uni.showToast({ title: '支付成功', icon: 'success' })
    loadUserInfo()
    setTimeout(() => {
      if (userStore.fetchUserInfo) userStore.fetchUserInfo()
    }, 500)
  } catch (e) {
    uni.hideLoading()
    if (e.errMsg && e.errMsg.includes('cancel')) {
      uni.showToast({ title: '已取消支付', icon: 'none' })
    } else {
      console.error('支付失败:', e)
      uni.showToast({ title: e.message || '支付失败', icon: 'none' })
    }
  }
}

function doCustomerService() {
  showActionSheet.value = false
  showCsPopup.value = true
}

function onHideCsPopup() {
  showCsPopup.value = false
}
</script>

<style scoped>
.credits-page {
  min-height: 100vh;
  background: #f5f7fa;
}

/* 头部 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 24rpx 36rpx;
}

.header-content {
  position: relative;
  z-index: 1;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.header-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.credits-balance {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 30rpx;
  backdrop-filter: blur(10rpx);
}

.balance-icon {
  font-size: 24rpx;
}

.balance-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
}

.header-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 套餐区域 */
.section {
  margin: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.package-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 26rpx;
}

.package-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.package-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx 20rpx;
  text-align: center;
  position: relative;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.package-card.selected {
  border-color: #667eea;
  box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.25);
}

.package-card.popular {
  transform: scale(1.05);
}

.popular-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, #ff8c42 0%, #ff6b6b 100%);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 0 16rpx 0 12rpx;
  font-weight: 600;
}

.pkg-points {
  font-size: 48rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.pkg-unit {
  font-size: 24rpx;
  color: #999;
  margin: 6rpx 0 16rpx;
}

.pkg-price {
  font-size: 32rpx;
  font-weight: 700;
  color: #ff6b6b;
}

/* 积分用途 */
.usage-list {
  background: #fff;
  border-radius: 12rpx;
  padding: 12rpx;
}

.usage-item {
  display: flex;
  align-items: center;
  padding: 20rpx 16rpx;
  gap: 20rpx;
}

.usage-item + .usage-item {
  border-top: 1rpx solid #f5f5f5;
}

.usage-icon {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  background: #f8f9fc;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.usage-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.usage-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

/* 按钮 */
.btn-area {
  padding: 0 24rpx;
  margin-top: 40rpx;
}

.recharge-btn {
  height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}

.recharge-btn.disabled {
  opacity: 0.5;
}

.bottom-placeholder {
  height: calc(40rpx + env(safe-area-inset-bottom));
}

/* 支付方式弹窗 */
.action-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.action-sheet {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx 24rpx calc(30rpx + env(safe-area-inset-bottom));
}

.action-title {
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
  margin-bottom: 30rpx;
  color: #333;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 24rpx 20rpx;
  gap: 24rpx;
  border-radius: 12rpx;
  background: #f8f9fc;
  margin-bottom: 16rpx;
}

.action-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  border-radius: 50%;
  background: #eee;
}

.action-icon.wechat {
  background: #07c160;
}

.action-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.action-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.action-cancel {
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #999;
  margin-top: 8rpx;
}

/* 客服弹窗 */
.cs-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cs-popup {
  background: #fff;
  border-radius: 24rpx;
  padding: 50rpx 40rpx;
  width: 560rpx;
  position: relative;
  text-align: center;
}

.cs-close {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #999;
}

.cs-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 20rpx;
}

.cs-info {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 24rpx;
}

.cs-pkg-info {
  display: block;
  color: #667eea;
  font-weight: 600;
  margin-top: 8rpx;
}

.cs-qrcode-img {
  width: 400rpx;
  margin: 0 auto;
  display: block;
  border-radius: 12rpx;
}

/* 加载动画 */
.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-spinner.small {
  width: 24rpx;
  height: 24rpx;
  border-width: 2rpx;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
