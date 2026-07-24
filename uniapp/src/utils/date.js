// utils/date.js - 日期处理工具

export function formatDate(date) {
  const d = parseDate(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatTime(date) {
  const d = parseDate(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function formatShortDateTime(date) {
  const d = parseDate(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

export function parseDate(date) {
  if (date instanceof Date) return date
  if (typeof date === 'number') return new Date(date)
  if (typeof date === 'string') {
    const normalized = date.replace(/-/g, '/').replace(/T/, ' ')
    return new Date(normalized)
  }
  return new Date()
}

export function getRelativeTime(date) {
  const d = parseDate(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
}

export function isToday(date) {
  const d = parseDate(date)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

export function isTomorrow(date) {
  const d = parseDate(date)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return d.toDateString() === tomorrow.toDateString()
}

export function isYesterday(date) {
  const d = parseDate(date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.toDateString() === yesterday.toDateString()
}

export function getFriendlyDate(date) {
  if (isToday(date)) return '今天'
  if (isTomorrow(date)) return '明天'
  if (isYesterday(date)) return '昨天'
  return formatDate(date)
}

export function getWeekDay(date) {
  const d = parseDate(date)
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekDays[d.getDay()]
}
