// api/quickQuestions.js - 快捷问题接口
import { get } from './index'

// 默认兜底问题
const DEFAULT_QUESTIONS = [
  '帮我分析一下这场比赛',
  '这场比赛谁的胜率更高？',
  '主队最近状态怎么样？',
  '两队的交战历史如何？'
]

export function getQuickQuestions(matchId) {
  return get(`/api/questions/quick/${matchId}`, {}, { showLoading: false }).catch(() => {
    return DEFAULT_QUESTIONS
  })
}

export { DEFAULT_QUESTIONS }
