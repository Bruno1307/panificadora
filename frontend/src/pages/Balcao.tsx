import React, { useState, useEffect, useRef } from 'react';
import { connectOrdersWS } from '../ws';
import { useNavigate } from 'react-router-dom';
import { getApi } from '../api';
import { useToast } from '../components/Toast';

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

function useVoiceCommand(products: any[], addToCart: any, updateCartQty: any) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const chunksRef = useRef<any[]>([]);
  const { showToast } = useToast();

  async function startRecording() {
    setAudioUrl(null);
    setRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new window.MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e: any) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioUrl(URL.createObjectURL(blob));
        const formData = new FormData();
        formData.append('file', blob, 'comando.wav');
        try {
          // Busca a URL do backend do config.json
          const configRes = await fetch('/config.json');
          const config = await configRes.json();
          const backendUrl = config.BACKEND_URL.replace(/\/$/, '');
          const res = await fetch(`${backendUrl}/transcribe-audio/`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.text) {
            // Função para normalizar texto (remover acentos, espaços extras, minúsculas)
            function normalize(str: string) {
              return str
                .normalize('NFD')
                  .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // remove caracteres de controle
                  .replace(/[\u0300-\u036f]/g, '') // remove acentos
                .replace(/[^\w\s]/gi, '') // remove pontuação
                .replace(/\s+/g, ' ') // espaços múltiplos para um só
                .trim()
                .toLowerCase();
            }
            const txt = normalize(data.text);
            let found = null;
            // Debug: log texto reconhecido e nomes dos produtos normalizados
            console.log('Reconhecido:', txt);
            console.log('Produtos normalizados:', products.map(p => normalize(p.name)));
            for (const p of products) {
              if (txt.includes(normalize(p.name))) {
                found = p;
                break;
              }
            }
            const qtdMatch = txt.match(/(\d+)/);
            const qtd = qtdMatch ? parseInt(qtdMatch[1]) : 1;
            if (found) {
              addToCart({ ...found, quantity: qtd });
              showToast(`Produto reconhecido: ${found.name} x${qtd}`, 'success');
            } else {
              showToast(`Produto não reconhecido. Fale o nome exato do produto.\nTexto reconhecido: "${data.text}"`, 'error');
            }
          }
        } catch (err) {
          alert('Erro ao transcrever áudio.');
        }
      };
      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
        setRecording(false);
      }, 3500);
    } catch (err) {
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
      setRecording(false);
    }
  }
  return { recording, audioUrl, startRecording };
}

function Balcao() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('balcao_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('balcao_customerName') || '');
  const [tableRef, setTableRef] = useState(() => localStorage.getItem('balcao_tableRef') || '');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  function handleCartQtyChange(product_id: number, value: string) {
    setCart(prev => prev.map(i => {
      if (i.product_id !== product_id) return i;
      const n = parseInt(value);
      return { ...i, quantity: !value || isNaN(n) || n < 1 ? 1 : n };
    }));
  }
  function handleCartQtyBlur(product_id: number, value: string) {
    setCart(prev => prev.map(i => {
      if (i.product_id !== product_id) return i;
      const n = parseInt(value);
      return { ...i, quantity: !value || isNaN(n) || n < 1 ? 1 : n };
    }));
  }

  const voice = useVoiceCommand(products, addToCart, updateCartQty);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login', { replace: true });
    window.location.reload();
  }

  useEffect(() => {
    let wsInstance: WebSocket | null = null;
    (async () => {
      const api = await getApi();
      api.get('/products').then(res => setProducts(res.data));
      loadRecentOrders(api);
      wsInstance = await connectOrdersWS(() => loadRecentOrders(api));
    })();
    return () => {
      if (wsInstance && typeof wsInstance.close === 'function') wsInstance.close();
    };
  }, []);

  async function loadRecentOrders(apiInstance?: any) {
    const api = apiInstance || await getApi();
    const res = await api.get('/orders?status=pending');
    setRecentOrders(res.data.sort((a: Order, b: Order) => (b.created_at && a.created_at ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : 0)).slice(0, 10));
  }

  useEffect(() => {
    localStorage.setItem('balcao_cart', JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem('balcao_customerName', customerName);
  }, [customerName]);
  useEffect(() => {
    localStorage.setItem('balcao_tableRef', tableRef);
  }, [tableRef]);

  function addToCart(product: any) {
    setCart(prev => {
      const found = prev.find(i => i.product_id === product.id);
      const quantity = product.quantity || 1;
      if (found) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { product_id: product.id, quantity }];
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
      showToast('Você precisa estar logado para enviar pedidos.', 'error');
      navigate('/login', { replace: true });
      return;
    }
    setLoading(true);
    try {
      const api = await getApi();
      await api.post('/orders/', { items: cart, customer_name: customerName || null, table_ref: tableRef || null });
      setCart([]);
      setCustomerName('');
      setTableRef('');
      localStorage.removeItem('balcao_cart');
      localStorage.removeItem('balcao_customerName');
      localStorage.removeItem('balcao_tableRef');
      showToast('Pedido enviado!', 'success');
      loadRecentOrders(api);
      window.dispatchEvent(new Event('pedidoEnviadoAoCaixa'));
    } catch (err) {
      const errorMsg = (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'detail' in err.response.data)
        ? (err as any).response.data.detail
        : (err instanceof Error ? err.message : String(err));
      showToast('Erro ao enviar pedido! ' + errorMsg, 'error');
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
    <>
      <div style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh' }}>
        {/* Coluna Catálogo */}
        <div style={{ flex: 2, minWidth: 0, background: '#f7fafc', color: '#23264a', borderRadius: 0, boxShadow: 'none', padding: '32px 32px 32px 24px', margin: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
            <button className="button" style={{ borderRadius: 12, fontWeight: 600, fontSize: 16, padding: '8px 18px', boxShadow: '0 2px 8px #0003', background: '#43e97b', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }} onClick={voice.startRecording} disabled={voice.recording}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={voice.recording ? '#ff4d4f' : '#fff'} xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3s-3 1.34-3 3v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V22h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                {voice.recording ? 'Gravando...' : 'Falar'}
              </span>
            </button>
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
          <div className="catalogo-scroll" style={{ maxHeight: 650, overflowY: 'auto', marginBottom: 8 }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filteredProducts.map(p => (
                <li key={p.id} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', background: '#f7fafc', borderRadius: 14, boxShadow: '0 2px 8px #0001', padding: '12px 12px', border: '2px solid #43e97b' }}>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 18 }}>{p.name} <small style={{ color: '#6b7280', fontSize: 16 }}>R$ {p.price.toFixed(2)}</small></span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1,3,5].map((qtd, idx) => (
                      <button key={qtd} className="button" style={{ background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)', color: '#23264a', borderRadius: 10, fontWeight: 700, fontSize: 20, padding: '10px 14px', boxShadow: '0 2px 8px #0001', minWidth: 48 }} onClick={() => addToCart({ ...p, quantity: qtd })}>+{qtd}</button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Coluna Carrinho */}
        <div className="balcao-col-carrinho" style={{ flex: 1, minWidth: 0, background: '#fff', color: '#23264a', borderRadius: 0, boxShadow: '0 0 24px #43e97b55', padding: '32px 32px 32px 24px', margin: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh', borderLeft: '4px solid #43e97b', position: 'sticky', top: 0, zIndex: 10 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 12, color: '#23264a' }}>Carrinho</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {cart.map(i => {
              const p = products.find(p => p.id === i.product_id);
              if (!p) return null;
              return (
                <li key={i.product_id} style={{ marginBottom: 18, display: 'flex', alignItems: 'center', background: '#f7fafc', borderRadius: 14, boxShadow: '0 2px 8px #0001', padding: '12px 12px', border: '2px solid #43e97b' }}>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 18 }}>{p.name} x{i.quantity}</span>
                  <button className="button secondary" style={{ borderRadius: 12, fontWeight: 700, fontSize: 28, marginRight: 4, background: '#e3e6f0', color: '#23264a', minWidth: 48, minHeight: 48 }} onClick={() => updateCartQty(i.product_id, Math.max(1, Number(i.quantity) - 1))} disabled={Number(i.quantity) <= 1}>-</button>
                  <input
                    type="number"
                    min={1}
                    value={i.quantity === undefined ? '' : i.quantity}
                    onChange={e => handleCartQtyChange(i.product_id, e.target.value)}
                    onBlur={e => handleCartQtyBlur(i.product_id, e.target.value)}
                    style={{ width: 70, margin: '0 6px', borderRadius: 10, border: '2px solid #43e97b', background: '#fff', color: '#23264a', textAlign: 'center', fontSize: 22, fontWeight: 700, height: 48 }}
                  />
                  <button className="button secondary" style={{ borderRadius: 12, fontWeight: 700, fontSize: 28, marginLeft: 4, background: '#e3e6f0', color: '#23264a', minWidth: 48, minHeight: 48 }} onClick={() => updateCartQty(i.product_id, Math.max(1, Number(i.quantity) + 1))}>+</button>
                  <button className="button danger" style={{ borderRadius: 12, fontWeight: 700, fontSize: 18, marginLeft: 10, background: '#ff4d4f', color: '#fff', minWidth: 48, minHeight: 48 }} onClick={() => removeFromCart(i.product_id)}>Remover</button>
                </li>
              );
            })}
          </ul>
          <div style={{ margin: '18px 0', fontWeight: 'bold', fontSize: 18, color: '#43e97b' }}>Total: R$ {total.toFixed(2)}</div>
          <button className="button success" style={{ background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 18, padding: '12px 0', marginBottom: 18, boxShadow: '0 2px 8px #0001' }} onClick={sendOrder} disabled={cart.length === 0 || loading}>
            {loading ? 'Enviando...' : 'Enviar pedido'}
          </button>
        </div>
      </div>
      {/* Últimos 10 pedidos enviados - abaixo do carrinho e catálogo */}
      <div style={{ maxWidth: 1200, margin: '32px auto 0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #43e97b22', padding: '32px 32px', border: '2px solid #43e97b' }}>
        <h3 style={{ fontWeight: 600, marginBottom: 16, color: '#23264a' }}>Últimos 10 pedidos enviados</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {recentOrders.length === 0 && <li style={{ color: '#888' }}>Nenhum pedido enviado ainda.</li>}
          {recentOrders.map(order => {
            const valor = order.items.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
            return (
              <li key={order.id} style={{ marginBottom: 14, padding: 14, background: '#f7fafc', borderRadius: 12, color: '#23264a', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 2px 8px #0001', border: '1px solid #e3e6f0' }}>
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
    </>
  );
}

export default Balcao;
