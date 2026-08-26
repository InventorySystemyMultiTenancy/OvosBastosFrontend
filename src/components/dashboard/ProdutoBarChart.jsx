function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProdutoBarChart({ dados }) {
  if (dados.length === 0) return <p className="text-muted">Sem vendas no período.</p>;

  const maxValor = Math.max(1, ...dados.map((p) => p.receita));

  return (
    <div className="dash-barlist">
      {dados.map((p) => (
        <div className="dash-barlist-row is-wide" key={p.produtoId ?? 'outros'}>
          <span className="dash-barlist-label" title={p.nome}>{p.nome}</span>
          <div className="dash-barlist-track is-purple">
            <div
              className={`dash-barlist-fill${p.produtoId === null ? ' is-outros' : ' is-purple'}`}
              style={{ width: `${Math.max((p.receita / maxValor) * 100, 3)}%` }}
            />
          </div>
          <span className="dash-barlist-value">{formatBRL(p.receita)}</span>
        </div>
      ))}
    </div>
  );
}
