import React, { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin }: { onLogin: (token: string, role: string) => void }) {
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
    <div style={{ maxWidth: 320, margin: '0 auto', padding: 32 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="Usuário"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
        />
        <input
          className="input"
          placeholder="Senha"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <div style={{ color: 'red', margin: '8px 0' }}>{error}</div>}
        <button className="button success" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
