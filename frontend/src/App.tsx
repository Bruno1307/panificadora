import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Cashier from './pages/Cashier'
import Receipt from './pages/Receipt'
import Logo from './components/Logo'
import Balcao from './pages/Balcao'
import Login from './pages/Login'
import React, { useState } from 'react';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  // Autenticação simples: token e perfil no localStorage
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [role, setRole] = useState(() => localStorage.getItem('role') || '');

  function handleLogin(token: string, role: string) {
    setToken(token);
    setRole(role);
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    if (role === 'caixa') {
      navigate('/cashier');
    } else {
      navigate('/');
    }
  }
  function handleLogout() {
    setToken('');
    setRole('');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  }

  // Se não autenticado, mostrar tela de login (exceto /balcao)
  if (!token && location.pathname !== '/balcao') {
    return <Login onLogin={handleLogin} />;
  }
  // Se estiver na rota do balconista, renderiza só a página do balcão
  if (location.pathname === '/balcao') {
    return <Balcao />;
  }
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
  // Controle de rotas por perfil
  const canSee = (route: string) => {
    if (role === 'gerente') return true;
    if (role === 'caixa') return route === '/orders' || route === '/cashier' || route === '/receipt/:id';
    if (role === 'balconista') return route === '/balcao';
    return false;
  };
  return (
    <div className="app">
      <div className="brand">
        <Logo />
        <h1>Panificadora Jardim</h1>
        <div style={{ marginLeft: 'auto' }}>
          <button className="button secondary" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            Tema: {theme === 'dark' ? 'Escuro' : 'Claro'}
          </button>
          {token && <button className="button danger" style={{ marginLeft: 8 }} onClick={handleLogout}>Sair</button>}
        </div>
      </div>
      <nav className="nav">
        {role === 'gerente' && <Link to="/">Produtos</Link>}
        {(role === 'gerente' || role === 'caixa') && <Link to="/orders">Pedidos</Link>}
        {(role === 'gerente' || role === 'caixa') && <Link to="/cashier">Caixa</Link>}
      </nav>
      <Routes>
        {role === 'gerente' && <Route path="/" element={<Products />} />}
        {(role === 'gerente' || role === 'caixa') && <Route path="/orders" element={<Orders />} />}
        {(role === 'gerente' || role === 'caixa') && <Route path="/cashier" element={<Cashier />} />}
        {(role === 'gerente' || role === 'caixa') && <Route path="/receipt/:id" element={<Receipt />} />}
        <Route path="/balcao" element={<Balcao />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
      </Routes>
    </div>
  )
}
