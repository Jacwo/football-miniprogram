// utils/markdown.js - Markdown 解析工具（基于 marked）
import { marked } from 'marked'

/**
 * 预处理 Markdown —— 修复 AI 流式输出缺少换行的问题
 */
function preprocessMarkdown(md) {
  if (!md) return ''
  let text = md
  text = text.replace(/\r\n/g, '\n')
  text = text.replace(/\r/g, '')
  text = text.replace(/[\u200B-\u200F\u2028\u2029\uFEFF]/g, '')
  // 分离标题/段落行尾的表格内容
  text = text.replace(/^(#{1,6}\s*)(.+?)\|([^|]+\|[^\n]*\|\|:[-:]+\|.*)$/gm, '$1$2\n|$3')
  text = text.replace(/([^\n|])\|(\s*\S.*?\|\|:[-:]+\|[^\n]*)/g, '$1\n|$2')
  text = text.replace(/(\|[^\n|]+)\|(#{1,6}[\s\S]*)$/gm, '$1\n$2')
  text = text.replace(/(\|[^\n|]+)\|(\s*---\s*)$/gm, '$1\n$2')
  text = text.replace(/(\|[^\n|]{0,80})\|([^|\n][^|\n]{10,}\s*(?:###|---|\*\*))$/gm, '$1\n$2')
  // 用 || 双管道拆分挤在一起的表格行
  text = _splitSquishedTables(text)
  // 分隔线处理
  const lines = text.split('\n')
  text = lines.map(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('|')) return line
    if (/^-{3,}\s*$/.test(trimmed)) return '---'
    return line
  }).join('\n')
  text = text.replace(/([^\n|:])---/g, '$1\n\n---')
  text = text.replace(/^---/gm, '\n---\n')
  // 标题格式修复
  text = text.replace(/([^\n])###(\d+[.\-\d]*[.．、])/g, '$1\n\n### $2')
  text = text.replace(/^###(\d+[.\-\d]*[.．、])/gm, '### $1')
  // 子标题/列表项拆分
  let prevText = ''
  let maxRounds = 6
  while (prevText !== text && maxRounds-- > 0) {
    prevText = text
    text = text.replace(/([^\n])-(\*\*[^*]+\*\*)(?=[:：【《(（])/g, '$1\n\n$2')
    text = text.replace(/^(\s*)-(\*\*[^*]+\*\*)(?=[:：【《(（])/gm, '$1$2')
    text = text.replace(/([^\n\*])\*(\s+\*\*[^*]+\*\*)(?=[:：【《(（])/g, '$1\n\n*$2')
    text = text.replace(/^(\s*)\*(\s+\*\*[^*]+\*\*)(?=[:：【《(（])/gm, '$1$2')
  }
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.replace(/^\n+/, '')
  text = text.replace(/\n+$/, '')
  return text
}

function _splitSquishedTables(text) {
  if (!text || !text.includes('|')) return text
  text = text.replace(/^(\|.*)$/gm, function(line) {
    if (line.includes('\n')) return line
    if (!line.match(/\|\|/)) return line
    const segments = line.split('||')
    const rows = segments.map(s => s.trim()).filter(s => s.length > 0).map(s => {
      if (!s.startsWith('|')) s = '|' + s
      if (!s.endsWith('|')) s = s + '|'
      return s
    })
    if (rows.length <= 1) return line
    return rows.join('\n')
  })
  return text
}

export function parseMarkdown(markdown) {
  if (!markdown) return []
  try {
    const preprocessed = preprocessMarkdown(markdown)
    const tokens = marked.lexer(preprocessed)
    return convertBlockTokens(tokens)
  } catch (e) {
    console.error('Markdown 解析失败:', e)
    return [{ type: 'paragraph', children: [{ type: 'text', text: markdown }] }]
  }
}

function convertBlockTokens(tokens) {
  const nodes = []
  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        nodes.push({ type: 'heading', level: token.depth, children: convertInlineTokens(token.tokens) })
        break
      case 'paragraph':
        nodes.push({ type: 'paragraph', children: convertInlineTokens(token.tokens) })
        break
      case 'code':
        nodes.push({ type: 'code', language: token.lang || '', content: token.text })
        break
      case 'blockquote':
        nodes.push({ type: 'blockquote', children: flattenBlockquoteTokens(token.tokens) })
        break
      case 'list':
        nodes.push(convertListToken(token))
        break
      case 'hr':
        nodes.push({ type: 'hr' })
        break
      case 'table':
        nodes.push({
          type: 'table',
          header: (token.tokens && token.tokens.header ? token.tokens.header.map(t => ({ children: convertInlineTokens(t) })) : (token.header || []).map(t => ({ children: [{ type: 'text', text: t || '' }] }))),
          rows: (token.tokens && token.tokens.cells ? token.tokens.cells.map(row => row.map(t => ({ children: convertInlineTokens(t) }))) : (token.cells || []).map(row => (row || []).map(t => ({ children: [{ type: 'text', text: t || '' }] })))),
          align: token.align || []
        })
        break
      case 'html':
        if (token.raw && token.raw.trim()) nodes.push({ type: 'paragraph', children: [{ type: 'text', text: token.raw }] })
        break
      case 'space': break
      default:
        if (token.raw && token.raw.trim()) nodes.push({ type: 'paragraph', children: [{ type: 'text', text: token.raw }] })
    }
  }
  return nodes
}

function convertInlineTokens(tokens) {
  if (!tokens || !tokens.length) return [{ type: 'text', text: '' }]
  const children = []
  for (const token of tokens) {
    switch (token.type) {
      case 'text': children.push({ type: 'text', text: token.text }); break
      case 'strong': children.push({ type: 'strong', text: token.text }); break
      case 'em': children.push({ type: 'em', text: token.text }); break
      case 'codespan': children.push({ type: 'code-inline', text: token.text }); break
      case 'link': children.push({ type: 'link', text: token.text, url: token.href }); break
      case 'image': children.push({ type: 'text', text: token.title || token.text || '[图片]' }); break
      case 'br': children.push({ type: 'text', text: '\n' }); break
      case 'del': children.push({ type: 'text', text: token.text }); break
      default: if (token.raw) children.push({ type: 'text', text: token.raw })
    }
  }
  return _extractStrongFromText(children)
}

function _extractStrongFromText(children) {
  if (!children || !children.length) return children
  const result = []
  const strongRegex = /\*\*([^*]+?)\*\*/g
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child.type !== 'text' || !child.text) { result.push(child); continue }
    const text = child.text
    if (!text.includes('**')) { result.push(child); continue }
    let lastIndex = 0, match, hasStrong = false
    strongRegex.lastIndex = 0
    while ((match = strongRegex.exec(text)) !== null) {
      hasStrong = true
      if (match.index > lastIndex) result.push({ type: 'text', text: text.substring(lastIndex, match.index) })
      result.push({ type: 'strong', text: match[1] })
      lastIndex = match.index + match[0].length
    }
    if (hasStrong) { if (lastIndex < text.length) result.push({ type: 'text', text: text.substring(lastIndex) }) }
    else result.push(child)
  }
  return result
}

function flattenBlockquoteTokens(tokens) {
  if (!tokens || !tokens.length) return [{ type: 'text', text: '' }]
  const children = []
  for (const token of tokens) {
    switch (token.type) {
      case 'text':
      case 'paragraph':
        if (token.tokens) children.push(...convertInlineTokens(token.tokens))
        else children.push({ type: 'text', text: token.text || token.raw || '' })
        break
      default: if (token.raw) children.push({ type: 'text', text: token.raw })
    }
  }
  return children.length ? children : [{ type: 'text', text: '' }]
}

function convertListToken(token) {
  const items = token.items.map(item => ({ type: 'li', children: flattenListItemTokens(item.tokens) }))
  return { type: token.ordered ? 'ol' : 'ul', items }
}

function flattenListItemTokens(tokens) {
  if (!tokens || !tokens.length) return [{ type: 'text', text: '' }]
  const children = []
  for (const token of tokens) {
    switch (token.type) {
      case 'text':
      case 'paragraph':
        if (token.tokens) children.push(...convertInlineTokens(token.tokens))
        else children.push({ type: 'text', text: token.text || token.raw || '' })
        break
      default: if (token.raw) children.push({ type: 'text', text: token.raw })
    }
  }
  return children.length ? children : [{ type: 'text', text: '' }]
}

export function toRichTextNodes(nodes) {
  return nodes.map(node => {
    switch (node.type) {
      case 'heading': return { name: `h${node.level}`, attrs: { class: `md-h${node.level}` }, children: inlineToRichText(node.children) }
      case 'paragraph': return { name: 'p', attrs: { class: 'md-p' }, children: inlineToRichText(node.children) }
      case 'blockquote': return { name: 'blockquote', attrs: { class: 'md-blockquote' }, children: inlineToRichText(node.children) }
      case 'code': return { name: 'pre', attrs: { class: `md-code-block${node.language ? ` language-${node.language}` : ''}` }, children: [{ name: 'code', children: [{ type: 'text', text: node.content }] }] }
      case 'ul':
      case 'ol': return { name: node.type, attrs: { class: `md-${node.type}` }, children: node.items.map(item => ({ name: 'li', attrs: { class: 'md-li' }, children: inlineToRichText(item.children) })) }
      case 'hr': return { name: 'hr', attrs: { class: 'md-hr' } }
      case 'table': return {
        name: 'table', attrs: { class: 'md-table' },
        children: [
          { name: 'thead', children: [{ name: 'tr', children: node.header.map(cell => ({ name: 'th', children: inlineToRichText(cell.children) })) }] },
          { name: 'tbody', children: node.rows.map(row => ({ name: 'tr', children: row.map(cell => ({ name: 'td', children: inlineToRichText(cell.children) })) })) }
        ]
      }
      default: return { name: 'span', children: [{ type: 'text', text: JSON.stringify(node) }] }
    }
  })
}

function inlineToRichText(nodes) {
  return nodes.map(node => {
    switch (node.type) {
      case 'text': return { type: 'text', text: node.text }
      case 'strong': return { name: 'strong', attrs: { class: 'md-strong' }, children: [{ type: 'text', text: node.text }] }
      case 'em': return { name: 'em', attrs: { class: 'md-em' }, children: [{ type: 'text', text: node.text }] }
      case 'code-inline': return { name: 'code', attrs: { class: 'md-code-inline' }, children: [{ type: 'text', text: node.text }] }
      case 'link': return { name: 'a', attrs: { class: 'md-link', href: node.url }, children: [{ type: 'text', text: node.text }] }
      default: return { type: 'text', text: node.text || '' }
    }
  })
}

export function render(markdown) {
  const nodes = parseMarkdown(markdown)
  return toRichTextNodes(nodes)
}

export function simpleRender(markdown) {
  if (!markdown) return ''
  return markdown
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

export function parseInline(text) {
  if (!text) return [{ type: 'text', text: '' }]
  try {
    const tokens = marked.lexer(text)
    if (tokens.length === 1 && tokens[0].type === 'paragraph') return convertInlineTokens(tokens[0].tokens)
    for (const token of tokens) {
      if (token.type === 'paragraph' && token.tokens) return convertInlineTokens(token.tokens)
    }
    return convertInlineTokens(tokens)
  } catch (e) { return [{ type: 'text', text }] }
}
