function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function TopClientesList({ dados }) {
  if (dados.length === 0) return <p className="text-muted">Sem vendas no período.</p>;

  const maxValor = Math.max(1, ...dados.map((c) => c.total));

  return (
    <div className="dash-ranklist">
      {dados.map((c, i) => (
        <div className="dash-rank-row" key={c.clienteId}>
          <span className="dash-rank-pos">{i + 1}º</span>
          <div className="dash-rank-main">
            <div className="dash-rank-top">
              <span className="dash-rank-nome">{c.nome}</span>
              <span className="dash-rank-valor">{formatBRL(c.total)}</span>
            </div>
            <div className="dash-rank-track">
              <div className="dash-rank-fill" style={{ width: `${Math.max((c.total / maxValor) * 100, 4)}%` }} />
            </div>
            <span className="text-muted dash-rank-pedidos">{c.pedidos} {c.pedidos === 1 ? 'pedido' : 'pedidos'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
