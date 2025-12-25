import axios from 'axios'

// Prefer env var, fallback to current host on port 8000
const host = window.location.hostname
const defaultUrl = `http://${host}:8000`
const baseURL = (import.meta as any).env?.VITE_API_URL || defaultUrl

export const api = axios.create({ baseURL })
