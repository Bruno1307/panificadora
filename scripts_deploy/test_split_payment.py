import json, urllib.request
BASE="http://10.95.165.220:8000"
headers_json={"Content-Type":"application/json","accept":"application/json"}

def http(method, path, data=None, headers=None):
    url=BASE+path
    body=None
    if data is not None:
        body=json.dumps(data).encode()
    req=urllib.request.Request(url, data=body, method=method)
    for k,v in (headers or {}).items():
        req.add_header(k,v)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# 1) Produtos
status, prods = http("GET","/products/")
if isinstance(prods, str):
    print("Erro produtos:",status, prods[:200])
    raise SystemExit(1)
if not prods:
    status, created = http("POST","/products/", {"name":"Teste Pao","price":12.5}, headers_json)
    status, prods = http("GET","/products/")
print("Produtos:", len(prods))
pid=int(prods[0]["id"])
price=float(prods[0]["price"])
print("Usando produto:", pid, price)

# 2) Login admin
status, login = http("POST","/auth/login", {"username":"admin","password":"admin123"}, headers_json)
if status!=200:
    print("Falha login:",status, login)
    raise SystemExit(1)
TOKEN=login["access_token"]
print("Token len:", len(TOKEN))
headers_auth={"Authorization":"Bearer "+TOKEN, **headers_json}

# 3) Criar pedido
status, order = http("POST","/orders/", {"items":[{"product_id":pid,"quantity":1}], "customer_name":"Teste Split"}, headers_auth)
if status!=201:
    print("Falha criar pedido:",status, order)
    raise SystemExit(1)
order_id=order["id"]
print("Pedido:", order_id, order["status"]) 

# 4) Pagar dividido
p1=round(price/2.0,2)
p2=round(price-p1,2)
status, paid = http("POST", f"/orders/{order_id}/pay", {"payments":[{"method":"dinheiro","amount":p1},{"method":"pix","amount":p2}]}, headers_json)
if status!=200:
    print("Falha pagar:",status, paid)
    raise SystemExit(1)
print("Pago:", paid["status"], paid.get("payment_method"))

# 5) Indicadores
status, indic = http("GET","/indicators/revenue", headers=headers_auth)
if status!=200:
    print("Falha indicadores:",status, indic)
    raise SystemExit(1)
print("Daily:", indic["daily"]) 
print("Totals:", indic["payment_totals_daily"]) 
print("Weekly:", indic["weekly"]) 
print("Totals(weekly):", indic["payment_totals_weekly"]) 
print("Monthly:", indic["monthly"]) 
print("Totals(monthly):", indic["payment_totals_monthly"]) 
print("Yearly:", indic["yearly"]) 
print("Totals(yearly):", indic["payment_totals_yearly"]) 

# 5b) Indicadores com filtro end=hoje (inclui pagamentos anteriores a 03:00 UTC)
from datetime import date
end=date.today().isoformat()
status, indic2 = http("GET", f"/indicators/revenue?end={end}", headers=headers_auth)
if status!=200:
    print("Falha indicadores (end):",status, indic2)
    raise SystemExit(1)
print("Daily(end):", indic2["daily"]) 
print("Totals(end):", indic2["payment_totals_daily"]) 
print("Weekly(end):", indic2["weekly"]) 
print("Totals(weekly,end):", indic2["payment_totals_weekly"]) 
print("Monthly(end):", indic2["monthly"]) 
print("Totals(monthly,end):", indic2["payment_totals_monthly"]) 
print("Yearly(end):", indic2["yearly"]) 
print("Totals(yearly,end):", indic2["payment_totals_yearly"]) 