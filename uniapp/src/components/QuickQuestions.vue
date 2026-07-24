<template>
  <view class="quick-questions" v-if="(questionList.length > 0 || loading)">
    <!-- 标题 -->
    <view v-if="showTitle" class="header">
      <text class="title">{{ title }}</text>
      <view class="refresh-btn" v-if="!loading" @tap="refresh">
        <text class="refresh-text">换一批</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 问题列表 -->
    <view v-else class="question-list">
      <view
        v-for="(question, index) in questionList"
        :key="index"
        class="question-item"
        @tap="onQuestionTap(index)"
      >
        <text class="question-text">{{ question }}</text>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, watch } from 'vue'
import { getQuickQuestions, DEFAULT_QUESTIONS } from '@/api/quickQuestions'

export default {
  name: 'QuickQuestions',
  props: {
    // 是否自动加载
    autoLoad: { type: Boolean, default: true },
    // 自定义问题列表
    questions: { type: Array, default: () => [] },
    // 标题
    title: { type: String, default: '猜你想问' },
    // 是否显示标题
    showTitle: { type: Boolean, default: true }
  },
  emits: ['select'],
  setup(props, { emit }) {
    const questionList = ref([])
    const loading = ref(false)

    async function loadQuestions() {
      loading.value = true
      try {
        const res = await getQuickQuestions()
        questionList.value = res || DEFAULT_QUESTIONS
      } catch (e) {
        console.error('加载快速问题失败:', e)
        questionList.value = DEFAULT_QUESTIONS
      } finally {
        loading.value = false
      }
    }

    function refresh() {
      loadQuestions()
    }

    function onQuestionTap(index) {
      const question = questionList.value[index]
      if (question) {
        emit('select', { question, index })
      }
    }

    // 监听外部传入的 questions
    watch(() => props.questions, (val) => {
      if (val && val.length > 0) {
        questionList.value = val
      }
    }, { immediate: true })

    // 自动加载
    if (props.autoLoad && (!props.questions || props.questions.length === 0)) {
      loadQuestions()
    }

    return { questionList, loading, loadQuestions, refresh, onQuestionTap }
  }
}
</script>

<style scoped>
.quick-questions {
  padding: 24rpx;
}

/* 头部 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.refresh-btn {
  padding: 8rpx 16rpx;
}

.refresh-text {
  font-size: 26rpx;
  color: #1890ff;
}

.refresh-btn:active {
  opacity: 0.7;
}

/* 加载中 */
.loading {
  padding: 40rpx;
  text-align: center;
}

.loading-text {
  font-size: 26rpx;
  color: #999;
}

/* 问题列表 */
.question-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.question-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background-color: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.question-item:active {
  background-color: #f5f5f5;
}

.question-text {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}

.arrow {
  flex-shrink: 0;
  font-size: 32rpx;
  color: #ccc;
  margin-left: 16rpx;
}
</style>
