// api/stream.js - AI 流式对话接口

const BASE_URL = 'https://ai-football.cn/foot'

/**
 * 拼接多个 Uint8Array 并一次性 UTF-8 解码（纯 JS 实现）
 */
function concatAndDecode(chunks) {
  if (!chunks || chunks.length === 0) return ''
  let totalLen = 0
  for (const c of chunks) totalLen += c.length
  const combined = new Uint8Array(totalLen)
  let offset = 0
  for (const c of chunks) { combined.set(c, offset); offset += c.length }
  return utf8Decode(combined)
}

function utf8Decode(bytes) {
  let result = ''
  let i = 0
  const len = bytes.length
  while (i < len) {
    const b0 = bytes[i]
    if (b0 < 0x80) { result += String.fromCharCode(b0); i += 1; continue }
    if (b0 >= 0xC0 && b0 < 0xE0) {
      if (i + 1 >= len) { result += '\uFFFD'; break }
      const b1 = bytes[i + 1]
      if ((b1 & 0xC0) !== 0x80) { result += '\uFFFD'; i += 1; continue }
      result += String.fromCharCode(((b0 & 0x1F) << 6) | (b1 & 0x3F))
      i += 2; continue
    }
    if (b0 >= 0xE0 && b0 < 0xF0) {
      if (i + 2 >= len) { result += '\uFFFD'; break }
      const b1 = bytes[i + 1], b2 = bytes[i + 2]
      if ((b1 & 0xC0) !== 0x80 || (b2 & 0xC0) !== 0x80) { result += '\uFFFD'; i += 1; continue }
      result += String.fromCharCode(((b0 & 0x0F) << 12) | ((b1 & 0x3F) << 6) | (b2 & 0x3F))
      i += 3; continue
    }
    if (b0 >= 0xF0 && b0 < 0xF8) {
      if (i + 3 >= len) { result += '\uFFFD'; break }
      const b1 = bytes[i + 1], b2 = bytes[i + 2], b3 = bytes[i + 3]
      if ((b1 & 0xC0) !== 0x80 || (b2 & 0xC0) !== 0x80 || (b3 & 0xC0) !== 0x80) { result += '\uFFFD'; i += 1; continue }
      let cp = ((b0 & 0x07) << 18) | ((b1 & 0x3F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F)
      if (cp > 0xFFFF) { cp -= 0x10000; result += String.fromCharCode((cp >>> 10) + 0xD800, (cp & 0x3FF) + 0xDC00) }
      else { result += String.fromCharCode(cp) }
      i += 4; continue
    }
    result += '\uFFFD'; i += 1
  }
  return result
}

function processLine(line, onMessage) {
  if (!line) return
  let dataStr = ''
  if (line.startsWith('data: ')) dataStr = line.slice(6)
  else if (line.startsWith('data:')) dataStr = line.slice(5)
  else return
  if (!dataStr || dataStr === '[DONE]') return
  if (dataStr.startsWith('{')) {
    try {
      const data = JSON.parse(dataStr)
      const delta = (data.choices && data.choices[0] && data.choices[0].delta) || {}
      const content = delta.reasoning_content != null ? String(delta.reasoning_content) :
                      delta.content != null ? String(delta.content) : ''
      if (content) onMessage && onMessage(content)
    } catch (e) { /* JSON 解析失败，忽略 */ }
  } else {
    onMessage && onMessage(dataStr)
  }
}

/**
 * 流式聊天 - 使用 enableChunked 分块传输
 */
export function streamChat(options) {
  const { message, deepThinking = false, userId, agentId, matchId, sessionId, onMessage, onComplete, onError } = options
  const token = uni.getStorageSync('token') || ''
  let requestTask = null
  let isCompleted = false
  const rawChunks = []
  let processedLineCount = 0

  requestTask = uni.request({
    url: `${BASE_URL}/api/stream/chat`,
    method: 'POST',
    data: { message, deepThinking, userId, agentId, matchId, sessionId, stream: true },
    header: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'Accept': 'text/event-stream'
    },
    enableChunked: true,
    responseType: 'text',
    success: (res) => {
      if (isCompleted) return
      isCompleted = true
      if (res.statusCode === 200) {
        flushReservedLine()
        onComplete && onComplete()
      } else if (res.statusCode === 401) {
        uni.removeStorageSync('token')
        onError && onError(new Error('登录已过期'))
      } else {
        onError && onError(new Error(`请求失败: ${res.statusCode}`))
      }
    },
    fail: (err) => {
      if (isCompleted) return
      isCompleted = true
      onError && onError(err)
    }
  })

  requestTask.onChunkReceived((res) => {
    if (isCompleted) return
    if (res.data && Object.prototype.toString.call(res.data) === '[object ArrayBuffer]') {
      rawChunks.push(new Uint8Array(res.data))
      flushNewLines()
    }
  })

  function flushNewLines() {
    const fullText = concatAndDecode(rawChunks)
    const allLines = fullText.split('\n')
    const newLines = allLines.slice(processedLineCount)
    if (newLines.length <= 1) return
    const linesToProcess = newLines.slice(0, -1)
    processedLineCount += linesToProcess.length
    for (const line of linesToProcess) processLine(line, onMessage)
  }

  function flushReservedLine() {
    const fullText = concatAndDecode(rawChunks)
    const allLines = fullText.split('\n')
    if (processedLineCount < allLines.length) {
      processLine(allLines[processedLineCount++], onMessage)
    }
  }

  return { abort: () => { if (requestTask) requestTask.abort() } }
}

/**
 * 轮询方式的流式聊天（降级方案）
 */
export function streamChatPolling(options) {
  const { message, deepThinking = false, userId, agentId, matchId, sessionId, onMessage, onComplete, onError } = options
  const token = uni.getStorageSync('token') || ''
  let pollingSessionId = null
  let isAborted = false
  let pollTimer = null

  uni.request({
    url: `${BASE_URL}/api/stream/chat/start`,
    method: 'POST',
    data: { message, deepThinking, userId, agentId, matchId, sessionId },
    header: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
    success: (res) => {
      if (res.statusCode === 200 && res.data.code === 0) {
        pollingSessionId = res.data.data.sessionId
        startPolling()
      } else {
        onError && onError(new Error((res.data && res.data.message) || '启动对话失败'))
      }
    },
    fail: (err) => onError && onError(err)
  })

  function startPolling() { poll() }
  function poll() {
    if (isAborted || !pollingSessionId) return
    uni.request({
      url: `${BASE_URL}/api/stream/chat/next`,
      method: 'GET',
      data: { sessionId: pollingSessionId },
      header: { 'Authorization': token ? `Bearer ${token}` : '' },
      success: (res) => {
        if (isAborted) return
        if (res.statusCode === 200 && res.data.code === 0) {
          const { content, done } = res.data.data
          if (content) onMessage && onMessage(content)
          if (done) onComplete && onComplete()
          else pollTimer = setTimeout(poll, 100)
        } else {
          onError && onError(new Error((res.data && res.data.message) || '获取消息失败'))
        }
      },
      fail: (err) => { if (!isAborted) onError && onError(err) }
    })
  }

  return { abort: () => { isAborted = true; if (pollTimer) clearTimeout(pollTimer) } }
}

export function isChunkedSupported() {
  try {
    const systemInfo = uni.getSystemInfoSync()
    const SDKVersion = systemInfo.SDKVersion || ''
    return compareVersion(SDKVersion, '2.20.2') >= 0
  } catch (e) { return false }
}

function compareVersion(v1, v2) {
  const v1Parts = v1.split('.').map(Number)
  const v2Parts = v2.split('.').map(Number)
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const p1 = v1Parts[i] || 0, p2 = v2Parts[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

export function smartStreamChat(options) {
  if (isChunkedSupported()) return streamChat(options)
  else return streamChatPolling(options)
}

/**
 * 流式分析比赛
 */
export function streamAnalysis(options) {
  const { matchId, userId, onMessage, onComplete, onError } = options
  const token = uni.getStorageSync('token') || ''
  let requestTask = null
  let isCompleted = false
  const rawChunks = []
  let processedLineCount = 0

  requestTask = uni.request({
    url: `${BASE_URL}/api/match/stream/analysis/${matchId}/${userId}`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'Accept': 'text/event-stream'
    },
    enableChunked: true,
    responseType: 'text',
    success: (res) => {
      if (isCompleted) return
      isCompleted = true
      if (res.statusCode === 200) {
        flushReservedLine()
        onComplete && onComplete()
      } else if (res.statusCode === 401) {
        onError && onError(new Error('登录已过期'))
      } else {
        onError && onError(new Error(`请求失败: ${res.statusCode}`))
      }
    },
    fail: (err) => {
      if (isCompleted) return; isCompleted = true
      onError && onError(err)
    }
  })

  requestTask.onChunkReceived((res) => {
    if (isCompleted) return
    if (res.data && Object.prototype.toString.call(res.data) === '[object ArrayBuffer]') {
      rawChunks.push(new Uint8Array(res.data))
      flushNewLines()
    }
  })

  function flushNewLines() {
    const fullText = concatAndDecode(rawChunks)
    const allLines = fullText.split('\n')
    const newLines = allLines.slice(processedLineCount)
    if (newLines.length <= 1) return
    const linesToProcess = newLines.slice(0, -1)
    processedLineCount += linesToProcess.length
    for (const line of linesToProcess) processLine(line, onMessage)
  }

  function flushReservedLine() {
    const fullText = concatAndDecode(rawChunks)
    const allLines = fullText.split('\n')
    if (processedLineCount < allLines.length) {
      processLine(allLines[processedLineCount++], onMessage)
    }
  }

  return { abort: () => { if (requestTask) requestTask.abort() } }
}
