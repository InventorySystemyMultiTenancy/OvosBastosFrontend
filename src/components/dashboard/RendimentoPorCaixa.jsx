function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function RendimentoPorCaixa({ dados, mostrarSaldo }) {
  if (!dados || dados.length === 0) return <p className="text-muted">Sem vendas no período.</p>;

  const maxValor = Math.max(1, ...dados.map((c) => c.receitas));

  return (
    <div className="dash-barlist">
      {dados.map((c) => (
        <div className="dash-barlist-row is-wide" key={c.caixaId ?? 'sem-caixa'}>
          <span className="dash-barlist-label" title={c.unidade ? `${c.nome} — ${c.unidade}` : c.nome}>
            {c.nome}
            {c.unidade && <span className="text-muted"> · {c.unidade}</span>}
          </span>
          <div className="dash-barlist-track is-green">
            <div
              className={`dash-barlist-fill${c.caixaId === null ? ' is-outros' : ' is-green'}`}
              style={{ width: `${Math.max((c.receitas / maxValor) * 100, 3)}%` }}
            />
          </div>
          <span className="dash-barlist-value-col">
            <span className="dash-barlist-value">{formatBRL(c.receitas)}</span>
            {mostrarSaldo && c.saldo !== undefined && (
              <span className={`dash-barlist-saldo ${c.saldo >= 0 ? 'text-success' : 'text-danger'}`}>
                líquido {formatBRL(c.saldo)}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
