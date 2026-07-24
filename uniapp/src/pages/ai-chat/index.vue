<template>
  <view class="page-ai-chat">
    <!-- 悬浮可拖动聊天记录按钮 -->
    <movable-area class="floating-btn-area">
      <movable-view class="floating-btn" direction="all" @tap="onToggleSidebar">
        <text class="chat-icon-emoji">☰</text>
      </movable-view>
    </movable-area>

    <!-- 左侧栏遮罩 -->
    <view :class="['sidebar-mask', showSidebar ? 'visible' : '']" @tap="onCloseSidebar"></view>

    <!-- 左侧栏面板 -->
    <view :class="['sidebar-panel', showSidebar ? 'open' : '']">
      <view class="sidebar-header">
        <text class="sidebar-title">聊天记录</text>
        <view class="sidebar-close" @tap="onCloseSidebar">
          <text class="sidebar-close-icon">×</text>
        </view>
      </view>
      <scroll-view class="sidebar-list" scroll-y :show-scrollbar="false">
        <view v-if="sessionGroups.length === 0" class="sidebar-empty">
          <text class="sidebar-empty-text">暂无聊天记录</text>
          <text class="sidebar-empty-desc">开始一场新的对话吧</text>
        </view>
        <view v-for="(group, gi) in sessionGroups" :key="gi">
          <text class="session-group-label">{{ group.label }}</text>
          <view
            v-for="session in group.sessions"
            :key="session.sessionId"
            :class="['session-item', currentSessionId === session.sessionId ? 'active' : '']"
            @tap="onSelectSession(session)"
            @longpress="onLongPressSession(session)"
          >
            <view class="session-row">
              <view class="session-info">
                <text v-if="session.leagueName" class="session-league-tag">{{ session.leagueName }}</text>
                <text class="session-name">{{ session.matchName || '未命名对话' }}</text>
              </view>
              <text class="session-time">{{ session.timeDisplay }}</text>
            </view>
            <text v-if="session.agentName" class="session-agent">{{ session.agentName }}</text>
            <view v-if="currentSessionId === session.sessionId" class="session-check">
              <text>✓</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      scroll-y
      class="chat-messages"
      :scroll-into-view="scrollToView"
      :scroll-with-animation="true"
    >
      <!-- 欢迎信息 -->
      <view v-if="messages.length === 0" class="welcome-section">
        <view class="welcome-icon">
          <image src="/static/images/logo.png" mode="aspectFit" class="ai-icon" />
        </view>
        <text class="welcome-title">AI足球智能体</text>
        <text class="welcome-desc">专业的足球赛事分析，为你提供比赛预测与策略建议</text>
      </view>

      <!-- 比赛 + 智能体选择区域（无消息时显示） -->
      <view v-if="messages.length === 0" class="setup-section">
        <view class="setup-step">
          <view class="setup-step-header">
            <view class="setup-step-num">1</view>
            <text class="setup-step-title">选择比赛</text>
          </view>
          <text class="setup-step-desc">选择一场想要分析的比赛</text>
          <view v-if="selectedMatch" class="setup-match-selected" @tap="onShowMatchPicker">
            <text class="setup-match-text">{{ selectedMatch.league }} {{ selectedMatch.homeTeam }} vs {{ selectedMatch.awayTeam }}</text>
            <text class="setup-match-sub">{{ selectedMatch.matchNumStr }}</text>
            <text class="setup-match-switch">点击切换 ›</text>
          </view>
          <view v-else class="setup-match-btn" @tap="onShowMatchPicker">
            <text class="setup-match-btn-icon">⚽</text>
            <text class="setup-match-btn-text">选择比赛</text>
          </view>
        </view>
        <view v-if="selectedMatch" class="setup-step">
          <view class="setup-step-header">
            <view class="setup-step-num">2</view>
            <text class="setup-step-title">选择智能体</text>
          </view>
          <text class="setup-step-desc">选择一个AI智能体来为你分析</text>
          <view v-if="selectedAgent" class="setup-agent-selected">
            <view class="setup-agent-back" @tap.stop="onSwitchAgent">
              <text class="setup-agent-back-icon">‹</text>
            </view>
            <text class="setup-agent-name">{{ selectedAgent.agentName }}</text>
            <view class="setup-agent-reselect" @tap.stop="onSwitchAgent">
              <text class="setup-agent-switch-tip">切换 ›</text>
            </view>
          </view>
          <view v-else class="agent-grid">
            <view
              v-for="agent in agentList"
              :key="agent.id"
              :class="['agent-card', agent.isDefault ? 'agent-default' : '']"
              @tap="onAgentSelectFromList(agent)"
            >
              <image class="agent-avatar" :src="agent.avatar || '/static/images/logo.png'" mode="aspectFill" />
              <view class="agent-info">
                <view class="agent-name-row">
                  <text class="agent-name">{{ agent.agentName }}</text>
                  <view v-if="agent.isDefault" class="agent-default-tag"><text>默认</text></view>
                </view>
                <text class="agent-desc">{{ agent.description || '暂无描述' }}</text>
              </view>
              <text class="agent-arrow">›</text>
            </view>
          </view>
          <view class="create-agent-btn" @tap="onShowCreateAgent">
            <text class="create-agent-icon">＋</text>
            <text class="create-agent-text">新建专属智能体</text>
          </view>
        </view>
      </view>

      <!-- 消息气泡 -->
      <view v-else>
        <message-bubble
          v-for="(msg, idx) in messages"
          :key="msg.id"
          :id="`msg-${idx}`"
          :type="msg.role"
          :content="msg.content"
          :typing="msg.typing"
          :show-avatar="true"
        />
        <view class="list-footer"></view>
      </view>
    </scroll-view>

    <!-- 快捷问题 -->
    <quick-questions
      v-if="messages.length === 0 && quickQuestions.length > 0"
      :questions="quickQuestions"
      @select="onQuestionSelect"
    />

    <!-- 输入区域 -->
    <view class="bottom-section">
      <!-- 紧凑信息栏 -->
      <view class="info-bar">
        <view class="info-bar-left" @tap="onShowMatchPicker">
          <text v-if="selectedMatch" class="info-bar-match">{{ selectedMatch.homeTeam }} vs {{ selectedMatch.awayTeam }}</text>
          <text v-else class="info-bar-match-empty">选择比赛</text>
          <text class="info-bar-arrow">▼</text>
        </view>
        <view class="info-bar-right">
          <view v-if="selectedAgent" class="info-bar-agent" @tap.stop="onSwitchAgent">
            <text class="info-bar-agent-text">{{ selectedAgent.agentName }}</text>
            <text class="info-bar-agent-switch">‹</text>
          </view>
          <view v-else-if="selectedMatch" class="info-bar-agent info-bar-agent-empty" @tap.stop="onSwitchAgent">
            <text class="info-bar-agent-text">选择智能体</text>
            <text class="info-bar-agent-switch">‹</text>
          </view>
          <view v-if="selectedAgent" class="info-bar-model">
            <text class="info-bar-model-text">{{ modelName }}</text>
          </view>
          <view class="info-bar-clear" @tap.stop="onClearChat">
            <text>清空</text>
          </view>
        </view>
      </view>

      <!-- 正在生成提示 -->
      <view v-if="typing" class="generating-tip">
        <text class="tip-text">AI 正在思考...</text>
        <view class="stop-btn" @tap="onStopGenerate">
          <text class="stop-text">停止</text>
        </view>
      </view>

      <!-- 输入框 -->
      <view class="input-wrapper">
        <input
          class="chat-input"
          :placeholder="selectedMatch ? (selectedAgent ? '输入你的问题...' : '请先选择智能体') : '请先选择比赛'"
          v-model="inputText"
          :disabled="sending || !selectedMatch || !selectedAgent"
          confirm-type="send"
          @confirm="onSend"
          @focus="onInputFocus"
          @blur="onInputBlur"
        />
        <view
          :class="['send-btn', inputText.trim() && !sending && selectedMatch && selectedAgent ? 'active' : '']"
          @tap="onSend"
        >
          <text class="send-icon">➤</text>
        </view>
      </view>
    </view>

    <!-- 比赛选择弹窗 -->
    <view v-if="showMatchPicker" class="popup-mask" @tap="onCloseMatchPicker">
      <view class="popup-sheet" @tap.stop>
        <view class="flex-between p-md border-bottom">
          <text class="text-bold">选择比赛</text>
          <text @tap="onCloseMatchPicker" class="text-primary">关闭</text>
        </view>
        <scroll-view scroll-y class="popup-list">
          <view v-if="matchLoading" class="flex-center p-xl"><text class="text-placeholder">加载中...</text></view>
          <view v-else v-for="m in matchList" :key="m.id" class="popup-item flex-between" :data-match="m" @tap="onSelectMatch">
            <text class="text-sm">{{ m.league }} {{ m.matchNumStr }}</text>
            <text class="text-sm text-bold">{{ m.homeTeam }} vs {{ m.awayTeam }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 智能体选择弹窗 -->
    <view v-if="showAgentPicker" class="popup-mask" @tap="onCloseAgentPicker">
      <view class="popup-sheet" @tap.stop>
        <view class="flex-between p-md border-bottom">
          <text class="text-bold">选择智能体</text>
          <text @tap="onCloseAgentPicker" class="text-primary">关闭</text>
        </view>
        <scroll-view scroll-y class="popup-list">
          <view v-for="agent in agentList" :key="agent.id" class="popup-item flex-between" :data-agent="agent" @tap="onAgentSelect">
            <text class="text-sm text-bold">{{ agent.agentName }}</text>
            <text class="text-xs text-placeholder">{{ agent.isDefault ? '默认' : '自定义' }}</text>
          </view>
          <view class="popup-item flex-center" @tap="onShowCreateAgent">
            <text class="text-primary">+ 创建新智能体</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 智能体详情弹窗 -->
    <view v-if="showAgentDetail" class="popup-mask" @tap="onCloseAgentDetail">
      <view class="popup-sheet popup-sheet--large" @tap.stop>
        <view class="flex-between p-md border-bottom">
          <text class="text-bold">{{ agentDetail?.agentName }}</text>
          <view class="flex-center">
            <view class="btn btn-sm btn-primary mr-sm" @tap="onConfirmSelectAgent">使用</view>
            <text @tap="onCloseAgentDetail" class="text-placeholder p-sm">✕</text>
          </view>
        </view>
        <scroll-view scroll-y class="popup-list">
          <view v-if="agentDetailLoading" class="flex-center p-xl"><text>加载中...</text></view>
          <view v-else-if="agentDetail">
            <view class="p-md">
              <text class="text-sm text-secondary">{{ agentDetail.description || '暂无描述' }}</text>
            </view>
            <view v-for="group in factorGroups" :key="group.groupName" class="p-md border-top">
              <text class="text-xs text-secondary">{{ group.groupDisplayName }}</text>
              <view v-for="item in group.items" :key="item.factorCode" class="factor-item flex-between mt-sm">
                <text class="text-sm">{{ item.factorName }}</text>
                <text class="text-xs" :class="item.isEnabled ? 'text-success' : 'text-placeholder'">
                  {{ item.isEnabled ? '启用' : '禁用' }}
                </text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import * as streamApi from '@/api/stream'
import * as agentApi from '@/api/agent'
import * as matchApi from '@/api/match'
import * as chatApi from '@/api/chat'
import * as quickQuestionApi from '@/api/quickQuestions'
import MessageBubble from '@/components/MessageBubble.vue'
import QuickQuestions from '@/components/QuickQuestions.vue'
import EmptyState from '@/components/EmptyState.vue'

export default {
  components: { MessageBubble, QuickQuestions, EmptyState },
  setup() {
    const userStore = useUserStore()
    const messages = ref([])
    const inputText = ref('')
    const sending = ref(false)
    const typing = ref(false)
    const scrollToView = ref('')
    const deepThinking = ref(false)
    const selectedMatch = ref(null)
    const showMatchPicker = ref(false)
    const matchList = ref([])
    const matchLoading = ref(false)
    const selectedAgent = ref(null)
    const showAgentPicker = ref(false)
    const agentList = ref([])
    const showAgentDetail = ref(false)
    const agentDetail = ref(null)
    const agentDetailLoading = ref(false)
    const factorGroups = ref([])
    const quickQuestions = ref([])
    const currentSessionId = ref(null)
    const showSidebar = ref(false)
    const sessionGroups = ref([])
    const modelName = ref('GPT-4')
    const agentInfoBarEmpty = ref(false)
    let streamController = null

    onLoad((options) => {
      if (options?.matchInfo) {
        try { selectedMatch.value = JSON.parse(decodeURIComponent(options.matchInfo)) } catch (e) {}
      }
      loadMatchList()
      loadAgentList()
      loadMessages()
    })

    onShow(() => {
      if (userStore.getIsLoggedIn) loadAgentList()
    })

    onUnload(() => { abortStream(); saveMessages() })

    async function loadMatchList() {
      matchLoading.value = true
      try {
        const result = await matchApi.getTodayMatches()
        const list = result?.list || result || []
        matchList.value = list.map(m => ({
          id: m.matchId || m.id,
          homeTeam: m.homeTeamAbbName || m.homeTeam,
          awayTeam: m.awayTeamAbbName || m.awayTeam,
          league: m.leagueAbbName || m.league,
          matchNumStr: m.matchNumStr
        }))
      } catch (e) {} finally { matchLoading.value = false }
    }

    async function loadAgentList() {
      if (!userStore.getUserInfo?.id) return
      try { agentList.value = await agentApi.getAgentList(userStore.getUserInfo.id) || [] } catch (e) { agentList.value = [] }
    }

    function loadMessages() {
      try { messages.value = uni.getStorageSync('ai-chat-messages') || [] } catch (e) {}
    }

    function saveMessages() {
      try { uni.setStorageSync('ai-chat-messages', messages.value.slice(-5)) } catch (e) {}
    }

    async function onSend() {
      if (sending.value || !inputText.value.trim()) return
      if (!userStore.checkLoginWithRedirect()) return
      if (!selectedMatch.value) { uni.showToast({ title: '请先选择比赛', icon: 'none' }); return }
      if (!selectedAgent.value) { uni.showToast({ title: '请先选择智能体', icon: 'none' }); return }

      const userInfo = userStore.getUserInfo
      if (!userInfo?.isVip) {
        uni.showModal({
          title: '会员专属功能',
          content: 'AI分析为VIP会员专属功能',
          confirmText: '开通会员',
          cancelText: '取消',
          success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pages/vip/index' }) }
        })
        return
      }

      let sessionId = currentSessionId.value
      if (!sessionId) {
        try {
          const session = await chatApi.createSession(selectedMatch.value.id, userInfo.id)
          sessionId = session.sessionId
          currentSessionId.value = sessionId
        } catch (e) { uni.showToast({ title: '创建会话失败', icon: 'none' }); return }
      }

      const userMsg = { id: Date.now().toString(), role: 'user', content: inputText.value.trim(), timestamp: new Date().toISOString() }
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: new Date().toISOString(), typing: true }

      messages.value = [...messages.value, userMsg, aiMsg]
      inputText.value = ''
      sending.value = true
      typing.value = true
      scrollToBottom()

      streamController = streamApi.smartStreamChat({
        message: userMsg.content,
        deepThinking: deepThinking.value,
        userId: userInfo.id,
        agentId: selectedAgent.value.id,
        matchId: selectedMatch.value.id,
        sessionId,
        onMessage: (text) => {
          const idx = messages.value.findIndex(m => m.id === aiMsg.id)
          if (idx !== -1) messages.value[idx].content += text
        },
        onComplete: () => {
          const idx = messages.value.findIndex(m => m.id === aiMsg.id)
          if (idx !== -1) messages.value[idx].typing = false
          sending.value = false
          typing.value = false
          saveMessages()
        },
        onError: (err) => {
          const idx = messages.value.findIndex(m => m.id === aiMsg.id)
          if (idx !== -1) { messages.value[idx].typing = false; messages.value[idx].error = true }
          sending.value = false; typing.value = false
          uni.showToast({ title: err.message || '请求失败', icon: 'none' })
        }
      })
    }

    function abortStream() { if (streamController) { streamController.abort(); streamController = null } }

    function onStopGenerate() { abortStream(); typing.value = false; sending.value = false; saveMessages() }
    function scrollToBottom() { scrollToView.value = `msg-${messages.value.length - 1}` }

    function onQuestionSelect(q) { inputText.value = q; onSend() }
    function onInputFocus() {}
    function onInputBlur() {}

    function onShowMatchPicker() { showMatchPicker.value = true }
    function onCloseMatchPicker() { showMatchPicker.value = false }
    function onSelectMatch(e) {
      const match = e.currentTarget.dataset.match
      selectedMatch.value = match
      showMatchPicker.value = false
      messages.value = []
      currentSessionId.value = null
      uni.removeStorageSync('ai-chat-messages')
    }

    function onSwitchAgent() { showAgentPicker.value = true }

    async function onAgentSelect(e) {
      const agent = e.currentTarget.dataset.agent
      if (!agent) return
      showAgentDetail.value = true
      agentDetailLoading.value = true
      try {
        const detail = await agentApi.getAgentDetail(userStore.getUserInfo.id, agent.id)
        const groups = {}
        const configs = detail.factorConfigs || []
        configs.forEach(item => {
          const group = item.factorGroup || '其他'
          if (!groups[group]) groups[group] = { groupName: group, groupDisplayName: ({ BASIC: '基础信息', HISTORY: '历史数据', STATS: '统计数据', INFO: '情报数据' })[group] || group, items: [] }
          groups[group].items.push(item)
        })
        factorGroups.value = Object.values(groups)
        agentDetail.value = detail
      } catch (e) { uni.showToast({ title: '加载详情失败', icon: 'none' }) }
      finally { agentDetailLoading.value = false }
    }

    function onCloseAgentDetail() { showAgentDetail.value = false }
    function onCloseAgentPicker() { showAgentPicker.value = false }
    function onConfirmSelectAgent() {
      if (!agentDetail.value) return
      selectedAgent.value = { id: agentDetail.value.id, agentName: agentDetail.value.agentName }
      showAgentDetail.value = false
      showAgentPicker.value = false
    }

    function onShowCreateAgent() { uni.showToast({ title: '请在详情页创建', icon: 'none' }) }
    function onToggleDeepThinking() { deepThinking.value = !deepThinking.value }

    // Sidebar
    function onToggleSidebar() { showSidebar.value = !showSidebar.value }
    function onCloseSidebar() { showSidebar.value = false }
    function onSelectSession(session) {
      currentSessionId.value = session.sessionId
      selectedMatch.value = { id: session.matchId, homeTeam: session.matchName?.split(' vs ')[0] || '', awayTeam: session.matchName?.split(' vs ')[1] || '', league: session.leagueName, matchNumStr: '' }
      showSidebar.value = false
    }
    function onLongPressSession(session) {
      uni.showModal({
        title: '删除对话',
        content: '确定要删除此对话记录吗？',
        success: (res) => {
          if (res.confirm) {
            sessionGroups.value = sessionGroups.value.map(g => ({
              ...g,
              sessions: g.sessions.filter(s => s.sessionId !== session.sessionId)
            })).filter(g => g.sessions.length > 0)
          }
        }
      })
    }
    function onClearChat() {
      if (messages.value.length === 0) return
      uni.showModal({
        title: '清空对话',
        content: '确定要清空当前对话吗？',
        success: (res) => {
          if (res.confirm) {
            messages.value = []
            currentSessionId.value = null
            uni.removeStorageSync('ai-chat-messages')
          }
        }
      })
    }

    // Agent select from setup list
    function onAgentSelectFromList(agent) {
      if (!agent) return
      selectedAgent.value = { id: agent.id, agentName: agent.agentName }
    }

    return {
      messages, inputText, sending, typing, scrollToView, deepThinking,
      selectedMatch, showMatchPicker, matchList, matchLoading,
      selectedAgent, showAgentPicker, agentList, showAgentDetail,
      agentDetail, agentDetailLoading, factorGroups, quickQuestions,
      showSidebar, sessionGroups, modelName, agentInfoBarEmpty,
      onSend, onStopGenerate, onQuestionSelect, onInputFocus, onInputBlur,
      onShowMatchPicker, onCloseMatchPicker, onSelectMatch,
      onSwitchAgent, onCloseAgentPicker,
      onAgentSelect, onCloseAgentDetail, onConfirmSelectAgent,
      onShowCreateAgent, onToggleDeepThinking,
      onToggleSidebar, onCloseSidebar, onSelectSession, onLongPressSession,
      onClearChat, onAgentSelectFromList,
    }
  }
}
</script>

<style scoped>
/* ========== 全局 ========== */
.page-ai-chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
  overflow: hidden;
}

/* ========== 左侧栏 ========== */
.sidebar-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 500;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-mask.visible { opacity: 1; pointer-events: auto; }
.sidebar-panel {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 580rpx;
  max-width: 85vw;
  background: #fff;
  z-index: 501;
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 4rpx 0 40rpx rgba(0, 0, 0, 0.08);
  border-radius: 0 28rpx 28rpx 0;
}
.sidebar-panel.open { transform: translateX(0); }
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 32rpx 24rpx;
  border-bottom: 1rpx solid #f1f5f9;
  flex-shrink: 0;
}
.sidebar-title { font-size: 34rpx; font-weight: 700; color: #0f172a; }
.sidebar-close {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%; background: #f1f5f9;
}
.sidebar-close:active { background: #e2e8f0; transform: scale(0.93); }
.sidebar-close-icon { font-size: 36rpx; color: #64748b; line-height: 1; }
.sidebar-list { flex: 1; min-height: 0; padding: 16rpx 0; }
.sidebar-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 120rpx 48rpx; gap: 16rpx;
}
.sidebar-empty-text { font-size: 28rpx; color: #94a3b8; font-weight: 500; }
.sidebar-empty-desc { font-size: 24rpx; color: #cbd5e1; }
.session-group-label {
  font-size: 22rpx; color: #94a3b8; font-weight: 600;
  padding: 24rpx 32rpx 10rpx; letter-spacing: 1rpx;
}
.session-item {
  position: relative;
  display: flex; flex-direction: column; gap: 6rpx;
  padding: 22rpx 32rpx; margin: 4rpx 16rpx;
  border-radius: 16rpx; border: 2rpx solid transparent;
}
.session-item:active { background: #f8fafc; transform: scale(0.98); }
.session-item.active {
  background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
  border-color: #bae6fd;
}
.session-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16rpx; }
.session-info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10rpx; }
.session-league-tag {
  flex-shrink: 0; font-size: 20rpx; font-weight: 600; color: #fff;
  background: #475569; padding: 4rpx 12rpx; border-radius: 6rpx;
}
.session-name { font-size: 28rpx; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session-time { font-size: 22rpx; color: #94a3b8; flex-shrink: 0; }
.session-agent { font-size: 22rpx; color: #3b82f6; }
.session-check {
  position: absolute; right: 32rpx; top: 50%; transform: translateY(-50%);
  width: 44rpx; height: 44rpx; border-radius: 50%;
  background: linear-gradient(135deg, #2563eb 0%, #6366f1 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; color: #fff; font-weight: 600;
  box-shadow: 0 2rpx 12rpx rgba(37, 99, 235, 0.35);
}

/* ========== 悬浮按钮 ========== */
.floating-btn-area {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 100vh;
  pointer-events: none; z-index: 450;
}
.floating-btn {
  display: flex; align-items: center; justify-content: center;
  width: 88rpx; height: 88rpx; border-radius: 50%;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  box-shadow: 0 8rpx 28rpx rgba(13, 148, 136, 0.35);
  pointer-events: auto;
}
.floating-btn:active { transform: scale(0.9); box-shadow: 0 4rpx 16rpx rgba(13, 148, 136, 0.25); }
.chat-icon-emoji { font-size: 36rpx; line-height: 1; color: #fff; }

/* ========== 消息列表 ========== */
.chat-messages { flex: 1; min-height: 0; }

/* 欢迎区域 */
.welcome-section {
  display: flex; flex-direction: column; align-items: center;
  padding: 80rpx 48rpx 40rpx;
}
.welcome-icon {
  margin-bottom: 36rpx;
  width: 120rpx; height: 120rpx;
  background: #fff; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08), 0 0 0 8rpx rgba(59, 130, 246, 0.05);
}
.ai-icon { width: 80rpx; height: 80rpx; }
.welcome-title {
  font-size: 44rpx; font-weight: 700; color: #0f172a;
  margin-bottom: 16rpx; letter-spacing: 1rpx;
}
.welcome-desc {
  font-size: 28rpx; color: #64748b; text-align: center; line-height: 1.7;
}

/* ========== 比赛&智能体选择区 ========== */
.setup-section {
  padding: 0 28rpx 28rpx;
  display: flex; flex-direction: column; gap: 28rpx;
}
.setup-step { display: flex; flex-direction: column; gap: 18rpx; }
.setup-step-header { display: flex; align-items: center; gap: 14rpx; }
.setup-step-num {
  width: 44rpx; height: 44rpx;
  background: linear-gradient(135deg, #2563eb 0%, #6366f1 100%);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; color: #fff; font-weight: 700;
  box-shadow: 0 4rpx 14rpx rgba(37, 99, 235, 0.3);
}
.setup-step-title { font-size: 32rpx; font-weight: 700; color: #0f172a; }
.setup-step-desc { font-size: 24rpx; color: #94a3b8; padding-left: 58rpx; }

.setup-match-selected {
  padding: 28rpx;
  background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%);
  border-radius: 20rpx; border: 2rpx solid #bae6fd;
  display: flex; flex-direction: column; gap: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(59, 130, 246, 0.06);
}
.setup-match-text { font-size: 32rpx; font-weight: 700; color: #0f172a; }
.setup-match-sub { font-size: 24rpx; color: #64748b; }
.setup-match-switch { font-size: 22rpx; color: #2563eb; margin-top: 4rpx; font-weight: 500; }

.setup-match-btn {
  display: flex; align-items: center; justify-content: center; gap: 18rpx;
  padding: 44rpx; background: #fff; border: 2rpx dashed #93c5fd;
  border-radius: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}
.setup-match-btn:active { transform: scale(0.98); background: #f8fafc; border-color: #60a5fa; }
.setup-match-btn-icon { font-size: 40rpx; }
.setup-match-btn-text { font-size: 30rpx; color: #2563eb; font-weight: 600; }

.setup-agent-selected {
  display: flex; align-items: center; gap: 16rpx;
  padding: 22rpx 28rpx;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 18rpx; border: 2rpx solid #bbf7d0;
  box-shadow: 0 2rpx 12rpx rgba(22, 163, 74, 0.06);
}
.setup-agent-back {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; border-radius: 50%; background: rgba(22, 163, 74, 0.1);
}
.setup-agent-back:active { background: rgba(22, 163, 74, 0.2); transform: scale(0.93); }
.setup-agent-back-icon { font-size: 44rpx; color: #16a34a; font-weight: 300; line-height: 1; }
.setup-agent-name {
  flex: 1; font-size: 30rpx; font-weight: 700; color: #166534;
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.setup-agent-reselect { flex-shrink: 0; padding: 8rpx 16rpx; }
.setup-agent-switch-tip { font-size: 24rpx; color: #16a34a; font-weight: 600; }

/* 智能体列表 */
.agent-grid { display: flex; flex-direction: column; gap: 16rpx; }
.agent-card {
  display: flex; align-items: center;
  padding: 24rpx; background: #fff; border-radius: 20rpx;
  border: 2rpx solid #f1f5f9; box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.02);
}
.agent-card:active {
  transform: scale(0.98); border-color: #93c5fd;
  box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.12);
}
.agent-card.agent-default {
  border-color: #bfdbfe;
  background: linear-gradient(135deg, #eff6ff 0%, #fff 100%);
}
.agent-avatar {
  width: 88rpx; height: 88rpx; border-radius: 50%; flex-shrink: 0;
  background: #f1f5f9; border: 3rpx solid #e2e8f0;
}
.agent-info { flex: 1; margin-left: 22rpx; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.agent-name-row { display: flex; align-items: center; gap: 10rpx; }
.agent-name {
  font-size: 30rpx; font-weight: 700; color: #1e293b;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.agent-default-tag {
  padding: 4rpx 14rpx; background: linear-gradient(135deg, #dbeafe, #bae6fd);
  border-radius: 8rpx; flex-shrink: 0; font-size: 20rpx; color: #0369a1; font-weight: 600;
}
.agent-desc { font-size: 24rpx; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.agent-arrow { font-size: 36rpx; color: #cbd5e1; margin-left: 16rpx; flex-shrink: 0; font-weight: 300; }

.create-agent-btn {
  margin-top: 16rpx;
  display: flex; align-items: center; justify-content: center; gap: 14rpx;
  padding: 30rpx; border: 2rpx dashed #93c5fd; border-radius: 20rpx;
  background: #fff; box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.02);
}
.create-agent-btn:active { transform: scale(0.98); background: #f8fafc; border-color: #60a5fa; }
.create-agent-icon { font-size: 34rpx; color: #2563eb; font-weight: 300; line-height: 1; }
.create-agent-text { font-size: 28rpx; color: #2563eb; font-weight: 600; }

.list-footer { height: 40rpx; }

/* ========== 底部控制区 ========== */
.bottom-section {
  flex-shrink: 0; background: #fff;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.04);
  padding-bottom: env(safe-area-inset-bottom);
  border-radius: 28rpx 28rpx 0 0;
}

.info-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16rpx 24rpx 8rpx; gap: 12rpx;
}
.info-bar-left {
  display: flex; align-items: center; gap: 8rpx;
  padding: 10rpx 20rpx; background: #f1f5f9; border-radius: 24rpx;
  min-width: 0; flex-shrink: 1;
}
.info-bar-left:active { background: #e2e8f0; }
.info-bar-match {
  font-size: 24rpx; color: #1e293b; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.info-bar-match-empty { font-size: 24rpx; color: #94a3b8; white-space: nowrap; }
.info-bar-arrow { font-size: 18rpx; color: #94a3b8; margin-left: 2rpx; flex-shrink: 0; }
.info-bar-right { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.info-bar-agent {
  display: flex; align-items: center; gap: 6rpx;
  padding: 8rpx 16rpx; background: #f0fdf4; border-radius: 24rpx; white-space: nowrap;
}
.info-bar-agent:active { background: #dcfce7; }
.info-bar-agent-text {
  font-size: 22rpx; color: #16a34a; font-weight: 600;
  max-width: 160rpx; overflow: hidden; text-overflow: ellipsis;
}
.info-bar-agent-switch { font-size: 28rpx; color: #16a34a; font-weight: 400; line-height: 1; }
.info-bar-model {
  padding: 8rpx 14rpx; background: #eff6ff; border-radius: 24rpx; border: 1rpx solid #bfdbfe;
}
.info-bar-model-text { font-size: 20rpx; color: #2563eb; font-weight: 600; }
.info-bar-clear {
  padding: 10rpx 22rpx; background: #fef2f2; border-radius: 24rpx;
}
.info-bar-clear:active { background: #fee2e2; }
.info-bar-clear text { font-size: 22rpx; color: #ef4444; font-weight: 600; }

/* 正在生成提示 */
.generating-tip {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14rpx 24rpx;
  background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
}
.tip-text {
  font-size: 26rpx; color: #b45309; font-weight: 600;
  display: flex; align-items: center;
}
.tip-text::before {
  content: ''; display: inline-block;
  width: 16rpx; height: 16rpx; background-color: #f59e0b;
  border-radius: 50%; margin-right: 12rpx; animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.75); }
}
.stop-btn {
  padding: 12rpx 32rpx;
  background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
  border-radius: 24rpx; box-shadow: 0 4rpx 14rpx rgba(239, 68, 68, 0.3);
}
.stop-btn:active { transform: scale(0.95); }
.stop-text { font-size: 24rpx; color: #fff; font-weight: 600; }

/* 输入框 */
.input-wrapper {
  display: flex; align-items: center; gap: 12rpx;
  background: #f1f5f9; border-radius: 32rpx;
  padding: 14rpx 14rpx 14rpx 32rpx;
  margin: 14rpx 20rpx 20rpx;
  border: 2rpx solid transparent;
  transition: all 0.25s ease;
}
.input-wrapper:focus-within {
  border-color: #2563eb; background: #fff;
  box-shadow: 0 0 0 6rpx rgba(37, 99, 235, 0.08);
}
.chat-input {
  flex: 1; min-height: 44rpx; max-height: 120rpx;
  font-size: 28rpx; color: #1e293b; line-height: 1.5;
}
.send-btn {
  width: 68rpx; height: 68rpx;
  display: flex; align-items: center; justify-content: center;
  background: #e2e8f0; border-radius: 50%; flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.send-btn.active {
  background: linear-gradient(135deg, #2563eb 0%, #6366f1 100%);
  box-shadow: 0 6rpx 22rpx rgba(37, 99, 235, 0.4);
}
.send-btn.active:active { transform: scale(0.9); }
.send-icon {
  font-size: 32rpx; color: #94a3b8; font-weight: 700;
  transition: color 0.25s ease;
}
.send-btn.active .send-icon { color: #fff; }

/* ========== 弹窗通用 ========== */
.popup-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); z-index: 1000;
  display: flex; align-items: flex-end;
}
.popup-sheet {
  width: 100%; max-height: 60vh; background: #fff;
  border-radius: 36rpx 36rpx 0 0; overflow: hidden;
}
.popup-sheet--large { max-height: 80vh; }
.popup-list { max-height: 50vh; }
.popup-item {
  padding: 28rpx 32rpx; border-bottom: 1rpx solid #f1f5f9;
}
.popup-item:active { background: #f8fafc; }
.factor-item { padding: 8rpx 0; }
</style>
