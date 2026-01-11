// ...existing code...
import { useEffect, useMemo, useState } from 'react';
import EditOrderModal from './EditOrderModal';
// @ts-ignore
import { api } from '../api';
import { connectOrdersWS } from '../ws';
import QRCode from 'react-qr-code';
import { QrCodePix } from 'qrcode-pix';

// Tipos básicos
type Product = { id: number; name: string; price: number };
type OrderItem = { product_id: number; quantity: number };
type Order = {
  id: number;
  order_number?: number;
  status: string;
  customer_name?: string;
  table_ref?: string;
  items: OrderItem[];
  payment_method?: string;
};

// Função utilitária para calcular total do pedido
function total(order: Order, products: Product[] = []): number {
  return order.items.reduce((sum, item) => {
    const p = products.find(p => p.id === item.product_id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);
}

export default function Cashier() {
  // ...existing code...
  // Função para imprimir recibo em PDF
  function imprimirRecibo(orderId: number) {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      // TODO: Exibir mensagem amigável ao usuário
      return;
    }
    const pagamentoLabels: Record<string, string> = { 'dinheiro': 'Dinheiro', 'pix': 'Pix', 'débito': 'Débito', 'credito': 'Crédito', 'crédito': 'Crédito' };
    const dataAtual = new Date().toLocaleString('pt-BR');
    const html = `
      <div style='width:100vw;min-height:100vh;display:flex;align-items:center;justify-content:flex-start;background:var(--bg);'>
        <div style='padding:28px 16px;font-family:sans-serif;max-width:340px;width:340px;font-size:19px;line-height:1.5;background:var(--card);border-radius:14px;box-shadow:0 2px 12px #0001; margin-left:18vw; text-align:center;'>
          <h3 style='text-align:center;margin:0 0 6px 0;font-size:24px;'>Padaria Jardim</h3>
          <div style='text-align:center;margin-bottom:12px;font-size:18px;'>Pedido #${order.order_number}</div>
          <div style='text-align:left;'>Cliente: ${order.customer_name || '-'}</div>
          <div style='text-align:left;'>Mesa: ${order.table_ref || '-'}</div>
          <div style='text-align:left;'>Pagamento: ${pagamentoLabels[order.payment_method as string] || order.payment_method || '-'} ${dataAtual}</div>
          <hr style='margin:14px 0' />
          <div style='text-align:left;'>
            ${order.items.map((it: any) => {
              const prod = products.find((p: Product) => p.id === it.product_id);
              const name = prod?.name || `Item ${it.product_id}`;
              const unitPrice = it.unit_price && it.unit_price > 0 ? it.unit_price : (prod?.price || 0);
              let valor = (unitPrice * it.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              return `<div style='display:flex;justify-content:space-between'><span>${name} x${it.quantity}</span><span>R$ ${valor}</span></div>`;
            }).join('')}
          </div>
          <hr style='margin:14px 0' />
          <div style='display:flex;justify-content:space-between;font-weight:700;font-size:22px;margin-top:12px;'><span>Total da compra</span><span>R$ ${order.items.reduce((s: number, it: any) => {
            const prod = products.find((p: Product) => p.id === it.product_id);
            const unitPrice = it.unit_price && it.unit_price > 0 ? it.unit_price : (prod?.price || 0);
            return s + unitPrice * it.quantity;
          }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        </div>
      </div>
    `;
    function gerarPDF() {
      try {
        if (!window.html2pdf) {
          // TODO: Exibir mensagem amigável ao usuário
          console.error('window.html2pdf não está disponível!');
          return;
        }
        // @ts-ignore
        window.html2pdf().set({ filename: `recibo-pedido-${order.order_number}.pdf`, margin: 0.2, html2canvas: { scale: 2 } }).from(html).save();
      } catch (e) {
        // TODO: Exibir mensagem amigável ao usuário
        console.error('Erro ao gerar PDF:', e);
      }
    }
    if (!window.html2pdf) {
      // TODO: Exibir mensagem amigável ao usuário
      const script = document.createElement('script');
      script.src = '/html2pdf.bundle.min.js';
      script.onload = () => {
        // TODO: Exibir mensagem amigável ao usuário
        gerarPDF();
      };
      script.onerror = () => {
        // TODO: Exibir mensagem amigável ao usuário
        console.error('Erro ao carregar /html2pdf.bundle.min.js');
      };
      document.body.appendChild(script);
    } else {
      gerarPDF();
    }
  }
  useEffect(() => {
    function atualizarPedidos() { load(); }
    window.addEventListener('pedidoEnviadoAoCaixa', atualizarPedidos);
    return () => window.removeEventListener('pedidoEnviadoAoCaixa', atualizarPedidos);
  }, []);

// Tipos básicos
type Product = { id: number; name: string; price: number };
type OrderItem = { product_id: number; quantity: number };
type Order = {
  id: number;
  order_number?: number;
  status: string;
  customer_name?: string;
  table_ref?: string;
  items: OrderItem[];
  payment_method?: string;
};

// Função utilitária para calcular total do pedido
function total(order: Order, products: Product[] = []): number {
  return order.items.reduce((sum, item) => {
    const p = products.find(p => p.id === item.product_id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);
        // Tradução dos métodos de pagamento
        const pagamentoLabels: Record<string, string> = { 'dinheiro': 'Dinheiro', 'pix': 'Pix', 'débito': 'Débito', 'credito': 'Crédito', 'crédito': 'Crédito' };
        // Cria HTML do recibo
        // Corrigir valores zerados usando o preço do produto se unit_price for 0
        const htmlItens = order.items.map((it: any) => {
          const prod = products.find((p: Product) => p.id === it.product_id);
          const name = prod?.name || `Item ${it.product_id}`;
          const unitPrice = it.unit_price && it.unit_price > 0 ? it.unit_price : (prod?.price || 0);
          return `<div style='display:flex;justify-content:space-between'><span>${name} x${it.quantity}</span><span>R$ ${(unitPrice * it.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>`;
        }).join('');
        const total = order.items.reduce((s: number, it: any) => {
          const prod = products.find((p: Product) => p.id === it.product_id);
          const unitPrice = it.unit_price && it.unit_price > 0 ? it.unit_price : (prod?.price || 0);
          return s + unitPrice * it.quantity;
        }, 0);
        const html = `
          <div style='width:100vw;min-height:100vh;display:flex;align-items:center;justify-content:flex-start;background:var(--bg);'>
            <div style='padding:28px 16px;font-family:sans-serif;max-width:340px;width:340px;font-size:19px;line-height:1.5;background:var(--card);border-radius:14px;box-shadow:0 2px 12px #0001; margin-left:18vw; text-align:center;'>
              <h3 style='text-align:center;margin:0 0 6px 0;font-size:24px;'>Padaria Jardim</h3>
              <div style='text-align:center;margin-bottom:12px;font-size:18px;'>Pedido #${order.order_number}</div>
              <div style='text-align:left;'>Cliente: ${order.customer_name || '-'}</div>
              <div style='text-align:left;'>Mesa: ${order.table_ref || '-'}</div>
              <div style='text-align:left;'>Pagamento: ${pagamentoLabels[order.payment_method as string] || order.payment_method || '-'} ${dataAtual}</div>
              <hr style='margin:14px 0' />
              <div style='text-align:left;'>
                ${order.items.map((it: any) => {
                  const prod = products.find((p: Product) => p.id === it.product_id);
                  const name = prod?.name || `Item ${it.product_id}`;
                  const unitPrice = it.unit_price && it.unit_price > 0 ? it.unit_price : (prod?.price || 0);
                  let valor = (unitPrice * it.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return `<div style='display:flex;justify-content:space-between'><span>${name} x${it.quantity}</span><span>R$ ${valor}</span></div>`;
                }).join('')}
              </div>
              <hr style='margin:14px 0' />
              <div style='display:flex;justify-content:space-between;font-weight:700;font-size:22px;margin-top:12px;'><span>Total da compra</span><span>R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>
          </div>
        `;
        // Carrega html2pdf dinamicamente se não estiver presente
        function gerarPDF() {
          try {
            if (!window.html2pdf) {
              alert('Atenção: window.html2pdf não está disponível no momento da geração do PDF.');
              console.error('window.html2pdf não está disponível!');
              return;
            }
            // @ts-ignore
            window.html2pdf().set({ filename: `recibo-pedido-${order.order_number}.pdf`, margin: 0.2, html2canvas: { scale: 2 } }).from(html).save();
            alert('Comando para gerar PDF executado. Se não baixar, verifique bloqueio de popups/downloads.');
            console.log('Comando window.html2pdf().from(...).save() executado.');
          } catch (e) {
            alert('Erro ao gerar PDF do recibo. Tente novamente ou verifique se o navegador permite downloads automáticos.');
            console.error('Erro ao gerar PDF:', e);
          }
        }
        // @ts-ignore
        if (!window.html2pdf) {
          alert('window.html2pdf não está disponível, carregando biblioteca...');
          console.log('window.html2pdf não está disponível, carregando /html2pdf.bundle.min.js');
          const script = document.createElement('script');
          script.src = '/html2pdf.bundle.min.js';
          script.onload = () => {
            alert('Biblioteca html2pdf carregada! Tentando gerar PDF...');
            console.log('Biblioteca html2pdf carregada!');
            gerarPDF();
          };
          script.onerror = () => {
            alert('Erro ao carregar a biblioteca de PDF. Verifique sua conexão ou recarregue a página.');
            console.error('Erro ao carregar /html2pdf.bundle.min.js');
          };
          document.body.appendChild(script);
        } else {
          gerarPDF();
        }
      }
    // Mapeamento de status para português
    const statusLabels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      cancelled: 'Cancelado',
      '': 'Todos',
    };
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
  const [pixCity, setPixCity] = useState<string>('Macapá');
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

  // Atualizar pedidos automaticamente ao mudar o filtro de status

  // Atualizar pedidos automaticamente ao mudar o filtro de status ou datas
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, start, end]);

  useEffect(() => {
    load();
    connectOrdersWS(() => load());
  }, []);

  // Edição de pedido
  function setEditOrderFields(order: Order) {
    // Só permite editar se produtos já estiverem carregados
    if (!products || products.length === 0) {
      alert('Aguarde o carregamento dos produtos antes de editar o pedido.');
      return;
    }
    setEditingOrder(order);
    setEditCustomer(order.customer_name || '');
    setEditTable(order.table_ref || '');
    // Ao editar, inicializa editItems com todos os produtos do catálogo, usando a quantidade do pedido (ou zero)
    setEditItems(products.map(p => {
      const found = order.items.find(i => i.product_id === p.id);
      return { product_id: p.id, quantity: found ? found.quantity : 0 };
    }));
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
    setEditItems(items => {
      const idx = items.findIndex(i => i.product_id === product_id);
      if (idx !== -1) {
        // Se já existe, incrementa a quantidade
        return items.map(i => i.product_id === product_id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        // Se não existe, adiciona
        return [...items, { product_id, quantity: 1 }];
      }
    });
  }
  async function saveEditOrder() {
    if (!editingOrder) return;
    // Só envia produtos com quantidade > 0
    const itemsToSend = editItems.filter(i => i.quantity > 0);
    await api.put(`/orders/${editingOrder.id}`, {
      customer_name: editCustomer,
      table_ref: editTable,
      items: itemsToSend,
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
      // ATENÇÃO: NÃO ALTERAR SEM TESTAR!
      // - O campo value DEVE ser sempre Number (nunca string)
      // - NÃO incluir transactionId para QR estático
      // - Use sempre esta função centralizada para gerar o payload Pix
      // - Teste o QR Code em bancos reais após qualquer alteração
    if (!payingOrder || !isValidPixKey(pixKey)) {
      console.warn('payingOrder ou pixKey inválido:', payingOrder, pixKey)
      return ''
    }
    let key = pixKey.replace(/\D/g, '');
    let name = (pixName || 'Panificadora Jardim').normalize('NFC').slice(0,25);
    let city = (pixCity || 'Macapá').normalize('NFC').slice(0,15);
    let valorPix = Number(payingTotal);
    console.log('[PIX DEBUG]', { key, name, city, valorPix, payingOrder });
    try {
      const qrPix = QrCodePix({
        version: '01',
        key,
        name,
        city,
        value: valorPix,
      });
      const payload = qrPix.payload();
      console.log('[PIX PAYLOAD]', payload);
      return payload;
    } catch (e) {
      console.error('Erro ao gerar QrCodePix:', e, { key, name, city, valorPix });
      return '';
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
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="cancelled">Cancelado</option>
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
          <input className="input" placeholder="Token do caixa" value={cashierToken} readOnly style={{ width: 220 }} />
          <input className="input" placeholder="Chave Pix (CNPJ, email, etc)" value={pixKey} readOnly style={{ width: 220 }} />
          <input className="input" placeholder="Nome cadastrado Pix" value={pixName} readOnly style={{ width: 220 }} />
          <input className="input" placeholder="Cidade Pix" value={pixCity} readOnly style={{ width: 140 }} />
        </div>
      </div>
      <ul className="list">
        {orders.map(o => (
          <li key={o.id}>
            <div>
              <strong>#{o.order_number}</strong>
              <div className="item-meta">{statusLabels[o.status] || o.status} · {o.customer_name || 'Sem nome'} · {o.table_ref || 'Sem mesa'}</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0' }}>
                <span>{total(o, products).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                {o.status === 'pending' && (
                  <>
                    <button className="button success" onClick={() => markPaid(o.id)}>Receber</button>
                    <button className="button" onClick={() => setEditOrderFields(o)}>Editar</button>
                  </>
                )}
                {o.status === 'paid' && (
                  <button className="button" onClick={() => imprimirRecibo(o.id)}>Imprimir recibo</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {editingOrder && (
        <EditOrderModal onClose={closeEditModal} escEnabled>
          <div className="card edit-modal-product-list" style={{
            width: 600,
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: 12,
            scrollbarWidth: 'thin',
            scrollbarColor: '#b3b8e0 #f4f4fa',
            boxShadow: '0 8px 32px rgba(34, 41, 94, 0.18), 0 1.5px 8px rgba(0,0,0,0.10)',
            background: '#fff',
            borderRadius: 18,
          }}>
            <style>{`
              .edit-modal-product-list::-webkit-scrollbar {
                width: 8px;
                background: #f4f4fa;
                border-radius: 8px;
              }
              .edit-modal-product-list::-webkit-scrollbar-thumb {
                background: #b3b8e0;
                border-radius: 8px;
              }
              .edit-modal-product-list::-webkit-scrollbar-thumb:hover {
                background: #6c7bff;
              }
            `}</style>
            <h3>Editar Pedido #{editingOrder.order_number}</h3>
            <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
              <input className="input" placeholder="Nome do cliente" value={editCustomer} onChange={e=>setEditCustomer(e.target.value)} />
              <input className="input" placeholder="Mesa/Comanda" value={editTable} onChange={e=>setEditTable(e.target.value)} />
            </div>
            <div style={{marginBottom:8}}>
              <strong>Itens do pedido</strong>
              <ul className="list">
                {editItems.filter(i => i.quantity > 0).map(i => {
                  const p = products.find(p => p.id === i.product_id)
                  if (!p) return null
                  return (
                    <li key={i.product_id} style={{
                      display:'flex',alignItems:'center',gap:8,
                      padding:'8px 0',
                      borderBottom:'1px solid rgba(255,255,255,0.08)'
                    }}>
                      <span style={{flex:2}}>{p.name}</span>
                      <div style={{flex:2,display:'flex',alignItems:'center',justifyContent:'flex-start',gap:0}}>
                        <button className="button" style={{background:'#e53e3e',color:'#fff',fontWeight:600,border:'none',boxShadow:'0 1px 4px #0001',borderRadius:'6px 0 0 6px',padding:'4px 12px',fontSize:18,cursor:i.quantity>1?'pointer':'not-allowed',opacity:i.quantity>1?1:0.5,transition:'all 0.2s'}} onClick={()=>updateEditQty(i.product_id, Math.max(1, i.quantity-1))} disabled={i.quantity<=1}>−</button>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          value={i.quantity}
                          onChange={e => updateEditQty(i.product_id, Math.max(1, parseInt(e.target.value) || 1))}
                          style={{
                            width:48,
                            textAlign:'center',
                            fontWeight:600,
                            fontSize:18,
                            borderRadius:0,
                            borderLeft:'none',
                            borderRight:'none',
                            background:'#fff',
                            boxShadow:'none'
                          }}
                        />
                        <button className="button" style={{background:'#22c55e',color:'#fff',fontWeight:600,border:'none',boxShadow:'0 1px 4px #0001',borderRadius:'0 6px 6px 0',padding:'4px 12px',fontSize:18,cursor:'pointer',transition:'all 0.2s'}} onClick={()=>updateEditQty(i.product_id, i.quantity+1)}>+</button>
                        <button className="button danger" style={{marginLeft:12,background:'#e53e3e',color:'#fff',fontWeight:600,border:'none',boxShadow:'0 1px 4px #0001',borderRadius:6,padding:'4px 10px',fontSize:15,cursor:'pointer',transition:'all 0.2s'}} onClick={()=>removeEditItem(i.product_id)}>Remover</button>
                                  <style>{`
                                    .edit-modal-product-list .button:hover:not(:disabled) {
                                      filter: brightness(1.08) saturate(1.2);
                                      box-shadow: 0 2px 8px #22c55e33;
                                      transform: translateY(-1px) scale(1.04);
                                    }
                                  `}</style>
                      </div>
                      <span style={{flex:1, textAlign:'right'}}>{(p.price * i.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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
              {/* Produtos mais vendidos */}
              {(() => {
                // Contabiliza vendas por produto
                const salesCount: Record<number, number> = {};
                orders.forEach(order => {
                  order.items.forEach(item => {
                    salesCount[item.product_id] = (salesCount[item.product_id] || 0) + item.quantity;
                  });
                });
                // Ordena produtos por vendas
                const topProducts = [...products]
                  .sort((a, b) => (salesCount[b.id] || 0) - (salesCount[a.id] || 0))
                  .slice(0, 5);
                return topProducts.map(p => {
                  const already = editItems.find(i => i.product_id === p.id);
                  const qty = already ? already.quantity : 0;
                  return (
                    <li key={p.id} style={{display:'flex',alignItems:'center',gap:8, background:'#f7f7ff'}}>
                      <span style={{flex:2}}>🔥 {p.name}</span>
                      <span style={{flex:1, textAlign:'right'}}>{p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      <div style={{display:'flex',alignItems:'center',gap:4,flex:1,justifyContent:'flex-end'}}>
                        <button className={qty===0 ? 'button button-disabled' : 'button'} onClick={() => {
                          if (qty > 1) updateEditQty(p.id, qty-1);
                          else if (qty === 1) removeEditItem(p.id);
                        }} disabled={qty===0}>−</button>
                        <span style={{minWidth:24,display:'inline-block',textAlign:'center'}}>{qty}</span>
                        <button className="button button-plus" onClick={() => {
                          if (qty === 0) addEditItem(p.id);
                          else updateEditQty(p.id, qty+1);
                        }}>+</button>
                      </div>
                    </li>
                  );
                });
              })()}
              {/* Lista normal filtrada */}
              {products
                .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                .map(p => {
                  const already = editItems.find(i => i.product_id === p.id);
                  const qty = already ? already.quantity : 0;
                  return (
                    <li key={p.id} style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{flex:2}}>{p.name}</span>
                      <span style={{flex:1, textAlign:'right'}}>{p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      <div style={{display:'flex',alignItems:'center',gap:4,flex:1,justifyContent:'flex-end'}}>
                        <button className={qty===0 ? 'button button-disabled' : 'button'} onClick={() => {
                          if (qty > 1) updateEditQty(p.id, qty-1);
                          else if (qty === 1) removeEditItem(p.id);
                        }} disabled={qty===0}>−</button>
                        <span style={{minWidth:24,display:'inline-block',textAlign:'center'}}>{qty}</span>
                        <button className="button button-plus" onClick={() => {
                          if (qty === 0) addEditItem(p.id);
                          else updateEditQty(p.id, qty+1);
                        }}>+</button>
                      </div>
                    </li>
                  );
                })}
            </ul>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
              <button className="button secondary" style={{background:'#eee',color:'#222',fontWeight:600,border:'none',boxShadow:'0 1px 4px #0001',padding:'10px 24px',borderRadius:8,cursor:'pointer'}} onClick={closeEditModal}>Cancelar</button>
              <button className="button success" style={{background:'#22c55e',color:'#fff',fontWeight:600,border:'none',boxShadow:'0 1px 4px #0001',padding:'10px 24px',borderRadius:8,cursor:'pointer',opacity:editItems.length===0?0.5:1}} onClick={saveEditOrder} disabled={editItems.length===0}>Salvar alterações</button>
            </div>
          </div>
        </EditOrderModal>
      )}

      {payingOrder && (
        <EditOrderModal onClose={closeModal} escEnabled>
          <div className="card" style={{ width: 560, maxWidth:'90vw' }}>
            <h3>Receber pagamento · Pedido #{payingOrder.order_number}</h3>
            <div style={{marginBottom:12}}>
              <strong>Itens do pedido</strong>
              <ul className="list">
                {payingOrder.items.map(item => {
                  const p = products.find(prod => prod.id === item.product_id);
                  if (!p) return null;
                  return (
                    <li key={item.product_id} style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{flex:1}}>{p.name}</span>
                      <span style={{width:40, textAlign:'center'}}>{item.quantity}x</span>
                      <span>{(p.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
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
                      value={cashReceivedRaw}
                      onChange={e => {
                        setCashReceivedRaw(e.target.value);
                      }}
                      onBlur={e => {
                        let v = e.target.value.replace(/[^0-9,]/g, '');
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
              try {
                const payload = pixPayload();
                return (
                  <div style={{ display:'flex', gap:16, alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ background:'#fff', padding:12 }}>
                      <QRCode value={payload} size={180} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div className="item-meta">Chave Pix: {pixKey}</div>
                      <div className="item-meta">Nome: {pixName} · Cidade: {pixCity}</div>
                      <div style={{
                        marginTop:8,
                        fontSize:13,
                        wordBreak:'break-all',
                        background:'#f8f8f8',
                        color:'#111',
                        padding:8,
                        borderRadius:4,
                        fontFamily:'monospace',
                        textAlign:'left'
                      }}>
                        <b style={{color:'#111'}}>Payload Pix:</b><br/>
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
              <button className="button" style={{background:'#eee',color:'#222',fontWeight:600,border:'none',boxShadow:'0 1px 4px #0001',padding:'10px 24px',borderRadius:8,cursor:'pointer'}} onClick={closeModal}>Cancelar</button>
              <button
                className="button confirmar"
                onClick={confirmPayment}
                disabled={
                  method === 'dinheiro' && (cashReceivedRaw.trim() !== '' && cashReceived < payingTotal)
                }
              >
                Confirmar recebimento
              </button>
            </div>
          </div>
        </EditOrderModal>
      )}
    </div>
  );
}
