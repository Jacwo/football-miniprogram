<script>
import { useUserStore } from '@/store/user'
import { useLeagueColorStore } from '@/store/leagueColor'

export default {
  globalData: {
    baseUrl: 'https://ai-football.cn/foot',
    showHistory: true,
    showCalculator: false,
    showInformation: false,
    statusBarHeight: 20,
    navBarHeight: 64
  },
  onLaunch() {
    this.initSystemInfo()
    // 延迟加载远程 tabBar 图标
    setTimeout(() => {
      this.loadRemoteTabBarIcons()
    }, 1000)
  },
  methods: {
    initSystemInfo() {
      try {
        const systemInfo = uni.getWindowInfo()
        const deviceInfo = uni.getDeviceInfo()
        this.globalData.statusBarHeight = systemInfo.statusBarHeight || 20
        this.globalData.navBarHeight = this.globalData.statusBarHeight + 44
      } catch (e) {
        console.error('获取系统信息失败:', e)
        this.globalData.statusBarHeight = 20
        this.globalData.navBarHeight = 64
      }
    },

    // tabBar 图标配置（远程地址）
    tabBarIcons: [
      { index: 0, iconPath: 'https://ai-football.cn/10.png', selectedIconPath: 'https://ai-football.cn/5.png' },
      { index: 1, iconPath: 'https://ai-football.cn/6.png', selectedIconPath: 'https://ai-football.cn/1.png' },
      { index: 2, iconPath: 'https://ai-football.cn/7.png', selectedIconPath: 'https://ai-football.cn/2.png' },
      { index: 3, iconPath: 'https://ai-football.cn/8.png', selectedIconPath: 'https://ai-football.cn/3.png' },
      { index: 4, iconPath: 'https://ai-football.cn/9.png', selectedIconPath: 'https://ai-football.cn/4.png' }
    ],

    loadRemoteTabBarIcons() {
      // #ifdef MP-WEIXIN
      const cacheKey = 'tabBarIconsCache'
      const cachedIcons = uni.getStorageSync(cacheKey)

      this.tabBarIcons.forEach(item => {
        if (cachedIcons && cachedIcons[item.index]) {
          const cached = cachedIcons[item.index]
          uni.setTabBarItem({
            index: item.index,
            iconPath: cached.iconPath,
            selectedIconPath: cached.selectedIconPath
          })
          return
        }

        Promise.all([
          this.downloadFile(item.iconPath),
          this.downloadFile(item.selectedIconPath)
        ]).then(([iconPath, selectedIconPath]) => {
          if (iconPath || selectedIconPath) {
            const updateData = {}
            if (iconPath) updateData.iconPath = iconPath
            if (selectedIconPath) updateData.selectedIconPath = selectedIconPath

            uni.setTabBarItem({ index: item.index, ...updateData })

            const allCache = uni.getStorageSync(cacheKey) || {}
            allCache[item.index] = {
              iconPath: iconPath || item.iconPath,
              selectedIconPath: selectedIconPath || item.selectedIconPath
            }
            uni.setStorageSync(cacheKey, allCache)
          }
        }).catch(err => {
          console.log('tabBar 图标加载失败:', err)
        })
      })
      // #endif
    },

    downloadFile(url) {
      return new Promise((resolve) => {
        uni.downloadFile({
          url,
          success: (res) => res.statusCode === 200 ? resolve(res.tempFilePath) : resolve(null),
          fail: () => resolve(null)
        })
      })
    }
  }
}
</script>

<style lang="scss">
@use '@/styles/variables.scss' as *;
@use '@/styles/common.scss' as *;

page {
  box-sizing: border-box;
  background-color: var(--bg-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  color: var(--text-color);
  line-height: 1.5;
}

/* 安全区域适配 */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 滚动条隐藏 */
::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  color: transparent;
}

/* 图片默认样式 */
image {
  vertical-align: middle;
}

/* 按钮重置 */
button {
  margin: 0;
  padding: 0;
  background-color: transparent;
  border: none;
  border-radius: 0;
  font-size: inherit;
  line-height: inherit;
}

button::after {
  border: none;
}

/* 输入框重置 */
input {
  font-size: inherit;
}
</style>
