import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import QRCode from 'react-qr-code'
import { QrCodePix } from 'qrcode-pix'

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
      const { data } = await api.get<Order>(`/orders/${id}`)
      setOrder(data)
    }
    load()
  }, [id])

  useEffect(() => {
    async function loadProducts() {
      const { data } = await api.get<Product[]>(`/products/`)
      setProducts(data)
    }
    loadProducts()
  }, [])

  useEffect(() => {
    async function loadConfig() {
      try {
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
    <div className="receipt" style={{ padding: 16 }}>
      <h3 style={{ textAlign: 'center', margin: 0 }}>Padaria Jardim</h3>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>Pedido #{order.id}</div>
      <div>Cliente: {order.customer_name || '-'}</div>
      <div>Mesa: {order.table_ref || '-'}</div>
      <div>Data: {order.created_at?.replace('T',' ').slice(0,16) || '-'}</div>
      <div>Pagamento: {order.payment_method || '-' } {order.paid_at ? `(${order.paid_at.replace('T',' ').slice(0,16)})` : ''}</div>
      {order.payment_method === 'pix' && pixConfig && (
        <div className="item-meta">CNPJ: {(pixConfig.pix_key || '').replace(/\D/g,'').length===14 ? `${(pixConfig.pix_key||'').replace(/\D/g,'').slice(0,2)}.${(pixConfig.pix_key||'').replace(/\D/g,'').slice(2,5)}.${(pixConfig.pix_key||'').replace(/\D/g,'').slice(5,8)}/${(pixConfig.pix_key||'').replace(/\D/g,'').slice(8,12)}-${(pixConfig.pix_key||'').replace(/\D/g,'').slice(12,14)}` : (pixConfig.pix_key || '-')}</div>
      )}
      <hr />
      <div>
        {order.items.map((it) => {
          const name = products.find(p => p.id === it.product_id)?.name || `Item ${it.product_id}`
          return (
            <div key={it.id} className="line">
              <span>{name} x{it.quantity}</span>
              <span>R$ {(it.unit_price * it.quantity).toFixed(2)}</span>
            </div>
          )
        })}
      </div>
      <hr />
      <div className="line" style={{ fontWeight: 700 }}>
        <span>Total</span>
        <span>R$ {total.toFixed(2)}</span>
      </div>
      {order.payment_method === 'pix' && pixConfig && (
        <div style={{ display:'flex', justifyContent:'center', marginTop: 8 }}>
          <div style={{ background:'#fff', padding:8 }}>
            <QRCode value={pixPayload()} size={160} />
          </div>
        </div>
      )}
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <button className="button" onClick={() => {
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
          }
        }}>Download PDF</button>
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
