# Dockerfile para backend FastAPI
FROM python:3.12-slim

WORKDIR /app

# Instala dependências do sistema (inclui curl para healthcheck)
RUN apt-get update && apt-get install -y build-essential libpq-dev curl && rm -rf /var/lib/apt/lists/*


# Garante timezone UTC no container
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY . /app

# Instala dependências Python
RUN pip uninstall -y bcrypt passlib \
	&& pip install --no-cache-dir --upgrade pip \
	&& pip install -r requirements.txt

# Expõe a porta do backend
EXPOSE 8000

# Comando para rodar o backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
