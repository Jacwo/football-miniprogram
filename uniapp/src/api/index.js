// api/index.js - 请求封装

// 默认配置
const defaultConfig = {
  timeout: 45000,
  showLoading: true,
  showError: true,
  retryCount: 0
}

const BASE_URL = 'https://ai-football.cn/foot'

/**
 * 获取 token
 */
function getToken() {
  return uni.getStorageSync('token') || ''
}

/**
 * 基础请求方法
 */
function request(options) {
  const config = { ...defaultConfig, ...options }
  const { url, method = 'GET', data, header = {}, showLoading, showError, retryCount } = config

  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...header
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (showLoading) {
    uni.showLoading({ title: '加载中...', mask: true })
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: headers,
      timeout: config.timeout,
      success: (res) => {
        if (showLoading) uni.hideLoading()

        const { statusCode, data: responseData } = res

        if (statusCode >= 200 && statusCode < 300) {
          if (responseData.code === 0) {
            resolve(responseData.data)
          } else if (responseData.code === 401) {
            handleUnauthorized()
            reject(new Error(responseData.message || '登录已过期'))
          } else {
            if (showError) {
              uni.showToast({ title: responseData.message || '请求失败', icon: 'none', duration: 2000 })
            }
            reject(new Error(responseData.message || '请求失败'))
          }
        } else if (statusCode === 401) {
          handleUnauthorized()
          reject(new Error('登录已过期'))
        } else {
          if (showError) {
            uni.showToast({ title: `请求失败 (${statusCode})`, icon: 'none', duration: 2000 })
          }
          reject(new Error(`HTTP Error: ${statusCode}`))
        }
      },
      fail: (err) => {
        if (showLoading) uni.hideLoading()

        if (retryCount > 0) {
          return request({ ...config, retryCount: retryCount - 1 }).then(resolve).catch(reject)
        }

        if (showError) {
          uni.showToast({ title: err.errMsg || '网络错误', icon: 'none', duration: 2000 })
        }
        reject(err)
      }
    })
  })
}

/**
 * 处理未授权状态
 */
function handleUnauthorized() {
  uni.removeStorageSync('token')
  uni.removeStorageSync('userInfo')

  // 跳转登录页
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const currentRoute = currentPage ? currentPage.route : ''

  if (currentRoute !== 'pages/login/login') {
    uni.navigateTo({ url: '/pages/login/login' })
  }
}

function get(url, params = {}, config = {}) {
  const queryString = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
  const fullUrl = queryString ? `${url}?${queryString}` : url
  return request({ url: fullUrl, method: 'GET', ...config })
}

function post(url, data = {}, config = {}) {
  return request({ url, method: 'POST', data, ...config })
}

function put(url, data = {}, config = {}) {
  return request({ url, method: 'PUT', data, ...config })
}

function del(url, data = {}, config = {}) {
  return request({ url, method: 'DELETE', data, ...config })
}

export {
  request,
  get,
  post,
  put,
  del
}
