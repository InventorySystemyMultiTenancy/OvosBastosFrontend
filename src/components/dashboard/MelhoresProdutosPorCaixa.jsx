export function MelhoresProdutosPorCaixa({ dados }) {
  if (!dados || dados.length === 0) return <p className="text-muted">Sem vendas no período.</p>;

  return (
    <div className="dash-melhores-caixas">
      {dados.map((c) => {
        const maxQtd = Math.max(1, ...c.produtos.map((p) => p.quantidade));
        return (
          <div key={c.caixaId ?? 'sem-caixa'} className="dash-melhores-caixa-bloco">
            <strong>
              {c.nome}
              {c.unidade && <span className="text-muted"> · {c.unidade}</span>}
            </strong>
            <ul className="dash-melhores-caixa-lista">
              {c.produtos.map((p, i) => (
                <li key={p.produtoId}>
                  <span className="dash-melhores-rank">{i + 1}º</span>
                  <span className="dash-melhores-main">
                    <span className="dash-melhores-nome" title={p.nome}>{p.nome}</span>
                    <span className="dash-melhores-track">
                      <span className="dash-melhores-fill" style={{ width: `${Math.max((p.quantidade / maxQtd) * 100, 4)}%` }} />
                    </span>
                  </span>
                  <span className="dash-melhores-qtd">{p.quantidade} un.</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
