import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_invalido():
    response = client.post("/auth/login", json={"username": "usuario_inexistente", "password": "senha_errada"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Usuário ou senha inválidos"

# Para testar login válido, é necessário garantir que exista um usuário no banco.
# Exemplo de teste (ajuste conforme usuário real):
# def test_login_valido():
#     response = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
#     assert response.status_code == 200
#     assert "access_token" in response.json()
