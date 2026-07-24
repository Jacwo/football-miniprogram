<template>
  <view class="message-bubble" :class="[`message-bubble--${type}`, { 'message-bubble--typing': typing }]" @longpress="onLongPress">
    <view v-if="showAvatar" class="message-bubble__avatar">
      <image v-if="type === 'user'" class="message-bubble__avatar-img" src="/static/images/logo.png" mode="aspectFill" />
      <view v-else class="message-bubble__avatar-img flex-center">
        <text>🤖</text>
      </view>
    </view>
    <view class="message-bubble__body">
      <view class="message-bubble__content">
        <text>{{ content }}</text>
        <view v-if="typing" class="message-bubble__typing-dot animate-spin">●</view>
      </view>
      <text v-if="timestamp" class="message-bubble__time text-xs text-placeholder">{{ timestamp }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'MessageBubble',
  props: {
    type: { type: String, default: 'user' },
    content: { type: String, default: '' },
    typing: { type: Boolean, default: false },
    showAvatar: { type: Boolean, default: true },
    timestamp: { type: String, default: '' },
    markdown: { type: Boolean, default: false }
  },
  emits: ['typingComplete'],
  setup(props) {
    function onLongPress() {
      uni.showActionSheet({
        itemList: ['复制内容'],
        success: (res) => {
          if (res.tapIndex === 0) {
            uni.setClipboardData({ data: props.content })
            uni.showToast({ title: '已复制', icon: 'success', duration: 1500 })
          }
        }
      })
    }

    return { onLongPress }
  }
}
</script>

<style scoped>
.message-bubble { display: flex; padding: var(--spacing-md); gap: var(--spacing-sm); }
.message-bubble--user { flex-direction: row-reverse; }
.message-bubble__avatar { flex-shrink: 0; }
.message-bubble__avatar-img { width: 72rpx; height: 72rpx; border-radius: 50%; background: var(--bg-gray); font-size: 36rpx; }
.message-bubble--user .message-bubble__avatar-img { background: var(--gradient-primary); }
.message-bubble__body { max-width: 75%; }
.message-bubble__content { padding: var(--spacing-md); border-radius: var(--radius-lg); font-size: var(--font-md); line-height: 1.6; word-break: break-all; }
.message-bubble--user .message-bubble__content { background: var(--gradient-primary); color: #fff; }
.message-bubble--assistant .message-bubble__content { background: var(--bg-white); color: var(--text-color); box-shadow: var(--shadow-sm); }
.message-bubble--typing .message-bubble__content { position: relative; }
.message-bubble__typing-dot { display: inline-block; margin-left: 4rpx; }
.message-bubble__time { display: block; margin-top: 4rpx; padding: 0 8rpx; }
</style>
