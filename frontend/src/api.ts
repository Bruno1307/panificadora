
import axios from 'axios';

let api: ReturnType<typeof axios.create>;
let configPromise: Promise<{DOMAIN_URL?: string, BACKEND_URL: string}> | null = null;
let domainUrl: string | undefined;

async function loadConfig() {
	if (api) return;
	if (!configPromise) {
		configPromise = Promise.all([
			fetch('/config.json').then((res) => res.json()),
			fetch('/config-domain.json').then((res) => res.json()).catch(() => ({}))
		]).then(([config, domainConfig]) => {
			api = axios.create({ baseURL: config.BACKEND_URL });
			api.interceptors.request.use((cfg) => {
				const token = localStorage.getItem('token');
				if (token) {
					cfg.headers = cfg.headers || {};
					cfg.headers['Authorization'] = `Bearer ${token}`;
				}
				return cfg;
			});
			domainUrl = domainConfig.DOMAIN_URL;
			return {DOMAIN_URL: domainUrl, BACKEND_URL: config.BACKEND_URL};
		});
	}
	await configPromise;
}

export async function getApi() {
	await loadConfig();
	return api;
}

export async function getDomainUrl() {
	const config = await configPromise;
	return config?.DOMAIN_URL;
}
