import axios from 'axios'

// Prefer env var, fallback to current host on port 8000

// Força o uso de 127.0.0.1:8000 para evitar problemas de localhost/IPv6
const baseURL = 'http://127.0.0.1:8000'

export const api = axios.create({ baseURL })
