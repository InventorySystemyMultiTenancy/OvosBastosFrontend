import { Link } from 'react-router-dom';

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

export function CaixaDivergenciaAlerta({ divergencias }) {
  if (!divergencias || divergencias.length === 0) {
    return <div className="alert-box dash-fiado-ok">Nenhuma divergência de caixa em aberto. 🎉</div>;
  }

  return (
    <Link to="/admin/financeiro?aba=caixas&divergencia=1" className="dash-fiado-card is-critico dash-divergencia-link">
      <div className="dash-fiado-resumo">
        <div>
          <span className="dash-fiado-valor">{divergencias.length}</span>
          <span className="text-muted"> {divergencias.length === 1 ? 'divergência recente' : 'divergências recentes'} de contagem de caixa</span>
        </div>
        <span className="badge badge-red">Requer revisão</span>
      </div>

      <ul className="dash-fiado-lista">
        {divergencias.map((d) => (
          <li key={d.id} className="is-vencida" style={{ gridTemplateColumns: '1fr' }}>
            <span>
              <strong>{d.caixaNome}</strong> <span className="text-muted">({d.caixaUnidade})</span> ·{' '}
              {d.usuarioFechamento || 'alguém'} deixou {formatBRL(d.valorFechamento)}, {d.usuarioAbertura} contou{' '}
              {formatBRL(d.valorAbertura)} ao abrir em {formatDataHora(d.abertaEm)} ·{' '}
              <strong className={Number(d.divergencia) > 0 ? 'text-success' : 'text-danger'}>
                diferença {Number(d.divergencia) > 0 ? '+' : ''}{formatBRL(d.divergencia)}
              </strong>
            </span>
          </li>
        ))}
      </ul>

      <span className="dash-divergencia-cta">
        Ver detalhes e marcar como revisado no Financeiro →
      </span>
    </Link>
  );
}
