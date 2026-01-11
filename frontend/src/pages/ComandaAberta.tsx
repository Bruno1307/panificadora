import { useState, useEffect } from 'react'
import AdicionarItem from './AdicionarItem'
import { api } from '../api'
import Balcao from './Balcao'

// Types (should match backend)
interface Product {
  id: number;
  name: string;
  price: number;
}
interface OrderItem {
  product_id: number;
  quantity: number;
  unit_price: number;
}
interface Comanda {
  id: number;
  order_number: number;
  customer_name: string;
  table_ref: string;
  items: OrderItem[];
  status: string;
  created_at: string;
}

export default function ComandaAberta() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [produtoId, setProdutoId] = useState<string>('');
  const [qtd, setQtd] = useState<number>(1);
  const [comandaSel, setComandaSel] = useState<number|null>(null);
  const [novaLoading, setNovaLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [cliente, setCliente] = useState('');
  const [mesa, setMesa] = useState('');
  const [showNova, setShowNova] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'balcao'|'comanda'>('comanda');

  async function loadComandas() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await api.get('/comandas/abertas', { headers });
      setComandas(data);
    } catch (e) {
      setMsg('Erro ao carregar comandas');
    } finally {
      setLoading(false);
    }
  }
  async function loadProdutos() {
    try {
      const { data } = await api.get('/products/');
      setProdutos(data);
    } catch (e) {
      setMsg('Erro ao carregar produtos');
    }
  }

  useEffect(() => { loadComandas(); loadProdutos(); }, []);




  async function abrirComanda(e:any) {
    e.preventDefault();
    setNovaLoading(true)
    setMsg('')
    try {
      await api.post('/comandas/abrir', { customer_name: cliente, table_ref: mesa, items: [] })
      setShowNova(false); setCliente(''); setMesa('');
      loadComandas()
    } catch (e:any) {
      setMsg(e?.response?.data?.detail || 'Erro ao abrir comanda')
    } finally { setNovaLoading(false) }
  }
  async function adicionarItem(comandaId:number) {
    if (!produtoId || !qtd) return;
    setMsg('')
    try {
      await api.post(`/comandas/${comandaId}/adicionar_item`, { product_id: Number(produtoId), quantity: Number(qtd) })
      setProdutoId(''); setQtd(1); setComandaSel(null); loadComandas()
    } catch (e:any) {
      setMsg(e?.response?.data?.detail || 'Erro ao adicionar item')
    }
  }
  async function fecharComanda(comandaId:number) {
    setMsg('')
    try {
      await api.post(`/comandas/${comandaId}/fechar`, {})
      setMsg('Comanda fechada com sucesso!')
      loadComandas()
    } catch (e:any) {
      if (e?.response?.data?.detail) {
        setMsg('Erro ao fechar comanda: ' + e.response.data.detail)
      } else if (e?.message) {
        setMsg('Erro ao fechar comanda: ' + e.message)
      } else {
        setMsg('Erro ao fechar comanda desconhecido')
      }
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <button
          className={tab === 'balcao' ? 'button primary' : 'button'}
          style={{ fontSize: 18, padding: '10px 24px', borderRadius: 8 }}
          onClick={() => setTab('balcao')}
        >Balcão</button>
        <button
          className={tab === 'comanda' ? 'button primary' : 'button'}
          style={{ fontSize: 18, padding: '10px 24px', borderRadius: 8 }}
          onClick={() => setTab('comanda')}
        >Comanda Aberta</button>
      </div>
      {tab === 'balcao' ? (
        <Balcao />
      ) : (
        <>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: '#222', marginBottom: 24 }}>Comandas Abertas</h2>
          {msg && <div style={{color:'#ef4444', fontWeight:500, marginBottom:12, fontSize:17}}>{msg}</div>}
          <button
            className="button success"
            style={{ marginBottom: 18, fontSize: 18, padding: '10px 24px', borderRadius: 8, boxShadow: '0 2px 8px #22c55e33' }}
            onClick={()=>setShowNova(v=>!v)}>
            {showNova ? 'Cancelar' : 'Abrir nova comanda'}
          </button>
          {showNova && (
            <form onSubmit={abrirComanda} style={{margin:'16px 0', display:'flex', gap:16, alignItems:'center', background:'#f6f8fa', padding:16, borderRadius:10, boxShadow:'0 2px 8px #0001'}}>
              <input className="input" placeholder="Cliente" value={cliente} onChange={e=>setCliente(e.target.value)} required style={{fontSize:17, padding:8, borderRadius:6, border:'1px solid #ccc'}} />
              <input className="input" placeholder="Mesa/Ref" value={mesa} onChange={e=>setMesa(e.target.value)} style={{fontSize:17, padding:8, borderRadius:6, border:'1px solid #ccc'}} />
              <button className="button success" type="submit" disabled={novaLoading} style={{fontSize:17, padding:'8px 18px', borderRadius:6}}>{novaLoading ? 'Abrindo...' : 'Abrir'}</button>
            </form>
          )}
          {loading && <div style={{margin:'24px 0', fontSize:18}}>Carregando...</div>}
          <div style={{marginTop:24}}>
            <table style={{width:'100%', borderCollapse:'collapse', background:'var(--card)', borderRadius:12, boxShadow:'0 2px 12px #0001', overflow:'hidden'}}>
              <thead style={{background:'#f3f4f6'}}>
                <tr style={{fontSize:18, color:'#222'}}>
                  <th style={{padding:'12px 8px'}}>Pedido</th>
                  <th style={{padding:'12px 8px'}}>Cliente</th>
                  <th style={{padding:'12px 8px'}}>Mesa/Ref</th>
                  <th style={{padding:'12px 8px'}}>Itens</th>
                  <th style={{padding:'12px 8px'}}>Valor</th>
                  <th style={{padding:'12px 8px'}}>Aberta em</th>
                  <th style={{padding:'12px 8px'}}>Status</th>
                  <th style={{padding:'12px 8px'}}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Generate all rows for comandas and their items
                  const rows: JSX.Element[] = [];
                  comandas.forEach(c => {
                    rows.push(
                      <tr key={c.id} style={{fontSize:17, borderBottom:'1px solid #eee'}}>
                        <td style={{padding:'10px 8px'}}>{c.order_number}</td>
                        <td style={{padding:'10px 8px'}}>{c.customer_name}</td>
                        <td style={{padding:'10px 8px'}}>{c.table_ref}</td>
                        <td style={{padding:'10px 8px'}}>{c.items.length}</td>
                        <td style={{padding:'10px 8px'}}>{c.items && c.items.length > 0 ? c.items.reduce((s, it) => s + (it.unit_price || 0) * (it.quantity || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</td>
                        <td style={{padding:'10px 8px'}}>{c.created_at ? new Date(c.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' }) : ''}</td>
                        <td style={{padding:'10px 8px'}}>{c.status === 'comanda_aberta' ? <span style={{color:'#22c55e', fontWeight:600}}>Aberta</span> : c.status}</td>
                        <td style={{padding:'10px 8px'}}>
                          <button className="button primary" style={{marginRight:8, padding:'6px 14px', borderRadius:6, fontSize:16}} onClick={()=>setComandaSel(c.id)}>Adicionar item</button>
                          <button className="button danger" style={{padding:'6px 14px', borderRadius:6, fontSize:16}} onClick={()=>fecharComanda(c.id)}>Fechar</button>
                          {comandaSel===c.id && (
                            <AdicionarItem
                              produtos={produtos}
                              produtoId={produtoId}
                              setProdutoId={setProdutoId}
                              qtd={qtd}
                              setQtd={setQtd}
                              adicionarItem={()=>adicionarItem(c.id)}
                            />
                          )}
                        </td>
                      </tr>
                    );
                    if (c.items && c.items.length > 0) {
                      rows.push(
                        <tr key={c.id+"-itens"} style={{background:'#f6f8fa'}}>
                          <td colSpan={8} style={{padding:'8px 24px'}}>
                            <div style={{fontWeight:600,marginBottom:4}}>Itens já adicionados:</div>
                            <ul style={{margin:0,paddingLeft:18}}>
                              {c.items.map(it => {
                                const prod = produtos.find(p => p.id === it.product_id);
                                return (
                                  <li key={it.product_id}>
                                    {prod ? prod.name : `Produto ${it.product_id}`} x{it.quantity} — {(it.unit_price * it.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </li>
                                );
                              })}
                            </ul>
                          </td>
                        </tr>
                      );
                    }
                  });
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
