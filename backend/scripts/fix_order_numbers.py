# Script para corrigir order_number sequencial diário em pedidos antigos
# Execute este script uma única vez após garantir backup do banco de dados!

from app.db import SessionLocal
from app.models import Order
from sqlalchemy import func
from datetime import datetime

# Abre sessão
session = SessionLocal()

# Busca todas as datas distintas de pedidos
datas = session.query(func.date(Order.created_at)).distinct().all()

for (data_str,) in datas:
    data = datetime.strptime(str(data_str), '%Y-%m-%d').date()
    # Busca todos os pedidos do dia, ordenados por created_at
    pedidos = session.query(Order).filter(
        func.date(Order.created_at) == data
    ).order_by(Order.created_at.asc(), Order.id.asc()).all()
    # Atualiza order_number sequencial
    for idx, pedido in enumerate(pedidos, start=1):
        pedido.order_number = idx
    session.commit()

print('Correção concluída!')
session.close()
