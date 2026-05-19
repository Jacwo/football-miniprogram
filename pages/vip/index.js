// pages/vip/index.js
const userStore = require('../../store/user')
const userApi = require('../../api/user')
const skuApi = require('../../api/sku')
const payApi = require('../../api/pay')

Page({
  data: {
    packages: [],
    selectedPackage: null,
    userInfo: null,
    isLoggedIn: false,
    faqOpen: [false, false, false],
    vipExpireTimeStr: '',
    showVipPurchase: true,
    loading: false,
    showPayModal: false,
    qrcodeUrl: '',
    qrcodeImage: '',
    outTradeNo: '',
    payAmount: 0,
    payTimer: null,
    currentOutTradeNo: '',
    checkingPay: false,
    isCreditsPay: false,
    credits: 0,
    showCreditsModal: false,
    creditsLoading: false,
    creditPackages: [],
    selectedCreditPackage: null,
    showCustomerModal: false
  },

  onLoad() {
    this.loadUserInfo()
    this.checkFeatures()
  },

  onShow() {
    this.loadUserInfo()
    this.checkFeatures()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  onUnload() {
    this.stopPayPolling()
  },

  async checkFeatures() {
    try {
      const matchApi = require('../../api/match')
      const result = await matchApi.checkFeatures()
      this.setData({ showVipPurchase: result === true })
    } catch (error) {
      console.error('检查功能开关失败:', error)
      this.setData({ showVipPurchase: false })
    }
  },

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

    let vipExpireTimeStr = ''
    if (userInfo && userInfo.isVip && userInfo.vipExpireTime) {
      vipExpireTimeStr = this.formatExpireTime(userInfo.vipExpireTime)
    }

    this.setData({
      isLoggedIn,
      userInfo,
      vipExpireTimeStr,
      credits: userInfo?.credits || 0
    })
    this.loadSkuList()
  },

  async loadSkuList() {
    this.setData({ loading: true })
    try {
      const list = await skuApi.getSkuList({ category: 1, status: 1 })
      const packages = (list || []).map((item) => ({
        id: item.id,
        skuId: item.id,
        name: item.skuName || (item.validDays >= 365 ? '年卡' : '月卡'),
        duration: item.validDays >= 365 ? 12 : 1,
        durationUnit: '个月',
        icon: item.validDays >= 365 ? '👑' : '💳',
        price: item.price ? (item.price / 100) : 0,
        originalPrice: item.originalPrice ? (item.originalPrice / 100) : 0,
        validDays: item.validDays || 30,
        popular: item.popular || item.validDays >= 365,
        description: item.description || '',
        benefits: item.benefits || []
      }))

      packages.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))

      this.setData({ packages, loading: false })

      const defaultSelected = packages.find(p => p.popular) || packages[0]
      if (defaultSelected) {
        this.setData({ selectedPackage: defaultSelected })
      }
    } catch (error) {
      console.error('加载SKU列表失败:', error)
      this.setData({ loading: false })
      this.setData({
        packages: [
          { id: 1, skuId: 1, name: '月卡', duration: 1, durationUnit: '个月', icon: '💳', price: 39, originalPrice: 69 },
          { id: 2, skuId: 2, name: '年卡', duration: 12, durationUnit: '个月', icon: '👑', price: 299, originalPrice: 599, popular: true }
        ]
      })
      this.setData({
        selectedPackage: { id: 2, skuId: 2, name: '年卡', duration: 12, durationUnit: '个月', icon: '👑', price: 299, originalPrice: 599, popular: true }
      })
    }
  },

  scrollToPackages() {
    wx.pageScrollTo({ selector: '.packages-section', duration: 300 })
  },

  onSelectPackage(e) {
    const { id } = e.currentTarget.dataset
    if (id) {
      const selectedPackage = this.data.packages.find(p => p.id == id)
      this.setData({ selectedPackage })
    }
  },

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
        attach: `VIP会员-${selectedPackage.name}`,
        clientIp: '127.0.0.1',
        userId: this.data.userInfo.id
      })

      wx.hideLoading()

      if (res.codeUrl) {
        this.setData({
          showPayModal: true,
          qrcodeUrl: res.codeUrl,
          qrcodeImage: res.qrcodeImage || '',
          outTradeNo: res.outTradeNo || '',
          payAmount: res.amount || Math.round(selectedPackage.price * 100)
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
    // 保存订单号，不再自动轮询
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

    // 开始轮询，最多10次
    let count = 0
    const timer = setInterval(async () => {
      count++
      try {
        const orderApi = require('../../api/order')
        const res = await orderApi.getOrderStatus(currentOutTradeNo)
        // 解析返回结果，判断支付是否成功
        const isPaid = res.paid === true || res.status === 1 || res.tradeState === 'SUCCESS'

        if (isPaid) {
          clearInterval(timer)
          this.setData({ checkingPay: false })
          // 显示支付详情
          let successContent = ''
          if (this.data.isCreditsPay) {
            successContent = `恭喜您成功充值${this.data.selectedCreditPackage.credits}积分！`
          } else {
            successContent = `恭喜您成功开通${this.data.selectedPackage.name}！`
          }
          wx.showModal({
            title: '支付成功',
            content: successContent,
            showCancel: false,
            success: () => {
              this.setData({ showPayModal: false, currentOutTradeNo: '', isCreditsPay: false })
              this.loadUserInfo()
            }
          })
        } else if (!res.paid || res.status === 0 || res.status === 2 || res.tradeState === 'NOTPAY' || res.tradeState === 'CLOSED' || res.tradeState === 'PAYERROR') {
          // 支付失败
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

  onPaySuccess() {
    this.stopPayPolling()
    this.setData({ showPayModal: false, currentOutTradeNo: '' })
    wx.showModal({
      title: '支付成功',
      content: `恭喜您成功开通${this.data.selectedPackage.name}！`,
      showCancel: false,
      success: () => { this.loadUserInfo() }
    })
  },

  onClosePayModal() {
    wx.showModal({
      title: '确认关闭',
      content: '支付尚未完成，关闭后将保留订单，是否继续？',
      success: (res) => {
        if (res.confirm) {
          this.stopPayPolling()
          this.setData({ showPayModal: false, currentOutTradeNo: '', isCreditsPay: false })
        }
      }
    })
  },

  formatExpireTime(timeStr) {
    if (!timeStr) return '未知'
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  toggleFaq(e) {
    const { index } = e.currentTarget.dataset
    const faqOpen = [...this.data.faqOpen]
    faqOpen[index] = !faqOpen[index]
    this.setData({ faqOpen })
  },

  onShareAppMessage() {
    return { title: 'AI足球智能体 - 开通会员享无限分析', path: '/pages/vip/index' }
  },

  // ========== 积分充值相关 ==========

  // 打开积分充值弹窗
  onOpenCredits() {
    this.setData({ showCreditsModal: true })
    this.loadCreditPackages()
  },

  // 关闭积分充值弹窗
  onCloseCreditsModal() {
    this.setData({ showCreditsModal: false, selectedCreditPackage: null })
  },

  // 加载积分套餐列表
  async loadCreditPackages() {
    if (this.data.creditPackages.length > 0) return

    this.setData({ creditsLoading: true })
    try {
      const list = await skuApi.getSkuList({ category: 2, status: 1 })
      const creditPackages = (list || []).map((item) => ({
        id: item.id,
        skuId: item.id,
        name: item.skuName || (item.credits >= 500 ? '大礼包' : '积分包'),
        credits: item.credits || 0,
        icon: item.credits >= 500 ? '💎' : '💰',
        price: item.price ? (item.price / 100) : 0,
        popular: item.popular || false
      }))

      creditPackages.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))

      this.setData({ creditPackages, creditsLoading: false })

      const defaultSelected = creditPackages.find(p => p.popular) || creditPackages[0]
      if (defaultSelected) {
        this.setData({ selectedCreditPackage: defaultSelected })
      }
    } catch (error) {
      console.error('加载积分套餐失败:', error)
      this.setData({ creditsLoading: false })
      this.setData({
        creditPackages: [
          { id: 1, skuId: 1, name: '积分包', credits: 100, icon: '💰', price: 30, popular: false },
          { id: 2, skuId: 2, name: '大礼包', credits: 500, icon: '💎', price: 150, popular: true }
        ]
      })
      this.setData({
        selectedCreditPackage: { id: 2, skuId: 2, name: '大礼包', credits: 500, icon: '💎', price: 150, popular: true }
      })
    }
  },

  // 选择积分套餐
  onSelectCreditPackage(e) {
    const { id } = e.currentTarget.dataset
    if (id) {
      const selectedCreditPackage = this.data.creditPackages.find(p => p.id == id)
      this.setData({ selectedCreditPackage })
    }
  },

  // 确认积分充值
  async onConfirmCreditsPurchase() {
    const { selectedCreditPackage, isLoggedIn } = this.data

    if (!selectedCreditPackage) {
      wx.showToast({ title: '请选择套餐', icon: 'none' })
      return
    }

    if (!isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => { wx.navigateTo({ url: '/pages/login/index' }) }, 1500)
      return
    }

    wx.showLoading({ title: '正在创建订单...' })

    try {
      const res = await payApi.createWxNativePay({
        skuId: selectedCreditPackage.skuId,
        amount: Math.round(selectedCreditPackage.price * 100),
        attach: `积分充值-${selectedCreditPackage.name}`,
        clientIp: '127.0.0.1',
        userId: this.data.userInfo.id
      })

      wx.hideLoading()

      if (res.codeUrl) {
        this.setData({
          showCreditsModal: false,
          showPayModal: true,
          isCreditsPay: true,
          qrcodeUrl: res.codeUrl,
          qrcodeImage: res.qrcodeImage || '',
          outTradeNo: res.outTradeNo || '',
          payAmount: res.amount || Math.round(selectedCreditPackage.price * 100)
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

  // 复制支付链接
  onCopyPayUrl(e) {
    const { text } = e.currentTarget.dataset
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制支付链接', icon: 'success' })
      }
    })
  }
})
