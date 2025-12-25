
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { connectOrdersWS } from '../ws';
import QRCode from 'react-qr-code';
import { QrCodePix } from 'qrcode-pix';

// Tipos básicos
type Product = { id: number; name: string; price: number };
type OrderItem = { product_id: number; quantity: number };
type Order = {
  id: number;
  status: string;
  customer_name?: string;
  table_ref?: string;
  items: OrderItem[];
};

// Função utilitária para calcular total do pedido
function total(order: Order, products: Product[] = []): number {
  return order.items.reduce((sum, item) => {
    const p = products.find(p => p.id === item.product_id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);
}

export default function Cashier() {
  // Estados principais
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [sums, setSums] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [cashierToken, setCashierToken] = useState<string>(() => localStorage.getItem('cashierToken') || '');
  const [pixKey, setPixKey] = useState<string>('61629638000180');
  const [pixName, setPixName] = useState<string>('PANIFICADORA JARDIM');
  const [pixCity, setPixCity] = useState<string>('SAO PAULO');
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomer, setEditCustomer] = useState<string>('');
  const [editTable, setEditTable] = useState<string>('');
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [method, setMethod] = useState<'dinheiro' | 'pix' | 'débito' | 'crédito'>('dinheiro');
  const [cashReceivedRaw, setCashReceivedRaw] = useState<string>('');

  // Carregar pedidos e produtos
  async function load() {
    // Monta params apenas com filtros preenchidos
    const params: any = {};
    if (status) params.status = status;
    if (q) params.q = q;
    if (start) params.start = start;
    if (end) params.end = end;
    const resOrders = await api.get('/orders', { params });
    setOrders(resOrders.data || []);
    const resProducts = await api.get('/products');
    setProducts(resProducts.data || []);
    // Atualiza somatórios
    let totalSum = 0;
    (resOrders.data || []).forEach((o: Order) => {
      totalSum += total(o, resProducts.data || []);
    });
    setSums({ total: totalSum, count: (resOrders.data || []).length });
  }

  useEffect(() => {
    load();
    connectOrdersWS(() => load());
  }, []);

  // Edição de pedido
  function setEditOrderFields(order: Order) {
    setEditingOrder(order);
    setEditCustomer(order.customer_name || '');
    setEditTable(order.table_ref || '');
    setEditItems(order.items.map(i => ({ ...i })));
  }
  function closeEditModal() {
    setEditingOrder(null);
    setEditCustomer('');
    setEditTable('');
    setEditItems([]);
    setProductSearch('');
  }
  function updateEditQty(product_id: number, qty: number) {
    setEditItems(items => items.map(i => i.product_id === product_id ? { ...i, quantity: qty } : i));
  }
  function removeEditItem(product_id: number) {
    setEditItems(items => items.filter(i => i.product_id !== product_id));
  }
  function addEditItem(product_id: number) {
    setEditItems(items => [...items, { product_id, quantity: 1 }]);
  }
  async function saveEditOrder() {
    if (!editingOrder) return;
    await api.put(`/orders/${editingOrder.id}`, {
      customer_name: editCustomer,
      table_ref: editTable,
      items: editItems,
    });
    closeEditModal();
    await load();
  }

  // Pagamento
  const cashReceived = useMemo(() => {
    let v = cashReceivedRaw.replace(/\./g, '').replace(',', '.');
    return parseFloat(v) || 0;
  }, [cashReceivedRaw]);

  // ...existing code...
  // ...existing code...
  async function markPaid(orderId: number) {
    const ord = orders.find(o => o.id === orderId)
    if (!ord) return
    setPayingOrder(ord)
    // Removido setCashReceived(0) pois não existe, já usamos setCashReceivedRaw
  }

  async function cancel(orderId: number) {
    await api.post(`/orders/${orderId}/cancel`, {}, {
      headers: cashierToken ? { 'X-Cashier-Token': cashierToken } : undefined,
    })
    await load()
  }

  const payingTotal = payingOrder ? total(payingOrder, products) : 0
  const change = Math.max(0, cashReceived - payingTotal)

  async function confirmPayment() {
    if (!payingOrder) return;
    // Se o token estiver vazio, não envia o header
    const headers = cashierToken ? { 'X-Cashier-Token': cashierToken } : {};
    console.log('Enviando pagamento com token:', cashierToken);
    await api.post(
      `/orders/${payingOrder.id}/pay`,
      { method },
      { headers }
    );
    setPayingOrder(null);
    await load();
  }
  function closeModal() {
    setPayingOrder(null)
  }
  // Função para remover acentos e caracteres especiais
  function limpaBR(str: string, max: number) {
    return str
      .normalize('NFD')
      .replace(/[^A-Za-z0-9 .\/-]/g, '')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .slice(0, max)
  }
  // CNPJ só números
  function limpaCNPJ(cnpj: string) {
    return (cnpj || '').replace(/\D/g, '')
  }

  function pixPayload(): string {
    if (!payingOrder || !isValidPixKey(pixKey)) {
      console.warn('payingOrder ou pixKey inválido:', payingOrder, pixKey)
      return ''
    }
    const txid = `PDV-${payingOrder.id}`.slice(0,25)
    const amt = payingTotal > 0.009 ? Number(payingTotal.toFixed(2)) : 0.01
    // Sempre usa SAO PAULO como cidade para o BR Code (campo obrigatório)
    let city = 'SAO PAULO'
    let name = limpaBR((pixName || 'PANIFICADORA JARDIM').trim(), 25)
    let key = pixKey
    if (/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(pixKey)) {
      key = limpaCNPJ(pixKey)
    }
    console.log('PIX DEBUG:', { key, name, city, txid, amt })
    try {
      // TODO: Implemente QrCodePix ou use uma lib adequada para gerar o payload Pix
      // Exemplo: return gerarPayloadPix({ key, name, city, txid, amt })
      return ''
    } catch (e) {
      console.error('Erro ao gerar QrCodePix:', e, { key, name, city, txid, amt })
      return ''
    }
  }

  function isValidPixKey(key: string): boolean {
    const k = key.trim()
    if (!k) return false
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    const digits = k.replace(/\D/g, '')
    const phone = /^\+?\d{10,14}$/
    if (email.test(k)) return true
    if (uuid.test(k)) return true
    if (phone.test(k) || (digits.length === 11 || digits.length === 14)) return true // CPF/CNPJ/telefone
    return false
  }

  function formatCNPJ(key: string): string {
    const d = (key || '').replace(/\D/g, '')
    if (d.length !== 14) return key || '—'
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`
  }

  return (
    <div className="card">
      <h2>Caixa</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <select className="select" value={status} onChange={e=>setStatus(e.target.value as any)}>
          <option value="">Todos</option>
          <option value="pending">Pendentes</option>
          <option value="paid">Pagos</option>
          <option value="cancelled">Cancelados</option>
        </select>
        <input className="input" placeholder="Buscar nome/mesa" value={q} onChange={e=>setQ(e.target.value)} />
        <label>
          <span className="item-meta">Início</span>
          <input className="input" type="date" value={start} onChange={e=>setStart(e.target.value)} />
        </label>
        <label>
          <span className="item-meta">Fim</span>
          <input className="input" type="date" value={end} onChange={e=>setEnd(e.target.value)} />
        </label>
        <button className="button" onClick={load}>Atualizar</button>
        <div style={{ marginLeft: 'auto' }}>
          <strong>Total: R$ {sums.total.toFixed(2)}</strong> — Pedidos: {sums.count}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginLeft: 'auto' }}>
          <input className="input" placeholder="Token do caixa" value={cashierToken} onChange={e=>{ setCashierToken(e.target.value); localStorage.setItem('cashierToken', e.target.value); }} style={{ width: 220 }} />
          <input className="input" placeholder="Chave Pix (CNPJ, email, etc)" value={pixKey} onChange={e=>setPixKey(e.target.value)} style={{ width: 220 }} />
          <input className="input" placeholder="Nome cadastrado Pix" value={pixName} onChange={e=>setPixName(e.target.value)} style={{ width: 220 }} />
          <input className="input" placeholder="Cidade Pix" value={pixCity} onChange={e=>setPixCity(e.target.value)} style={{ width: 140 }} />
        </div>
      </div>
      <ul className="list">
        {orders.map(o => (
          <li key={o.id}>
            <div>
              <strong>#{o.id}</strong>
              <div className="item-meta">{o.status} · {o.customer_name || 'Sem nome'} · {o.table_ref || 'Sem mesa'}</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0' }}>
                <span>R$ {total(o).toFixed(2)}</span>
                {o.status === 'pending' && (
                  <>
                    <button className="button success" onClick={() => markPaid(o.id)}>Receber</button>
                    <button className="button danger" onClick={() => cancel(o.id)}>Cancelar</button>
                    <button className="button" onClick={() => setEditingOrder(o)}>Editar</button>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {editingOrder && (
        <div className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:1000 }}>
          <div className="card" style={{ width: 600, maxWidth:'95vw', maxHeight:'90vh', overflow:'auto' }}>
            <h3>Editar Pedido #{editingOrder.id}</h3>
            <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
              <input className="input" placeholder="Nome do cliente" value={editCustomer} onChange={e=>setEditCustomer(e.target.value)} />
              <input className="input" placeholder="Mesa/Comanda" value={editTable} onChange={e=>setEditTable(e.target.value)} />
            </div>
            <div style={{marginBottom:8}}>
              <strong>Itens do pedido</strong>
              <ul className="list">
                {editItems.map(i => {
                  const p = products.find(p => p.id === i.product_id)
                  if (!p) return null
                  return (
                    <li key={i.product_id} style={{display:'flex',alignItems:'center',gap:8}}>
                      <span>{p.name}</span>
                      <input className="input" type="number" min={1} value={i.quantity} onChange={e=>updateEditQty(i.product_id, Math.max(1,parseInt(e.target.value)||1))} style={{width:60}} />
                      <span>R$ {(p.price * i.quantity).toFixed(2)}</span>
                      <button className="button danger" onClick={()=>removeEditItem(i.product_id)}>Remover</button>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div style={{marginBottom:8, display:'flex', alignItems:'center', gap:16}}>
              <strong style={{flex:1}}>Adicionar produto</strong>
              <input
                className="input"
                style={{width:220, marginLeft:8}}
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>
            <ul className="list">
              {products
                .filter(p => !editItems.some(i => i.product_id === p.id))
                .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                .map(p => (
                  <li key={p.id} style={{display:'flex',alignItems:'center',gap:8}}>
                    <span>{p.name}</span>
                    <span>R$ {p.price.toFixed(2)}</span>
                    <button className="button" onClick={()=>addEditItem(p.id)}>Adicionar</button>
                  </li>
                ))}
            </ul>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
              <button className="button secondary" onClick={closeEditModal}>Cancelar</button>
              <button className="button success" onClick={saveEditOrder} disabled={editItems.length===0}>Salvar alterações</button>
            </div>
          </div>
        </div>
      )}

      {payingOrder && (
        <div className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div className="card" style={{ width: 560, maxWidth:'90vw' }}>
            <h3>Receber pagamento · Pedido #{payingOrder.id}</h3>
            <div style={{ marginBottom: 12 }}>
              <label className="item-meta">Forma de pagamento</label>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {(['dinheiro','pix','débito','crédito'] as const).map(m => (
                  <label key={m} style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <input type="radio" name="method" checked={method===m} onChange={()=>setMethod(m)} /> {m}
                  </label>
                ))}
              </div>
            </div>

            {(method === 'dinheiro' || method === 'pix' || method === 'débito' || method === 'crédito') && (
              <div style={{ marginBottom: 12 }}>
                {method === 'dinheiro' && (
                  <>
                    <label className="item-meta">Valor recebido</label>
                    <input
                      className="input"
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={cashReceivedRaw || payingTotal.toFixed(2).replace('.', ',')}
                      onChange={e => {
                        // Mascara moeda pt-BR
                        let v = e.target.value.replace(/[^0-9,]/g, '');
                        // Garante formato 0,00
                        v = v.replace(/(\d{1,})(,\d{0,2})?.*/, (m: string, int: string, dec: string) => int + (dec || ''));
                        setCashReceivedRaw(v);
                      }}
                      placeholder={payingTotal.toFixed(2).replace('.', ',')}
                    />
                  </>
                )}
                <div className="item-meta">
                  Total: R$ {payingTotal.toFixed(2)}
                  {method === 'dinheiro' && <> · Troco: R$ {change.toFixed(2)}</>}
                </div>
              </div>
            )}

            {method === 'pix' && payingOrder && (() => {
              // Sanitização dos campos Pix
              function limpaBR(str: string, max=25) {
                return (str || '')
                  .normalize('NFD')
                  .replace(/[^A-Za-z0-9 .\/-]/g, '')
                  .replace(/[\u0300-\u036f]/g, '')
                  .toUpperCase()
                  .slice(0, max);
              }
              function limpaCNPJ(cnpj: string) {
                return (cnpj || '').replace(/\D/g, '');
              }
              let valorPix = Number(payingTotal);
              if (isNaN(valorPix) || valorPix < 0.01) valorPix = 0.01;
              let txid = `PDV-${payingOrder.id}`.slice(0,25);
              let key = pixKey;
              // Se for CNPJ, só números
              if (/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(key)) {
                key = limpaCNPJ(key);
              }
              let name = limpaBR(pixName || 'PANIFICADORA JARDIM', 25);
              let city = limpaBR(pixCity || 'SAO PAULO', 15);
              try {
                const qrPix = new QrCodePix({
                  version: '01',
                  key,
                  name,
                  city,
                  transactionId: txid,
                  value: valorPix,
                });
                const payload = qrPix.payload();
                return (
                  <div style={{ display:'flex', gap:16, alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ background:'#fff', padding:12 }}>
                      <QRCode value={payload} size={180} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div className="item-meta">CNPJ: 61.629.638/0001-80</div>
                      <div className="item-meta">TXID: {txid}</div>
                      <div className="item-meta">Nome: {name} · Cidade: {city}</div>
                      <div style={{marginTop:8, fontSize:12, wordBreak:'break-all', background:'#eee', padding:8, borderRadius:4}}>
                        <b>Payload Pix:</b><br/>
                        <span>{payload}</span>
                      </div>
                    </div>
                  </div>
                );
              } catch (e) {
                return <div style={{color:'red'}}>Erro ao gerar payload Pix</div>;
              }
            })()}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
              <button className="button secondary" onClick={closeModal}>Cancelar</button>
              <button
                className="button success"
                onClick={confirmPayment}
                // Só desabilita para dinheiro se valor recebido < total
                disabled={
                  method === 'dinheiro' && (cashReceivedRaw.trim() !== '' && cashReceived < payingTotal)
                }
              >
                Confirmar recebimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
