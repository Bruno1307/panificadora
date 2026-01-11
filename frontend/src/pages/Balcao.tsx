  // Permitir edição livre do input de quantidade
  function handleCartQtyChange(product_id: number, value: string) {
    setCart(prev => prev.map(i => i.product_id === product_id ? { ...i, quantity: value } : i));
  }
  function handleCartQtyBlur(product_id: number, value: string) {
    setCart(prev => prev.map(i => {
      if (i.product_id !== product_id) return i;
      const n = parseInt(value);
      return { ...i, quantity: !value || isNaN(n) || n < 1 ? 1 : n };
    }));
  }
import React, { useState, useEffect } from 'react';
import { connectOrdersWS } from '../ws';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

interface Product {
  id: number;
  name: string;
  price: number;
}

interface OrderItem {
  product_id: number;
  quantity: number;
}

interface Order {
  id: number;
  order_number?: number;
  items: { product_id: number; quantity: number; unit_price: number }[];
  status: string;
  created_at?: string;
  customer_name?: string;
  table_ref?: string;
}

export default function Balcao() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('balcao_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('balcao_customerName') || '');
  const [tableRef, setTableRef] = useState(() => localStorage.getItem('balcao_tableRef') || '');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

    function handleLogout() {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      navigate('/login', { replace: true });
      window.location.reload(); // Garante renderização correta do login
  }

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data));
    loadRecentOrders();
    // Atualiza pedidos automaticamente via WebSocket
    const ws = connectOrdersWS(() => loadRecentOrders());
    return () => ws.close();
  }, []);

  async function loadRecentOrders() {
    const res = await api.get<Order[]>('/orders?status=pending');
    // Ordena por data de criação (mais recentes primeiro) e pega os 10 primeiros
    setRecentOrders(res.data.sort((a, b) => (b.created_at && a.created_at ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : 0)).slice(0, 10));
  }

  // Salvar carrinho e campos no localStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem('balcao_cart', JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem('balcao_customerName', customerName);
  }, [customerName]);
  useEffect(() => {
    localStorage.setItem('balcao_tableRef', tableRef);
  }, [tableRef]);

  function addToCart(product: Product) {
    setCart(prev => {
      const found = prev.find(i => i.product_id === product.id);
      if (found) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, quantity: 1 }];
    });
  }

  function updateCartQty(product_id: number, quantity: number) {
    setCart(prev => prev.map(i => i.product_id === product_id ? { ...i, quantity: Math.max(1, quantity) } : i));
  }

  function removeFromCart(product_id: number) {
    setCart(prev => prev.filter(i => i.product_id !== product_id));
  }

  async function sendOrder() {
    if (cart.length === 0) return;
    const token = localStorage.getItem('token');
    if (!token) {
      // TODO: Exibir mensagem amigável ao usuário
      navigate('/login', { replace: true });
      return;
    }
    setLoading(true);
    try {
      await api.post('/orders/', { items: cart, customer_name: customerName || null, table_ref: tableRef || null });
      setCart([]);
      setCustomerName('');
      setTableRef('');
      // Limpar localStorage após envio
      localStorage.removeItem('balcao_cart');
      localStorage.removeItem('balcao_customerName');
      localStorage.removeItem('balcao_tableRef');
      // TODO: Exibir mensagem amigável ao usuário
      loadRecentOrders();
      window.dispatchEvent(new Event('pedidoEnviadoAoCaixa'));
    } catch (err: any) {
      // TODO: Exibir mensagem amigável ao usuário
    } finally {
      setLoading(false);
    }
  }

  const total = cart.reduce((sum, i) => {
    const p = products.find(p => p.id === i.product_id);
    return sum + (p ? p.price * i.quantity : 0);
  }, 0);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', padding: 0, margin: 0, background: 'linear-gradient(120deg, #f7fafc 0%, #e9ecef 100%)' }}>
      <div className="balcao-flex" style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%', maxWidth: 1100, margin: '0 auto', justifyContent: 'center', alignItems: 'stretch', gap: 32, padding: 0 }}>
        {/* Coluna Catálogo */}
        <div className="balcao-col-catalogo" style={{ flex: 2, minWidth: 0, background: '#fff', color: '#23264a', borderRadius: 0, boxShadow: 'none', padding: '32px 24px 32px 32px', margin: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh', borderRight: '1px solid #e3e6f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ flex: 1, fontWeight: 700, fontSize: 28, letterSpacing: 1, color: '#23264a' }}>Fazer Pedido (Balcão)</h2>
            <button className="button danger" style={{ borderRadius: 12, fontWeight: 600, fontSize: 16, padding: '8px 18px', boxShadow: '0 2px 8px #0003', background: '#ff4d4f', color: '#fff' }} onClick={handleLogout}>Sair</button>
          </div>
          <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
            <input
              className="input"
              placeholder="Nome do cliente"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              style={{ flex: 1, borderRadius: 10, fontSize: 16, padding: '10px 12px', border: '1px solid #d1d5db', background: '#f7fafc', color: '#23264a' }}
            />
            <input
              className="input"
              placeholder="Mesa/Comanda"
              value={tableRef}
              onChange={e => setTableRef(e.target.value)}
              style={{ flex: 1, borderRadius: 10, fontSize: 16, padding: '10px 12px', border: '1px solid #d1d5db', background: '#f7fafc', color: '#23264a' }}
            />
          </div>
          <h3 style={{ fontWeight: 600, marginBottom: 8, color: '#23264a' }}>Catálogo</h3>
          <input
            className="input"
            placeholder="Buscar produto por nome"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 16, width: '100%', borderRadius: 10, fontSize: 16, padding: '10px 12px', border: '1px solid #d1d5db', background: '#f7fafc', color: '#23264a' }}
          />
          <div className="catalogo-scroll" style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 8 }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filteredProducts.map(p => (
                <li key={p.id} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', background: '#f7fafc', borderRadius: 10, boxShadow: '0 2px 8px #0001', padding: '8px 12px', border: '1px solid #e3e6f0' }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>{p.name} <small style={{ color: '#6b7280' }}>R$ {p.price.toFixed(2)}</small></span>
                  <button className="button" style={{ background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)', color: '#23264a', borderRadius: 8, fontWeight: 600, fontSize: 15, padding: '6px 18px', boxShadow: '0 2px 8px #0001' }} onClick={() => addToCart(p)}>Adicionar</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Coluna Carrinho */}
        <div className="balcao-col-carrinho" style={{ flex: 1, minWidth: 0, background: '#fff', color: '#23264a', borderRadius: 0, boxShadow: 'none', padding: '32px 32px 32px 24px', margin: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh', borderLeft: '1px solid #e3e6f0' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 12, color: '#23264a' }}>Carrinho</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {cart.map(i => {
              const p = products.find(p => p.id === i.product_id);
              if (!p) return null;
              return (
                <li key={i.product_id} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', background: '#f7fafc', borderRadius: 10, boxShadow: '0 2px 8px #0001', padding: '8px 12px', border: '1px solid #e3e6f0' }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>{p.name} x{i.quantity}</span>
                  <button className="button secondary" style={{ borderRadius: 8, fontWeight: 600, fontSize: 15, marginRight: 2, background: '#e3e6f0', color: '#23264a' }} onClick={() => updateCartQty(i.product_id, (parseInt(i.quantity as any) || 1) - 1)} disabled={parseInt(i.quantity as any) <= 1}>-</button>
                  <input
                    type="number"
                    min={1}
                    value={i.quantity === undefined ? '' : i.quantity}
                    onChange={e => handleCartQtyChange(i.product_id, e.target.value)}
                    onBlur={e => handleCartQtyBlur(i.product_id, e.target.value)}
                    style={{ width: 60, margin: '0 4px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#23264a', textAlign: 'center' }}
                  />
                  <button className="button secondary" style={{ borderRadius: 8, fontWeight: 600, fontSize: 15, marginLeft: 2, background: '#e3e6f0', color: '#23264a' }} onClick={() => updateCartQty(i.product_id, (parseInt(i.quantity as any) || 1) + 1)}>+</button>
                  <button className="button danger" style={{ borderRadius: 8, fontWeight: 600, fontSize: 15, marginLeft: 8, background: '#ff4d4f', color: '#fff' }} onClick={() => removeFromCart(i.product_id)}>Remover</button>
                </li>
              );
            })}
          </ul>
          <div style={{ margin: '18px 0', fontWeight: 'bold', fontSize: 18, color: '#43e97b' }}>Total: R$ {total.toFixed(2)}</div>
          <button className="button success" style={{ background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 18, padding: '12px 0', marginBottom: 18, boxShadow: '0 2px 8px #0001' }} onClick={sendOrder} disabled={cart.length === 0 || loading}>
            {loading ? 'Enviando...' : 'Enviar pedido'}
          </button>
          <h3 style={{ marginTop: 12, fontWeight: 600, marginBottom: 8, color: '#23264a' }}>Últimos 10 pedidos enviados</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {recentOrders.length === 0 && <li style={{ color: '#888' }}>Nenhum pedido enviado ainda.</li>}
            {recentOrders.map(order => {
              const valor = order.items.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
              return (
                <li key={order.id} style={{ marginBottom: 10, padding: 10, background: '#f7fafc', borderRadius: 10, color: '#23264a', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 2px 8px #0001', border: '1px solid #e3e6f0' }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontWeight:500}}><strong>#{order.order_number || order.id}</strong> · {order.customer_name || 'Sem nome'} · {order.table_ref || 'Sem mesa'} · {order.items.length} itens · <b>R$ {valor.toFixed(2)}</b></span>
                    <button className="button secondary" style={{marginLeft:8,padding:'4px 12px',fontSize:18, borderRadius:8, background:'#43e97b', color:'#fff', fontWeight:700, boxShadow:'0 2px 8px #0001'}} onClick={() => {
                      setCart(order.items.map(it => ({ product_id: it.product_id, quantity: it.quantity })));
                      setCustomerName(order.customer_name || '');
                      setTableRef(order.table_ref || '');
                      window.scrollTo({top:0,behavior:'smooth'});
                    }}>{/* Seta para cima maior e branca */}
                      <span style={{fontSize:24, color:'#fff', lineHeight:1}}>↑</span>
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Enviado em: {order.created_at ? new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' }) : '-'}</div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
