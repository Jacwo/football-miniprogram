// pages/ai-chat/index.js - AI 对话页面（核心功能）
const streamApi = require('../../api/stream')
const userStore = require('../../store/user')
const agentApi = require('../../api/agent')
const matchApi = require('../../api/match')
const chatApi = require('../../api/chat')
const dateUtils = require('../../utils/date')

// 因素分组显示名映射
const GROUP_DISPLAY_MAP = {
  'BASIC': '基础信息',
  'HISTORY': '历史数据',
  'STATS': '统计数据',
  'INFO': '情报数据'
}

Page({
  data: {
    messages: [],
    inputText: '',
    sending: false,
    typing: false,
    scrollToView: '',
    keyboardHeight: 0,
    deepThinking: false,
    modelName: 'deepseek-v4-flash',
    // 比赛选择
    selectedMatch: null, // 当前选中的比赛
    showMatchPicker: false, // 比赛选择弹窗
    matchList: [], // 可选比赛列表
    matchLoading: false, // 比赛列表加载中
    // 智能体
    selectedAgent: null, // 当前选中的智能体
    showAgentPicker: false, // 智能体选择弹窗（从已有对话中重新选择智能体）
    agentList: [], // 智能体列表
    agentLoading: true, // 智能体列表加载中
    showAgentDetail: false, // 是否显示智能体详情弹窗
    agentDetail: null, // 当前查看的智能体详情
    agentDetailLoading: false, // 详情加载中
    factorGroups: [], // 因素分组列表
    // 新建智能体弹窗
    showCreateAgent: false,
    createAgentName: '',
    createAgentDesc: '',
    createAgentCopySystem: true,
    createAgentLoading: false,
    // 编辑智能体弹窗
    showEditAgent: false,
    editAgentName: '',
    editAgentDesc: '',
    editAgentLoading: false,
    // 新增/编辑因素抽屉
    showFactorDrawer: false,
    factorDrawerMode: 'add', // 'add' | 'edit'
    factorFormName: '',
    factorFormDesc: '',
    factorFormPrompt: '',
    editingFactorCode: null, // 编辑时的 factorCode
    savingFactor: false,
    savingFactorId: null,
    // 左侧栏
    showSidebar: false,
    sessionList: [], // 保留兼容旧逻辑
    sessionGroups: [], // [{ label: '今天', sessions: [...] }]
    sessionLoading: false,
    currentSessionId: null
  },

  // 流式请求控制器
  _streamController: null,

  onLoad(options) {
    // 如果从其他页面传来比赛参数，自动选中
    if (options.matchInfo) {
      try {
        const match = JSON.parse(decodeURIComponent(options.matchInfo))
        this.setData({ selectedMatch: match })
      } catch (e) {
        console.error('解析比赛信息失败:', e)
      }
    }

    // 加载比赛列表
    this.loadMatchList()

    // 加载智能体列表
    this.loadAgentList()

    // 加载历史消息
    this.loadMessages()

    // 监听键盘高度变化
    wx.onKeyboardHeightChange((res) => {
      this.setData({ keyboardHeight: res.height })
      this.scrollToBottom()
    })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }

    // 刷新智能体列表和比赛列表（如果已登录）
    const userInfo = userStore.getUserInfo()
    if (userInfo && userInfo.id) {
      this.loadAgentList()
      this.loadMatchList()
    }

    // 从插件市场返回后刷新智能体详情
    if (this._needRefreshAgentDetail && this.data.agentDetail && this.data.agentDetail.id) {
      this._needRefreshAgentDetail = false
      this.loadAgentDetail(this.data.agentDetail.id)
    }
  },

  onUnload() {
    // 停止流式请求
    this.abortStream()
    // 清理定时器
    if (this._appendTimer) {
      clearTimeout(this._appendTimer)
      this._appendTimer = null
    }
    if (this._scrollTimer) {
      clearTimeout(this._scrollTimer)
      this._scrollTimer = null
    }
    this._streamBuffer = null
    // 保存消息
    this.saveMessages()
  },

  // 加载智能体列表
  async loadAgentList() {
    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id) {
      this.setData({ agentLoading: false, agentList: [] })
      return
    }

    this.setData({ agentLoading: true })

    try {
      const list = await agentApi.getAgentList(userInfo.id)
      this.setData({
        agentList: list || [],
        agentLoading: false
      })
    } catch (e) {
      console.error('加载智能体列表失败:', e)
      this.setData({
        agentList: [],
        agentLoading: false
      })
    }
  },

  // 加载历史消息
  loadMessages() {
    try {
      const messages = wx.getStorageSync('ai-chat-messages') || []
      this.setData({ messages })

      if (messages.length > 0) {
        this.scrollToBottom()
      }
    } catch (e) {
      console.error('加载消息失败:', e)
    }
  },

  // 保存消息到本地
  saveMessages() {
    try {
      // 只保存最近 5 条消息
      const messages = this.data.messages.slice(-5)
      wx.setStorageSync('ai-chat-messages', messages)
    } catch (e) {
      console.error('保存消息失败:', e)
    }
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({ inputText: e.detail.value })
  },

  // 输入框聚焦 — 键盘弹起时滚动到底部
  onInputFocus() {
    // 延迟一下等键盘弹出
    setTimeout(() => {
      this.scrollToBottom()
    }, 300)
  },

  // 输入框失焦 — 键盘收起后 reset
  onInputBlur() {
    // 键盘收起后重置高度，回弹
    setTimeout(() => {
      if (!this.data.keyboardHeight) {
        this.scrollToBottom()
      }
    }, 150)
  },

  // 发送消息
  async onSend() {
    const { inputText, sending, messages, selectedMatch, selectedAgent, currentSessionId } = this.data

    if (sending || !inputText.trim()) return

    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }

    // 检查是否选择了比赛
    if (!selectedMatch) {
      wx.showToast({ title: '请先选择比赛', icon: 'none' })
      return
    }

    // 检查是否选择了智能体
    if (!selectedAgent) {
      wx.showToast({ title: '请先选择智能体', icon: 'none' })
      return
    }

    // 如果没有会话，先创建会话
    let sessionId = currentSessionId
    if (!sessionId) {
      try {
        const userInfo = userStore.getUserInfo()
        const session = await chatApi.createSession(selectedMatch.id, userInfo.id)
        sessionId = session.sessionId
        this.setData({ currentSessionId: sessionId })
      } catch (e) {
        console.error('创建会话失败:', e)
        wx.showToast({ title: '创建会话失败', icon: 'none' })
        return
      }
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    }

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      typing: true
    }

    // 更新 UI
    this.setData({
      messages: [...messages, userMessage, assistantMessage],
      inputText: '',
      sending: true,
      typing: true
    })

    this.scrollToBottom()

    // 开始流式请求
    this.startStream(userMessage.content, assistantMessage.id, sessionId)
  },

  // 开始流式请求
  startStream(message, messageId, sessionId) {
    const { deepThinking, selectedMatch, selectedAgent } = this.data
    const userInfo = userStore.getUserInfo()

    this._streamController = streamApi.smartStreamChat({
      message,
      deepThinking,
      userId: userInfo.id,
      agentId: selectedAgent.id,
      matchId: selectedMatch.id,
      sessionId,
      onMessage: (text) => {
        this.appendMessage(messageId, text)
      },
      onComplete: () => {
        this.finishMessage(messageId)
      },
      onError: (err) => {
        console.error('流式请求错误:', err)
        this.handleStreamError(messageId, err)
      }
    })
  },

  // 追加消息内容（缓冲区 + 批量 setData，避免高频刷屏导致渲染错乱）
  appendMessage(messageId, text) {
    // 累积到本地缓冲区，不在每个 token 上都 setData
    if (!this._streamBuffer) this._streamBuffer = {}
    if (!this._streamBuffer[messageId]) this._streamBuffer[messageId] = ''
    this._streamBuffer[messageId] += text

    // 已有定时器则无需重复创建（前端节流）
    if (this._appendTimer) return

    this._appendTimer = setTimeout(() => {
      this._flushAppendBuffer()
    }, 80)

    this.throttleScrollToBottom()
  },

  // 刷出缓冲区 — 原子化更新，不 mutate this.data
  _flushAppendBuffer() {
    this._appendTimer = null
    if (!this._streamBuffer) return

    const buffers = this._streamBuffer
    this._streamBuffer = {}

    const { messages } = this.data
    const updates = {}

    Object.keys(buffers).forEach(mid => {
      const delta = buffers[mid]
      if (!delta) return
      const index = messages.findIndex(m => m.id === mid)
      if (index !== -1) {
        // 从 data 取最新 content，安全拼接
        updates[`messages[${index}].content`] = (messages[index].content || '') + delta
      }
    })

    if (Object.keys(updates).length > 0) {
      // 同时触发 scroll-into-view，确保流式输出时自动追底
      updates.scrollToView = `msg-${messages.length - 1}`
      this.setData(updates)
    }
  },

  // 节流滚动到底部
  throttleScrollToBottom() {
    if (this._scrollTimer) return
    this._scrollTimer = setTimeout(() => {
      this.scrollToBottom()
      this._scrollTimer = null
    }, 150)
  },

  // 完成消息
  finishMessage(messageId) {
    // 先刷出缓冲区中的残留内容
    if (this._appendTimer) {
      clearTimeout(this._appendTimer)
      this._appendTimer = null
    }
    this._flushAppendBuffer()

    const { messages } = this.data
    const index = messages.findIndex(m => m.id === messageId)

    if (index !== -1) {
      this.setData({
        [`messages[${index}].typing`]: false,
        sending: false,
        typing: false
      })

      this.saveMessages()
      this.scrollToBottom()
    }
  },

  // 处理流式错误
  handleStreamError(messageId, err) {
    // 先刷出缓冲区残留内容
    this._flushAppendBuffer()

    const { messages } = this.data
    const index = messages.findIndex(m => m.id === messageId)

    if (index !== -1) {
      const errorText = messages[index].content || '抱歉，发生了一些错误，请稍后重试。'

      this.setData({
        [`messages[${index}].content`]: errorText,
        [`messages[${index}].typing`]: false,
        [`messages[${index}].error`]: true,
        sending: false,
        typing: false
      })
    }

    wx.showToast({
      title: err.message || '请求失败',
      icon: 'none'
    })
  },

  // 中止流式请求
  abortStream() {
    if (this._streamController) {
      this._streamController.abort()
      this._streamController = null
    }
  },

  // 停止生成
  onStopGenerate() {
    this.abortStream()

    // 刷出残留缓冲区
    this._flushAppendBuffer()

    const { messages } = this.data
    const lastIndex = messages.length - 1

    if (lastIndex >= 0 && messages[lastIndex].typing) {
      this.setData({
        [`messages[${lastIndex}].typing`]: false,
        sending: false,
        typing: false
      })

      this.saveMessages()
    }
  },

  // 选择快速问题
  onQuestionSelect(e) {
    const { question } = e.detail
    this.setData({ inputText: question })
    this.onSend()
  },

  // 选择智能体 - 查看详情
  async onAgentSelect(e) {
    const { agent } = e.currentTarget.dataset
    if (!agent) return

    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id) return

    this.setData({
      showAgentDetail: true,
      showAgentPicker: false,
      agentDetailLoading: true,
      agentDetail: null,
      factorGroups: []
    })

    try {
      const detail = await agentApi.getAgentDetail(userInfo.id, agent.id)
      // 按 factorGroup 分组
      const groupMap = {}
      const factorConfigs = detail.factorConfigs || []
      factorConfigs.forEach(item => {
        const group = item.factorGroup || '其他'
        if (!groupMap[group]) {
          groupMap[group] = {
            groupName: group,
            groupDisplayName: GROUP_DISPLAY_MAP[group] || group,
            items: []
          }
        }
        // 标记是否为自定义因素
        item.isCustom = item.factorGroup === 'CUSTOM'
        groupMap[group].items.push(item)
      })
      // 将 BASIC 组排在最前面
      const factorGroups = Object.values(groupMap).sort((a, b) => {
        if (a.groupName === 'BASIC') return -1
        if (b.groupName === 'BASIC') return 1
        return 0
      })

      this.setData({
        agentDetail: detail,
        factorGroups,
        agentDetailLoading: false
      })
    } catch (e) {
      console.error('加载智能体详情失败:', e)
      wx.showToast({ title: '加载详情失败', icon: 'none' })
      this.setData({
        showAgentDetail: false,
        agentDetailLoading: false
      })
    }
  },

  // 关闭智能体详情弹窗
  onCloseAgentDetail() {
    this.setData({
      showAgentDetail: false
    })
  },

  // 刷新智能体详情（批量引入后使用）
  async loadAgentDetail(agentId) {
    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id || !agentId) return

    try {
      const detail = await agentApi.getAgentDetail(userInfo.id, agentId)
      const groupMap = {}
      const factorConfigs = detail.factorConfigs || []
      factorConfigs.forEach(item => {
        const group = item.factorGroup || '其他'
        if (!groupMap[group]) {
          groupMap[group] = {
            groupName: group,
            groupDisplayName: GROUP_DISPLAY_MAP[group] || group,
            items: []
          }
        }
        item.isCustom = item.factorGroup === 'CUSTOM'
        groupMap[group].items.push(item)
      })
      const factorGroups = Object.values(groupMap).sort((a, b) => {
        if (a.groupName === 'BASIC') return -1
        if (b.groupName === 'BASIC') return 1
        return 0
      })

      this.setData({ agentDetail: detail, factorGroups })
    } catch (e) {
      console.error('刷新智能体详情失败:', e)
    }
  },

  // 阻止事件冒泡
  preventTap() {},

  // 显示新建智能体弹窗
  onShowCreateAgent() {
    this.setData({
      showCreateAgent: true,
      createAgentName: '',
      createAgentDesc: '',
      createAgentCopySystem: true,
      createAgentLoading: false
    })
  },

  // 关闭新建智能体弹窗
  onCloseCreateAgent() {
    this.setData({ showCreateAgent: false })
  },

  // 新建智能体 - 名称输入
  onCreateNameInput(e) {
    this.setData({ createAgentName: e.detail.value })
  },

  // 新建智能体 - 描述输入
  onCreateDescInput(e) {
    this.setData({ createAgentDesc: e.detail.value })
  },

  // 新建智能体 - 切换复制系统配置
  onToggleCopySystem() {
    this.setData({ createAgentCopySystem: !this.data.createAgentCopySystem })
  },

  // 提交新建智能体
  async onSubmitCreateAgent() {
    const { createAgentName, createAgentDesc, createAgentCopySystem, createAgentLoading } = this.data

    if (createAgentLoading) return

    const name = createAgentName.trim()
    if (!name) {
      wx.showToast({ title: '请输入智能体名称', icon: 'none' })
      return
    }

    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ createAgentLoading: true })

    try {
      await agentApi.createAgent({
        userId: userInfo.id,
        agentName: name,
        description: createAgentDesc.trim(),
        avatar: '',
        copySystemConfig: createAgentCopySystem
      })

      wx.showToast({ title: '创建成功', icon: 'success' })

      // 关闭弹窗并刷新列表
      this.setData({
        showCreateAgent: false,
        createAgentLoading: false
      })

      this.loadAgentList()
    } catch (e) {
      console.error('创建智能体失败:', e)
      wx.showToast({ title: e.message || '创建失败', icon: 'none' })
      this.setData({ createAgentLoading: false })
    }
  },

  // ========== 编辑智能体 ==========

  // 显示编辑智能体弹窗
  onShowEditAgent() {
    const { agentDetail } = this.data
    if (!agentDetail) return

    this.setData({
      showEditAgent: true,
      editAgentName: agentDetail.agentName || '',
      editAgentDesc: agentDetail.description || '',
      editAgentLoading: false
    })
  },

  // 关闭编辑智能体弹窗
  onCloseEditAgent() {
    this.setData({ showEditAgent: false })
  },

  // 编辑智能体 - 名称输入
  onEditNameInput(e) {
    this.setData({ editAgentName: e.detail.value })
  },

  // 编辑智能体 - 描述输入
  onEditDescInput(e) {
    this.setData({ editAgentDesc: e.detail.value })
  },

  // 提交编辑智能体
  async onSubmitEditAgent() {
    const { editAgentName, editAgentDesc, editAgentLoading, agentDetail } = this.data

    if (editAgentLoading || !agentDetail) return

    const name = editAgentName.trim()
    if (!name) {
      wx.showToast({ title: '请输入智能体名称', icon: 'none' })
      return
    }

    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ editAgentLoading: true })

    try {
      await agentApi.updateAgent({
        userId: userInfo.id,
        agentId: agentDetail.id,
        agentName: name,
        description: editAgentDesc.trim()
      })

      wx.showToast({ title: '更新成功', icon: 'success' })

      this.setData({
        showEditAgent: false,
        editAgentLoading: false
      })

      // 刷新详情和列表
      this.loadAgentList()
      this.onAgentSelect({
        currentTarget: { dataset: { agent: { id: agentDetail.id } } }
      })

      // 如果当前选中的是这个智能体，同步更新
      const { selectedAgent } = this.data
      if (selectedAgent && selectedAgent.id === agentDetail.id) {
        this.setData({
          selectedAgent: {
            ...selectedAgent,
            agentName: name,
            description: editAgentDesc.trim()
          }
        })
      }
    } catch (e) {
      console.error('更新智能体失败:', e)
      wx.showToast({ title: e.message || '更新失败', icon: 'none' })
      this.setData({ editAgentLoading: false })
    }
  },

  // 删除智能体
  onDeleteAgent() {
    const { agentDetail } = this.data
    if (!agentDetail) return

    wx.showModal({
      title: '确认删除',
      content: `确定要删除智能体「${agentDetail.agentName}」吗？此操作不可撤销。`,
      confirmColor: '#ef4444',
      success: async (res) => {
        if (!res.confirm) return

        const userInfo = userStore.getUserInfo()
        if (!userInfo || !userInfo.id) return

        try {
          await agentApi.deleteAgent({
            userId: userInfo.id,
            agentId: agentDetail.id
          })

          wx.showToast({ title: '删除成功', icon: 'success' })

          // 如果当前选中的是这个智能体，取消选中
          const { selectedAgent } = this.data
          if (selectedAgent && selectedAgent.id === agentDetail.id) {
            this.setData({ selectedAgent: null })
          }

          // 关闭详情弹窗，刷新列表
          this.setData({ showAgentDetail: false })
          this.loadAgentList()
        } catch (e) {
          console.error('删除智能体失败:', e)
          wx.showToast({ title: e.message || '删除失败', icon: 'none' })
        }
      }
    })
  },

  // 切换因素启用状态（非系统智能体）
  async onToggleFactorEnabled(e) {
    const { factorcode, groupindex, itemindex } = e.currentTarget.dataset
    const { agentDetail, factorGroups } = this.data
    if (!agentDetail || agentDetail.isSystem) return

    const factor = factorGroups[groupindex].items[itemindex]
    if (!factor) return

    // BASIC 组不允许禁用
    if (factor.factorGroup === 'BASIC') return

    // 乐观更新 UI
    const newEnabled = !factor.isEnabled
    this.setData({
      [`factorGroups[${groupindex}].items[${itemindex}].isEnabled`]: newEnabled,
      savingFactor: true,
      savingFactorId: factorcode
    })

    const userInfo = userStore.getUserInfo()
    try {
      await agentApi.saveFactor({
        userId: userInfo.id,
        agentId: agentDetail.id,
        factorCode: factorcode,
        isEnabled: newEnabled,
        weight: factor.weight || 1
      })
    } catch (e) {
      console.error('保存因素配置失败:', e)
      // 恢复原状态
      this.setData({
        [`factorGroups[${groupindex}].items[${itemindex}].isEnabled`]: !newEnabled
      })
      wx.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      this.setData({
        savingFactor: false,
        savingFactorId: null
      })
    }
  },

  // ========== 因素抽屉（新增/编辑） ==========
  // 显示添加因素抽屉
  onShowAddFactor() {
    this.setData({
      showFactorDrawer: true,
      factorDrawerMode: 'add',
      factorFormName: '',
      factorFormDesc: '',
      factorFormPrompt: '',
      editingFactorCode: null
    })
  },

  // 显示编辑因素抽屉
  onEditFactor(e) {
    const { factorcode, groupindex, itemindex } = e.currentTarget.dataset
    const { factorGroups } = this.data
    const factor = factorGroups[groupindex].items[itemindex]
    if (!factor) return

    this.setData({
      showFactorDrawer: true,
      factorDrawerMode: 'edit',
      factorFormName: factor.factorName || '',
      factorFormDesc: factor.description || '',
      factorFormPrompt: factor.promptTemplate || '',
      editingFactorCode: factorcode
    })
  },

  // 关闭因素抽屉
  onCloseFactorDrawer() {
    this.setData({ showFactorDrawer: false })
  },

  // ========== 因素插件市场 ==========
  // 打开插件市场页面
  onOpenPluginMarket() {
    const { agentDetail } = this.data
    if (!agentDetail || !agentDetail.id) {
      wx.showToast({ title: '请先选择智能体', icon: 'none' })
      return
    }

    this._needRefreshAgentDetail = true

    wx.navigateTo({
      url: `/pages/plugin-market/index?agentId=${agentDetail.id}`,
      events: {
        pluginsImported: (_data) => {
          // 引入成功后刷新智能体详情
          if (agentDetail.id) {
            this.loadAgentDetail(agentDetail.id)
          }
        }
      }
    })
  },

  // 抽屉表单项输入
  onFactorFormNameInput(e) {
    this.setData({ factorFormName: e.detail.value })
  },
  onFactorFormDescInput(e) {
    this.setData({ factorFormDesc: e.detail.value })
  },
  onFactorFormPromptInput(e) {
    this.setData({ factorFormPrompt: e.detail.value })
  },

  // 提交因素表单（新增 or 编辑）
  async onSubmitFactorForm() {
    const { factorFormName, factorFormDesc, factorFormPrompt, factorDrawerMode, editingFactorCode, agentDetail, savingFactor } = this.data
    if (savingFactor) return

    const name = factorFormName.trim()
    if (!name) {
      wx.showToast({ title: '请输入因素名称', icon: 'none' })
      return
    }

    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id) return

    this.setData({ savingFactor: true, savingFactorId: editingFactorCode || 'new' })

    try {
      if (factorDrawerMode === 'add') {
        await agentApi.createCustomFactor({
          userId: userInfo.id,
          agentId: agentDetail.id,
          factorName: name,
          description: factorFormDesc.trim(),
          promptTemplate: factorFormPrompt.trim()
        })
        wx.showToast({ title: '添加成功', icon: 'success' })
      } else {
        await agentApi.updateCustomFactor({
          userId: userInfo.id,
          factorCode: editingFactorCode,
          factorName: name,
          description: factorFormDesc.trim(),
          promptTemplate: factorFormPrompt.trim()
        })
        wx.showToast({ title: '更新成功', icon: 'success' })
      }

      // 关闭抽屉并刷新详情
      this.setData({ showFactorDrawer: false, savingFactor: false, savingFactorId: null })
      this.onAgentSelect({ currentTarget: { dataset: { agent: agentDetail } } })
    } catch (e) {
      console.error('因素操作失败:', e)
      wx.showToast({ title: e.message || '操作失败', icon: 'none' })
      this.setData({ savingFactor: false, savingFactorId: null })
    }
  },

  // 删除自定义因素
  onDeleteFactor(e) {
    const { factorcode, groupindex, itemindex } = e.currentTarget.dataset
    const { factorGroups, agentDetail } = this.data
    const factor = factorGroups[groupindex].items[itemindex]
    if (!factor) return

    wx.showModal({
      title: '确认删除',
      content: `确定要删除因素「${factor.factorName}」吗？此操作不可撤销。`,
      confirmColor: '#ef4444',
      success: async (res) => {
        if (!res.confirm) return

        const userInfo = userStore.getUserInfo()
        if (!userInfo || !userInfo.id) return

        this.setData({ savingFactor: true, savingFactorId: factorcode })

        try {
          await agentApi.deleteCustomFactor({
            userId: userInfo.id,
            factorCode: factorcode
          })

          wx.showToast({ title: '删除成功', icon: 'success' })

          this.setData({ savingFactor: false, savingFactorId: null })
          this.onAgentSelect({ currentTarget: { dataset: { agent: agentDetail } } })
        } catch (e) {
          console.error('删除因素失败:', e)
          wx.showToast({ title: e.message || '删除失败', icon: 'none' })
          this.setData({ savingFactor: false, savingFactorId: null })
        }
      }
    })
  },

  // 切换深度思考模式
  onToggleDeepThinking() {
    const { deepThinking } = this.data
    this.setData({ deepThinking: !deepThinking })

    wx.showToast({
      title: !deepThinking ? '已开启深度思考' : '已关闭深度思考',
      icon: 'none'
    })
  },

  // 加载比赛列表
  async loadMatchList() {
    this.setData({ matchLoading: true })
    try {
      const result = await matchApi.getTodayMatches()
      const list = result.list || result || []
      // 转换比赛数据为简洁格式
      const matchList = list.map(m => ({
        id: m.matchId || m.id,
        homeTeam: m.homeTeamAbbName || m.homeTeam,
        awayTeam: m.awayTeamAbbName || m.awayTeam,
        league: m.leagueAbbName || m.league,
        matchNumStr: m.matchNumStr,
        matchTime: m.matchTime,
        matchDate: m.matchDate
      }))
      this.setData({ matchList, matchLoading: false })
    } catch (e) {
      console.error('加载比赛列表失败:', e)
      this.setData({ matchLoading: false, matchList: [] })
    }
  },

  // 打开比赛选择弹窗
  onShowMatchPicker() {
    this.setData({ showMatchPicker: true })
    // 如果列表为空，重新加载
    if (this.data.matchList.length === 0) {
      this.loadMatchList()
    }
  },

  // 关闭比赛选择弹窗
  onCloseMatchPicker() {
    this.setData({ showMatchPicker: false })
  },

  // 选择比赛
  onSelectMatch(e) {
    const { match } = e.currentTarget.dataset
    this.setData({
      selectedMatch: match,
      showMatchPicker: false,
      // 清空之前的对话，切换比赛需要创建新会话
      messages: [],
      inputText: '',
      currentSessionId: null
    })
    wx.removeStorageSync('ai-chat-messages')
  },

  // 切换智能体 — 返回到智能体列表/显示底部弹窗
  onSwitchAgent() {
    const { selectedAgent, messages } = this.data

    // 如果已有选中的智能体，先取消选中
    if (selectedAgent) {
      this.setData({ selectedAgent: null })
    }

    // 有消息时显示底部弹窗选择智能体
    if (messages.length > 0) {
      // 如果智能体列表为空，先刷新
      if (this.data.agentList.length === 0) {
        this.loadAgentList().then(() => {
          this.setData({ showAgentPicker: true })
        })
      } else {
        this.setData({ showAgentPicker: true })
      }
    }
  },

  // 关闭智能体选择弹窗
  onCloseAgentPicker() {
    this.setData({ showAgentPicker: false })
  },

  // 重新选择智能体 — 点击已选智能体打开详情
  onReSelectAgent() {
    const { selectedAgent } = this.data
    if (!selectedAgent) return

    // 构造一个简化的 agent 对象传给 onAgentSelect
    this.onAgentSelect({
      currentTarget: {
        dataset: {
          agent: selectedAgent
        }
      }
    })
  },

  // 确认选择智能体（从详情弹窗中选中）
  onConfirmSelectAgent() {
    const { agentDetail } = this.data
    if (!agentDetail) return

    this.setData({
      selectedAgent: {
        id: agentDetail.id,
        agentName: agentDetail.agentName,
        avatar: agentDetail.avatar,
        isDefault: agentDetail.isDefault,
        isSystem: agentDetail.isSystem
      },
      showAgentDetail: false,
      showAgentPicker: false
    })
  },

  // 清空对话
  onClearChat() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有对话记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ messages: [], currentSessionId: null })
          wx.removeStorageSync('ai-chat-messages')

          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  // ========== 左侧栏：聊天记录 ==========

  // 切换左侧栏
  onToggleSidebar() {
    const show = !this.data.showSidebar
    this.setData({ showSidebar: show })

    if (show && this.data.sessionGroups.length === 0) {
      this.loadSessions()
    }
  },

  // 关闭左侧栏
  onCloseSidebar() {
    this.setData({ showSidebar: false })
  },

  // 加载会话列表
  async loadSessions() {
    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id) return

    this.setData({ sessionLoading: true })

    try {
      const list = await chatApi.getSessions(userInfo.id)

      // 格式化每个会话的时间并注入 timeDisplay
      const enhanced = (list || []).map(session => {
        let timeDisplay = ''
        if (session.lastChatTime) {
          try {
            const d = dateUtils.parseDate(session.lastChatTime)
            const hours = String(d.getHours()).padStart(2, '0')
            const minutes = String(d.getMinutes()).padStart(2, '0')
            timeDisplay = `${hours}:${minutes}`
          } catch {
            timeDisplay = ''
          }
        }
        return { ...session, timeDisplay }
      })

      // 分组：今天 / 昨天 / MM-DD
      const groups = []
      const groupMap = {}

      enhanced.forEach(session => {
        const rawTime = session.lastChatTime
        let label

        if (rawTime && dateUtils.isToday(rawTime)) {
          label = '今天'
        } else if (rawTime && dateUtils.isYesterday(rawTime)) {
          label = '昨天'
        } else if (rawTime) {
          label = dateUtils.formatShortDateTime(rawTime).split(' ')[0] // MM-DD
        } else {
          label = '未知'
        }

        if (!groupMap[label]) {
          groupMap[label] = { label, sessions: [] }
          groups.push(groupMap[label])
        }
        groupMap[label].sessions.push(session)
      })

      this.setData({
        sessionList: enhanced,
        sessionGroups: groups,
        sessionLoading: false
      })
    } catch (e) {
      console.error('加载会话列表失败:', e)
      this.setData({
        sessionList: [],
        sessionGroups: [],
        sessionLoading: false
      })
    }
  },

  // 选择会话
  async onSelectSession(e) {
    const { session } = e.currentTarget.dataset
    if (!session) return

    const { currentSessionId } = this.data

    // 点击的是当前会话，不做处理
    if (currentSessionId === session.sessionId) {
      this.setData({ showSidebar: false })
      return
    }

    // 切换比赛上下文
    const matchContext = {
      id: session.matchId,
      homeTeam: session.matchName ? session.matchName.split(' vs ')[0] : '',
      awayTeam: session.matchName ? session.matchName.split(' vs ')[1] : '',
      league: session.leagueName || '',
      matchTime: session.matchTime || ''
    }

    // 恢复会话中使用的智能体
    const sessionAgent = session.agentId ? {
      id: session.agentId,
      agentName: session.agentName || ''
    } : null

    this.setData({
      currentSessionId: session.sessionId,
      showSidebar: false,
      selectedMatch: matchContext,
      selectedAgent: sessionAgent,
      messages: [],
      inputText: '',
      typing: false,
      sending: false
    })

    wx.removeStorageSync('ai-chat-messages')

    // 加载该会话的历史聊天记录
    try {
      const records = await chatApi.getSessionHistory(session.sessionId)
      if (records && records.length > 0) {
        // 按 messageIndex 排序
        const sorted = [...records].sort((a, b) => (a.messageIndex || 0) - (b.messageIndex || 0))
        // 转换为消息格式
        const messages = sorted.map((r, i) => ({
          id: `${session.sessionId}_${r.messageIndex || i}`,
          role: r.role === 'AI' ? 'assistant' : (r.role === 'USER' ? 'user' : 'assistant'),
          content: r.content || '',
          timestamp: ''
        }))
        this.setData({ messages })
        this.scrollToBottom()
      }
    } catch (e) {
      console.error('加载历史聊天记录失败:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      this.setData({
        scrollToView: `msg-${this.data.messages.length - 1}`
      })
    }, 100)
  },

  // 打字完成回调
  onTypingComplete() {
    this.setData({ typing: false })
  }
})
