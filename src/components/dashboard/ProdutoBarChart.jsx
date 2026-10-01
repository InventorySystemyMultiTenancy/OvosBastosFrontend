function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Sem centavos — com 7-8 colunas o valor completo não cabe sem colidir com a barra vizinha.
function formatBRLCompacto(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function ProdutoBarChart({ dados }) {
  if (dados.length === 0) return <p className="text-muted">Sem vendas no período.</p>;

  const maxValor = Math.max(1, ...dados.map((p) => p.receita));

  return (
    <div className="dash-vbar-chart is-denso">
      {dados.map((p) => (
        <div className="dash-vbar-col" key={p.produtoId ?? 'outros'}>
          <span className="dash-vbar-value" title={formatBRL(p.receita)}>{formatBRLCompacto(p.receita)}</span>
          <div className="dash-vbar-track is-purple">
            <div
              className={`dash-vbar-fill${p.produtoId === null ? ' is-outros' : ' is-purple'}`}
              style={{ height: `${Math.max((p.receita / maxValor) * 100, 3)}%` }}
            />
          </div>
          <span className="dash-vbar-label" title={p.nome}>{p.nome}</span>
        </div>
      ))}
    </div>
  );
}
