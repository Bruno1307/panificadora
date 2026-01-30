import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getApi } from '../api'
import QRCode from 'react-qr-code'
import { QrCodePix } from 'qrcode-pix'
import React from 'react';

function SimpleReceiptModal({ open, onClose, order, products }) {
  if (!open) return null;
  let itemsHtml = '';
  order.items.forEach(it => {
    const name = (products.find(p => p.id === it.product_id)?.name || `Item ${it.product_id}`) + ' x' + it.quantity;
    const value = 'R$ ' + (it.unit_price * it.quantity).toFixed(2);
    itemsHtml += `<tr><td>${name}</td><td>${value}</td></tr>`;
  });
  const html = `
    <style>
      table, tr, td, b, hr { color: #000 !important; background: #fff !important; font-weight: bold !important; }
      body, html { color: #000 !important; background: #fff !important; }
    </style>
    <table width="320">
      <tr><td colspan="2" align="center"><b>Padaria Jardim</b></td></tr>
      <tr><td colspan="2" align="center"><b>Pedido #${order.id}</b></td></tr>
      <tr><td colspan="2"><hr></td></tr>
      <tr><td colspan="2"><b>Cliente:</b> ${order.customer_name || '-'}<br><b>Mesa:</b> ${order.table_ref || '-'}</td></tr>
      <tr><td colspan="2"><b>Pagamento:</b> ${order.payment_method || '-'} ${order.paid_at ? order.paid_at.replace('T',' ').slice(0,16) : ''}</td></tr>
      <tr><td colspan="2"><hr></td></tr>
      ${itemsHtml}
      <tr><td colspan="2"><hr></td></tr>
      <tr><td colspan="2" align="right"><b>Total da compra</b>  R$ ${order.items.reduce((acc, it) => acc + it.unit_price * it.quantity, 0).toFixed(2)}</td></tr>
    </table>
  `;
  return (
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'var(--card)',padding:24,borderRadius:8,maxWidth:440,width:'100%',boxShadow:'0 2px 12px #0004',color:'var(--text)'}}>
        <div dangerouslySetInnerHTML={{__html: html}} />
        <div style={{textAlign:'right',marginTop:16}}>
          <button onClick={onClose} style={{marginRight:8}}>Fechar</button>
          <button onClick={() => {
            // Gera PDF a partir do HTML puro, com estilos fixos
            const htmlFixed = html.replace(/var\(--text\)/g, '#000').replace(/var\(--card\)/g, '#fff');
            const temp = document.createElement('div');
            temp.innerHTML = htmlFixed;
            document.body.appendChild(temp);
            const gerar = () => {
              window.html2pdf().from(temp).set({ margin: 0.2, filename: `recibo-pedido-${order.id}.pdf` }).save().then(() => temp.remove());
            };
            if (!window.html2pdf) {
              const script = document.createElement('script');
              script.src = '/html2pdf.bundle.min.js';
              script.onload = gerar;
              document.body.appendChild(script);
            } else {
              gerar();
            }
          }}>Download PDF</button>
        </div>
      </div>
    </div>
  );
}

type Order = {
  id: number
  created_at?: string
  customer_name?: string | null
  table_ref?: string | null
  payment_method?: string | null
  paid_at?: string | null
  items: { id: number; product_id: number; quantity: number; unit_price: number }[]
}
type Product = { id: number; name: string }

export default function Receipt() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [pixConfig, setPixConfig] = useState<{ pix_key: string; pix_name: string; pix_city: string } | null>(null)

  useEffect(() => {
    async function load() {
      const api = await getApi();
      const { data } = await api.get<Order>(`/orders/${id}`)
      setOrder(data)
    }
    load()
  }, [id])

  useEffect(() => {
    async function loadProducts() {
      const api = await getApi();
      const { data } = await api.get<Product[]>(`/products/`)
      setProducts(data)
    }
    loadProducts()
  }, [])

  useEffect(() => {
    async function loadConfig() {
      try {
        const api = await getApi();
        const { data } = await api.get('/config')
        setPixConfig(data)
      } catch {}
    }
    loadConfig()
  }, [])

  const total = useMemo(() => order ? order.items.reduce((s, it) => s + it.unit_price * it.quantity, 0) : 0, [order])
  function pixPayload(): string {
    if (!order || !pixConfig) return ''
    const txid = `PDV-${order.id}`
    const amt = Number(total.toFixed(2))
    // Trata chave CNPJ: remove caracteres não numéricos
    let pixKey = pixConfig.pix_key
    if (pixKey && pixKey.replace(/\D/g, '').length === 14) {
      pixKey = pixKey.replace(/\D/g, '')
    }
    try {
      const code = QrCodePix({
        version: '01',
        key: pixKey,
        name: (pixConfig.pix_name || 'Panificadora Jardim').toUpperCase(),
        city: (pixConfig.pix_city || 'SAO PAULO').toUpperCase(),
        transactionId: txid,
        value: amt,
      })
      return code.payload()
    } catch { return '' }
  }

  if (!order) return <div style={{ padding: 16 }}>Carregando...</div>

  // Se for autoPdf, gera PDF automaticamente ao abrir
  if (window.location.search.includes('autoPdf=1') && order) {
    // Carrega html2pdf.js dinamicamente se não estiver presente
    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = '/html2pdf.bundle.min.js';
      script.onload = () => gerarPDF();
      document.body.appendChild(script);
    } else {
      gerarPDF();
    }
    function gerarPDF() {
      window.html2pdf()
        .set({ filename: `recibo-pedido-${order.id}.pdf`, margin: 0.2, html2canvas: { scale: 2 } })
        .from(document.querySelector('.receipt'))
        .save();
      setTimeout(() => window.close(), 1000);
    }
    return <div style={{ padding: 16 }}>Gerando PDF...</div>;
  }
  return (
    <div className="receipt" style={{
      padding: 24,
      maxWidth: 420,
      margin: '0 auto',
      fontFamily: 'Arial, Helvetica, sans-serif',
      background: 'var(--card)',
      borderRadius: 12,
      boxShadow: '0 2px 12px #0002',
      border: '2px solid var(--text)',
      color: 'var(--text)',
      position: 'relative'
    }}>
      {/* Força CSS global para recibo no PDF */}
      <style>{`
        .receipt, .receipt * {
          color: #000 !important;
          background: #fff !important;
          font-weight: 900 !important;
          opacity: 1 !important;
          filter: none !important;
          text-shadow: none !important;
        }
        .receipt hr {
          border-color: #000 !important;
        }
      `}</style>
      <h1 style={{ textAlign: 'center', margin: 0, fontWeight: 800, fontSize: 26, letterSpacing: 1, color: 'var(--text)' }}>PANIFICADORA JARDIM</h1>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, marginBottom: 10, marginTop: 2, letterSpacing: 1, color: 'var(--text)' }}>RECIBO</div>
      <hr />
      <div style={{ fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>
        <b>Pedido:</b> #{order.id} &nbsp; <b>Data:</b> {order.created_at ? new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' }) : '-'}
      </div>
      <div style={{ fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>
        <b>Cliente:</b> {order.customer_name || '-'} &nbsp; <b>Mesa:</b> {order.table_ref || '-'}
      </div>
      <div style={{ fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>
        <b>Pagamento:</b> {order.payment_method || '-'} {order.paid_at ? `(${order.paid_at.replace('T',' ').slice(0,16)})` : ''}
      </div>
      {order.payment_method === 'pix' && pixConfig && (
        <div style={{ fontSize: 12, marginBottom: 4, color: 'var(--text)' }}>
          <b>Chave Pix:</b> {pixConfig.pix_key}<br />
          <b>Nome:</b> {pixConfig.pix_name} &nbsp; <b>Cidade:</b> {pixConfig.pix_city}
        </div>
      )}
      <hr />
      <table style={{
        width: '100%',
        fontSize: 14,
        marginBottom: 10,
        borderCollapse: 'collapse',
        border: '1px solid var(--text)',
        color: 'var(--text)',
        background: 'var(--card)'
      }}>
        <thead>
          <tr style={{ textAlign: 'left', fontWeight: 700, background: 'var(--card)', borderBottom: '2px solid var(--text)' }}>
            <th style={{padding: '6px 4px', color: 'var(--text)'}}>Produto</th>
            <th style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--text)' }}>Qtd</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--text)' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, idx) => {
            const name = products.find(p => p.id === it.product_id)?.name || `Item ${it.product_id}`
            return (
              <tr key={it.id} style={{ background: 'var(--card)' }}>
                <td style={{padding: '4px 2px', color: 'var(--text)'}}>{name}</td>
                <td style={{ textAlign: 'center', padding: '4px 2px', color: 'var(--text)' }}>{it.quantity}</td>
                <td style={{ textAlign: 'right', padding: '4px 2px', color: 'var(--text)' }}>R$ {(it.unit_price * it.quantity).toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <hr />
      <div style={{ fontWeight: 900, fontSize: 20, textAlign: 'right', marginBottom: 12, color: 'var(--text)', letterSpacing: 1 }}>
        Total: R$ {total.toFixed(2)}
      </div>
      {order.payment_method === 'pix' && pixConfig && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
          <div style={{background:'#fff',padding:10,borderRadius:12,boxShadow:'0 2px 8px #0002',border:'2px solid #eee',display:'inline-block'}}>
            <QRCode value={pixPayload()} size={148} bgColor="#fff" fgColor="#111" style={{display:'block',margin:'0 auto',borderRadius:8,border:'2px solid #ddd'}} />
          </div>
          <div style={{
            marginTop: 14,
            fontSize: 15,
            color: '#111',
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: 0.5,
            wordBreak: 'break-all',
            background: '#fff',
            borderRadius: 8,
            padding: 10,
            boxShadow: '0 2px 8px #0001',
            border: '2px solid #eee',
            maxWidth: 340,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <div style={{fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 2}}>Chave Pix:</div>
            <div style={{fontFamily:'monospace',fontWeight:700,fontSize:17,color:'#222',marginBottom:6,letterSpacing:1}}>{pixConfig.pix_key}</div>
            <div style={{fontSize: 14, fontWeight: 600, color: '#222',marginBottom:4}}>Nome: <span style={{fontWeight:700}}>{pixConfig.pix_name}</span> &nbsp; Cidade: <span style={{fontWeight:700}}>{pixConfig.pix_city}</span></div>
            <div style={{fontSize: 13, color: '#111', marginTop: 6, fontFamily:'monospace', wordBreak:'break-all',textAlign:'left',background:'#f8f8f8',padding:6,borderRadius:4}}>
              <b style={{color:'#111'}}>Payload Pix:</b><br/>{pixPayload()}
            </div>
          </div>
        </div>
      )}
      <div style={{ textAlign: 'center', fontSize: 13, marginTop: 12, color: 'var(--text)', fontWeight: 600, letterSpacing: 0.2 }}>
        Obrigado pela preferência!
      </div>
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <button className="button" style={{background:'#2ecc40',color:'#fff',fontWeight:700,border:'none',boxShadow:'0 1px 4px #0001',padding:'10px 24px',borderRadius:8,cursor:'pointer'}} onClick={() => {
          // Gera HTML ultra-simples para o PDF, com estilos 100% fixos (preto no branco)
          const orderData = order;
          const productsData = products;
          let itemsHtml = '';
          orderData.items.forEach(it => {
            const name = (productsData.find(p => p.id === it.product_id)?.name || `Item ${it.product_id}`) + ' x' + it.quantity;
            const value = 'R$ ' + (it.unit_price * it.quantity).toFixed(2);
            itemsHtml += `<tr><td style='padding:4px 2px;'>${name}</td><td style='text-align:right;padding:4px 2px;'>${value}</td></tr>`;
          });
          const html = `
            <div style='font-family:Arial,sans-serif;max-width:420px;margin:0 auto;background:#fff;color:#000;'>
              <div style='text-align:center;font-size:22px;font-weight:bold;'><b>Padaria Jardim</b></div>
              <div style='text-align:center;font-size:15px;'><b>Pedido #${orderData.id}</b></div>
              <hr style='border:1px solid #000;' />
              <div style='font-size:13px;'><b>Cliente:</b> ${orderData.customer_name || '-'}<br/><b>Mesa:</b> ${orderData.table_ref || '-'}</div>
              <div style='font-size:13px;'><b>Pagamento:</b> ${orderData.payment_method || '-'} ${orderData.paid_at ? orderData.paid_at.replace('T',' ').slice(0,16) : ''}</div>
              <hr style='border:1px solid #000;' />
              <table style='width:100%;font-size:15px;border-collapse:collapse;'>
                ${itemsHtml}
              </table>
              <hr style='border:1px solid #000;' />
              <div style='font-size:18px;font-weight:bold;text-align:right;'><b>Total da compra</b>  R$ ${orderData.items.reduce((acc, it) => acc + it.unit_price * it.quantity, 0).toFixed(2)}</div>
            </div>
          `;
          // Cria elemento temporário
          const temp = document.createElement('div');
          temp.innerHTML = html;
          document.body.appendChild(temp);
          // Carrega html2pdf.js dinamicamente se não estiver presente
          const gerar = () => {
            window.html2pdf().from(temp).set({ margin: 0.2, filename: `recibo-pedido-${orderData.id}.pdf` }).save().then(() => temp.remove());
          };
          if (!window.html2pdf) {
            const script = document.createElement('script');
            script.src = '/html2pdf.bundle.min.js';
            script.onload = gerar;
            document.body.appendChild(script);
          } else {
            gerar();
          }
        }}>Download PDF</button>
        <SimpleReceiptModal open={showSimpleModal} onClose={() => setShowSimpleModal(false)} order={order} products={products} />
      </div>
      <style>{`
        @media print {
          button { display: none; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  )
}
