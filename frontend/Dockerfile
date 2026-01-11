# Dockerfile para frontend React (Vite)
FROM node:20-slim

WORKDIR /app

COPY . /app

RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
