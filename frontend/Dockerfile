# Dockerfile para frontend React (Vite)
FROM node:20-slim

WORKDIR /app

COPY . /app

RUN rm -rf node_modules package-lock.json \
	&& npm cache clean --force \
	&& npm install \
	&& npm install vite --save-dev

EXPOSE 5173

CMD ["npx", "vite", "--host", "--port", "5173"]
