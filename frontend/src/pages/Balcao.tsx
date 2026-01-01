import React, { useState, useEffect } from 'react';
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

export default function Balcao() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('balcao_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('balcao_customerName') || '');
  const [tableRef, setTableRef] = useState(() => localStorage.getItem('balcao_tableRef') || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data));
  }, []);

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
    setLoading(true);
    await api.post('/orders/', { items: cart, customer_name: customerName || null, table_ref: tableRef || null });
    setCart([]);
    setCustomerName('');
    setTableRef('');
    setLoading(false);
    // Limpar localStorage após envio
    localStorage.removeItem('balcao_cart');
    localStorage.removeItem('balcao_customerName');
    localStorage.removeItem('balcao_tableRef');
    alert('Pedido enviado!');
  }

  const total = cart.reduce((sum, i) => {
    const p = products.find(p => p.id === i.product_id);
    return sum + (p ? p.price * i.quantity : 0);
  }, 0);

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
      <h2>Fazer Pedido (Balcão)</h2>
      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Nome do cliente"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          className="input"
          placeholder="Mesa/Comanda"
          value={tableRef}
          onChange={e => setTableRef(e.target.value)}
        />
      </div>
      <h3>Catálogo</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {products.map(p => (
          <li key={p.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{p.name} <small>R$ {p.price.toFixed(2)}</small></span>
            <button className="button" onClick={() => addToCart(p)}>Adicionar</button>
          </li>
        ))}
      </ul>
      <h3>Carrinho</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {cart.map(i => {
          const p = products.find(p => p.id === i.product_id);
          if (!p) return null;
          return (
            <li key={i.product_id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }}>{p.name} x{i.quantity}</span>
              <button className="button secondary" onClick={() => updateCartQty(i.product_id, i.quantity - 1)} disabled={i.quantity <= 1}>-</button>
              <input
                type="number"
                min={1}
                value={i.quantity}
                onChange={e => updateCartQty(i.product_id, parseInt(e.target.value) || 1)}
                style={{ width: 40, margin: '0 4px' }}
              />
              <button className="button secondary" onClick={() => updateCartQty(i.product_id, i.quantity + 1)}>+</button>
              <button className="button danger" onClick={() => removeFromCart(i.product_id)}>Remover</button>
            </li>
          );
        })}
      </ul>
      <div style={{ margin: '16px 0', fontWeight: 'bold' }}>Total: R$ {total.toFixed(2)}</div>
      <button className="button success" onClick={sendOrder} disabled={cart.length === 0 || loading}>
        {loading ? 'Enviando...' : 'Enviar pedido'}
      </button>
    </div>
  );
}
