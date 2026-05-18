// api/topic.js - 专题相关接口
const { post } = require('./index')

/**
 * 获取专题首页数据
 */
function getTopicHome() {
  return post('/api/topic/home', {})
}

/**
 * 获取专题详情
 * @param {string} topicId - 专题ID
 */
function getTopicDetail(topicId) {
  return post('/api/topic/detail', { topicId })
}

module.exports = {
  getTopicHome,
  getTopicDetail
}
