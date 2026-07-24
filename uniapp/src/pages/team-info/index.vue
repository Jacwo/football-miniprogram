<template>
  <view class="team-info-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 主内容 -->
    <block v-else-if="groupNames.length > 0">
      <!-- 分组Tab -->
      <scroll-view class="tabs-scroll" scroll-x scroll-with-animation :scroll-into-view="'tab' + selectedGroupIndex">
        <view class="tabs-wrapper">
          <view
            v-for="(name, index) in groupNames"
            :key="index"
            :id="'tab' + index"
            :class="['tab-btn', selectedGroupIndex === index ? 'active' : '']"
            @tap="onTabTap(index)"
          >{{ name }}组</view>
        </view>
      </scroll-view>

      <!-- 球队列表 Swiper -->
      <swiper
        class="teams-swiper"
        :style="{ height: swiperHeight + 'px' }"
        :current="selectedGroupIndex"
        @change="onSwiperChange"
      >
        <swiper-item v-for="groupName in groupNames" :key="groupName">
          <scroll-view class="teams-scroll" scroll-y>
            <view class="teams-list">
              <view
                v-for="(team, teamIdx) in groupList[groupName]"
                :key="team.id"
                class="team-card"
              >
                <!-- 球队基本信息 -->
                <view class="team-card-main" @tap="onTogglePlayers(groupName, teamIdx)">
                  <view class="team-card-top">
                    <image v-if="team.logo" class="team-logo" :src="team.logo" mode="aspectFit" />
                    <view v-else class="team-logo-placeholder">⚽</view>
                    <view class="team-info-block">
                      <view class="team-name-row">
                        <text class="team-info-name">{{ team.name }}</text>
                        <text v-if="team.fifaRank" class="team-fifa-rank">FIFA #{{ team.fifaRank }}</text>
                      </view>
                      <view class="team-meta-row">
                        <text v-if="team.coach" class="team-meta">{{ team.coach }}</text>
                        <text v-if="team.continent" class="team-meta">{{ team.continent }}</text>
                        <text v-if="team.bestResult" class="team-meta">{{ team.bestResult }}</text>
                      </view>
                    </view>
                    <view class="team-card-arrow">
                      <text :class="['arrow-icon', team._playersExpanded ? 'expanded' : '']">▶</text>
                    </view>
                  </view>

                  <view v-if="team.playerCount || team.remark" class="team-card-bottom">
                    <text v-if="team.playerCount" class="team-player-count">球员 {{ team.playerCount }}人</text>
                    <text v-if="team.remark" class="team-remark">{{ team.remark }}</text>
                  </view>
                </view>

                <!-- 球员列表（可折叠）- 按位置分组 -->
                <view v-if="team._playersExpanded && team._playerSections && team._playerSections.length > 0" class="team-players-panel">
                  <view v-for="(section, si) in team._playerSections" :key="si" class="players-section">
                    <view class="section-header">
                      <text class="section-label">{{ section.label }}</text>
                      <text class="section-count">{{ section.players.length }}人</text>
                    </view>
                    <view class="players-grid">
                      <view v-for="player in section.players" :key="player.id" class="player-item">
                        <image v-if="player.headImg" class="player-avatar" :src="player.headImg" mode="aspectFill" />
                        <view v-else class="player-avatar-placeholder">
                          <image src="/static/images/logo.png" mode="aspectFill" />
                        </view>
                        <view class="player-info">
                          <text v-if="player.number" class="player-number">{{ player.number }}</text>
                          <!-- 长名字：轮播滚动 -->
                          <view v-if="!isNameFit(player.name)" class="player-name-marquee">
                            <view class="marquee-inner">
                              <text>{{ player.name }}</text>
                              <text>{{ player.name }}</text>
                            </view>
                          </view>
                          <text v-else class="player-name">{{ player.name }}</text>
                        </view>
                        <view class="player-tags">
                          <text class="player-position">{{ player.position || '-' }}</text>
                          <text v-if="player.score" class="player-score">{{ player.score }}</text>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
                <view v-else-if="team._playersExpanded" class="team-players-panel empty">
                  <text class="no-players">暂无球员数据</text>
                </view>
              </view>
            </view>
            <view class="bottom-space"></view>
          </scroll-view>
        </swiper-item>
      </swiper>

      <!-- 底部指示器 -->
      <view v-if="groupNames.length > 1" class="indicator-bar">
        <view
          v-for="(name, index) in groupNames"
          :key="index"
          :class="['indicator-dot', selectedGroupIndex === index ? 'active' : '']"
        ></view>
      </view>
    </block>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-text">暂无球队数据</text>
    </view>
  </view>
</template>

<script>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as worldcupApi from '@/api/worldcup'

// 位置分类映射
const POSITION_MAP = {
  GK: '门将',
  DF: '后卫', CB: '后卫', LB: '后卫', RB: '后卫',
  SW: '后卫', RWB: '后卫', LWB: '后卫', WB: '后卫',
  MF: '中场', CM: '中场', CDM: '中场', CAM: '中场',
  LM: '中场', RM: '中场', AM: '中场', DM: '中场',
  FW: '前锋', ST: '前锋', CF: '前锋', LW: '前锋',
  RW: '前锋', SS: '前锋', WF: '前锋',
  '门将': '门将', '守门员': '门将',
  '后卫': '后卫', '中后卫': '后卫', '边后卫': '后卫', '右后卫': '后卫', '左后卫': '后卫',
  '中场': '中场', '前腰': '中场', '后腰': '中场', '边前卫': '中场', '中前卫': '中场',
  '前锋': '前锋', '中锋': '前锋', '边锋': '前锋', '影锋': '前锋',
}

const POSITION_ORDER = ['前锋', '中场', '后卫', '门将']

function classifyPosition(pos) {
  if (!pos) return '其他'
  const val = pos.trim()
  if (POSITION_MAP[val]) return POSITION_MAP[val]
  if (POSITION_MAP[val.toUpperCase()]) return POSITION_MAP[val.toUpperCase()]
  if (val.includes('门将') || val.includes('守门')) return '门将'
  if (val.includes('后卫') || val.includes('卫')) return '后卫'
  if (val.includes('中场') || val.includes('腰') || val.includes('前卫')) return '中场'
  if (val.includes('前锋') || val.includes('锋')) return '前锋'
  return '其他'
}

function buildPlayerSections(players) {
  if (!players || players.length === 0) return []
  const groups = {}
  POSITION_ORDER.forEach(p => { groups[p] = [] })
  ;(players || []).forEach(p => {
    const cat = classifyPosition(p.position)
    if (groups[cat]) groups[cat].push(p)
    else (groups['其他'] = groups['其他'] || []).push(p)
  })
  const sections = []
  POSITION_ORDER.forEach(pos => {
    if (groups[pos] && groups[pos].length > 0) sections.push({ label: pos, players: groups[pos] })
  })
  if (groups['其他'] && groups['其他'].length > 0) sections.push({ label: '其他', players: groups['其他'] })
  return sections
}

export default {
  setup() {
    const loading = ref(true)
    const groupNames = ref([])
    const groupList = reactive({})
    const selectedGroupIndex = ref(0)
    const swiperHeight = ref(500)

    function calcSwiperHeight() {
      const info = uni.getSystemInfoSync()
      const rpx = info.windowWidth / 750
      const reserved = (90 + 100) * rpx
      swiperHeight.value = Math.floor(info.windowHeight - reserved)
    }

    function isNameFit(name) {
      if (!name) return true
      return name.length <= 7
    }

    async function loadTeams() {
      loading.value = true
      try {
        const res = await worldcupApi.getWorldCupTeams()
        const list = res || []

        const groupMap = {}
        list.forEach(group => {
          const key = group.groupName || '未知'
          const teams = (group.teams || []).map((team, teamIdx) => ({
            ...team,
            _playersExpanded: teamIdx === 0,
            _playerSections: buildPlayerSections(team.players),
          })).sort((a, b) => (a.fifaRank || 999) - (b.fifaRank || 999))
          groupMap[key] = teams
        })

        const names = Object.keys(groupMap).sort()
        groupNames.value = names
        Object.keys(groupList).forEach(k => delete groupList[k])
        Object.assign(groupList, groupMap)
        loading.value = false
      } catch (err) {
        console.error('加载球队信息失败:', err)
        loading.value = false
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    }

    function onSwiperChange(e) {
      selectedGroupIndex.value = e.detail.current
    }

    function onTabTap(index) {
      selectedGroupIndex.value = index
    }

    function onTogglePlayers(groupName, teamIdx) {
      const teams = groupList[groupName]
      if (teams && teams[teamIdx]) {
        teams[teamIdx]._playersExpanded = !teams[teamIdx]._playersExpanded
      }
    }

    onLoad(() => {
      calcSwiperHeight()
      loadTeams()
    })

    return {
      loading, groupNames, groupList, selectedGroupIndex, swiperHeight,
      isNameFit,
      onSwiperChange, onTabTap, onTogglePlayers
    }
  }
}
</script>

<style scoped>
.team-info-page {
  height: 100vh;
  background: linear-gradient(180deg, #f0f4f8 0%, #e8eef3 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 加载 */
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}
.loading-spinner {
  width: 56rpx; height: 56rpx;
  border: 4rpx solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { margin-top: 16rpx; font-size: 24rpx; color: #8c8c8c; }

/* 空状态 */
.empty-state { flex: 1; display: flex; align-items: center; justify-content: center; }
.empty-text { font-size: 28rpx; color: #999; }

/* 分组Tab */
.tabs-scroll {
  padding: 20rpx 24rpx;
  flex-shrink: 0;
  background: #fff;
}
.tabs-wrapper { display: flex; gap: 16rpx; width: max-content; padding-right: 24rpx; }
.tab-btn {
  padding: 12rpx 28rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
  font-size: 27rpx;
  color: #666;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.3s;
}
.tab-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

/* Swiper */
.teams-swiper { width: 100%; }
.teams-scroll { height: 100%; padding: 20rpx 24rpx; box-sizing: border-box; }
.teams-list { display: flex; flex-direction: column; gap: 16rpx; }
.bottom-space { height: 40rpx; }

/* 球队卡片 */
.team-card {
  background: #fff;
  border-radius: 16rpx;
  border: 1rpx solid #f0f0f0;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.03);
}
.team-card-main { padding: 20rpx; }
.team-card-main:active { background: #f9f9f9; }
.team-card-top { display: flex; align-items: center; gap: 16rpx; }
.team-logo {
  width: 72rpx; height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f5f5f5;
}
.team-logo-placeholder {
  width: 72rpx; height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f0f0f0;
  display: flex; align-items: center; justify-content: center;
  font-size: 36rpx;
}
.team-info-block { flex: 1; min-width: 0; }
.team-name-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.team-info-name { font-size: 30rpx; font-weight: 700; color: #1a1a1a; }
.team-fifa-rank {
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border-radius: 8rpx;
  font-weight: 600;
}
.team-meta-row { display: flex; flex-wrap: wrap; gap: 8rpx; }
.team-meta {
  font-size: 22rpx;
  color: #888;
  padding: 4rpx 12rpx;
  background: #f5f5f5;
  border-radius: 6rpx;
}
.team-card-arrow {
  flex-shrink: 0;
  width: 36rpx; height: 36rpx;
  display: flex; align-items: center; justify-content: center;
}
.arrow-icon {
  font-size: 22rpx;
  color: #ccc;
  transition: transform 0.3s;
}
.arrow-icon.expanded { transform: rotate(90deg); color: #667eea; }

/* 球队卡片底部 */
.team-card-bottom {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 14rpx; padding-top: 14rpx;
  border-top: 1rpx dashed #eee;
}
.team-player-count { font-size: 22rpx; color: #667eea; font-weight: 500; }
.team-remark { font-size: 22rpx; color: #ff8c00; font-weight: 500; }

/* 球员列表 */
.team-players-panel {
  background: #f8f9fc;
  padding: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}
.team-players-panel.empty { padding: 30rpx; text-align: center; }
.no-players { font-size: 24rpx; color: #999; }

.players-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
}

/* 位置分区 */
.players-section { margin-bottom: 20rpx; }
.players-section:last-child { margin-bottom: 0; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12rpx 0 10rpx; margin-bottom: 8rpx;
  border-bottom: 2rpx solid #e8e8e8;
}
.section-label { font-size: 24rpx; font-weight: 700; color: #333; }
.section-count { font-size: 20rpx; color: #999; }

.player-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 8rpx 10rpx;
  background: #fff;
  border-radius: 10rpx;
  overflow: hidden;
  max-width: 100%;
}
.player-avatar {
  width: 48rpx; height: 48rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #eee;
}
.player-avatar-placeholder {
  width: 48rpx; height: 48rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #eee;
  display: flex; align-items: center; justify-content: center;
  font-size: 24rpx;
}
.player-info {
  flex: 1; min-width: 0;
  display: flex; align-items: center;
  gap: 4rpx;
  overflow: hidden;
}
.player-number { font-size: 20rpx; color: #667eea; font-weight: 700; flex-shrink: 0; }
.player-name {
  font-size: 22rpx; color: #333; font-weight: 500;
  flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* 长名字轮播 */
.player-name-marquee { flex: 1; min-width: 0; overflow: hidden; }
.marquee-inner {
  display: inline-flex;
  white-space: nowrap;
  animation: marquee-scroll 4s linear infinite;
  font-size: 22rpx; color: #333; font-weight: 500;
}
@keyframes marquee-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.player-tags { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; }
.player-position {
  font-size: 18rpx;
  color: #fff;
  background: #667eea;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  font-weight: 600;
  white-space: nowrap;
}
.player-score { font-size: 18rpx; color: #ff8c00; font-weight: 600; }

/* 底部指示器 */
.indicator-bar {
  display: flex; justify-content: center; gap: 12rpx;
  padding: 30rpx 0 50rpx;
  padding-bottom: calc(50rpx + env(safe-area-inset-bottom));
  flex-shrink: 0;
  background: #fff;
}
.indicator-dot {
  width: 12rpx; height: 12rpx;
  border-radius: 50%;
  background: #ddd;
  transition: all 0.3s;
}
.indicator-dot.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  width: 24rpx;
  border-radius: 6rpx;
}
</style>
