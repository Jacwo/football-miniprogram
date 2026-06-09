// pages/ai-analysis/index.js - AI 分析结果页面
const { post } = require('../../api/index')
const streamApi = require('../../api/stream')
const userStore = require('../../store/user')
const analysisApi = require('../../api/analysis')

Page({
  data: {
    matchId: null,
    matchInfo: null,
    loading: true,
    error: null,
    analysisResult: '', // 完整 Markdown 文本（流式时传给 typing-text，完成后传给 markdown-viewer）
    pointsPerAnalysis: 1, // 每次分析消耗积分
    isAdmin: false, // 是否是管理员
    isVip: false, // 是否是VIP
    generateTime: '', // 生成时间
    streaming: false // 是否正在流式获取
  },

  // 流式请求控制器
  _streamController: null,
  // 缓冲区：累积流式文本，避免高频 setData
  _streamBuffer: '',
  // 节流定时器
  _appendTimer: null,

  onLoad(options) {
    const { matchId, matchInfo } = options

    if (!matchId) {
      this.setData({ loading: false, error: '缺少比赛ID' })
      return
    }

    this.setData({ matchId })

    if (matchInfo) {
      try {
        const info = JSON.parse(decodeURIComponent(matchInfo))
        this.setData({ matchInfo: info })
        wx.setNavigationBarTitle({
          title: `${info.homeTeam} vs ${info.awayTeam}`
        })
      } catch (e) {
        console.error('解析比赛信息失败:', e)
      }
    }

    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      this.setData({ loading: false })
      wx.showModal({
        title: '请先登录',
        content: '使用AI分析功能需要先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({ url: '/pages/login/index' })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }

    // 检查管理员状态
    this.checkAdminStatus()

    // 直接加载分析（在match-card组件中已经检查和扣减积分）
    this.loadAnalysis(matchId)
  },

  onUnload() {
    // 停止流式请求
    this.abortStream()
    // 清理定时器
    if (this._appendTimer) {
      clearTimeout(this._appendTimer)
      this._appendTimer = null
    }
  },

  // 检查管理员状态和VIP状态
  checkAdminStatus() {
    const userInfo = userStore.getUserInfo()
    if (userInfo) {
      this.setData({
        isAdmin: userInfo.isAdmin === true,
        isVip: userInfo.isVip === true
      })
    }
  },

  async loadAnalysis(matchId) {

    this.setData({ loading: true, error: null })
   
    try {
      const result = await post(`/api/match/analysis/${matchId}`, {}, { showLoading: false })

      // 解析返回数据
      const analysisText = result.aiAnalysis || result.content || result.analysis || ''

      if (!analysisText) {
        this.setData({ loading: false, error: '暂无分析结果' })
        return
      }

      // 格式化生成时间
      let generateTime = ''
      if (result.timestamp) {
        generateTime = this.formatTimestamp(result.timestamp)
      }

      this.setData({
        loading: false,
        analysisResult: analysisText,
        generateTime
      })
    } catch (e) {
      console.error('加载分析失败:', e)
      this.setData({
        loading: false,
        error: e.message || '加载分析失败'
      })
    }
  },

  // 格式化时间戳
  formatTimestamp(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  onRetry() {
    const { matchId } = this.data
    if (matchId) {
      this.loadAnalysis(matchId)
    }
  },

  onCopy() {
    const { analysisResult } = this.data
    wx.setClipboardData({
      data: analysisResult,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  onDelete() {
    const { matchId, matchInfo } = this.data

    wx.showModal({
      title: '确认删除',
      content: matchInfo
        ? `确定要删除 ${matchInfo.homeTeam} vs ${matchInfo.awayTeam} 的分析结果吗？`
        : '确定要删除此分析结果吗？',
      confirmText: '删除',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            await analysisApi.deleteAnalysis(matchId)
            wx.hideLoading()

            wx.showToast({
              title: '删除成功',
              icon: 'success',
              duration: 2000
            })

            // 延迟返回上一页
            setTimeout(() => {
              wx.navigateBack()
            }, 1000)
          } catch (error) {
            wx.hideLoading()
            console.error('删除失败:', error)
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none',
              duration: 2000
            })
          }
        }
      }
    })
  },

  // 获取最新分析（流式接口）
  onGetLatestAnalysis() {
    const { isVip, matchId, streaming } = this.data

    // 非VIP不可用
    if (!isVip) {
      wx.showModal({
        title: '会员专属',
        content: '获取最新AI分析是VIP会员专属功能，开通会员即可使用',
        confirmText: '开通会员',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/vip/index' })
          }
        }
      })
      return
    }

    // 防止重复点击
    if (streaming) return

    this.setData({
      streaming: true,
      analysisResult: '',
      generateTime: '',
      error: null
    })

    // 清空缓冲区
    this._streamBuffer = ''
    if (this._appendTimer) {
      clearTimeout(this._appendTimer)
      this._appendTimer = null
    }

    // 调用流式接口
    this.startStreamAnalysis(matchId)
  },

  // 开始流式分析请求（参考 ai-chat 的实现模式）
  startStreamAnalysis(matchId) {
    const userInfo = userStore.getUserInfo()
    const userId = userInfo ? (userInfo.userId || userInfo.id || '') : ''

    this._streamController = streamApi.streamAnalysis({
      matchId,
      userId,
      onMessage: (text) => {
        this.appendStreamText(text)
      },
      onComplete: () => {
        this.finishStream()
      },
      onError: (err) => {
        this.handleStreamError(err)
      }
    })
  },

  // 追加流式文本（缓冲区 + 节流，由 typing-text 组件负责逐字打字机效果）
  appendStreamText(text) {
    this._streamBuffer += text
    if (this._appendTimer) return
    this._appendTimer = setTimeout(() => {
      this._flushStreamBuffer()
    }, 80)
  },

  // 刷出缓冲区：将累积的原始文本拼接到 analysisResult（typing-text 组件自动处理打字动画）
  _flushStreamBuffer() {
    this._appendTimer = null
    if (!this._streamBuffer) return

    const delta = this._streamBuffer
    this._streamBuffer = ''

    const newContent = (this.data.analysisResult || '') + delta
    this.setData({ analysisResult: newContent })
  },

  // 流式传输完成
  finishStream() {
    // 先刷出缓冲区中的残留内容
    if (this._appendTimer) {
      clearTimeout(this._appendTimer)
      this._appendTimer = null
    }
    this._flushStreamBuffer()

    // 防止重复调用
    if (!this.data.streaming) return

    const now = new Date()
    const generateTime = this.formatTimestamp(now.getTime())

    this._streamController = null

    // 切换到 Markdown 渲染模式：设 streaming=false，让 wxml 走 markdown-viewer 分支
    this.setData({
      streaming: false,
      generateTime: generateTime
    })

    if (this.data.analysisResult) {
      wx.showToast({
        title: '分析完成',
        icon: 'success'
      })
    }
  },

  // 处理流式错误
  handleStreamError(err) {
    // 先刷出缓冲区残留内容
    if (this._appendTimer) {
      clearTimeout(this._appendTimer)
      this._appendTimer = null
    }
    this._flushStreamBuffer()

    this._streamController = null

    console.error('流式请求失败:', err)
    this.setData({
      streaming: false,
      error: err.message || '获取分析失败，请重试'
    })
    wx.showToast({
      title: err.message || '获取失败',
      icon: 'error'
    })
  },

  // 停止生成（供外部调用，如页面卸载时）
  abortStream() {
    if (this._streamController) {
      this._streamController.abort()
      this._streamController = null
    }
    // 刷出残留缓冲区
    if (this._appendTimer) {
      clearTimeout(this._appendTimer)
      this._appendTimer = null
    }
    this._flushStreamBuffer()
  },

  onShareAppMessage() {
    const { matchInfo, matchId } = this.data
    return {
      title: matchInfo ? `${matchInfo.homeTeam} vs ${matchInfo.awayTeam} AI分析` : 'AI比赛分析',
      path: `/pages/ai-analysis/index?matchId=${matchId}`
    }
  }
})
