// api/stream.js - AI 流式对话接口
const app = getApp()

/**
 * 流式聊天 - 使用 enableChunked 分块传输
 * 需要基础库 2.20.2+
 *
 * @param {Object} options 配置项
 * @param {string} options.message 用户消息
 * @param {boolean} options.deepThinking 是否开启深度思考
 * @param {string} options.userId 用户ID
 * @param {string} options.agentId 智能体ID
 * @param {string} options.matchId 比赛ID
 * @param {string} options.sessionId 会话ID
 * @param {Function} options.onMessage 收到消息回调
 * @param {Function} options.onComplete 完成回调
 * @param {Function} options.onError 错误回调
 * @returns {Object} 包含 abort 方法的控制器
 */
function streamChat(options) {
  const { message, deepThinking = false, userId, agentId, matchId, sessionId, onMessage, onComplete, onError } = options

  const token = app.globalData.token
  let requestTask = null
  let isCompleted = false

  // 积累原始 ArrayBuffer 分片
  const rawChunks = []
  // 已处理的行数，用于增量推送（实现打字机效果）
  let processedLineCount = 0

  requestTask = wx.request({
    url: `${app.globalData.baseUrl}/api/stream/chat`,
    method: 'POST',
    data: {
      message,
      deepThinking,
      userId,
      agentId,
      matchId,
      sessionId,
      stream: true
    },
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
        // 只处理之前保留的最后一行（最多一行），避免批量倾倒
        flushReservedLine()
        onComplete && onComplete()
      } else if (res.statusCode === 401) {
        app.clearLoginState()
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

  // 每个分块到达时，用全新 Decoder 解码全部累积字节，只推送新增行
  // 避开了 iOS 上持久 TextDecoder.decode(buf, {stream:true}) 的状态错乱问题
  requestTask.onChunkReceived((res) => {
    if (isCompleted) return
    // 用 Object.prototype.toString 代替 instanceof，
    // 避免 iOS 上跨执行上下文导致 instanceof ArrayBuffer 返回 false
    if (res.data && Object.prototype.toString.call(res.data) === '[object ArrayBuffer]') {
      rawChunks.push(new Uint8Array(res.data))
      flushNewLines()
    }
  })

  /**
   * 将当前累积字节一次性解码，提取还未处理的新行并推送
   * 每次用纯 JS 解码，无状态累积，不会产生 iOS 乱码
   * 总是保留最后一行（可能被截断的 SSE 行），由 flushReservedLine 兜底
   */
  function flushNewLines() {
    const fullText = concatAndDecode(rawChunks)
    const allLines = fullText.split('\n')

    // 只处理新增的行，保留最后一行
    const newLines = allLines.slice(processedLineCount)
    if (newLines.length <= 1) return

    const linesToProcess = newLines.slice(0, -1)
    processedLineCount += linesToProcess.length

    for (const line of linesToProcess) {
      processLine(line)
    }
  }

  /**
   * 刷出被保留的最后一行（在 success 中调用）
   * 只处理一行，不会批量倾倒
   */
  function flushReservedLine() {
    const fullText = concatAndDecode(rawChunks)
    const allLines = fullText.split('\n')
    // 只取被保留的那一行（processedLineCount 位置）
    if (processedLineCount < allLines.length) {
      const line = allLines[processedLineCount]
      processedLineCount++
      processLine(line)
    }
  }

  /**
   * 处理单行 SSE 数据
   * 对标: line.startsWith('data: ') → JSON.parse(line.slice(6))
   */
  function processLine(line) {
    if (!line) return

    // 匹配 "data: " (6字符) 或 "data:" (5字符)
    let dataStr = ''
    if (line.startsWith('data: ')) {
      dataStr = line.slice(6)
    } else if (line.startsWith('data:')) {
      dataStr = line.slice(5)
    } else {
      return
    }

    // 跳过空数据或结束标记
    if (!dataStr || dataStr === '[DONE]') return

    // JSON 格式: DeepSeek / OpenAI 兼容
    if (dataStr.startsWith('{')) {
      try {
        const data = JSON.parse(dataStr)
        const delta = (data.choices && data.choices[0] && data.choices[0].delta) || {}
        // 使用 != null 避免 0/false 等 falsy 值被吞掉
        const content = delta.reasoning_content != null ? String(delta.reasoning_content) :
                        delta.content != null ? String(delta.content) : ''
        if (content) {
          onMessage && onMessage(content)
        }
      } catch (e) {
        // JSON 解析失败（截断 chunk），忽略
      }
    } else {
      // 纯文本透传（向后兼容）
      onMessage && onMessage(dataStr)
    }
  }

  // 返回控制器
  return {
    abort: () => {
      if (requestTask) {
        requestTask.abort()
      }
    }
  }
}

/**
 * 轮询方式的流式聊天（降级方案）
 * 适用于不支持 enableChunked 的情况
 *
 * @param {Object} options 配置项
 */
function streamChatPolling(options) {
  const { message, deepThinking = false, userId, agentId, matchId, sessionId, onMessage, onComplete, onError } = options

  const token = app.globalData.token
  let pollingSessionId = null
  let isAborted = false
  let pollTimer = null

  // 首先发起聊天请求
  wx.request({
    url: `${app.globalData.baseUrl}/api/stream/chat/start`,
    method: 'POST',
    data: {
      message,
      deepThinking,
      userId,
      agentId,
      matchId,
      sessionId
    },
    header: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    success: (res) => {
      if (res.statusCode === 200 && res.data.code === 0) {
        pollingSessionId = res.data.data.sessionId
        startPolling()
      } else {
        onError && onError(new Error((res.data && res.data.message) || '启动对话失败'))
      }
    },
    fail: (err) => {
      onError && onError(err)
    }
  })

  /**
   * 开始轮询
   */
  function startPolling() {
    poll()
  }

  /**
   * 单次轮询
   */
  function poll() {
    if (isAborted || !pollingSessionId) return

    wx.request({
      url: `${app.globalData.baseUrl}/api/stream/chat/next`,
      method: 'GET',
      data: { sessionId: pollingSessionId },
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (isAborted) return

        if (res.statusCode === 200 && res.data.code === 0) {
          const { content, done } = res.data.data

          if (content) {
            onMessage && onMessage(content)
          }

          if (done) {
            onComplete && onComplete()
          } else {
            // 继续轮询
            pollTimer = setTimeout(poll, 100)
          }
        } else {
          onError && onError(new Error((res.data && res.data.message) || '获取消息失败'))
        }
      },
      fail: (err) => {
        if (!isAborted) {
          onError && onError(err)
        }
      }
    })
  }

  return {
    abort: () => {
      isAborted = true
      if (pollTimer) {
        clearTimeout(pollTimer)
      }
    }
  }
}

/**
 * 拼接多个 Uint8Array 并一次性 UTF-8 解码
 * 纯 JS 实现，不依赖 TextDecoder（iOS 微信 JSCore 不支持）
 */
function concatAndDecode(chunks) {
  if (!chunks || chunks.length === 0) return ''

  // 计算总字节数
  let totalLen = 0
  for (const c of chunks) {
    totalLen += c.length
  }

  // 拼接到一个 Uint8Array
  const combined = new Uint8Array(totalLen)
  let offset = 0
  for (const c of chunks) {
    combined.set(c, offset)
    offset += c.length
  }

  return utf8Decode(combined)
}

/**
 * 纯 JS UTF-8 解码（兼容 iOS 微信 JSCore）
 * 非法字节序列用 U+FFFD 替代，对标 TextDecoder fatal: false
 */
function utf8Decode(bytes) {
  let result = ''
  let i = 0
  const len = bytes.length

  while (i < len) {
    const b0 = bytes[i]

    // 1-byte: 0xxxxxxx
    if (b0 < 0x80) {
      result += String.fromCharCode(b0)
      i += 1
      continue
    }

    // 2-byte: 110xxxxx 10xxxxxx
    if (b0 >= 0xC0 && b0 < 0xE0) {
      if (i + 1 >= len) { result += '\uFFFD'; break }
      const b1 = bytes[i + 1]
      if ((b1 & 0xC0) !== 0x80) { result += '\uFFFD'; i += 1; continue }
      const cp = ((b0 & 0x1F) << 6) | (b1 & 0x3F)
      result += String.fromCharCode(cp)
      i += 2
      continue
    }

    // 3-byte: 1110xxxx 10xxxxxx 10xxxxxx
    if (b0 >= 0xE0 && b0 < 0xF0) {
      if (i + 2 >= len) { result += '\uFFFD'; break }
      const b1 = bytes[i + 1]
      const b2 = bytes[i + 2]
      if ((b1 & 0xC0) !== 0x80 || (b2 & 0xC0) !== 0x80) { result += '\uFFFD'; i += 1; continue }
      const cp = ((b0 & 0x0F) << 12) | ((b1 & 0x3F) << 6) | (b2 & 0x3F)
      result += String.fromCharCode(cp)
      i += 3
      continue
    }

    // 4-byte: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx (surrogate pairs)
    if (b0 >= 0xF0 && b0 < 0xF8) {
      if (i + 3 >= len) { result += '\uFFFD'; break }
      const b1 = bytes[i + 1]
      const b2 = bytes[i + 2]
      const b3 = bytes[i + 3]
      if ((b1 & 0xC0) !== 0x80 || (b2 & 0xC0) !== 0x80 || (b3 & 0xC0) !== 0x80) { result += '\uFFFD'; i += 1; continue }
      let cp = ((b0 & 0x07) << 18) | ((b1 & 0x3F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F)
      // 超出 BMP，用 surrogate pair 表示
      if (cp > 0xFFFF) {
        cp -= 0x10000
        result += String.fromCharCode((cp >>> 10) + 0xD800, (cp & 0x3FF) + 0xDC00)
      } else {
        result += String.fromCharCode(cp)
      }
      i += 4
      continue
    }

    // 非法字节
    result += '\uFFFD'
    i += 1
  }

  return result
}

/**
 * 检查是否支持分块传输
 */
function isChunkedSupported() {
  const systemInfo = wx.getSystemInfoSync()
  const SDKVersion = systemInfo.SDKVersion || ''
  return compareVersion(SDKVersion, '2.20.2') >= 0
}

/**
 * 版本号比较
 */
function compareVersion(v1, v2) {
  const v1Parts = v1.split('.').map(Number)
  const v2Parts = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const p1 = v1Parts[i] || 0
    const p2 = v2Parts[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

/**
 * 智能选择流式方案
 */
function smartStreamChat(options) {
  if (isChunkedSupported()) {
    return streamChat(options)
  } else {
    return streamChatPolling(options)
  }
}

/**
 * 流式分析比赛 - 使用 enableChunked 分块传输
 * 用于 ai-analysis 页面的最新 AI 分析获取
 *
 * @param {Object} options 配置项
 * @param {string} options.matchId 比赛ID
 * @param {string} options.userId 用户ID
 * @param {Function} options.onMessage 收到消息回调
 * @param {Function} options.onComplete 完成回调
 * @param {Function} options.onError 错误回调
 * @returns {Object} 包含 abort 方法的控制器
 */
function streamAnalysis(options) {
  const { matchId, userId, onMessage, onComplete, onError } = options

  const token = app.globalData.token || wx.getStorageSync('token')
  let requestTask = null
  let isCompleted = false

  // 积累原始 ArrayBuffer 分片
  const rawChunks = []
  // 已处理的行数，用于增量推送（实现打字机效果）
  let processedLineCount = 0

  requestTask = wx.request({
    url: `${app.globalData.baseUrl}/api/match/stream/analysis/${matchId}/${userId}`,
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
        app.clearLoginState && app.clearLoginState()
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

  // 分块到达时的处理逻辑（与 streamChat 一致）
  requestTask.onChunkReceived((res) => {
    if (isCompleted) return
    if (res.data && Object.prototype.toString.call(res.data) === '[object ArrayBuffer]') {
      rawChunks.push(new Uint8Array(res.data))
      flushNewLines()
    }
  })

  /**
   * 将当前累积字节一次性解码，提取还未处理的新行并推送
   */
  function flushNewLines() {
    const fullText = concatAndDecode(rawChunks)
    const allLines = fullText.split('\n')

    // 只处理新增的行，保留最后一行
    const newLines = allLines.slice(processedLineCount)
    if (newLines.length <= 1) return

    const linesToProcess = newLines.slice(0, -1)
    processedLineCount += linesToProcess.length

    for (const line of linesToProcess) {
      processLine(line)
    }
  }

  /**
   * 刷出被保留的最后一行（在 success 中调用）
   */
  function flushReservedLine() {
    const fullText = concatAndDecode(rawChunks)
    const allLines = fullText.split('\n')
    if (processedLineCount < allLines.length) {
      const line = allLines[processedLineCount]
      processedLineCount++
      processLine(line)
    }
  }

  /**
   * 处理单行 SSE 数据（与 streamChat 保持一致）
   * 支持 OpenAI/DeepSeek 兼容格式和纯文本透传
   */
  function processLine(line) {
    if (!line) return

    // 匹配 "data: " (6字符) 或 "data:" (5字符)
    let dataStr = ''
    if (line.startsWith('data: ')) {
      dataStr = line.slice(6)
    } else if (line.startsWith('data:')) {
      dataStr = line.slice(5)
    } else {
      return
    }

    // 跳过空数据或结束标记
    if (!dataStr || dataStr === '[DONE]') return

    // JSON 格式: OpenAI / DeepSeek 兼容
    if (dataStr.startsWith('{')) {
      try {
        const data = JSON.parse(dataStr)
        const delta = (data.choices && data.choices[0] && data.choices[0].delta) || {}
        const content = delta.reasoning_content != null ? String(delta.reasoning_content) :
                        delta.content != null ? String(delta.content) : ''
        if (content) {
          onMessage && onMessage(content)
        }
      } catch (e) {
        // JSON 解析失败（截断 chunk），忽略
      }
    } else {
      // 纯文本透传（向后兼容）
      onMessage && onMessage(dataStr)
    }
  }

  // 返回控制器
  return {
    abort: () => {
      if (requestTask) {
        requestTask.abort()
      }
    }
  }
}

module.exports = {
  streamChat,
  streamChatPolling,
  smartStreamChat,
  streamAnalysis,
  isChunkedSupported
}
