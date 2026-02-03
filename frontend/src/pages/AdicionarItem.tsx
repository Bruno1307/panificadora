import React, { useState } from 'react';

export default function AdicionarItem({ produtos, produtoId, setProdutoId, qtd, setQtd, adicionarItem }) {
  const [search, setSearch] = useState('');
  return (
    <>
      <div style={{marginTop:12, background:'#f6f8fa', padding:18, borderRadius:14, boxShadow:'0 2px 8px #0001', display:'flex', gap:18, alignItems:'center'}}>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{fontSize:22,padding:14,borderRadius:12,border:'2px solid #ccc',marginBottom:8,minHeight:48}}
          />
          <select value={produtoId} onChange={e=>setProdutoId(e.target.value)} style={{fontSize:22, padding:14, borderRadius:12, border:'2px solid #ccc',minHeight:48}}>
            <option value="">Selecione o produto</option>
            {produtos.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <button className="button secondary" style={{padding:'18px 28px',fontSize:32, borderRadius:14, minWidth:64, minHeight:64, fontWeight:700}} onClick={()=>setQtd(qtd > 1 ? qtd - 1 : 1)} disabled={qtd <= 1}>-</button>
          <input type="number" min={1} value={qtd} onChange={e=>setQtd(Number(e.target.value))} style={{width:90, fontSize:28, padding:18, borderRadius:14, border:'2px solid #43e97b', textAlign:'center', fontWeight:700, height:64}} />
          <button className="button secondary" style={{padding:'18px 28px',fontSize:32, borderRadius:14, minWidth:64, minHeight:64, fontWeight:700}} onClick={()=>setQtd(qtd + 1)}>+</button>
          {[1,2,3].map(q=>
            <button key={q} className="button" style={{background:'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)', color:'#23264a', borderRadius:14, fontWeight:700, fontSize:26, padding:'18px 18px', minWidth:64, minHeight:64, marginLeft:8}} onClick={()=>setQtd(q)}>
              {q}
            </button>
          )}
        </div>
        <button className="button success" style={{fontSize:24, padding:'18px 32px', borderRadius:14, minHeight:56}} onClick={adicionarItem}>Adicionar</button>
      </div>
    </>
  );
}
