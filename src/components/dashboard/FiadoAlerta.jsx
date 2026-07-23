function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function FiadoAlerta({ fiado }) {
  if (!fiado || fiado.quantidadeEmAberto === 0) {
    return <div className="alert-box dash-fiado-ok">Nenhum fiado em aberto no momento. 🎉</div>;
  }

  return (
    <div className={`dash-fiado-card${fiado.quantidadeVencida > 0 ? ' is-critico' : ''}`}>
      <div className="dash-fiado-resumo">
        <div>
          <span className="dash-fiado-valor">{formatBRL(fiado.totalEmAberto)}</span>
          <span className="text-muted"> em aberto · {fiado.quantidadeEmAberto} {fiado.quantidadeEmAberto === 1 ? 'conta' : 'contas'}</span>
        </div>
        {fiado.quantidadeVencida > 0 && (
          <span className="badge badge-red">
            {formatBRL(fiado.totalVencido)} vencido · {fiado.quantidadeVencida} {fiado.quantidadeVencida === 1 ? 'conta' : 'contas'}
          </span>
        )}
      </div>

      <ul className="dash-fiado-lista">
        {fiado.contas.map((c) => (
          <li key={c.id} className={c.vencida ? 'is-vencida' : ''}>
            <span className="dash-fiado-cliente">{c.cliente}</span>
            <span>{formatBRL(c.valor)}</span>
            <span className="text-muted">{c.vencida ? 'venceu em' : 'vence em'} {formatData(c.vencimento)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
