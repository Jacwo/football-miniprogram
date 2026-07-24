// api/system.js - 系统相关接口
import { get } from './index'

/**
 * 获取公告列表
 */
export function getAnnouncements() {
  return get('/api/system/announcement', {}, { showLoading: false })
}
