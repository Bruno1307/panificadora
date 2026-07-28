import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApi } from '../api'
import Ean13Barcode from '../components/Ean13Barcode'

type Product = {
  id: number
  name: string
  price: number
  barcode?: string | null
}

function normalizeBarcode(value?: string | null) {
  return (value ?? '').replace(/\D/g, '')
}

function currency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function BarcodeSheets() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [copies, setCopies] = useState<Record<number, number>>({})
  const [onlyWithBarcode, setOnlyWithBarcode] = useState(true)

  useEffect(() => {
    async function load() {
      const api = await getApi()
      const { data } = await api.get<Product[]>('/products/')
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
      setProducts(sorted)
      setSelectedIds(sorted.filter(product => normalizeBarcode(product.barcode).length === 13).map(product => product.id))
      setCopies(Object.fromEntries(sorted.map(product => [product.id, 1])))
    }

    load()
  }, [])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter(product => {
      const barcode = normalizeBarcode(product.barcode)
      const matchesSearch = !term || product.name.toLowerCase().includes(term) || barcode.includes(term)
      if (!matchesSearch) return false
      if (!onlyWithBarcode) return true
      return barcode.length === 13
    })
  }, [onlyWithBarcode, products, search])

  const selectedProducts = useMemo(() => {
    const selected = new Set(selectedIds)
    return filteredProducts.filter(product => selected.has(product.id) && normalizeBarcode(product.barcode).length === 13)
  }, [filteredProducts, selectedIds])

  const cards = useMemo(() => {
    return selectedProducts.flatMap(product => {
      const quantity = Math.max(1, copies[product.id] ?? 1)
      return Array.from({ length: quantity }, (_, index) => ({
        product,
        key: `${product.id}-${index}`,
      }))
    })
  }, [copies, selectedProducts])

  function toggleSelection(productId: number) {
    setSelectedIds(current => (
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId]
    ))
  }

  function selectFiltered() {
    setSelectedIds(current => {
      const merged = new Set(current)
      filteredProducts.forEach(product => {
        if (normalizeBarcode(product.barcode).length === 13) {
          merged.add(product.id)
        }
      })
      return Array.from(merged)
    })
  }

  function clearSelection() {
    setSelectedIds([])
  }

  function printSheets() {
    window.print()
  }

  return (
    <div className="grid barcode-sheets-page">
      <div className="card barcode-sheets-controls">
        <div className="barcode-sheets-header">
          <div>
            <h2>Fichas para leitura no caixa</h2>
            <p className="item-meta">
              Selecione os produtos com codigo EAN-13 e imprima as fichas para o operador bipar no caixa.
            </p>
          </div>
          <div className="barcode-sheets-actions">
            <button className="button secondary" type="button" onClick={selectFiltered}>Selecionar filtrados</button>
            <button className="button secondary" type="button" onClick={clearSelection}>Limpar selecao</button>
            <button className="button" type="button" onClick={printSheets} disabled={cards.length === 0}>Imprimir fichas</button>
          </div>
        </div>

        <div className="barcode-toolbar">
          <input
            className="input"
            placeholder="Buscar por nome ou codigo"
            value={search}
            onChange={event => setSearch(event.target.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <label className="barcode-toggle">
            <input
              checked={onlyWithBarcode}
              onChange={event => setOnlyWithBarcode(event.target.checked)}
              type="checkbox"
            />
            Mostrar apenas com codigo valido
          </label>
          <Link className="button secondary barcode-link-button" to="/">
            Voltar para produtos
          </Link>
        </div>

        <div className="barcode-products-list">
          {filteredProducts.map(product => {
            const barcode = normalizeBarcode(product.barcode)
            const hasValidBarcode = barcode.length === 13
            const checked = selectedIds.includes(product.id)
            return (
              <label key={product.id} className={`barcode-product-row${hasValidBarcode ? '' : ' is-disabled'}`}>
                <input
                  checked={checked}
                  disabled={!hasValidBarcode}
                  onChange={() => toggleSelection(product.id)}
                  type="checkbox"
                />
                <div className="barcode-product-main">
                  <strong>{product.name}</strong>
                  <div className="item-meta">
                    {currency(product.price)}
                    {hasValidBarcode ? ` · ${barcode}` : ' · sem codigo EAN-13'}
                  </div>
                </div>
                <label className="barcode-copies-field">
                  Copias
                  <input
                    className="input"
                    disabled={!hasValidBarcode}
                    min={1}
                    onChange={event => {
                      const value = Math.max(1, Number.parseInt(event.target.value || '1', 10) || 1)
                      setCopies(current => ({ ...current, [product.id]: value }))
                    }}
                    type="number"
                    value={copies[product.id] ?? 1}
                  />
                </label>
              </label>
            )
          })}
        </div>
      </div>

      <div className="card barcode-sheets-preview-card">
        <div className="barcode-preview-header">
          <div>
            <h3>Pre-visualizacao</h3>
            <div className="item-meta">{cards.length} ficha(s) pronta(s) para impressao</div>
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="barcode-empty-state">
            Nenhuma ficha selecionada. Escolha produtos com codigo de barras valido para imprimir.
          </div>
        ) : (
          <div className="barcode-print-grid">
            {cards.map(({ key, product }) => {
              const barcode = normalizeBarcode(product.barcode)
              return (
                <article key={key} className="barcode-ticket">
                  <div className="barcode-ticket-name">{product.name}</div>
                  <div className="barcode-ticket-price">{currency(product.price)}</div>
                  <Ean13Barcode value={barcode} />
                  <div className="barcode-ticket-code">{barcode}</div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}