import React, { useEffect, useState } from 'react';
import { getApi } from '../api';
import { useToast } from '../components/Toast';

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
  const { showToast } = useToast();
  const pagamentoLabels: Record<string, string> = {
    'dinheiro': 'Dinheiro',
    'pix': 'Pix',
    'débito': 'Débito',
    'crédito': 'Crédito',
    'ifood': 'Ifood',
    '99food': '99 Food',
  };
  const formatMethodLabel = (method: string) => pagamentoLabels[method] || method;
  // Por padrão: hoje (YYYY-MM-DD) em horário local
  function formatDateYYYYMMDD(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const todayStr = formatDateYYYYMMDD(new Date());
  const [start, setStart] = useState<string>(todayStr);
  const [end, setEnd] = useState<string>(todayStr);

  async function imprimirFaturamento() {
    try {
      const api = await getApi();
      await api.post('/indicators/revenue/print', null, {
        params: {
          ...(start ? { start } : {}),
          ...(end ? { end } : {}),
        },
      });
      showToast('Faturamento enviado para a impressora.', 'success');
    } catch (err: any) {
      let msg = 'Erro ao imprimir faturamento.';
      if (err?.response?.data?.detail) msg += ' ' + err.response.data.detail;
      showToast(msg, 'error');
      console.error('Erro ao imprimir faturamento:', err);
    }
  }

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
    // Busca inicial já filtrada para hoje
    fetchIndicators(todayStr, todayStr);
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
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, background: '#6c7bff', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' }}>Filtrar</button>
          <button type="button" style={{ padding: '8px 18px', borderRadius: 8, background: '#eee', color: '#222', border: 'none', fontWeight: 500, cursor: 'pointer' }} onClick={() => { const t = formatDateYYYYMMDD(new Date()); setStart(t); setEnd(t); fetchIndicators(t, t); }}>Limpar</button>
          <button
            type="button"
            style={{ padding: '8px 18px', borderRadius: 8, background: '#23264a', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' }}
            onClick={imprimirFaturamento}
          >
            Imprimir faturamento no cupom
          </button>
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
                  {(() => {
                    const totals = data.payment_totals_daily || {};
                    const knownMethods = ['dinheiro','pix','débito','crédito','ifood','99food'];
                    const allMethods = Array.from(new Set([
                      ...knownMethods,
                      ...Object.keys(totals),
                    ]));
                    return allMethods.map(method => (
                      <div key={method}>
                        {formatMethodLabel(method)}: R$ {(totals[method] ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    ));
                  })()}
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
                'crédito',
                'ifood',
                '99food',
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
                        {formatMethodLabel(method)}: R$ {(totals[method] ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
