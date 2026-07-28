import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getApi } from '../api'
import QRCode from 'react-qr-code'
import { QrCodePix } from 'qrcode-pix'
import React from 'react';

type Order = {
  id: number
  created_at?: string
  customer_name?: string | null
  table_ref?: string | null
  payment_method?: string | null
  paid_at?: string | null
  items: { id: number; product_id: number; quantity: number; unit_price: number }[]
  payments?: { method: string; amount: number }[]
}
type Product = { id: number; name: string }

export default function Receipt() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [pixConfig, setPixConfig] = useState<{ pix_key: string; pix_name: string; pix_city: string } | null>(null)
  const receiptRef = useRef<HTMLDivElement | null>(null)
  const pdfStartedRef = useRef(false)
  const shouldAutoPdf = window.location.search.includes('autoPdf=1')

  async function downloadReceiptPdf(orderData: Order) {
    const api = await getApi()
    const response = await api.get(`/orders/${orderData.id}/receipt-pdf`, {
      responseType: 'blob',
    })
    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `recibo-pedido-${orderData.id}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

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

  useEffect(() => {
    if (!shouldAutoPdf || !order || pdfStartedRef.current || !receiptRef.current) return
    const gerarPDF = async () => {
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready
        } catch {}
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      if (pdfStartedRef.current) return
      pdfStartedRef.current = true
      try {
        await downloadReceiptPdf(order)
      } catch (error) {
        console.error('Erro ao gerar PDF do recibo:', error)
      }
      window.close()
    }

    void gerarPDF()
  }, [order, shouldAutoPdf])

  const total = useMemo(() => order ? order.items.reduce((s, it) => s + it.unit_price * it.quantity, 0) : 0, [order])
  const pixAmount = useMemo(() => {
    if (!order) return 0
    const parts = order.payments || []
    const pixPartsSum = parts.filter(p => (p.method || '').toLowerCase() === 'pix').reduce((s, p) => s + Number(p.amount || 0), 0)
    if (pixPartsSum > 0) return pixPartsSum
    // caso simples: método único pix => usa total
    if ((order.payment_method || '').toLowerCase() === 'pix') return total
    return 0
  }, [order, total])
  function pixPayload(): string {
    if (!order || !pixConfig) return ''
    const amt = Number(pixAmount.toFixed(2))
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
        value: amt,
      })
      return code.payload()
    } catch { return '' }
  }

  if (!order) return <div style={{ padding: 16 }}>Carregando...</div>

  return (
    <>
    {shouldAutoPdf && <div style={{ padding: 16 }}>Gerando PDF...</div>}
    <div ref={receiptRef} className="receipt" style={{
      padding: 24,
      maxWidth: 420,
      margin: '24px auto',
      fontFamily: 'Arial, Helvetica, sans-serif',
      background: 'var(--card)',
      borderRadius: 12,
      boxShadow: '0 2px 12px #0002',
      border: '2px solid var(--text)',
      color: 'var(--text)',
      position: 'relative',
      pointerEvents: shouldAutoPdf ? 'none' : undefined,
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
      {order.payments && order.payments.length > 0 && (
        <div style={{ fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>
          <b>Detalhe:</b> {order.payments.map(p => `${p.method}: R$ ${Number(p.amount).toFixed(2)}`).join(' · ')}
        </div>
      )}
      {(order.payment_method === 'pix' || (order.payments || []).some(p => p.method === 'pix')) && pixConfig && (
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
      {pixAmount > 0 && pixConfig && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
          <div style={{background:'#fff',padding:10,borderRadius:12,boxShadow:'0 2px 8px #0002',border:'2px solid #eee',display:'inline-block'}}>
            <QRCode value={pixPayload()} key={pixPayload()} size={148} bgColor="#fff" fgColor="#111" style={{display:'block',margin:'0 auto',borderRadius:8,border:'2px solid #ddd'}} />
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
        <button className="button" style={{background:'#2ecc40',color:'#fff',fontWeight:700,border:'none',boxShadow:'0 1px 4px #0001',padding:'10px 24px',borderRadius:8,cursor:'pointer'}} onClick={() => void downloadReceiptPdf(order)}>Download PDF</button>
      </div>
      <style>{`
        @media print {
          button { display: none; }
          body { margin: 0; }
        }
      `}</style>
    </div>
    </>
  )
}
