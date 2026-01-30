import { useToast } from '../components/Toast';
import { useEffect, useState } from 'react'
import { getApi } from '../api'

type Product = { id: number; name: string; price: number; barcode?: string | null }

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const { showToast } = useToast();
  const [name, setName] = useState('Pão francês')
  const [price, setPrice] = useState(1.0)
  const [barcode, setBarcode] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [searchBarcode, setSearchBarcode] = useState('')
  const [barcodeValid, setBarcodeValid] = useState(true)

  function isValidEAN13(code: string): boolean {
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 13) return false
    const arr = digits.split('').map(d => parseInt(d, 10))
    const check = arr[12]
    let sum = 0
    for (let i = 0; i < 12; i++) {
      const val = arr[i]
      sum += (i % 2 === 0) ? val : val * 3
    }
    const calc = (10 - (sum % 10)) % 10
    return calc === check
  }

  async function load() {
      const api = await getApi();
      const { data } = await api.get<Product[]>('/products/', {
      params: {
        q: searchQ || undefined,
        barcode: searchBarcode || undefined,
      },
    })
    setProducts(data)
  }
  useEffect(() => { load() }, [searchQ, searchBarcode])

  async function addProduct(e: React.FormEvent) {
    e.preventDefault()
    if (barcode && !isValidEAN13(barcode)) {
      showToast('Código EAN-13 inválido', 'error');
      return;
    }
    const api = await getApi();
    await api.post('/products/', { name, price, barcode: barcode || null })
    setName('')
    setPrice(1)
    setBarcode('')
    await load()
  }

  async function removeProduct(id: number) {
    const api = await getApi();
    await api.delete(`/products/${id}`)
    await load()
  }

  async function updateProduct(p: Product) {
    const newName = prompt('Nome do produto', p.name)
    if (newName == null) return
    let newPriceStr = prompt('Preço', p.price.toString())
    if (newPriceStr == null) return
    newPriceStr = newPriceStr.replace(',', '.')
    const newPrice = parseFloat(newPriceStr)
    if (isNaN(newPrice) || newPrice <= 0) {
      showToast('Preço inválido! Informe um valor maior que zero. Ex: 0.50 ou 0,50', 'error');
      return;
    }
    const newBarcode = prompt('Código de barras (opcional)', p.barcode ?? '')
    if ((newBarcode ?? '').trim() && !isValidEAN13(newBarcode!.trim())) {
      showToast('Código EAN-13 inválido', 'error');
      return;
    }
    const api = await getApi();
    await api.put(`/products/${p.id}`, { name: newName, price: newPrice, barcode: (newBarcode ?? '') || null })
    await load()
  }

  return (
    <div className="card">
      <h2>Produtos</h2>
      <form onSubmit={addProduct} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input className="input" placeholder="Nome do produto" value={name} onChange={e => setName(e.target.value)} />
        <input className="input" type="number" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value))} />
        <input
          className="input"
          placeholder="Código de barras (opcional, EAN-13)"
          value={barcode}
          onChange={e => { setBarcode(e.target.value); setBarcodeValid(!e.target.value || isValidEAN13(e.target.value)) }}
          style={{ borderColor: barcode && !barcodeValid ? 'var(--danger)' : undefined }}
        />
        <button className="button" type="submit" disabled={!!barcode && !barcodeValid}>Adicionar</button>
      </form>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom: 12 }}>
        <input className="input" placeholder="Buscar (nome ou código)" value={searchQ} onChange={e=>setSearchQ(e.target.value)} style={{ flex: 1, minWidth: 240 }} />
        <input className="input" placeholder="Filtrar por código exato" value={searchBarcode} onChange={e=>setSearchBarcode(e.target.value)} style={{ width: 240 }} />
        <button className="button secondary" onClick={()=>{ setSearchQ(''); setSearchBarcode(''); }}>Limpar filtros</button>
      </div>
      <div style={{marginBottom: 8, color: '#888'}}>Produtos encontrados: {products.length}</div>
      <ul className="list">
        {products.map((p, idx) => (
          <li key={p.id}>
            <div>
              <strong>{idx + 1}. {p.name}</strong>
              <div className="item-meta">R$ {p.price.toFixed(2)} {p.barcode ? `· ${p.barcode}` : ''}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="button secondary" onClick={() => updateProduct(p)}>Editar</button>
              <button className="button danger" onClick={() => removeProduct(p.id)}>Excluir</button>
            </div>
          </li>
        ))}
      </ul>
      {/* Total dos produtos removido conforme solicitado */}
    </div>
  )
}
