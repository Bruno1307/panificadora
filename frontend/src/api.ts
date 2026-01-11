import axios from 'axios'

// Prefer env var, fallback to current host on port 8000

// Usa o nome do serviço Docker para acesso ao backend quando em ambiente Docker
const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://backend:8000/'


export const api = axios.create({ baseURL })

// Interceptor para enviar o token JWT salvo no localStorage
api.interceptors.request.use((config) => {
	const token = localStorage.getItem('token');
	if (token) {
		config.headers = config.headers || {};
		config.headers['Authorization'] = `Bearer ${token}`;
	}
	return config;
});
