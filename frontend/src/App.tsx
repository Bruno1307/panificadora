import { Routes, Route, Link } from 'react-router-dom'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Cashier from './pages/Cashier'
import Receipt from './pages/Receipt'
import Logo from './components/Logo'

export default function App() {
  // theme toggle
  const [theme, setTheme] = ((): ["dark"|"light", (t:"dark"|"light")=>void] => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('theme')) as any
    let initial = saved as "dark"|"light" | null
    if (!initial && typeof window !== 'undefined') {
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      initial = prefersLight ? 'light' : 'dark'
    }
    initial = initial || 'dark'
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', initial)
    }
    const setter = (t: any) => {
      localStorage.setItem('theme', t)
      document.documentElement.setAttribute('data-theme', t)
    }
    return [initial, setter]
  })()
  return (
    <div className="app">
      <div className="brand">
        <Logo />
        <h1>Panificadora Jardim</h1>
        <div style={{ marginLeft: 'auto' }}>
          <button className="button secondary" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            Tema: {theme === 'dark' ? 'Escuro' : 'Claro'}
          </button>
        </div>
      </div>
      <nav className="nav">
        <Link to="/">Produtos</Link>
        <Link to="/orders">Pedidos</Link>
        <Link to="/cashier">Caixa</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Products />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/cashier" element={<Cashier />} />
        <Route path="/receipt/:id" element={<Receipt />} />
      </Routes>
    </div>
  )
}
