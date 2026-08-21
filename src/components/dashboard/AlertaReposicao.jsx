import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

function formatDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function AlertaReposicao() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === 'ADMIN';

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [gerando, setGerando] = useState(false);

  function carregar() {
    setCarregando(true);
    setErro('');
    api.get('/dashboard/analise-reposicao').then(setDados).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function gerarDeNovo() {
    setGerando(true);
    setErro('');
    try {
      const novo = await api.post('/dashboard/analise-reposicao/gerar', {});
      setDados(novo);
    } catch (err) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  }

  if (carregando) {
    return <p className="text-muted">Analisando estoque das unidades...</p>;
  }

  if (erro && !dados) {
    return <div className="alert-box">{erro}</div>;
  }

  const itens = dados?.itens || [];

  return (
    <div>
      {erro && <div className="alert-box">{erro}</div>}

      {dados?.resumo && <p style={{ marginTop: 0 }}>{dados.resumo}</p>}

      {itens.length === 0 ? (
        <div className="alert-box dash-fiado-ok">Nenhuma unidade com risco de ruptura no momento. 🎉</div>
      ) : (
        <ul className="dash-fiado-lista">
          {itens.map((d) => (
            <li key={`${d.caixaId}-${d.produtoId}`} className={d.urgencia === 'alta' || d.coberturaDias <= 1 ? 'is-vencida' : ''}>
              <span className="dash-fiado-cliente">
                {d.produtoNome} — {d.caixaNome}
                {d.caixaUnidade && <span className="text-muted"> · {d.caixaUnidade}</span>}
                {d.motivo && <span className="text-muted" style={{ display: 'block', fontSize: 12 }}>{d.motivo}</span>}
              </span>
              <span>{d.estoqueAtual} em estoque</span>
              <span className="text-muted">{d.coberturaDias == null ? '—' : `~${Number(d.coberturaDias).toFixed(1)} dias de cobertura`}</span>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {dados?.modoFallback
            ? 'Cálculo automático — IA não configurada ainda.'
            : dados?.geradoEm
              ? `${dados.stale ? 'Última análise disponível' : 'Análise gerada'} em ${formatDataHora(dados.geradoEm)}`
              : null}
        </span>
        {ehAdmin && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={gerarDeNovo} disabled={gerando}>
            {gerando ? 'Gerando...' : '🔄 Gerar de novo'}
          </button>
        )}
      </div>
    </div>
  );
}
