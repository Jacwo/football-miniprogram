// api/system.js - 系统相关接口
const { get } = require('./index')

/**
 * 获取公告列表
 */
function getAnnouncements() {
  return get('/api/system/announcement', {}, { showLoading: false })
}

module.exports = {
  getAnnouncements
}
