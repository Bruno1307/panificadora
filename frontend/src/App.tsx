import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Cashier from './pages/Cashier'
import Receipt from './pages/Receipt'
import Logo from './components/Logo'
import Balcao from './pages/Balcao'
import Indicators from './pages/Indicators'
// ...existing code...
import Login from './pages/Login'
import React, { useState } from 'react';
import { ToastProvider } from './components/Toast';

import ComandaAberta from './pages/ComandaAberta';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  // Autenticação simples: token e perfil no localStorage
  // Persistir autenticação após atualizar a página
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [role, setRole] = useState(() => localStorage.getItem('role') || '');
  // Tema fixo claro
  React.useEffect(() => {
    // Tema escuro removido, sempre tema claro
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('theme');
  }, []);

  function handleLogin(token: string, role: string) {
    setToken(token);
    setRole(role);
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    navigate('/'); // Sempre vai para a tela principal, mostrando o menu
  }
  function handleLogout() {
    setToken('');
    setRole('');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login', { replace: true });
  }

  // Se não autenticado, redireciona para /login (exceto /balcao)
  React.useEffect(() => {
    if (!token && location.pathname !== '/balcao' && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [token, location.pathname, navigate]);
  // Redirecionamentos centralizados em useEffect
  React.useEffect(() => {
    if (!token && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    } else if (token && location.pathname === '/login') {
      navigate('/');
    } else if (role === 'balconista' && location.pathname === '/') {
      navigate('/comanda-aberta', { replace: true });
    } else if (role === 'caixa' && location.pathname === '/') {
      navigate('/cashier', { replace: true });
    }
  }, [token, role, location.pathname, navigate]);

  // Controle de rotas por perfil
  const isGerente = role === 'gerente' || role === 'admin';
  const canSee = (route: string) => {
    if (isGerente) return true;
    if (role === 'caixa') return route === '/orders' || route === '/cashier' || route === '/receipt/:id';
    if (role === 'balconista') return route === '/balcao' || route === '/comanda-aberta';
    return false;
  };

  // Renderização condicional apenas do conteúdo
  return (
    <ToastProvider>
      <div className="app">
        <div className="brand">
          <Logo />
          <h1>Panificadora Jardim</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Botão de tema removido */}
            {token && <button className="button danger" style={{ marginLeft: 8 }} onClick={handleLogout}>Sair</button>}
          </div>
        </div>
        {token ? (
          <>
            <nav className="nav">
              {isGerente && <Link to="/">Produtos</Link>}
              {(isGerente || role === 'caixa') && <Link to="/orders">Pedidos</Link>}
              {(isGerente || role === 'caixa') && <Link to="/cashier">Caixa</Link>}
              {isGerente && <Link to="/indicators">Indicadores</Link>}
            </nav>
            <Routes>
              {isGerente && <Route path="/" element={<Products />} />}
              {(isGerente || role === 'caixa') && <Route path="/orders" element={<Orders />} />}
              {(isGerente || role === 'caixa') && <Route path="/cashier" element={<Cashier />} />}
              {(isGerente || role === 'caixa') && <Route path="/receipt/:id" element={<Receipt />} />}
              {isGerente && <Route path="/indicators" element={<Indicators />} />}
              <Route path="/balcao" element={<Balcao />} />
              <Route path="/comanda-aberta" element={<ComandaAberta />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
            </Routes>
          </>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          </Routes>
        )}
      </div>
    </ToastProvider>
  );
}


