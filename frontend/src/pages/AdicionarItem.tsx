import React, { useState } from 'react';

export default function AdicionarItem({ produtos, produtoId, setProdutoId, qtd, setQtd, adicionarItem }) {
  const [search, setSearch] = useState('');
  return (
    <>
      <div style={{marginTop:12, background:'#f6f8fa', padding:12, borderRadius:8, boxShadow:'0 2px 8px #0001', display:'flex', gap:12, alignItems:'center'}}>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{fontSize:16,padding:6,borderRadius:6,border:'1px solid #ccc',marginBottom:2}}
          />
          <select value={produtoId} onChange={e=>setProdutoId(e.target.value)} style={{fontSize:16, padding:6, borderRadius:6, border:'1px solid #ccc'}}>
            <option value="">Selecione o produto</option>
            {produtos.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <button className="button secondary" style={{padding:'4px 10px',fontSize:18}} onClick={()=>setQtd(qtd > 1 ? qtd - 1 : 1)} disabled={qtd <= 1}>-</button>
          <input type="number" min={1} value={qtd} onChange={e=>setQtd(Number(e.target.value))} style={{width:60, fontSize:16, padding:6, borderRadius:6, border:'1px solid #ccc', textAlign:'center'}} />
          <button className="button secondary" style={{padding:'4px 10px',fontSize:18}} onClick={()=>setQtd(qtd + 1)}>+</button>
        </div>
        <button className="button success" style={{fontSize:16, padding:'6px 18px', borderRadius:6}} onClick={adicionarItem}>Adicionar</button>
      </div>
    </>
  );
}
