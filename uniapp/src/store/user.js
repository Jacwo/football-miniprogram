// store/user.js - 用户状态管理 (Pinia)
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as userApi from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const token = ref(uni.getStorageSync('token') || null)
  const userInfo = ref(uni.getStorageSync('userInfo') || null)
  const isLoggedIn = ref(!!token.value)

  // Getters
  const getToken = computed(() => token.value)
  const getUserInfo = computed(() => userInfo.value)
  const getIsLoggedIn = computed(() => isLoggedIn.value)

  // Actions
  function setLoginState(newToken, newUserInfo) {
    token.value = newToken
    userInfo.value = newUserInfo || userInfo.value
    isLoggedIn.value = true
    uni.setStorageSync('token', newToken)
    if (newUserInfo) {
      uni.setStorageSync('userInfo', newUserInfo)
    }
  }

  function clearLoginState() {
    token.value = null
    userInfo.value = null
    isLoggedIn.value = false
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
  }

  function updateLocalUserInfo(data) {
    userInfo.value = { ...userInfo.value, ...data }
    uni.setStorageSync('userInfo', userInfo.value)
  }

  async function sendSms(phone) {
    try {
      await userApi.sendSms(phone)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  async function login(phone, code) {
    try {
      const data = await userApi.login(phone, code)
      if (data && data.token) {
        setLoginState(data.token, data.userInfo || null)
        if (!data.userInfo) await fetchUserInfo()
        return { success: true }
      }
      return { success: false, message: '登录失败' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  async function logout() {
    try { await userApi.logout() } catch (error) { console.error('退出登录接口调用失败:', error) }
    clearLoginState()
    return { success: true }
  }

  async function fetchUserInfo() {
    try {
      const info = await userApi.getUserInfo()
      if (info) {
        userInfo.value = info
        uni.setStorageSync('userInfo', info)
        return { success: true, data: info }
      }
      return { success: false, message: '获取用户信息失败' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  async function updateUserInfo(data) {
    try {
      await userApi.updateUserInfo(data)
      updateLocalUserInfo(data)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  function checkLoginWithRedirect() {
    if (!isLoggedIn.value) {
      uni.navigateTo({ url: '/pages/login/login' })
      return false
    }
    return true
  }

  async function wxLogin(userInfoData) {
    try {
      const loginRes = await new Promise((resolve, reject) => {
        uni.login({ success: resolve, fail: reject })
      })
      if (!loginRes.code) return { success: false, message: '获取微信登录凭证失败' }
      const data = await userApi.wxLogin(loginRes.code, userInfoData)
      if (data && data.token) {
        setLoginState(data.token, data.userInfo || null)
        if (!data.userInfo) await fetchUserInfo()
        return { success: true }
      }
      return { success: false, message: '登录失败' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  return {
    token, userInfo, isLoggedIn,
    getToken, getUserInfo, getIsLoggedIn,
    setLoginState, clearLoginState, updateLocalUserInfo,
    sendSms, login, logout, fetchUserInfo, updateUserInfo,
    checkLoginWithRedirect, wxLogin
  }
})
