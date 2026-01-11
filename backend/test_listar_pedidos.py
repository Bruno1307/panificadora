import requests

# Login como caixa para listar pedidos
login_url = "http://127.0.0.1:8000/auth/login"
login_data = {"username": "caixa", "password": "caixa123"}
login_resp = requests.post(login_url, json=login_data)
print('Login caixa:', login_resp.status_code, login_resp.json())

token = login_resp.json().get('access_token')
if not token:
    print('Falha ao obter token do caixa.')
else:
    # Listar pedidos
    order_url = "http://127.0.0.1:8000/orders/"
    headers = {"Authorization": f"Bearer {token}"}
    list_resp = requests.get(order_url, headers=headers)
    print('Listagem pedidos:', list_resp.status_code, list_resp.json())
