import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { connectOrdersWS } from '../ws'

type Product = { id: number; name: string; price: number; barcode?: string | null }
type OrderItem = { product_id: number; quantity: number }

type Order = {
  id: number
  status: 'pending' | 'paid' | 'cancelled'
  created_at?: string
  items: { id: number; product_id: number; quantity: number; unit_price: number }[]
}

export default function Orders() {
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [cart, setCart] = useState<OrderItem[]>([])
  const [pending, setPending] = useState<Order[]>([])
  const [customerName, setCustomerName] = useState('')
  const [tableRef, setTableRef] = useState('')
  const [qtyMap, setQtyMap] = useState<Record<number, number>>({})
  const [scanCode, setScanCode] = useState('')
  const scanInputRef = useRef<HTMLInputElement | null>(null)

  async function load() {
    const prods = await api.get<Product[]>('/products/')
    setProducts(prods.data)
    // Adiciona o token JWT ao buscar pedidos pendentes
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const ords = await api.get<Order[]>('/orders/pending', { headers })
    setPending(ords.data)
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    const ws = connectOrdersWS(() => load())
    return () => ws.close()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        scanInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function scanAdd() {
    const code = scanCode.trim()
    if (!code) return
    try {
      const { data } = await api.get<Product>(`/products/by-barcode/${encodeURIComponent(code)}`)
      addToCart(data)
      setScanCode('')
    } catch (e) {
      // TODO: Exibir mensagem amigável ao usuário
    }
  }

  function addToCart(p: Product) {
    const addQty = Math.max(1, qtyMap[p.id] ?? 1)
    setCart(prev => {
      const idx = prev.findIndex(i => i.product_id === p.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + addQty }
        return copy
      }
      return [...prev, { product_id: p.id, quantity: addQty }]
    })
  }

  function setProductQty(pId: number, value: number) {
    setQtyMap(prev => ({ ...prev, [pId]: value }))
  }

  function updateCartQty(pId: number, value: number) {
    setCart(prev => prev.map(i => i.product_id === pId ? { ...i, quantity: Math.max(1, value) } : i))
  }

  function removeFromCart(pId: number) {
    setCart(prev => prev.filter(i => i.product_id !== pId))
  }

  async function sendToCashier() {
    if (cart.length === 0) return;
    // Recupera o token JWT do localStorage
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await api.post(
      '/orders/',
      { items: cart, customer_name: customerName || null, table_ref: tableRef || null },
      { headers }
    );
    setCart([]);
    setCustomerName('');
    setTableRef('');
    await load();
  }

  // Receber/Cancelar removidos do dispositivo móvel; ações apenas no Caixa

  const total = cart.reduce((sum, i) => {
    const p = products.find(p => p.id === i.product_id)
    return sum + (p ? p.price * i.quantity : 0)
  }, 0)

  const orderTotal = (o: Order) => o.items.reduce((s, it) => s + it.unit_price * it.quantity, 0)

  return (
    <div className="grid">
      <div className="card">
        <h3>Catálogo</h3>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
          <input
            className="input"
            placeholder="Buscar produto por nome"
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <input
            className="input"
            placeholder="Leitor de código de barras"
            value={scanCode}
            onChange={e=>setScanCode(e.target.value)}
            onKeyDown={e=>{ if(e.key === 'Enter'){ e.preventDefault(); scanAdd(); } }}
            ref={scanInputRef}
            style={{ width: 280 }}
          />
          <span className="item-meta">Atalho: F2 para focar</span>
          <button className="button" onClick={scanAdd}>Adicionar por código</button>
        </div>
        <div style={{marginBottom: 8, color: '#888'}}>Produtos encontrados: {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length}</div>
        <ul className="list">
          {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <div className="item-meta">R$ {p.price.toFixed(2)} {p.barcode ? `· ${p.barcode}` : ''}</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button className="button secondary" onClick={() => setProductQty(p.id, Math.max(1, (qtyMap[p.id] ?? 1) - 1))}>−</button>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={qtyMap[p.id] ?? 1}
                  onChange={e => setProductQty(p.id, Math.max(1, parseInt(e.target.value || '1')))}
                  style={{ width: 80 }}
                />
                <button className="button secondary" onClick={() => setProductQty(p.id, (qtyMap[p.id] ?? 1) + 1)}>+</button>
                <button className="button" onClick={() => addToCart(p)}>Adicionar</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>Carrinho (dispositivo móvel)</h3>
        <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
          <input className="input" placeholder="Nome do cliente" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
          <input className="input" placeholder="Mesa/Comanda" value={tableRef} onChange={e=>setTableRef(e.target.value)} />
        </div>
        <ul className="list">
          {cart.map(i => {
            const p = products.find(p => p.id === i.product_id)
            if (!p) return null
            return (
              <li key={i.product_id}>
                <div>
                  <strong>{p.name}</strong>
                  <div className="item-meta">unidades</div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button className="button secondary" onClick={() => updateCartQty(i.product_id, Math.max(1, i.quantity - 1))}>−</button>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={i.quantity}
                    onChange={e => updateCartQty(i.product_id, Math.max(1, parseInt(e.target.value || '1')))}
                    style={{ width: 80 }}
                  />
                  <button className="button secondary" onClick={() => updateCartQty(i.product_id, i.quantity + 1)}>+</button>
                  <span>R$ {(p.price * i.quantity).toFixed(2)}</span>
                  <button className="button danger" onClick={() => removeFromCart(i.product_id)}>Remover</button>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="total">
          <span>Total</span>
          <span>R$ {total.toFixed(2)}</span>
        </div>
        <div style={{ marginTop: 8, display:'flex', gap:8 }}>
          <button className="button success" onClick={sendToCashier} disabled={cart.length === 0}>Enviar ao caixa</button>
        </div>
      </div>

      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3>Pedidos pendentes (no caixa)</h3>
        <ul className="list">
          {pending.map(o => (
            <li key={o.id}>
              <div>
                <strong>#{o.id}</strong>
                <div className="item-meta">{o.customer_name || 'Sem nome'} · {o.table_ref || 'Sem mesa'} · Itens: {o.items.length} · {o.created_at ? new Date(o.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' }) : ''}</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span>R$ {orderTotal(o).toFixed(2)}</span>
                {/* Pagamento e cancelamento apenas no Caixa */}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
