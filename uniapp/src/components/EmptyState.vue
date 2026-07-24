<template>
  <view class="empty-state">
    <!-- 图标 -->
    <view class="icon-wrapper">
      <text class="icon-text">{{ iconText }}</text>
    </view>

    <!-- 标题 -->
    <view v-if="displayTitle" class="title">
      <text>{{ displayTitle }}</text>
    </view>

    <!-- 描述 -->
    <view v-if="displayDescription" class="description">
      <text>{{ displayDescription }}</text>
    </view>

    <!-- 按钮 -->
    <view v-if="buttonText" class="button-wrapper" @tap="onButtonTap">
      <view class="action-btn" :class="buttonType">{{ buttonText }}</view>
    </view>

    <!-- 插槽 -->
    <slot></slot>
  </view>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'EmptyState',
  props: {
    type: { type: String, default: 'empty' },
    icon: { type: String, default: '' },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    buttonText: { type: String, default: '' },
    buttonType: { type: String, default: 'primary' }
  },
  emits: ['buttonTap'],
  setup(props, { emit }) {
    const configs = {
      empty: { icon: '📭', title: '暂无数据', description: '这里空空如也' },
      error: { icon: '❌', title: '加载失败', description: '请稍后重试' },
      network: { icon: '📡', title: '网络异常', description: '请检查网络连接后重试' },
      search: { icon: '🔍', title: '未找到结果', description: '换个关键词试试吧' }
    }

    const currentConfig = computed(() => configs[props.type] || configs.empty)
    const iconText = computed(() => props.icon || currentConfig.value.icon)
    const displayTitle = computed(() => props.title || currentConfig.value.title)
    const displayDescription = computed(() => props.description || currentConfig.value.description)

    function onButtonTap() { emit('buttonTap') }

    return { iconText, displayTitle, displayDescription, onButtonTap }
  }
}
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 48rpx;
}

/* 图标 */
.icon-wrapper {
  margin-bottom: 32rpx;
}

.icon-text {
  font-size: 200rpx;
  line-height: 1;
}

/* 标题 */
.title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 16rpx;
  text-align: center;
}

/* 描述 */
.description {
  font-size: 28rpx;
  color: #999;
  text-align: center;
  line-height: 1.5;
}

/* 按钮 */
.button-wrapper {
  margin-top: 48rpx;
}

.action-btn {
  min-width: 240rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  border-radius: 40rpx;
  text-align: center;
}

.action-btn.primary {
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  color: #ffffff;
}

.action-btn.default {
  background-color: #f5f5f5;
  color: #666;
}

.action-btn:active {
  opacity: 0.8;
}
</style>
