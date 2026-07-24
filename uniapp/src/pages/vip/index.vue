<template>
  <view class="vip-page">
    <!-- 头部 -->
    <view class="vip-header">
      <view class="header-badge">👑 VIP会员</view>
      <view class="header-title">解锁更多精彩功能</view>
      <view class="header-desc">畅享比赛分析、情报查看、AI智能问答等特权</view>
      <view class="header-circles">
        <view class="circle c1"></view>
        <view class="circle c2"></view>
        <view class="circle c3"></view>
      </view>
    </view>

    <!-- 会员权益 -->
    <view class="section">
      <view class="section-title">会员权益</view>
      <view class="benefits-grid">
        <view class="benefit-card" v-for="item in benefits" :key="item.title">
          <view class="benefit-icon">{{ item.icon }}</view>
          <view class="benefit-title">{{ item.title }}</view>
          <view class="benefit-desc">{{ item.desc }}</view>
          <view class="benefit-badge" v-if="item.free">限时免费</view>
        </view>
      </view>
    </view>

    <!-- VIP状态卡片 -->
    <view class="status-card" v-if="userInfo?.vipExpireTime">
      <view class="status-icon-wrap">💎</view>
      <view class="status-info">
        <view class="status-title">VIP会员</view>
        <view class="status-expire">有效期至 {{ formatExpireTime(userInfo.vipExpireTime) }}</view>
      </view>
      <view class="status-renew" @click="onConfirmPurchase">续费</view>
    </view>

    <!-- 套餐加载 -->
    <view class="section">
      <view class="section-title">选择会员套餐</view>
      <view class="pkg-loading" v-if="pkgLoading">
        <view class="loading-spinner"></view>
        <text>加载套餐...</text>
      </view>
      <view class="pkg-list" v-else>
        <view
          class="pkg-card"
          :class="{ selected: selectedPkg?.id === pkg.id, popular: pkg.isPopular }"
          v-for="pkg in packages"
          :key="pkg.id"
          @click="selectedPkg = pkg"
        >
          <view class="ribbon" v-if="pkg.isPopular">推荐</view>
          <view class="pkg-type">{{ pkg.typeName }}</view>
          <view class="pkg-duration">{{ pkg.duration }}</view>
          <view class="pkg-price">
            <text class="price-symbol">¥</text>
            <text class="price-num">{{ pkg.price }}</text>
            <text class="price-unit">/{{ pkg.unit }}</text>
          </view>
          <view class="pkg-save" v-if="pkg.saveAmount">省¥{{ pkg.saveAmount }}</view>
          <view class="pkg-monthly" v-if="pkg.monthlyPrice">约¥{{ pkg.monthlyPrice }}/月</view>
        </view>
      </view>
    </view>

    <!-- 购买按钮 -->
    <view class="purchase-area" v-if="showPurchaseBtn">
      <view class="purchase-btn" @click="onConfirmPurchase" :class="{ disabled: !selectedPkg }">
        立即开通
      </view>
    </view>

    <!-- FAQ -->
    <view class="section">
      <view class="section-title">常见问题</view>
      <view class="faq-list">
        <view class="faq-item" v-for="(item, idx) in faqList" :key="idx">
          <view class="faq-q" @click="toggleFaq(idx)">
            <text class="faq-q-text">{{ item.q }}</text>
            <text class="faq-arrow" :class="{ open: faqOpen[idx] }">›</text>
          </view>
          <view class="faq-a" v-if="faqOpen[idx]">{{ item.a }}</view>
        </view>
      </view>
    </view>

    <view class="bottom-placeholder"></view>

    <!-- 支付方式弹窗 -->
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
        <view class="action-item" @click="showCreditsRecharge = true">
          <view class="action-icon">🎯</view>
          <view class="action-info">
            <view class="action-name">积分充值</view>
            <view class="action-desc">使用积分兑换VIP</view>
          </view>
        </view>
        <view class="action-item" @click="showCsPopup = true">
          <view class="action-icon">💬</view>
          <view class="action-info">
            <view class="action-name">客服充值</view>
            <view class="action-desc">联系客服开通</view>
          </view>
        </view>
        <view class="action-cancel" @click="showActionSheet = false">取消</view>
      </view>
    </view>

    <!-- 积分充值弹窗 -->
    <view class="credits-overlay" v-if="showCreditsRecharge" @click="showCreditsRecharge = false">
      <view class="credits-sheet" @click.stop>
        <view class="credits-title">积分充值兑换VIP</view>
        <view class="credits-list" v-if="creditPkgs.length > 0">
          <view
            class="credit-card"
            :class="{ active: selectedCreditPkg?.id === p.id }"
            v-for="p in creditPkgs"
            :key="p.id"
            @click="selectedCreditPkg = p"
          >
            <text class="credit-points">{{ p.points }}积分</text>
            <text class="credit-price">¥{{ p.price }}</text>
          </view>
        </view>
        <view class="credits-loading" v-else>
          <view class="loading-spinner"></view>
          <text>加载中...</text>
        </view>
        <view class="credits-actions">
          <view class="credits-btn cancel" @click="showCreditsRecharge = false">取消</view>
          <view class="credits-btn confirm" @click="onConfirmCreditsRecharge">确认充值</view>
        </view>
      </view>
    </view>

    <!-- 客服弹窗 -->
    <view class="cs-overlay" v-if="showCsPopup" @click="showCsPopup = false">
      <view class="cs-popup" @click.stop>
        <view class="cs-close" @click="showCsPopup = false">✕</view>
        <view class="cs-title">联系客服开通</view>
        <view class="cs-info">请扫描下方二维码联系客服开通VIP</view>
        <image class="cs-qrcode-img" src="https://ai-football.cn/me.png" mode="widthFix"></image>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as userApi from '@/api/user'
import * as skuApi from '@/api/sku'
import * as payApi from '@/api/pay'
import * as matchApi from '@/api/match'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const userInfo = ref(null)
const packages = ref([])
const pkgLoading = ref(true)
const selectedPkg = ref(null)
const showPurchaseBtn = ref(true)
const showActionSheet = ref(false)
const showCsPopup = ref(false)
const showCreditsRecharge = ref(false)
const creditPkgs = ref([])
const selectedCreditPkg = ref(null)
const faqOpen = ref({})

const benefits = [
  { icon: '⚽', title: '比赛数据', desc: '查看完整比赛数据', free: false },
  { icon: '📊', title: '赛事情报', desc: '深度情报分析', free: true },
  { icon: '🤖', title: 'AI分析', desc: '智能比赛预测', free: false },
  { icon: '🎯', title: '更多积分', desc: '每日积分加成', free: false },
  { icon: '💬', title: '专属客服', desc: '优先客服服务', free: false },
  { icon: '🧠', title: 'AI问答', desc: '无限次AI对话', free: true },
  { icon: '🔧', title: '自定义智能体', desc: '专属AI助手', free: false },
  { icon: '✨', title: '更多权益', desc: '持续更新中', free: false }
]

const faqList = [
  { q: 'VIP会员有什么权益？', a: 'VIP会员可享受比赛数据分析、AI智能预测、赛事情报查看、专属客服等多项特权。' },
  { q: '如何开通VIP？', a: '您可以通过微信支付或联系客服开通VIP会员，支持月卡和年卡两种套餐。' },
  { q: 'VIP到期后怎么办？', a: 'VIP到期后系统会保留您的数据，您可以随时续费恢复VIP特权。' }
]

const fallbackPackages = [
  { id: 1, typeName: '月卡', duration: '30天', price: 29.9, unit: '月', saveAmount: null, monthlyPrice: null, isPopular: false },
  { id: 2, typeName: '季度卡', duration: '90天', price: 79.9, unit: '季', saveAmount: 9.8, monthlyPrice: 26.6, isPopular: false },
  { id: 3, typeName: '年卡', duration: '365天', price: 199.9, unit: '年', saveAmount: 158.9, monthlyPrice: 16.7, isPopular: true }
]

onLoad(() => {
  loadUserInfo()
  loadSkuList()
  checkFeatures()
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
    const res = await skuApi.getSkuList({ category: 1 })
    const list = res.data || res || []
    if (list && list.length > 0) {
      packages.value = list.map(item => ({
        id: item.id,
        typeName: item.name || item.typeName,
        duration: item.duration || `${item.months || 1}个月`,
        price: item.price ? (item.price / 100) : 0,
        unit: item.unit || '月',
        saveAmount: item.saveAmount ? (item.saveAmount / 100) : null,
        monthlyPrice: item.monthlyPrice ? (item.monthlyPrice / 100) : null,
        isPopular: item.isPopular || item.popular || false
      }))
      if (!selectedPkg.value && packages.value.length > 0) {
        selectedPkg.value = packages.value.find(p => p.isPopular) || packages.value[0]
      }
    } else {
      packages.value = fallbackPackages
      selectedPkg.value = fallbackPackages.find(p => p.isPopular) || fallbackPackages[0]
    }
  } catch (e) {
    console.error('加载套餐失败:', e)
    packages.value = fallbackPackages
    selectedPkg.value = fallbackPackages.find(p => p.isPopular) || fallbackPackages[0]
  }
  pkgLoading.value = false
}

async function checkFeatures() {
  try {
    const res = await matchApi.checkFeatures()
    const data = res.data || res
    showPurchaseBtn.value = data?.showVipPurchase !== false
  } catch (e) {
    // 忽略
  }
}

function formatExpireTime(time) {
  if (!time) return ''
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toggleFaq(idx) {
  faqOpen.value = { ...faqOpen.value, [idx]: !faqOpen.value[idx] }
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

async function onConfirmCreditsRecharge() {
  if (!selectedCreditPkg.value) {
    uni.showToast({ title: '请选择积分套餐', icon: 'none' })
    return
  }
  showCreditsRecharge.value = false
  // 跳转到积分充值页
  uni.navigateTo({ url: '/pages/credits/index' })
}
</script>

<style scoped>
.vip-page {
  min-height: 100vh;
  background: #f5f7fa;
}

/* 头部 */
.vip-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  padding: 80rpx 32rpx 60rpx;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.header-circles {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.c1 { width: 400rpx; height: 400rpx; top: -100rpx; right: -100rpx; background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%); }
.c2 { width: 200rpx; height: 200rpx; bottom: -60rpx; left: -40rpx; }
.c3 { width: 120rpx; height: 120rpx; top: 40rpx; right: 60rpx; }

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #fff;
  padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10rpx);
  border-radius: 30rpx;
  margin-bottom: 20rpx;
}

.header-title {
  font-size: 48rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2rpx;
  margin-bottom: 12rpx;
  text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.header-desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

/* 权益 */
.section {
  margin: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
}

.benefit-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx 20rpx;
  position: relative;
  text-align: center;
}

.benefit-icon {
  font-size: 40rpx;
  margin-bottom: 12rpx;
}

.benefit-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 6rpx;
}

.benefit-desc {
  font-size: 22rpx;
  color: #999;
}

.benefit-badge {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  font-size: 18rpx;
  color: #52c41a;
  padding: 2rpx 10rpx;
  background: rgba(82, 196, 26, 0.1);
  border-radius: 6rpx;
}

/* VIP状态卡 */
.status-card {
  display: flex;
  align-items: center;
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ffb347 50%, #ff8c00 100%);
  border-radius: 16rpx;
  gap: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(255, 140, 0, 0.3);
}

.status-icon-wrap {
  font-size: 48rpx;
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
}

.status-expire {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.status-renew {
  padding: 12rpx 28rpx;
  background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  border-radius: 30rpx;
}

/* 套餐 */
.pkg-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 26rpx;
  gap: 16rpx;
}

.pkg-list {
  display: flex;
  gap: 20rpx;
}

.pkg-card {
  flex: 1;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 16rpx;
  position: relative;
  border: 3rpx solid transparent;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.pkg-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 6rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.pkg-card.selected {
  border-color: #667eea;
  box-shadow: 0 8rpx 32rpx rgba(102, 126, 234, 0.25);
}

.pkg-card.selected::before {
  opacity: 1;
}

.pkg-card.popular {
  transform: scale(1.05);
  border-color: #ff6a88;
  box-shadow: 0 12rpx 40rpx rgba(255, 106, 136, 0.2);
}

.pkg-card.popular::before {
  background: linear-gradient(90deg, #ff9a56 0%, #ff6a88 100%);
  opacity: 1;
}

.ribbon {
  position: absolute;
  top: 14rpx;
  right: -20rpx;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8c42 100%);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 32rpx;
  transform: rotate(45deg);
  font-weight: 600;
}

.pkg-type {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
  min-width: 120rpx;
}

.pkg-duration {
  font-size: 22rpx;
  color: #999;
  min-width: 80rpx;
}

.pkg-price {
  flex: 1;
  display: flex;
  align-items: baseline;
}

.price-symbol { font-size: 24rpx; color: #ff6b6b; }
.price-num { font-size: 44rpx; font-weight: 700; color: #ff6b6b; line-height: 1; }
.price-unit { font-size: 22rpx; color: #999; }

.pkg-save {
  font-size: 20rpx;
  color: #fff;
  background: #ff6b6b;
  padding: 4rpx 12rpx;
  border-radius: 10rpx;
  white-space: nowrap;
}

.pkg-monthly {
  font-size: 20rpx;
  color: #999;
  white-space: nowrap;
}

/* 购买按钮 */
.purchase-area {
  padding: 0 24rpx;
  margin-top: 40rpx;
  margin-bottom: 40rpx;
}

.purchase-btn {
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

.purchase-btn.disabled {
  opacity: 0.5;
}

/* FAQ */
.faq-list {
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
}

.faq-item {
  border-bottom: 1rpx solid #f5f5f5;
}

.faq-item:last-child { border-bottom: none; }

.faq-q {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 20rpx;
}

.faq-q-text {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.faq-arrow {
  font-size: 28rpx;
  color: #ccc;
  transition: transform 0.3s;
  transform: rotate(90deg);
}

.faq-arrow.open {
  transform: rotate(-90deg);
}

.faq-a {
  font-size: 24rpx;
  color: #999;
  padding: 0 20rpx 24rpx;
  line-height: 1.6;
}

.bottom-placeholder {
  height: calc(40rpx + env(safe-area-inset-bottom));
}

/* 弹窗通用 */
.loading-spinner {
  width: 40rpx; height: 40rpx;
  border: 3rpx solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-spinner.small { width: 24rpx; height: 24rpx; border-width: 2rpx; }

@keyframes spin { to { transform: rotate(360deg); } }

/* 支付方式弹窗 */
.action-overlay, .cs-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
}

.action-overlay { display: flex; align-items: flex-end; }
.cs-overlay { display: flex; align-items: center; justify-content: center; }

.action-sheet {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx 24rpx calc(30rpx + env(safe-area-inset-bottom));
}

.action-title, .pay-title, .cs-title {
  font-size: 30rpx; font-weight: 600; text-align: center;
  margin-bottom: 30rpx; color: #333;
}

.action-item {
  display: flex; align-items: center;
  padding: 24rpx 20rpx; gap: 24rpx;
  border-radius: 12rpx; background: #f8f9fc;
  margin-bottom: 16rpx;
}

.action-icon { width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; border-radius: 50%; background: #eee; }
.action-icon.wechat { background: #07c160; }
.action-name { font-size: 28rpx; font-weight: 600; color: #333; }
.action-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.action-cancel { text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #999; margin-top: 8rpx; }

/* 客服弹窗 */
.cs-popup {
  background: #fff; border-radius: 24rpx;
  padding: 50rpx 40rpx; width: 560rpx;
  position: relative; text-align: center;
}

.cs-close { position: absolute; top: 20rpx; right: 20rpx; width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #999; }

/* 积分充值弹窗 */
.credits-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); z-index: 250;
  display: flex; align-items: flex-end;
}

.credits-sheet {
  width: 100%; background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx 24rpx calc(30rpx + env(safe-area-inset-bottom));
}

.credits-title { font-size: 30rpx; font-weight: 600; text-align: center; margin-bottom: 24rpx; color: #333; }

.credits-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin-bottom: 28rpx; }

.credit-card {
  background: #f8f9fc; border-radius: 12rpx;
  padding: 24rpx 16rpx; text-align: center;
  border: 2rpx solid transparent; transition: all 0.2s;
}

.credit-card.active { border-color: #667eea; background: rgba(102, 126, 234, 0.04); }

.credit-points { display: block; font-size: 32rpx; font-weight: 700; color: #333; margin-bottom: 8rpx; }
.credit-price { font-size: 28rpx; color: #ff6b6b; font-weight: 600; }

.credits-loading { display: flex; flex-direction: column; align-items: center; padding: 60rpx 0; color: #999; gap: 16rpx; }

.credits-actions { display: flex; gap: 20rpx; }

.credits-btn {
  flex: 1; height: 80rpx; border-radius: 40rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 600;
}

.credits-btn.cancel { background: #f2f3f5; color: #666; }
.credits-btn.confirm { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }

/* 客服弹窗 */
.cs-info { font-size: 26rpx; color: #666; line-height: 1.6; margin-bottom: 24rpx; }

.cs-qrcode-img {
  width: 300rpx; margin: 0 auto; display: block;
  border-radius: 12rpx;
}
</style>
