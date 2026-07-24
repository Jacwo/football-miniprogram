<template>
  <view class="markdown-viewer">
    <block v-for="(node, index) in parsedNodes" :key="index">
      <!-- 标题 -->
      <view v-if="node.type === 'heading'" :class="'md-heading md-h' + node.level">
        <block v-for="(child, ci) in node.children" :key="ci">
          <text v-if="child.type === 'strong'" class="md-strong" :selectable="true">{{ child.text }}</text>
          <text v-else-if="child.type === 'em'" class="md-em" :selectable="true">{{ child.text }}</text>
          <text v-else-if="child.type === 'code-inline'" class="md-code-inline" :selectable="true">{{ child.text }}</text>
          <text v-else-if="child.type === 'link'" class="md-link" :data-url="child.url" @tap="onLinkTap(child)">{{ child.text }}</text>
          <text v-else :selectable="true">{{ child.text }}</text>
        </block>
      </view>

      <!-- 段落 -->
      <view v-else-if="node.type === 'paragraph'" class="md-paragraph">
        <block v-for="(child, ci) in node.children" :key="ci">
          <text v-if="child.type === 'strong'" class="md-strong" :selectable="true">{{ child.text }}</text>
          <text v-else-if="child.type === 'em'" class="md-em" :selectable="true">{{ child.text }}</text>
          <text v-else-if="child.type === 'code-inline'" class="md-code-inline" :selectable="true">{{ child.text }}</text>
          <text v-else-if="child.type === 'link'" class="md-link" :data-url="child.url" @tap="onLinkTap(child)">{{ child.text }}</text>
          <text v-else :selectable="true">{{ child.text }}</text>
        </block>
      </view>

      <!-- 代码块 -->
      <view v-else-if="node.type === 'code'" class="md-code-block">
        <view class="code-header">
          <text class="code-language">{{ node.language || 'code' }}</text>
          <view class="copy-btn" @tap="copyCode(index)">
            <text class="copy-text">复制</text>
          </view>
        </view>
        <scroll-view class="code-content" scroll-x :enhanced="true" :show-scrollbar="false">
          <text class="code-text" :selectable="true" :user-select="true">{{ node.content }}</text>
        </scroll-view>
      </view>

      <!-- 引用 -->
      <view v-else-if="node.type === 'blockquote'" class="md-blockquote">
        <block v-for="(child, ci) in node.children" :key="ci">
          <text v-if="child.type === 'strong'" class="md-strong" :selectable="true">{{ child.text }}</text>
          <text v-else-if="child.type === 'em'" class="md-em" :selectable="true">{{ child.text }}</text>
          <text v-else-if="child.type === 'code-inline'" class="md-code-inline" :selectable="true">{{ child.text }}</text>
          <text v-else-if="child.type === 'link'" class="md-link" :data-url="child.url" @tap="onLinkTap(child)">{{ child.text }}</text>
          <text v-else :selectable="true">{{ child.text }}</text>
        </block>
      </view>

      <!-- 无序列表 -->
      <view v-else-if="node.type === 'ul'" class="md-list md-ul">
        <view v-for="(li, liIndex) in node.items" :key="liIndex" class="md-li">
          <text class="li-marker">•</text>
          <view class="li-content">
            <block v-for="(child, ci) in li.children" :key="ci">
              <text v-if="child.type === 'strong'" class="md-strong" :selectable="true">{{ child.text }}</text>
              <text v-else-if="child.type === 'em'" class="md-em" :selectable="true">{{ child.text }}</text>
              <text v-else-if="child.type === 'code-inline'" class="md-code-inline" :selectable="true">{{ child.text }}</text>
              <text v-else-if="child.type === 'link'" class="md-link" :data-url="child.url" @tap="onLinkTap(child)">{{ child.text }}</text>
              <text v-else :selectable="true">{{ child.text }}</text>
            </block>
          </view>
        </view>
      </view>

      <!-- 有序列表 -->
      <view v-else-if="node.type === 'ol'" class="md-list md-ol">
        <view v-for="(li, liIndex) in node.items" :key="liIndex" class="md-li">
          <text class="li-marker">{{ liIndex + 1 }}.</text>
          <view class="li-content">
            <block v-for="(child, ci) in li.children" :key="ci">
              <text v-if="child.type === 'strong'" class="md-strong" :selectable="true">{{ child.text }}</text>
              <text v-else-if="child.type === 'em'" class="md-em" :selectable="true">{{ child.text }}</text>
              <text v-else-if="child.type === 'code-inline'" class="md-code-inline" :selectable="true">{{ child.text }}</text>
              <text v-else-if="child.type === 'link'" class="md-link" :data-url="child.url" @tap="onLinkTap(child)">{{ child.text }}</text>
              <text v-else :selectable="true">{{ child.text }}</text>
            </block>
          </view>
        </view>
      </view>

      <!-- 分隔线 -->
      <view v-else-if="node.type === 'hr'" class="md-hr"></view>

      <!-- 表格 -->
      <view v-else-if="node.type === 'table'" class="md-table-wrap">
        <scroll-view class="md-table-scroll" scroll-x :enhanced="true" :show-scrollbar="false">
          <view class="md-table">
            <view class="md-thead">
              <view class="md-tr">
                <view v-for="(cell, ci) in node.header" :key="ci" class="md-th">
                  <block v-for="(child, cj) in cell.children" :key="cj">
                    <text v-if="child.type === 'strong'" class="md-strong" :selectable="true">{{ child.text }}</text>
                    <text v-else-if="child.type === 'em'" class="md-em" :selectable="true">{{ child.text }}</text>
                    <text v-else-if="child.type === 'code-inline'" class="md-code-inline" :selectable="true">{{ child.text }}</text>
                    <text v-else-if="child.type === 'link'" class="md-link" :data-url="child.url" @tap="onLinkTap(child)">{{ child.text }}</text>
                    <text v-else :selectable="true">{{ child.text }}</text>
                  </block>
                </view>
              </view>
            </view>
            <view class="md-tbody">
              <view v-for="(row, ri) in node.rows" :key="ri" class="md-tr">
                <view v-for="(cell, ci) in row" :key="ci" class="md-td">
                  <block v-for="(child, cj) in cell.children" :key="cj">
                    <text v-if="child.type === 'strong'" class="md-strong" :selectable="true">{{ child.text }}</text>
                    <text v-else-if="child.type === 'em'" class="md-em" :selectable="true">{{ child.text }}</text>
                    <text v-else-if="child.type === 'code-inline'" class="md-code-inline" :selectable="true">{{ child.text }}</text>
                    <text v-else-if="child.type === 'link'" class="md-link" :data-url="child.url" @tap="onLinkTap(child)">{{ child.text }}</text>
                    <text v-else :selectable="true">{{ child.text }}</text>
                  </block>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </block>
  </view>
</template>

<script>
import { ref, watch } from 'vue'
import { parseMarkdown } from '@/utils/markdown'

export default {
  name: 'MarkdownViewer',
  props: {
    content: { type: String, default: '' }
  },
  setup(props) {
    const parsedNodes = ref([])

    function parse(content) {
      if (!content) {
        parsedNodes.value = []
        return
      }
      try {
        parsedNodes.value = parseMarkdown(content)
      } catch (e) {
        console.error('Markdown 解析失败:', e)
        parsedNodes.value = [{ type: 'paragraph', children: [{ type: 'text', text: content }] }]
      }
    }

    watch(() => props.content, (val) => parse(val), { immediate: true })

    function copyCode(index) {
      const node = parsedNodes.value[index]
      if (!node || node.type !== 'code') return
      // #ifdef MP-WEIXIN
      wx.setClipboardData({ data: node.content, success: () => wx.showToast({ title: '已复制', icon: 'success', duration: 1500 }) })
      // #endif
      // #ifndef MP-WEIXIN
      uni.setClipboardData({ data: node.content, success: () => uni.showToast({ title: '已复制', icon: 'success' }) })
      // #endif
    }

    function onLinkTap(child) {
      const url = child && child.url
      if (!url) return
      // #ifdef MP-WEIXIN
      wx.setClipboardData({ data: url, success: () => wx.showToast({ title: '链接已复制', icon: 'success', duration: 1500 }) })
      // #endif
      // #ifndef MP-WEIXIN
      uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'success' }) })
      // #endif
    }

    return { parsedNodes, copyCode, onLinkTap }
  }
}
</script>

<style>
.markdown-viewer {
  font-size: 28rpx;
  line-height: 1.8;
  color: #333;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  padding: 8rpx 0;
}

/* 标题 */
.md-heading { font-weight: 700; color: #1a1a1a; margin: 0; padding: 32rpx 0 18rpx; line-height: 1.5; }
.md-heading:first-child { padding-top: 10rpx; }
.md-h1 { font-size: 40rpx; padding: 28rpx 0 16rpx; }
.md-h2 { font-size: 36rpx; }
.md-h3 { font-size: 32rpx; }
.md-h4, .md-h5, .md-h6 { font-size: 30rpx; }

/* 段落 */
.md-paragraph { margin: 0; padding: 12rpx 0; line-height: 1.9; }
.md-paragraph > text { display: inline; word-break: break-word; overflow-wrap: break-word; }

/* 粗体 / 斜体 */
.md-strong { font-weight: 700; color: #0f172a; }
.md-em { font-style: italic; }

/* 行内代码 */
.md-code-inline {
  background-color: #f1f5f9; color: #e83e8c; padding: 4rpx 12rpx; border-radius: 6rpx;
  font-family: Menlo, Monaco, Consolas, monospace; font-size: 26rpx; word-break: keep-all;
}

/* 代码块 */
.md-code-block { background-color: #282c34; border-radius: 12rpx; margin: 0; padding: 0; margin-bottom: 20rpx; overflow: hidden; }
.code-header { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 20rpx; background-color: #21252b; border-bottom: 1rpx solid #3a3f4b; }
.code-language { font-size: 24rpx; color: #98c379; }
.copy-btn { padding: 4rpx 16rpx; background-color: #3a3f4b; border-radius: 6rpx; }
.copy-text { font-size: 22rpx; color: #abb2bf; }
.code-content { padding: 20rpx; white-space: pre; }
.code-text { font-family: Menlo, Monaco, Consolas, monospace; font-size: 24rpx; color: #abb2bf; line-height: 1.6; }

/* 引用 */
.md-blockquote {
  margin: 0 0 20rpx 0; padding: 18rpx 24rpx; background-color: #f6f8fa;
  border-left: 6rpx solid #1890ff; border-radius: 0 8rpx 8rpx 0; color: #555; font-style: italic;
}

/* 列表 */
.md-list { margin: 0; padding: 10rpx 0 20rpx 8rpx; }
.md-li { display: flex; align-items: flex-start; margin: 0; padding: 6rpx 0; line-height: 1.8; }
.li-marker { flex-shrink: 0; width: 40rpx; color: #1890ff; font-weight: 600; line-height: 1.8; }
.li-content { flex: 1; min-width: 0; }
.li-content text { display: inline; word-break: break-word; overflow-wrap: break-word; }

/* 链接 */
.md-link { color: #1890ff; text-decoration: underline; word-break: break-all; }

/* 分隔线 */
.md-hr { margin: 0; padding: 20rpx 0; border: none; border-top: 2rpx solid #e8e8e8; }

/* 表格 */
.md-table-wrap { margin: 20rpx 0; border-radius: 8rpx; overflow: hidden; border: 1rpx solid #e0e0e0; }
.md-table-scroll { width: 100%; }
.md-table { display: table; width: max-content; min-width: 100%; border-collapse: collapse; }
.md-thead { display: table-header-group; background-color: #f5f7fa; }
.md-tbody { display: table-row-group; }
.md-tr { display: table-row; }
.md-tr:last-child .md-td { border-bottom: none; }
.md-th { display: table-cell; padding: 16rpx 20rpx; font-size: 26rpx; font-weight: 700; color: #333; border-right: 1rpx solid #e0e0e0; border-bottom: 2rpx solid #d0d0d0; white-space: nowrap; }
.md-th:last-child { border-right: none; }
.md-td { display: table-cell; padding: 14rpx 20rpx; font-size: 26rpx; color: #555; border-right: 1rpx solid #e8e8e8; border-bottom: 1rpx solid #f0f0f0; line-height: 1.6; }
.md-td:last-child { border-right: none; }
.md-td .md-strong, .md-th .md-strong { font-weight: 700; color: #0f172a; }
.md-td .md-code-inline, .md-th .md-code-inline { font-size: 24rpx; }
</style>
