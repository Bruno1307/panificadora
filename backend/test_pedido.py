import requests

# Login para obter token
login_url = "http://127.0.0.1:8000/auth/login"
login_data = {"username": "balcao", "password": "balcao123"}
login_resp = requests.post(login_url, json=login_data)
print('Login:', login_resp.status_code, login_resp.json())

token = login_resp.json().get('access_token')
if not token:
    print('Falha ao obter token.')
else:
    # Criar pedido
    order_url = "http://127.0.0.1:8000/orders/"
    order_data = {
        "items": [{"product_id": 1, "quantity": 2}, {"product_id": 2, "quantity": 2}],
        "customer_name": "Teste",
        "table_ref": "Mesa 1"
    }
    headers = {"Authorization": f"Bearer {token}"}
    order_resp = requests.post(order_url, json=order_data, headers=headers)
    print('Pedido:', order_resp.status_code, order_resp.json())
    # Listar pedidos
    list_resp = requests.get(order_url, headers=headers)
    print('Listagem:', list_resp.status_code, list_resp.json())
