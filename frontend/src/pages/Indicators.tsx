import React, { useEffect, useState } from 'react';
import { getApi } from '../api';

type RevenueData = {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  payment_totals_daily?: Record<string, number>;
  payment_totals_weekly?: Record<string, number>;
  payment_totals_monthly?: Record<string, number>;
  payment_totals_yearly?: Record<string, number>;
};

export default function Indicators() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  async function fetchIndicators(startDate?: string, endDate?: string) {
    setLoading(true);
    setError('');
    setData(null); // Limpa o estado antes de buscar
    try {
      const api = await getApi();
      const res = await api.get('/indicators/revenue', {
        params: {
          ...(startDate ? { start: startDate } : {}),
          ...(endDate ? { end: endDate } : {}),
        }
      });
      setData(res.data);
    } catch {
      setError('Erro ao buscar dados de faturamento.');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (data) {
    }
  }, [data]);

  useEffect(() => {
    fetchIndicators();
  }, []);

  return (
    <div className="card">
      <h2>Indicadores de Faturamento</h2>
      <form
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 24,
          alignItems: 'flex-end',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
        onSubmit={e => { e.preventDefault(); fetchIndicators(start, end); }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="start-date" style={{ fontWeight: 500 }}>Início:</label>
          <input
            id="start-date"
            type="date"
            value={start}
            onChange={e => setStart(e.target.value)}
            placeholder="dd/mm/aaaa"
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', minWidth: 140 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="end-date" style={{ fontWeight: 500 }}>Fim:</label>
          <input
            id="end-date"
            type="date"
            value={end}
            onChange={e => setEnd(e.target.value)}
            placeholder="dd/mm/aaaa"
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', minWidth: 140 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
          <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, background: '#6c7bff', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' }}>Filtrar</button>
          <button type="button" style={{ padding: '8px 18px', borderRadius: 8, background: '#eee', color: '#222', border: 'none', fontWeight: 500, cursor: 'pointer' }} onClick={() => { setStart(''); setEnd(''); fetchIndicators(); }}>Limpar</button>
        </div>
      </form>
      {loading && <div>Carregando...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          {(start || end) ? (
            <>
              <div style={{ marginBottom: 8, color: '#555', fontStyle: 'italic' }}>
                Exibindo o total do período filtrado:
                {start && ` de ${start.split('-').reverse().join('/')}`}
                {end && ` até ${end.split('-').reverse().join('/')}`}
              </div>
              <div>
                <strong>Faturamento do Período:</strong> R$ {data.daily.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                <div style={{ marginLeft: 32, marginTop: 8 }}>
                  {['dinheiro','pix','débito','crédito'].map(method => (
                    <div key={method}>
                      {method}: R$ {(data.payment_totals_daily?.[method] ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            ['daily', 'weekly', 'monthly', 'yearly'].map((period) => {
              // Seleciona o detalhamento correto vindo do backend
              const periodTotals =
                period === 'daily' ? data.payment_totals_daily :
                period === 'weekly' ? data.payment_totals_weekly :
                period === 'monthly' ? data.payment_totals_monthly :
                data.payment_totals_yearly;
              const knownMethods = [
                'dinheiro',
                'pix',
                'débito',
                'crédito'
              ];
              const totals = periodTotals || {};
              const allMethods = Array.from(new Set([
                ...knownMethods,
                ...Object.keys(totals)
              ]));
              return (
                <div key={period}>
                  <strong>{
                    period === 'daily' ? 'Faturamento Diário:' :
                    period === 'weekly' ? 'Faturamento Semanal:' :
                    period === 'monthly' ? 'Faturamento Mensal:' :
                    'Faturamento Anual:'
                  }</strong> R$ {data[period].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <div style={{ marginLeft: 32, marginTop: 8 }}>
                    {allMethods.map(method => (
                      <div key={method}>
                        {method}: R$ {(totals[method] ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
