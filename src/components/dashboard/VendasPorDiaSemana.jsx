function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function VendasPorDiaSemana({ dados, melhor }) {
  if (!dados || dados.every((d) => d.pedidos === 0)) return <p className="text-muted">Sem vendas no período.</p>;

  const maxValor = Math.max(1, ...dados.map((d) => d.total));

  return (
    <div className="dash-barlist">
      {dados.map((d) => (
        <div className="dash-barlist-row" key={d.diaSemana}>
          <span className="dash-barlist-label">
            {d.label}
            {melhor && d.diaSemana === melhor.diaSemana && d.total > 0 && (
              <span className="dash-pico-tag">Pico</span>
            )}
          </span>
          <div className="dash-barlist-track">
            <div className="dash-barlist-fill" style={{ width: `${Math.max((d.total / maxValor) * 100, d.total > 0 ? 3 : 0)}%` }} />
          </div>
          <span className="dash-barlist-value">{formatBRL(d.total)}</span>
        </div>
      ))}
    </div>
  );
}
