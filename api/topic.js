// api/topic.js - 专题相关接口
const { post } = require('./index')

/**
 * 获取专题首页数据
 */
function getTopicHome() {
  return post('/api/topic/home', {})
}

module.exports = {
  getTopicHome
}
