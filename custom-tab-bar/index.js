// custom-tab-bar/index.js
const matchApi = require('../api/match')

Component({
  data: {
    selectedPath: '/pages/index/index',
    showHistory: true, // 是否显示历史tab
    color: '#999999',
    selectedColor: '#1890ff',
    list: [
      {
        pagePath: '/pages/index/index',
        text: '比赛',
        iconPath: '/images/tabbar/match.png',
        selectedIconPath: '/images/tabbar/match-active.png'
      },
      {
        pagePath: '/pages/topic/index',
        text: '专题',
        iconPath: '/images/tabbar/match.png',
        selectedIconPath: '/images/tabbar/match-active.png'
      },
      {
        pagePath: '/pages/calculator-hall/index',
        text: '大厅',
        iconPath: '/images/tabbar/match.png',
        selectedIconPath: '/images/tabbar/match-active.png'
      },
      {
        pagePath: '/pages/match-result/index',
        text: '赛果',
        iconPath: '/images/tabbar/match.png',
        selectedIconPath: '/images/tabbar/match-active.png'
      },
      {
        pagePath: '/pages/profile/index',
        text: '我的',
        iconPath: '/images/tabbar/match.png',
        selectedIconPath: '/images/tabbar/match-active.png'
      }
    ]
  },

  lifetimes: {
    attached() {
      // 同步初始化：从 globalData 读取 showHistory，根据当前路由确定 selectedPath
      // 确保首帧渲染就呈现正确状态，消除 webview 模式下的 tabbar 闪烁
      const app = getApp();
      this.setData({ showHistory: app.globalData.showHistory !== false });

      const pages = getCurrentPages();
      if (pages.length > 0) {
        const route = '/' + pages[pages.length - 1].route;
        if (this.data.list.some(item => item.pagePath === route)) {
          this.setData({ selectedPath: route });
        }
      }

      // 异步刷新功能开关缓存（不阻塞首帧渲染）
      this.refreshFeaturesCache();
    }
  },

  pageLifetimes: {
    // pageLifetimes.show 在页面 onShow 之前触发，作为 selectedPath 的双重保障
    show() {
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const route = '/' + pages[pages.length - 1].route;
        const list = this.data.list;
        if (list.some(item => item.pagePath === route) && this.data.selectedPath !== route) {
          this.setData({ selectedPath: route });
        }
      }
    }
  },

  methods: {
    // 异步刷新功能开关缓存
    async refreshFeaturesCache() {
      try {
        const result = await matchApi.checkFeatures();
        const showHistory = result === true;
        this.setData({ showHistory });
      } catch (error) {
        console.error('检查功能开关失败:', error);
      }
    },

    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
    }
  }
})
