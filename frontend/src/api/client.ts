import axios from 'axios'

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  '/api'

export const apiClient = axios.create({
  baseURL: API_BASE,
})
