// custom-tab-bar/index.js
const matchApi = require('../api/match')

Component({
  data: {
    selectedPath: '/pages/index/index',
    showHistory: true,
    color: '#999999',
    selectedColor: '#1890ff',
    list: [
      {
        pagePath: '/pages/index/index',
        text: '比赛',
        iconPath: '/static/tabbar/match.png',
        selectedIconPath: '/static/tabbar/match-active.png'
      },
      {
        pagePath: '/pages/topic/topic',
        text: '专题',
        iconPath: '/static/tabbar/topic.png',
        selectedIconPath: '/static/tabbar/topic-active.png'
      },
      {
        pagePath: '/pages/calculator-hall/index',
        text: '大厅',
        iconPath: '/static/tabbar/hall.png',
        selectedIconPath: '/static/tabbar/hall-active.png'
      },
      {
        pagePath: '/pages/match-result/index',
        text: '赛果',
        iconPath: '/static/tabbar/result.png',
        selectedIconPath: '/static/tabbar/result-active.png'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        iconPath: '/static/tabbar/mine.png',
        selectedIconPath: '/static/tabbar/mine-active.png'
      }
    ]
  },

  lifetimes: {
    attached() {
      const app = getApp();
      this.setData({ showHistory: app.globalData.showHistory !== false });

      const pages = getCurrentPages();
      if (pages.length > 0) {
        const route = '/' + pages[pages.length - 1].route;
        const list = this.data.list;
        if (list.some(item => item.pagePath === route)) {
          this.setData({ selectedPath: route });
        }
      }

      this.refreshFeaturesCache();
    }
  },

  pageLifetimes: {
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
    async refreshFeaturesCache() {
      try {
        const result = await matchApi.checkFeatures();
        const app = getApp();
        const showHistory = typeof result === 'object' && result !== null
          ? !!result.showHistory
          : result === true;
        app.globalData.showHistory = showHistory;
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
