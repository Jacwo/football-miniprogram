// utils/markdown.js - Markdown 解析工具（基于 marked）
// 需要在微信开发者工具中执行"工具 → 构建 npm"后方可使用
let marked

function getMarked() {
  if (!marked) {
    marked = require('marked')
  }
  return marked
}

/**
 * 预处理 Markdown —— 修复 AI 流式输出缺少换行的问题
 * AI 输出常把多个 block 元素挤在同一行，导致 marked 无法识别：
 *   "文本。---###1.标题* **子标题**: 内容"
 * 预处理将其还原为标准的多行格式
 */
function preprocessMarkdown(md) {
  if (!md) return ''

  let text = md

  // ====== 0) 全局清理 ======
  text = text.replace(/\r\n/g, '\n')
  text = text.replace(/\r/g, '')
  text = text.replace(/[\u200B-\u200F\u2028\u2029\uFEFF]/g, '')

  // ====== 1) 分离标题/段落行尾的表格内容 ======
  // 策略 A: 标题行 + 表格 → "###标题|col1||:--||data|" 在起始管道前切开
  text = text.replace(/^(#{1,6}\s*)(.+?)\|([^|]+\|[^\n]*\|\|:[-:]+\|.*)$/gm, '$1$2\n|$3')
  // 策略 B: 段落文本后紧跟的表格（含分隔符特征 ||:---）
  text = text.replace(/([^\n|])\|(\s*\S.*?\|\|:[-:]+\|[^\n]*)/g, '$1\n|$2')
  // 策略 C: 表格数据行末尾的非表格内容粘连
  //     "|cell|...|text###" 或 "|cell|...|text---" → 在 | 后切断
  text = text.replace(/(\|[^\n|]+)\|(#{1,6}[\s\S]*)$/gm, '$1\n$2')
  text = text.replace(/(\|[^\n|]+)\|(\s*---\s*)$/gm, '$1\n$2')
  // 更通用的：表格行末尾 | 后面跟着明显非表格内容（标题/中文开头的大段文本）
  text = text.replace(/(\|[^\n|]{0,80})\|([^|\n][^|\n]{10,}\s*(?:###|---|\*\*))$/gm, '$1\n$2')

  // ====== 2) 用 || 双管道拆分挤在一起的表格行 ======
  text = _splitSquishedTables(text)

  // ====== 3) 分隔线处理 ======
  const lines = text.split('\n')
  text = lines.map(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('|')) return line
    if (/^-{3,}\s*$/.test(trimmed)) return '---'
    return line
  }).join('\n')
  text = text.replace(/([^\n|:])---/g, '$1\n\n---')
  text = text.replace(/^---/gm, '\n---\n')

  // ====== 4) 标题格式修复 ======
  text = text.replace(/([^\n])###(\d+[.\-\d]*[.．、])/g, '$1\n\n### $2')
  text = text.replace(/^###(\d+[.\-\d]*[.．、])/gm, '### $1')

  // ====== 5) 子标题 / 列表项拆分（核心：每个子标题独立成段） ======
  // AI 输出格式（两种）：
  //   A) "-**市场预期**:text.-**异常波动**:text"  （无空格，-紧跟**）
  //   B) "* **市场预期**：text.* **异常波动**：text" （有空格，*空格**）← 实际最常见！
  // 目标: 每个子标题变成独立段落/列表项，marked 才能正确解析
  let prevText = ''
  let maxRounds = 6
  while (prevText !== text && maxRounds-- > 0) {
    prevText = text
    // A) -**标题**: 或 -**标题**：（无空格的 -** 模式）
    text = text.replace(/([^\n])-(\*\*[^*]+\*\*)(?=[:：【《(（])/g, '$1\n\n$2')
    text = text.replace(/^(\s*)-(\*\*[^*]+\*\*)(?=[:：【《(（])/gm, '$1$2')
    // B) * **标题**：或 * **标题**: （有空格的 * ** 模式 — 实际AI输出主流格式）
    //    行中间: "文本* **标题**：" → 在 * 前拆行
    text = text.replace(/([^\n\*])\*(\s+\*\*[^*]+\*\*)(?=[:：【《(（])/g, '$1\n\n*$2')
    //    行首已独立的: "* **标题**" → 去掉前导 * 让 marked 当作普通段落（含 strong）
    text = text.replace(/^(\s*)\*(\s+\*\*[^*]+\*\*)(?=[:：【《(（])/gm, '$1$2')
  }
  text = text.replace(/\n{3,}/g, '\n\n')

  // ====== 6) 收尾 ======
  text = text.replace(/^\n+/, '')
  text = text.replace(/\n+$/, '')

  return text
}
function _splitSquishedTables(text) {
  if (!text || !text.includes('|')) return text

  // 快速判断：已有多行表格结构则跳过
  const lineCount = text.split('\n').length
  const pipeLines = (text.match(/^\s*\|/gm) || []).length
  if (lineCount >= 6 && pipeLines >= 3) return text

  // ===== 核心策略：用 || (双管道) 作为行分隔符 =====
  // 挤在一起的表格格式: |a|b||:---:|:---:||x|y||z|w||
  // || 是天然的行边界标记

  // 逐行处理所有以 | 开头的长行
  text = text.replace(/^(\|.*)$/gm, function(line) {
    if (line.includes('\n')) return line  // 已经是多行的跳过
    
    // 检查是否包含 || (行分隔符特征)
    if (!line.match(/\|\|/)) return line
    
    // 用 || 分割成"段"，每段是一行表格内容
    const segments = line.split('||')
    
    // 过滤空段并给每段补上首尾 |
    const rows = segments
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => {
        if (!s.startsWith('|')) s = '|' + s
        if (!s.endsWith('|')) s = s + '|'
        return s
      })
    
    // 如果只有一行，不需要拆分
    if (rows.length <= 1) return line
    
    return rows.join('\n')
  })

  // 二次清理：处理单行内没有 || 但 pipe 数量异常多的情况（备用方案）
  text = text.replace(/^(\|.*)$/gm, function(line) {
    if (line.includes('\n')) return line
    const pipes = (line.match(/\|/g) || []).length
    if (pipes < 10) return line  // pipe 数不够多，不是挤在一起的表格
    
    // 尝试找分隔行来确定列数
    const cells = line.split('|').filter((c,i) => i>0 && i<line.split('|').length-1)
    // 假设合理表格不超过 8 列，如果数据格远超则尝试按约 6-7 列拆
    if (cells.length <= 8) return line
    
    // 按 6 列拆（常见表格宽度）
    const cols = 6
    const rows = []
    for (let i = 0; i < cells.length; i += cols) {
      rows.push('|' + cells.slice(i, i + cols).join('|') + '|')
    }
    return rows.join('\n')
  })

  return text
}
/**
 * 解析 Markdown 文本为自定义节点数组
 * @param {string} markdown Markdown 文本
 * @returns {Array} 节点数组
 */
function parseMarkdown(markdown) {
  if (!markdown) return []

  try {
    const preprocessed = preprocessMarkdown(markdown)
    const tokens = getMarked().lexer(preprocessed)
    return convertBlockTokens(tokens)
  } catch (e) {
    console.error('Markdown 解析失败:', e)
    // 降级为纯文本段落
    return [{ type: 'paragraph', children: [{ type: 'text', text: markdown }] }]
  }
}

/**
 * 将 marked 的顶层 tokens 转换为自定义节点
 */
function convertBlockTokens(tokens) {
  const nodes = []

  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        nodes.push({
          type: 'heading',
          level: token.depth,
          children: convertInlineTokens(token.tokens)
        })
        break

      case 'paragraph':
        nodes.push({
          type: 'paragraph',
          children: convertInlineTokens(token.tokens)
        })
        break

      case 'code':
        nodes.push({
          type: 'code',
          language: token.lang || '',
          content: token.text
        })
        break

      case 'blockquote':
        nodes.push({
          type: 'blockquote',
          children: flattenBlockquoteTokens(token.tokens)
        })
        break

      case 'list':
        nodes.push(convertListToken(token))
        break

      case 'hr':
        nodes.push({ type: 'hr' })
        break

      case 'table':
        // marked v2.1.3: inline tokens 在 token.tokens.header[] 和 token.tokens.cells[][] 中
        // token.header / token.cells 是纯字符串数组，不含 tokens
        nodes.push({
          type: 'table',
          header: (token.tokens && token.tokens.header
            ? token.tokens.header.map(t => ({ children: convertInlineTokens(t) }))
            : (token.header || []).map(t => ({ children: [{ type: 'text', text: t || '' }] }))
          ),
          rows: (token.tokens && token.tokens.cells
            ? token.tokens.cells.map(row => row.map(t => ({ children: convertInlineTokens(t) })))
            : (token.cells || []).map(row => (row || []).map(t => ({ children: [{ type: 'text', text: t || '' }] })))
          ),
          align: token.align || []
        })
        break

      case 'html':
        if (token.raw && token.raw.trim()) {
          nodes.push({
            type: 'paragraph',
            children: [{ type: 'text', text: token.raw }]
          })
        }
        break

      case 'space':
        // 跳过空白
        break

      default:
        // 兜底：未知类型当作段落
        if (token.raw && token.raw.trim()) {
          nodes.push({
            type: 'paragraph',
            children: [{ type: 'text', text: token.raw }]
          })
        }
    }
  }

  return nodes
}

/**
 * 将 marked 的行内 tokens 转换为自定义格式
 * 包含 fallback：扫描残留的 **...** 并转为 strong 节点（兼容小程序环境）
 */
function convertInlineTokens(tokens) {
  if (!tokens || !tokens.length) {
    return [{ type: 'text', text: '' }]
  }

  const children = []

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        children.push({ type: 'text', text: token.text })
        break

      case 'strong':
        children.push({ type: 'strong', text: token.text })
        break

      case 'em':
        children.push({ type: 'em', text: token.text })
        break

      case 'codespan':
        children.push({ type: 'code-inline', text: token.text })
        break

      case 'link':
        children.push({ type: 'link', text: token.text, url: token.href })
        break

      case 'image':
        children.push({ type: 'text', text: token.title || token.text || '[图片]' })
        break

      case 'br':
        children.push({ type: 'text', text: '\n' })
        break

      case 'del':
        children.push({ type: 'text', text: token.text })
        break

      default:
        if (token.raw) {
          children.push({ type: 'text', text: token.raw })
        }
    }
  }

  // ====== Fallback：扫描所有 text 节点中残留的未解析 **...** ======
  // 某些环境下（如小程序）marked 可能不解析 strong，导致 **文字** 作为纯文本输出
  // 这里做二次提取，确保加粗始终生效
  return _extractStrongFromText(children)
}

/**
 * 扫描子节点中的 text 内容，将残留的 **...** 提取为 strong 节点
 * 支持嵌套：一个 text 中可能包含多段 **...**
 */
function _extractStrongFromText(children) {
  if (!children || !children.length) return children

  const result = []
  // 匹配 **非空内容** （排除空匹配和代码块内的）
  const strongRegex = /\*\*([^*]+?)\*\*/g

  for (let i = 0; i < children.length; i++) {
    const child = children[i]

    // 只处理纯文本节点；已识别的 strong/em/link 等跳过
    if (child.type !== 'text' || !child.text) {
      result.push(child)
      continue
    }

    const text = child.text
    // 快速检查：不含 ** 则直接保留
    if (!text.includes('**')) {
      result.push(child)
      continue
    }

    // 用正则拆分 text → 交错输出 [普通文本, strong, 普通文本, strong, ...]
    let lastIndex = 0
    let match
    let hasStrong = false
    // 重置正则的 lastIndex（防止循环中状态泄漏）
    strongRegex.lastIndex = 0

    while ((match = strongRegex.exec(text)) !== null) {
      hasStrong = true
      // 前面的普通文本
      if (match.index > lastIndex) {
        result.push({ type: 'text', text: text.substring(lastIndex, match.index) })
      }
      // 加粗部分
      result.push({ type: 'strong', text: match[1] })
      lastIndex = match.index + match[0].length
    }

    if (hasStrong) {
      // 尾部剩余的普通文本
      if (lastIndex < text.length) {
        result.push({ type: 'text', text: text.substring(lastIndex) })
      }
      // 原始 child 已被拆分替换，不再 push
    } else {
      // 无匹配（理论上不会到这里），保留原样
      result.push(child)
    }
  }

  return result
}

/**
 * 展平 blockquote 内的 block tokens 为行内节点
 */
function flattenBlockquoteTokens(tokens) {
  if (!tokens || !tokens.length) {
    return [{ type: 'text', text: '' }]
  }

  const children = []

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
      case 'paragraph':
        if (token.tokens) {
          children.push(...convertInlineTokens(token.tokens))
        } else {
          children.push({ type: 'text', text: token.text || token.raw || '' })
        }
        break
      default:
        if (token.raw) {
          children.push({ type: 'text', text: token.raw })
        }
    }
  }

  return children.length ? children : [{ type: 'text', text: '' }]
}

/**
 * 转换列表 token
 */
function convertListToken(token) {
  const items = token.items.map(item => ({
    type: 'li',
    children: flattenListItemTokens(item.tokens)
  }))

  return {
    type: token.ordered ? 'ol' : 'ul',
    items
  }
}

/**
 * 展平列表项内的 tokens 为行内节点
 */
function flattenListItemTokens(tokens) {
  if (!tokens || !tokens.length) {
    return [{ type: 'text', text: '' }]
  }

  const children = []

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        if (token.tokens) {
          children.push(...convertInlineTokens(token.tokens))
        } else {
          children.push({ type: 'text', text: token.text || token.raw || '' })
        }
        break

      case 'paragraph':
        if (token.tokens) {
          children.push(...convertInlineTokens(token.tokens))
        } else {
          children.push({ type: 'text', text: token.text || token.raw || '' })
        }
        break

      default:
        if (token.raw) {
          children.push({ type: 'text', text: token.raw })
        }
    }
  }

  return children.length ? children : [{ type: 'text', text: '' }]
}

// ========== 以下为 rich-text 转换 ==========

/**
 * 将节点数组转换为 rich-text 可用的节点格式
 * @param {Array} nodes 解析后的节点数组
 * @returns {Array} rich-text 节点
 */
function toRichTextNodes(nodes) {
  return nodes.map(node => {
    switch (node.type) {
      case 'heading':
        return {
          name: `h${node.level}`,
          attrs: {
            class: `md-h${node.level}`
          },
          children: inlineToRichText(node.children)
        }

      case 'paragraph':
        return {
          name: 'p',
          attrs: {
            class: 'md-p'
          },
          children: inlineToRichText(node.children)
        }

      case 'blockquote':
        return {
          name: 'blockquote',
          attrs: {
            class: 'md-blockquote'
          },
          children: inlineToRichText(node.children)
        }

      case 'code':
        return {
          name: 'pre',
          attrs: {
            class: `md-code-block${node.language ? ` language-${node.language}` : ''}`
          },
          children: [{
            name: 'code',
            children: [{
              type: 'text',
              text: node.content
            }]
          }]
        }

      case 'ul':
      case 'ol':
        return {
          name: node.type,
          attrs: {
            class: `md-${node.type}`
          },
          children: node.items.map(item => ({
            name: 'li',
            attrs: {
              class: 'md-li'
            },
            children: inlineToRichText(item.children)
          }))
        }

      case 'hr':
        return {
          name: 'hr',
          attrs: {
            class: 'md-hr'
          }
        }

      case 'table':
        return {
          name: 'table',
          attrs: {
            class: 'md-table'
          },
          children: [
            {
              name: 'thead',
              children: [{
                name: 'tr',
                children: node.header.map(cell => ({
                  name: 'th',
                  children: inlineToRichText(cell.children)
                }))
              }]
            },
            {
              name: 'tbody',
              children: node.rows.map(row => ({
                name: 'tr',
                children: row.map(cell => ({
                  name: 'td',
                  children: inlineToRichText(cell.children)
                }))
              }))
            }
          ]
        }

      default:
        return {
          name: 'span',
          children: [{
            type: 'text',
            text: JSON.stringify(node)
          }]
        }
    }
  })
}

/**
 * 将行内节点转换为 rich-text 格式
 */
function inlineToRichText(nodes) {
  return nodes.map(node => {
    switch (node.type) {
      case 'text':
        return {
          type: 'text',
          text: node.text
        }

      case 'strong':
        return {
          name: 'strong',
          attrs: {
            class: 'md-strong'
          },
          children: [{
            type: 'text',
            text: node.text
          }]
        }

      case 'em':
        return {
          name: 'em',
          attrs: {
            class: 'md-em'
          },
          children: [{
            type: 'text',
            text: node.text
          }]
        }

      case 'code-inline':
        return {
          name: 'code',
          attrs: {
            class: 'md-code-inline'
          },
          children: [{
            type: 'text',
            text: node.text
          }]
        }

      case 'link':
        return {
          name: 'a',
          attrs: {
            class: 'md-link',
            href: node.url
          },
          children: [{
            type: 'text',
            text: node.text
          }]
        }

      default:
        return {
          type: 'text',
          text: node.text || ''
        }
    }
  })
}

/**
 * 渲染 Markdown 为 rich-text 节点（便捷方法）
 * @param {string} markdown
 * @returns {Array}
 */
function render(markdown) {
  const nodes = parseMarkdown(markdown)
  return toRichTextNodes(nodes)
}

/**
 * 简单转换（用于消息气泡等简单场景）
 * 只处理基本格式，返回纯文本
 */
function simpleRender(markdown) {
  if (!markdown) return ''

  return markdown
    .replace(/\*\*(.+?)\*\*/g, '$1')  // 移除粗体标记
    .replace(/\*(.+?)\*/g, '$1')      // 移除斜体标记
    .replace(/`(.+?)`/g, '$1')        // 移除行内代码标记
    .replace(/#{1,6}\s+/g, '')        // 移除标题标记
    .replace(/^>\s*/gm, '')           // 移除引用标记
    .replace(/^[-*+]\s+/gm, '• ')     // 转换无序列表
    .replace(/^\d+\.\s+/gm, '')       // 简化有序列表
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 提取链接文本
}

/**
 * 暴露 parseInline 保持向后兼容（解析一段文本为行内节点）
 */
function parseInline(text) {
  if (!text) return [{ type: 'text', text: '' }]
  try {
    const tokens = getMarked().lexer(text)
    if (tokens.length === 1 && tokens[0].type === 'paragraph') {
      return convertInlineTokens(tokens[0].tokens)
    }
    for (const token of tokens) {
      if (token.type === 'paragraph' && token.tokens) {
        return convertInlineTokens(token.tokens)
      }
    }
    return convertInlineTokens(tokens)
  } catch (e) {
    return [{ type: 'text', text }]
  }
}

module.exports = {
  parseMarkdown,
  toRichTextNodes,
  render,
  simpleRender,
  parseInline,
  inlineToRichText
}
