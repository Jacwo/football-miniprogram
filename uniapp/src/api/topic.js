// api/topic.js - 专题相关接口
import { post } from './index'

export function getTopicHome() {
  return post('/api/topic/home', {})
}

export function getTopicDetail(topicId) {
  return post('/api/topic/detail', { topicId })
}
