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

  // 1) 连续三个 - 当作分隔线：前后补换行
  text = text.replace(/([^\n])---/g, '$1\n\n---\n\n')
  text = text.replace(/^---/gm, '\n---\n')

  // 2) ### 后紧跟数字（###1. / ###2. 等）→ 补空间并确保在新行起头
  text = text.replace(/([^\n])###(\d+[.．、])/g, '$1\n\n### $2')
  text = text.replace(/^###(\d+[.．、])/gm, '### $1')

  // 3) * 或 - 开头的列表项紧跟标题或段落尾部 → 补换行
  text = text.replace(/([^\n])(\*|-) \*\*/g, '$1\n$2 **')

  // 4) 清理多余空行（超过2个连续空行合并为2个）
  text = text.replace(/\n{3,}/g, '\n\n')

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
        // 表格降级为纯文本段落
        nodes.push({
          type: 'paragraph',
          children: [{ type: 'text', text: token.raw }]
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

  return children
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

// ========== 以下为 rich-text 转换（保持不变） ==========

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
