<template>
  <view class="typing-text" v-if="displayText">
    <text>{{ displayText }}</text>
    <text v-if="isTyping" class="typing-text__cursor">|</text>
  </view>
</template>

<script>
import { ref, watch, onUnmounted } from 'vue'

export default {
  name: 'TypingText',
  props: {
    text: { type: String, default: '' },
    speed: { type: Number, default: 50 },
    autoPlay: { type: Boolean, default: true }
  },
  emits: ['complete'],
  setup(props, { emit }) {
    const displayText = ref('')
    const isTyping = ref(false)
    let timer = null
    let index = 0

    function startTyping() {
      if (!props.text) return
      stopTyping()
      displayText.value = ''
      index = 0
      isTyping.value = true

      const chars = props.text.split('')
      timer = setInterval(() => {
        if (index < chars.length) {
          displayText.value += chars[index]
          index++
        } else {
          stopTyping()
          emit('complete')
        }
      }, props.speed)
    }

    function stopTyping() {
      if (timer) { clearInterval(timer); timer = null }
      isTyping.value = false
    }

    watch(() => props.text, (val) => { if (val && props.autoPlay) startTyping() }, { immediate: true })

    onUnmounted(() => stopTyping())

    return { displayText, isTyping }
  }
}
</script>

<style scoped>
.typing-text { position: relative; }
.typing-text__cursor { animation: blink 1s infinite; }
@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
</style>
