// Função para testar conexão com backend
export async function pingBackend() {
	const apiInstance = await getApi();
	const response = await apiInstance.get('/ping');
	return response.data;
}

import axios from 'axios';

let api: ReturnType<typeof axios.create>;

let configPromise: Promise<{DOMAIN_URL?: string, BACKEND_URL: string}> | null = null;
let domainUrl: string | undefined;

async function loadConfig() {
	if (api) return;
	const ts = Date.now();
	configPromise = Promise.all([
		fetch(`/config.json?ts=${ts}`, { cache: 'no-store' }).then((res) => res.json()),
		fetch(`/config-domain.json?ts=${ts}`, { cache: 'no-store' }).then((res) => res.json()).catch(() => ({}))
	]).then(([config, domainConfig]) => {
		// Override para ambiente local
		let baseURL = config.BACKEND_URL;
		api = axios.create({ baseURL });
		api.interceptors.request.use((cfg) => {
			const token = localStorage.getItem('token');
			if (token) {
				cfg.headers = cfg.headers || {};
				cfg.headers['Authorization'] = `Bearer ${token}`;
			}
			return cfg;
		});
		domainUrl = domainConfig.DOMAIN_URL;
		return {DOMAIN_URL: domainUrl, BACKEND_URL: baseURL};
	});
}

export async function getApi() {
	await loadConfig();
	return api;
}

export async function getDomainUrl() {
	await loadConfig();
	const config = await configPromise;
	return config?.DOMAIN_URL;
}

export async function getBackendUrl() {
	await loadConfig();
	const config = await configPromise;
	return config?.BACKEND_URL;
}
