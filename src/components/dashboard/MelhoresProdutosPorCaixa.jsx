export function MelhoresProdutosPorCaixa({ dados }) {
  if (!dados || dados.length === 0) return <p className="text-muted">Sem vendas no período.</p>;

  return (
    <div className="dash-melhores-caixas">
      {dados.map((c) => (
        <div key={c.caixaId ?? 'sem-caixa'} className="dash-melhores-caixa-bloco">
          <strong>
            {c.nome}
            {c.unidade && <span className="text-muted"> · {c.unidade}</span>}
          </strong>
          <ul className="dash-melhores-caixa-lista">
            {c.produtos.map((p) => (
              <li key={p.produtoId}>
                <span>{p.nome}</span>
                <span>{p.quantidade} un.</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
