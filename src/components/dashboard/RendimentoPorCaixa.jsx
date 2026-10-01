function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function RendimentoPorCaixa({ dados, mostrarSaldo }) {
  if (!dados || dados.length === 0) return <p className="text-muted">Sem vendas no período.</p>;

  const maxValor = Math.max(1, ...dados.map((c) => c.receitas));

  return (
    <div className="dash-vbar-chart">
      {dados.map((c) => (
        <div className="dash-vbar-col" key={c.caixaId ?? 'sem-caixa'}>
          <span className="dash-vbar-value">{formatBRL(c.receitas)}</span>
          <div className="dash-vbar-track is-green">
            <div
              className={`dash-vbar-fill${c.caixaId === null ? ' is-outros' : ' is-green'}`}
              style={{ height: `${Math.max((c.receitas / maxValor) * 100, 3)}%` }}
            />
          </div>
          <span className="dash-vbar-label" title={c.unidade ? `${c.nome} — ${c.unidade}` : c.nome}>{c.nome}</span>
          {mostrarSaldo && c.saldo !== undefined && (
            <span className={`dash-vbar-sub ${c.saldo >= 0 ? 'text-success' : 'text-danger'}`}>
              {c.saldo >= 0 ? '+' : ''}{formatBRL(c.saldo)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
