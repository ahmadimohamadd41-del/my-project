import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'

// Dual Base URLs for the two separate environments
export const VPS_API_BASE_URL = import.meta.env.VITE_VPS_API_BASE_URL || 'https://api-var.popserver.shop'
export const CPANEL_API_BASE_URL = import.meta.env.VITE_CPANEL_API_BASE_URL || 'https://varminiapp.popserver.shop/api'

// VPS API Client (Read-heavy, Plans, Customer Status, Health)
export const vpsApi: AxiosInstance = axios.create({
  baseURL: VPS_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// cPanel Business API Client (Orders, Wallet, Auth, Admin)
export const cpanelApi: AxiosInstance = axios.create({
  baseURL: CPANEL_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Interceptors for Auth
cpanelApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('session_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

cpanelApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('session_token')
      localStorage.removeItem('user')
    }
    return Promise.reject(error)
  }
)

export default cpanelApi
