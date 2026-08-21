import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Modal } from '../Modal';
import { Table } from '../Table';

function formatDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const COLUNAS_REPOSICAO = [
  {
    key: 'unidade',
    header: 'Unidade',
    render: (i) => (
      <span>
        {i.caixaNome}
        {i.caixaUnidade && <span className="text-muted"> · {i.caixaUnidade}</span>}
      </span>
    ),
  },
  { key: 'produtoNome', header: 'Produto' },
  { key: 'estoqueInicioMes', header: 'Estoque início do mês' },
  { key: 'estoqueAtual', header: 'Estoque atual' },
  { key: 'faltaRepor', header: 'Falta repor', render: (i) => <strong className="text-danger">{i.faltaRepor}</strong> },
];

export function AlertaReposicao() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [modalReposicao, setModalReposicao] = useState(false);
  const [dadosReposicao, setDadosReposicao] = useState(null);
  const [carregandoReposicao, setCarregandoReposicao] = useState(false);
  const [erroReposicao, setErroReposicao] = useState('');

  function abrirReposicaoMensal() {
    setModalReposicao(true);
    setCarregandoReposicao(true);
    setErroReposicao('');
    api
      .get('/dashboard/reposicao-mensal')
      .then(setDadosReposicao)
      .catch((e) => setErroReposicao(e.message))
      .finally(() => setCarregandoReposicao(false));
  }

  function carregar() {
    setCarregando(true);
    setErro('');
    api.get('/dashboard/analise-reposicao').then(setDados).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  if (carregando) {
    return <p className="text-muted">Clara está analisando o estoque das unidades...</p>;
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
        <div className="alert-box dash-fiado-ok">Clara não encontrou nenhuma unidade com risco de ruptura no momento. 🎉</div>
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

      <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={abrirReposicaoMensal}>
          📦 Ver o que repor
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {dados?.modoFallback
            ? 'Cálculo automático — Clara (IA) ainda não foi configurada.'
            : dados?.geradoEm
              ? `${dados.stale ? 'Última análise semanal da Clara' : 'Clara analisou esta semana'} em ${formatDataHora(dados.geradoEm)} — atualiza automaticamente toda semana`
              : null}
        </span>
      </div>

      {modalReposicao && (
        <Modal title="O que repor pra voltar ao início do mês" onClose={() => setModalReposicao(false)}>
          <p className="text-muted" style={{ marginBottom: 14 }}>
            Quanto cada unidade precisa receber de cada produto pra voltar ao estoque que tinha no início do mês.
          </p>
          {erroReposicao && <div className="alert-box">{erroReposicao}</div>}
          {carregandoReposicao ? (
            <p className="text-muted">Calculando...</p>
          ) : (
            <Table
              columns={COLUNAS_REPOSICAO}
              rows={dadosReposicao?.itens || []}
              rowKey={(i) => `${i.caixaId}-${i.produtoId}`}
              emptyMessage="Nenhuma unidade precisa repor pra voltar ao nível do início do mês. 🎉"
            />
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalReposicao(false)}>Fechar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
