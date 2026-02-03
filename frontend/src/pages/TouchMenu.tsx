
import React, { useState, useEffect } from 'react';
import './TouchMenu.css';
import { getApi } from '../api';

// Tipos auxiliares
type Product = { id: number; name: string; price: number; icon?: string; category_id: number };
type Category = { id: number; name: string; color?: string };
type OrderItem = { product_id: number; quantity: number };

export default function TouchMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [orderDetails, setOrderDetails] = useState<Record<number, Product>>({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState('');

  // Funções auxiliares
  const fetchData = async () => {
    const api = await getApi();
    const cats = await api.get('/categories/');
    setCategories(cats.data);
    const prods = await api.get('/products/');
    setProducts(prods.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCategory = (catId: number) => setSelectedCategory(catId);
  const handleBack = () => setSelectedCategory(null);
  const handleAdd = (product: Product) => {
    setOrder(prev => {
      const found = prev.find(i => i.product_id === product.id);
      if (found) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, quantity: 1 }];
    });
    setOrderDetails(prev => ({ ...prev, [product.id]: product }));
  };
  const handleRemove = (productId: number) => {
    setOrder(prev => prev.filter(i => i.product_id !== productId));
    setOrderDetails(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  async function handleSendOrder() {
    if (order.length === 0) return;
    setLoading(true);
    setMsg('');
    try {
      const api = await getApi();
      await api.post('/orders/', {
        items: order,
        customer_name: null,
        table_ref: null,
      });
      setOrder([]);
      setOrderDetails({});
      setMsg('Pedido enviado com sucesso!');
    } catch (e: any) {
      setMsg('Erro ao enviar pedido: ' + (e?.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
    fetchData();
  }

  // CRUD Categorias
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const api = await getApi();
    await api.post('/categories/', { name: newCatName });
    setNewCatName('');
    fetchData();
  }
  async function handleEditCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editCatName.trim() || editCatId == null) return;
    const api = await getApi();
    await api.put(`/categories/${editCatId}`, { name: editCatName });
    setEditCatId(null); setEditCatName('');
    fetchData();
  }
  async function handleDeleteCategory(catId: number) {
    const api = await getApi();
    await api.delete(`/categories/${catId}`);
    fetchData();
  }

  // CRUD Produtos

  return (
    <div className="touch-menu-container">
      {!selectedCategory ? (
        <div className="category-list">
          <h2>Escolha a Categoria</h2>
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="input" placeholder="Nova categoria" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
            <button className="button" type="submit">Adicionar</button>
          </form>
          <div className="category-buttons">
            {categories.map((cat) => (
              <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 4 }}>
                <button
                  className="category-btn"
                  style={{ background: cat.color }}
                  onClick={() => handleCategory(cat.id)}
                >
                  {cat.name}
                </button>
                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                  <button className="button secondary" style={{ fontSize: 12 }} onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); }}>Editar</button>
                  <button className="button danger" style={{ fontSize: 12 }} onClick={() => handleDeleteCategory(cat.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
          {editCatId != null && (
            <form onSubmit={handleEditCategory} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="input" value={editCatName} onChange={e => setEditCatName(e.target.value)} />
              <button className="button" type="submit">Salvar</button>
              <button className="button secondary" type="button" onClick={() => { setEditCatId(null); setEditCatName(''); }}>Cancelar</button>
            </form>
          )}
          <h3 style={{ marginTop: 24 }}>Adicionar Produto</h3>
          <h3 style={{ marginTop: 24 }}>Categorias</h3>
          <ul className="list">
            {categories.map(cat => (
              <li key={cat.id} style={{ marginBottom: 8 }}>
                <strong>{cat.name}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="product-list">
          <button className="back-btn" onClick={handleBack}>← Voltar</button>
          <h2>Selecione o Item</h2>
          <div className="product-buttons">
            {products.filter(p => p.category_id === selectedCategory).map((prod) => (
              <button
                key={prod.id}
                className="product-btn"
                onClick={() => handleAdd(prod)}
              >
                <span className="icon" role="img" aria-label={prod.name}>{prod.icon || '🍞'}</span>
                <span className="prod-name">{prod.name}</span>
                <span className="prod-price">R$ {prod.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="order-summary">
        <h3>Pedido</h3>
        <ul>
          {order.map((item, idx) => (
            <li key={idx}>
              {orderDetails[item.product_id]?.icon || '🍞'} {orderDetails[item.product_id]?.name} - R$ {orderDetails[item.product_id]?.price?.toFixed(2)}
              <span style={{ marginLeft: 8 }}>x{item.quantity}</span>
              <button className="button danger" style={{ marginLeft: 8 }} onClick={() => handleRemove(item.product_id)}>Remover</button>
            </li>
          ))}
        </ul>
        {order.length > 0 && (
          <button className="button success" style={{ marginTop: 12 }} onClick={handleSendOrder} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Pedido'}
          </button>
        )}
        {msg && <div style={{ marginTop: 8, color: msg.startsWith('Erro') ? 'red' : 'green' }}>{msg}</div>}
      </div>
    </div>
  );
}
