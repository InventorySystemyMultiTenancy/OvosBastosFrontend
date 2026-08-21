export function AlertaReposicao({ dados }) {
  if (!dados || dados.length === 0) {
    return <div className="alert-box dash-fiado-ok">Nenhuma unidade com risco de ruptura no momento. 🎉</div>;
  }

  return (
    <ul className="dash-fiado-lista">
      {dados.map((d) => (
        <li key={`${d.caixaId}-${d.produtoId}`} className={d.coberturaDias <= 1 ? 'is-vencida' : ''}>
          <span className="dash-fiado-cliente">
            {d.produtoNome} — {d.caixaNome}
            {d.caixaUnidade && <span className="text-muted"> · {d.caixaUnidade}</span>}
          </span>
          <span>{d.estoqueAtual} em estoque</span>
          <span className="text-muted">~{d.coberturaDias.toFixed(1)} dias de cobertura</span>
        </li>
      ))}
    </ul>
  );
}
