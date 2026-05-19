// pages/credits/index.js
const userStore = require('../../store/user')
const userApi = require('../../api/user')
const skuApi = require('../../api/sku')
const payApi = require('../../api/pay')

Page({
  data: {
    packages: [],
    selectedPackage: null,
    userInfo: null,
    loading: false,
    isLoggedIn: false,
    showPayModal: false,
    qrcodeUrl: '',
    qrcodeImage: '',
    outTradeNo: '',
    payAmount: 0,
    payAmountYuan: '0.00',
    payTimer: null,
    currentOutTradeNo: '',
    checkingPay: false,
    credits: 0
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  onUnload() {
    this.stopPayPolling()
  },

  // 加载用户信息
  async loadUserInfo() {
    const isLoggedIn = userStore.isLoggedIn()
    let userInfo = userStore.getUserInfo()

    if (isLoggedIn && userInfo && userInfo.id) {
      try {
        const latestUserInfo = await userApi.getUserInfoById(userInfo.id)
        if (latestUserInfo) {
          wx.setStorageSync('userInfo', latestUserInfo)
          userInfo = latestUserInfo
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    }

    this.setData({
      isLoggedIn,
      userInfo,
      credits: userInfo?.credits || 0
    })
    this.loadSkuList()
  },

  // 加载积分商品列表
  async loadSkuList() {
    this.setData({ loading: true })
    try {
      const list = await skuApi.getSkuList({ category: 2, status: 1 })
      const packages = (list || []).map((item) => ({
        id: item.id,
        skuId: item.id,
        name: item.skuName || (item.validDays >= 500 ? '大礼包' : '积分包'),
        credits: item.validDays || 0,
        icon: item.validDays >= 500 ? '💎' : '💰',
        price: item.price ? (item.price / 100) : 0,
        originalPrice: item.originalPrice ? (item.originalPrice / 100) : 0,
        popular: item.popular || false,
        description: item.description || ''
      }))

      packages.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))

      this.setData({ packages, loading: false })

      const defaultSelected = packages.find(p => p.popular) || packages[0]
      if (defaultSelected) {
        this.setData({ selectedPackage: defaultSelected })
      }
    } catch (error) {
      console.error('加载积分商品列表失败:', error)
      this.setData({ loading: false })
      this.setData({
        packages: [
          { id: 1, skuId: 1, name: '积分包', credits: 100, icon: '💰', price: 30, originalPrice: 0, popular: false },
          { id: 2, skuId: 2, name: '大礼包', credits: 500, icon: '💎', price: 150, originalPrice: 0, popular: true }
        ]
      })
      this.setData({
        selectedPackage: { id: 2, skuId: 2, name: '大礼包', credits: 500, icon: '💎', price: 150, originalPrice: 0, popular: true }
      })
    }
  },

  // 选择套餐
  onSelectPackage(e) {
    const { id } = e.currentTarget.dataset
    if (id) {
      const selectedPackage = this.data.packages.find(p => p.id == id)
      this.setData({ selectedPackage })
    }
  },

  // 确认充值
  async onConfirmPurchase() {
    const { selectedPackage, isLoggedIn } = this.data

    if (!selectedPackage) {
      wx.showToast({ title: '请选择套餐', icon: 'none' })
      return
    }

    if (!isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => { wx.navigateTo({ url: '/pages/login/index' }) }, 1500)
      return
    }

    // 弹出选择框
    wx.showActionSheet({
      itemList: ['微信支付', '客服充值'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 微信支付
          this.doWechatPay()
        } else if (res.tapIndex === 1) {
          // 客服充值
          this.doCustomerService()
        }
      }
    })
  },

  // 微信支付
  async doWechatPay() {
    const { selectedPackage } = this.data

    wx.showLoading({ title: '正在创建订单...' })

    try {
      const res = await payApi.createWxNativePay({
        skuId: selectedPackage.skuId,
        amount: Math.round(selectedPackage.price * 100),
        attach: `积分充值-${selectedPackage.name}`,
        clientIp: '127.0.0.1',
        userId: this.data.userInfo.id
      })

      wx.hideLoading()

      if (res.codeUrl) {
        const payAmount = res.amount || Math.round(selectedPackage.price * 100)
        this.setData({
          showPayModal: true,
          qrcodeUrl: res.codeUrl,
          qrcodeImage: res.qrcodeImage || '',
          outTradeNo: res.outTradeNo || '',
          payAmount,
          payAmountYuan: (payAmount / 100).toFixed(2)
        })
        this.startPayPolling(res.outTradeNo)
      } else {
        wx.showToast({ title: '创建订单失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('创建订单失败:', error)
      wx.showToast({ title: error.message || '创建订单失败', icon: 'none' })
    }
  },

  // 客服充值
  doCustomerService() {
    this.setData({
      showCustomerModal: true
    })
  },

  // 关闭客服弹窗
  onCloseCustomerModal() {
    this.setData({
      showCustomerModal: false
    })
  },

  // 保存客服二维码到相册
  onSaveQrcode() {
    wx.showLoading({ title: '保存中...' })
    wx.downloadFile({
      url: 'https://ai-football.cn/me.png',
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading()
            wx.showToast({ title: '已保存到相册', icon: 'success' })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  },

  startPayPolling(outTradeNo) {
    this.setData({ currentOutTradeNo: outTradeNo, checkingPay: false })
  },

  stopPayPolling() {
    const { payTimer } = this.data
    if (payTimer) {
      clearInterval(payTimer)
      this.setData({ payTimer: null, checkingPay: false })
    }
  },

  // 手动检查支付状态
  onCheckPayStatus() {
    const { currentOutTradeNo, checkingPay } = this.data
    if (!currentOutTradeNo || checkingPay) return

    this.setData({ checkingPay: true })

    let count = 0
    const timer = setInterval(async () => {
      count++
      try {
        const orderApi = require('../../api/order')
        const res = await orderApi.getOrderStatus(currentOutTradeNo)
        const isPaid = res.paid === true || res.status === 1 || res.tradeState === 'SUCCESS'

        if (isPaid) {
          clearInterval(timer)
          this.setData({ checkingPay: false })
          wx.showModal({
            title: '支付成功',
            content: `恭喜您成功充值${this.data.selectedPackage.credits}积分！`,
            showCancel: false,
            success: () => {
              this.setData({ showPayModal: false, currentOutTradeNo: '', payAmountYuan: '0.00' })
              this.loadUserInfo()
            }
          })
        } else if (!res.paid || res.status === 0 || res.status === 2 || res.tradeState === 'NOTPAY' || res.tradeState === 'CLOSED' || res.tradeState === 'PAYERROR') {
          clearInterval(timer)
          this.setData({ checkingPay: false })
          wx.showModal({
            title: '支付失败',
            content: res.tradeStateDesc || '支付失败，请重试',
            showCancel: false
          })
        } else if (count >= 10) {
          clearInterval(timer)
          this.setData({ checkingPay: false })
          wx.showToast({ title: '暂未收到支付结果，请稍后重试', icon: 'none' })
        }
      } catch (error) {
        console.error('检查支付状态失败:', error)
        if (count >= 10) {
          clearInterval(timer)
          this.setData({ checkingPay: false })
        }
      }
    }, 2000)

    this.setData({ payTimer: timer })
  },

  // 关闭支付弹窗
  onClosePayModal() {
    wx.showModal({
      title: '确认关闭',
      content: '支付尚未完成，关闭后将保留订单，是否继续？',
      success: (res) => {
        if (res.confirm) {
          this.stopPayPolling()
          this.setData({ showPayModal: false, currentOutTradeNo: '', payAmountYuan: '0.00' })
        }
      }
    })
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: 'AI足球分析助手 - 积分充值',
      path: '/pages/credits/index'
    }
  }
})
