// pages/plugin-market/index.js - 因素插件市场
const agentApi = require('../../api/agent')
const userStore = require('../../store/user')

Page({
  data: {
    agentId: '',
    userId: '',
    plugins: [],
    filteredPlugins: [],
    searchKeyword: '',
    selectedCount: 0,
    allSelected: false,
    loading: true,
    importing: false
  },

  onLoad(options) {
    const { agentId } = options || {}
    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1200)
      return
    }
    if (!agentId) {
      wx.showToast({ title: '缺少智能体信息', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1200)
      return
    }

    this.setData({ userId: userInfo.id, agentId })
    this.fetchPlugins()
  },

  // 获取插件列表
  async fetchPlugins() {
    this.setData({ loading: true })

    try {
      const list = await agentApi.getPluginFactors()
      const plugins = (list || []).map(item => ({ ...item, selected: false }))
      this.setData({
        plugins,
        filteredPlugins: plugins,
        loading: false,
        selectedCount: 0,
        allSelected: false
      })
    } catch (e) {
      console.error('加载插件因素失败:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 搜索
  onSearchInput(e) {
    const keyword = (e.detail.value || '').trim()
    this.setData({ searchKeyword: keyword })
    this.filterPlugins(keyword)
  },

  onClearSearch() {
    this.setData({ searchKeyword: '' })
    this.filterPlugins('')
  },

  // 过滤插件
  filterPlugins(keyword) {
    const { plugins } = this.data
    if (!keyword) {
      this.setData({ filteredPlugins: plugins })
      return
    }

    const kw = keyword.toLowerCase()
    const filtered = plugins.filter(item => {
      return (item.factorName && item.factorName.toLowerCase().includes(kw)) ||
             (item.description && item.description.toLowerCase().includes(kw)) ||
             (item.factorCode && item.factorCode.toLowerCase().includes(kw)) ||
             (item.category && item.category.toLowerCase().includes(kw))
    })
    this.setData({ filteredPlugins: filtered })
  },

  // 切换选中
  onToggleSelect(e) {
    const { index } = e.currentTarget.dataset
    const item = this.data.filteredPlugins[index]
    if (!item) return

    const newVal = !item.selected
    const delta = newVal ? 1 : -1

    // 更新 filteredPlugins 中的选中状态
    this.setData({
      [`filteredPlugins[${index}].selected`]: newVal,
      selectedCount: this.data.selectedCount + delta
    })

    // 同步回 plugins 数组
    const plugins = this.data.plugins
    const realIndex = plugins.findIndex(p => p.factorCode === item.factorCode)
    if (realIndex >= 0) {
      this.setData({
        [`plugins[${realIndex}].selected`]: newVal
      })
    }

    // 检查全选状态
    const allSelected = this.data.filteredPlugins.length > 0 &&
      this.data.filteredPlugins.every(p => {
        // 取最新值
        if (p.factorCode === item.factorCode) return newVal
        return p.selected
      })
    this.setData({ allSelected })
  },

  // 全选/取消全选
  onToggleSelectAll() {
    const { filteredPlugins, allSelected } = this.data
    const newVal = !allSelected

    // 更新 filteredPlugins
    const updated = filteredPlugins.map(p => ({ ...p, selected: newVal }))
    const selectedCount = newVal ? updated.length : 0

    // 同步 plugins
    const plugins = this.data.plugins.map(p => {
      const fp = updated.find(u => u.factorCode === p.factorCode)
      if (fp) return { ...p, selected: newVal }
      return p
    })

    this.setData({
      filteredPlugins: updated,
      plugins,
      selectedCount,
      allSelected: newVal
    })
  },

  // 批量引入
  async onBatchImport() {
    const { plugins, selectedCount, importing, userId, agentId } = this.data
    if (importing || selectedCount === 0) return

    const selectedFactors = plugins.filter(f => f.selected)
    if (selectedFactors.length === 0) return

    this.setData({ importing: true })

    try {
      await agentApi.batchSaveFactors({
        userId,
        agentId,
        configs: selectedFactors.map(f => ({
          factorCode: f.factorCode,
          isEnabled: true,
          weight: 1
        }))
      })

      wx.showToast({ title: `已引入 ${selectedFactors.length} 个因素`, icon: 'success' })

      setTimeout(() => {
        // 通过 eventChannel 通知上一页刷新
        const eventChannel = this.getOpenerEventChannel()
        if (eventChannel) {
          eventChannel.emit('pluginsImported', { count: selectedFactors.length })
        }
        wx.navigateBack()
      }, 800)
    } catch (e) {
      console.error('批量引入因素失败:', e)
      wx.showToast({ title: '引入失败，请重试', icon: 'none' })
      this.setData({ importing: false })
    }
  }
})
