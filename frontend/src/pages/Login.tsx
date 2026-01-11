import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';

export default function Login({ onLogin }: { onLogin: (token: string, role: string) => void }) {
  const userRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    userRef.current?.focus();
  }, []);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { username, password });
      onLogin(data.access_token, data.role);
    } catch (err: any) {
      setError('Usuário ou senha inválidos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div className="card" style={{
        width: 370,
        padding: '36px 32px 32px 32px',
        boxShadow: '0 6px 32px 0 rgba(60,80,255,0.10), 0 1.5px 8px #0001',
        borderRadius: 18,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--card)',
        position: 'relative',
        border: '1.5px solid #e5e7eb',
      }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #6c7bff 80%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
          boxShadow: '0 4px 16px #22c55e33',
        }}>
          <span style={{ fontSize: 32, color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace' }}>PJ</span>
        </div>
        <h2 style={{
          fontWeight: 800,
          fontSize: 28,
          margin: 0,
          marginBottom: 18,
          color: '#23264a',
          letterSpacing: 0.5,
          textShadow: 'none',
        }}>Login</h2>
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            className="input"
            placeholder="Usuário"
            value={username}
            onChange={e => setUsername(e.target.value)}
            ref={userRef}
            style={{ fontSize: 17, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#f6f8fa', padding: '12px 14px' }}
          />
          <input
            className="input"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ fontSize: 17, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#f6f8fa', padding: '12px 14px' }}
          />
          {error && <div style={{ color: '#ef4444', margin: '-6px 0 0 2px', fontWeight: 500, fontSize: 15 }}>{error}</div>}
          <button className="button success" type="submit" disabled={loading} style={{
            width: '100%',
            fontSize: 18,
            marginTop: 8,
            boxShadow: '0 4px 16px #22c55e33',
            borderRadius: 8,
            padding: '12px 0',
            fontWeight: 700,
            letterSpacing: 0.5,
            background: 'linear-gradient(90deg, #22c55e 0%, #6ee7b7 100%)',
            border: 'none',
          }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
