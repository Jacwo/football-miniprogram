// pages/user-schemes/index.js
const matchApi = require('../../api/match')
const userStore = require('../../store/user')

Page({
  data: {
    userId: '',
    userName: '',
    userAvatar: '',
    loading: true,
    error: null,
    schemes: [],
    filteredSchemes: [],
    // 统计数据
    stats: {
      totalRecords: 0,
      winRecords: 0,
      loseRecords: 0,
      pendingRecords: 0,
      totalBonus: 0,
      totalBonusStr: '0.00',
      winRate: 0,
    },
    // 筛选状态
    statusFilter: '', // '', 'won', 'lost', 'pending'
  },

  onLoad(options) {
    const { userId, userName, userAvatar } = options
    this.setData({
      userId: userId || '',
      userName: userName ? decodeURIComponent(userName) : '未知用户',
      userAvatar: userAvatar ? decodeURIComponent(userAvatar) : '',
    })
    wx.setNavigationBarTitle({
      title: this.data.userName + '的推单',
    })
    this.loadSchemes()
  },

  async loadSchemes() {
    this.setData({ loading: true, error: null })
    try {
      const res = await matchApi.getCalculatorRecommendList()
      const rawRecords = res.data || res || []

      // 筛选当前用户的方案
      const userRecords = rawRecords.filter(
        (item) => String(item.userId) === String(this.data.userId)
      )

      // 处理方案数据，计算中奖金额
      const schemes = userRecords.map((item) => {
        // 优先用后端返回的 actualBonus，没有则前端计算
        let bonus = parseFloat(item.actualBonus) || 0
        if (bonus === 0 && item.status === 1 && item.matchDetails) {
          bonus = this.calculateActualBonus(item)
        }

        const bets = item.totalBets || 1
        const multiple = item.multiple || 1
        const betAmount = (2 * bets * multiple).toFixed(2)

        return {
          ...item,
          matchCount: item.matchDetails ? item.matchDetails.length : 0,
          passTypesStr: this.formatPassTypes(item.passTypes),
          createTimeStr: this.formatTime(item.createTime),
          statusDesc: this.getStatusDesc(item.status),
          calculatedBonus: bonus,
          totalAmount: bonus > 0 ? bonus.toFixed(2) : '--',
          bets,
          betAmount,
        }
      })

      // 计算统计数据
      let winRecords = 0
      let loseRecords = 0
      let pendingRecords = 0
      let totalBonus = 0

      schemes.forEach((item) => {
        if (item.status === 1) {
          winRecords++
          totalBonus += item.calculatedBonus
        } else if (item.status === 2) {
          loseRecords++
        } else {
          pendingRecords++
        }
      })

      const totalRecords = schemes.length
      const finishedRecords = winRecords + loseRecords
      const winRate =
        finishedRecords > 0 ? Math.round((winRecords / finishedRecords) * 100) : 0

      this.setData({
        schemes,
        loading: false,
        stats: {
          totalRecords,
          winRecords,
          loseRecords,
          pendingRecords,
          totalBonus: Math.round(totalBonus * 100) / 100,
          totalBonusStr: totalBonus.toFixed(2),
          winRate,
        },
      })

      // 应用当前筛选条件
      this.applyFilter()
    } catch (error) {
      console.error('加载用户方案失败:', error)
      this.setData({ loading: false, error: '加载失败，请重试' })
    }
  },

  // 计算实际中奖金额
  calculateActualBonus(record) {
    if (record.status !== 1) return 0
    if (!record.matchDetails || record.matchDetails.length === 0) return 0

    const multiple = record.multiple || 1
    const passTypes = record.passTypes || []
    const matchDetails = record.matchDetails

    const hitOptionsByMatch = {}
    const matchPlayTypes = {}
    const matchIds = []

    for (const match of matchDetails) {
      if (!match.options) continue
      const matchId = String(match.matchId)
      matchIds.push(matchId)
      hitOptionsByMatch[matchId] = {}
      matchPlayTypes[matchId] = {}

      for (const opt of match.options || []) {
        const isHit = opt.isHit === 1 || opt.isHit === true
        const checked = opt.checked !== false
        if (!checked) continue

        const playType = opt.optionType
        if (!matchPlayTypes[matchId][playType]) {
          matchPlayTypes[matchId][playType] = []
        }
        matchPlayTypes[matchId][playType].push({
          value: opt.optionValue,
          odds: opt.odds || 1,
          isHit: isHit,
        })

        if (checked && isHit) {
          hitOptionsByMatch[matchId][playType] = {
            value: opt.optionValue,
            odds: opt.odds || 1,
          }
        }
      }
    }

    const playTypePaths = this.generatePlayTypePaths(matchIds, matchPlayTypes)
    let totalBonus = 0

    for (const passType of passTypes) {
      if (passType === 'single') {
        for (const matchId of matchIds) {
          const hitOptions = hitOptionsByMatch[matchId] || {}
          for (const playType of Object.keys(hitOptions)) {
            const hitOdds = hitOptions[playType].odds
            totalBonus += 2 * hitOdds * multiple
          }
        }
      } else {
        const [m] = passType.split('_').map(Number)
        if (matchIds.length < m) continue

        const matchCombinations = this.getCombinations(matchIds, m)

        for (const path of playTypePaths) {
          for (const combo of matchCombinations) {
            let allHit = true
            let oddsProduct = 1

            for (const matchId of combo) {
              const playType = path[matchId]
              if (!playType) { allHit = false; break }

              const hitOptions = hitOptionsByMatch[matchId] || {}
              const hitForType = hitOptions[playType]
              if (!hitForType) { allHit = false; break }

              const selectedOptions = (matchPlayTypes[matchId] || {})[playType] || []
              const hitSelected = selectedOptions.find(opt => opt.isHit === true)
              if (!hitSelected) { allHit = false; break }

              oddsProduct *= hitSelected.odds
            }

            if (allHit) {
              totalBonus += 2 * oddsProduct * multiple
            }
          }
        }
      }
    }

    return totalBonus
  },

  // 生成玩法路径组合
  generatePlayTypePaths(matchIds, matchPlayTypes) {
    if (matchIds.length === 0) return [{}]

    const [firstMatchId, ...restMatchIds] = matchIds
    const firstPlayTypes = Object.keys(matchPlayTypes[firstMatchId] || {})

    if (firstPlayTypes.length === 0) {
      return this.generatePlayTypePaths(restMatchIds, matchPlayTypes)
    }

    const restPaths = this.generatePlayTypePaths(restMatchIds, matchPlayTypes)
    const result = []

    for (const playType of firstPlayTypes) {
      for (const restPath of restPaths) {
        result.push({ ...restPath, [firstMatchId]: playType })
      }
    }

    return result
  },

  // 获取组合
  getCombinations(arr, m) {
    if (m === 1) return arr.map(item => [item])
    if (m === arr.length) return [arr]

    const result = []
    for (let i = 0; i <= arr.length - m; i++) {
      const first = arr[i]
      const rest = arr.slice(i + 1)
      const subCombos = this.getCombinations(rest, m - 1)
      subCombos.forEach(combo => result.push([first, ...combo]))
    }
    return result
  },

  // 格式化时间
  formatTime(time) {
    if (!time) return ''
    const d = new Date(time)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${minute}`
  },

  // 格式化过关方式
  formatPassTypes(passTypes) {
    if (!passTypes || !Array.isArray(passTypes)) return ''
    const map = {
      single: '单关',
      '2_1': '2串1',
      '3_1': '3串1',
      '4_1': '4串1',
      '5_1': '5串1',
      '6_1': '6串1',
      '7_1': '7串1',
      '8_1': '8串1',
    }
    return passTypes.map((p) => map[p] || p).join('/')
  },

  // 获取状态描述
  getStatusDesc(status) {
    if (status === 1) return '已中奖'
    if (status === 2) return '未中奖'
    return '待开奖'
  },

  // 点击方案进入详情
  onRecordTap(e) {
    const record = e.currentTarget.dataset.record
    if (!record || !record.id) return

    if (!userStore.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }

    wx.navigateTo({
      url: `/pages/calculator-detail/index?id=${record.id}&from=hall`,
    })
  },

  // 切换筛选状态
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter
    const newFilter = filter === this.data.statusFilter ? '' : filter
    this.setData({ statusFilter: newFilter })
    this.applyFilter()
  },

  // 应用筛选
  applyFilter() {
    const { schemes, statusFilter } = this.data
    if (!statusFilter) {
      this.setData({ filteredSchemes: schemes })
      return
    }
    const filtered = schemes.filter((item) => {
      if (statusFilter === 'won') return item.status === 1
      if (statusFilter === 'lost') return item.status === 2
      // pending: status 不是已中奖也不是未中奖
      return item.status !== 1 && item.status !== 2
    })
    this.setData({ filteredSchemes: filtered })
  },

  // 重试
  onRetry() {
    this.loadSchemes()
  },

  // 分享
  onShareAppMessage() {
    const { userId, userName } = this.data
    return {
      title: `查看${userName}的推单方案`,
      path: `/pages/user-schemes/index?userId=${userId}&userName=${encodeURIComponent(userName)}`,
    }
  },
})
