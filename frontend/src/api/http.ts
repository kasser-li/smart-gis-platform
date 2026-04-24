/**
 * Axios 实例 + 拦截器
 */

import axios from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '@/types/marker'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse
    
    // 业务错误处理
    if (res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    
    return response
  },
  (error) => {
    // 网络错误处理
    let message = '网络错误'
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          message = '未认证，请重新登录'
          // 清除 token 并跳转登录页
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 403:
          message = '无权限访问'
          break
        case 404:
          message = '资源不存在'
          break
        case 429:
          message = '请求过于频繁，请稍后再试'
          break
        default:
          message = error.response.data?.message || `请求失败 (${error.response.status})`
      }
    } else if (error.request) {
      message = '网络连接失败，请检查网络'
    }
    
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export { request }
export default request
