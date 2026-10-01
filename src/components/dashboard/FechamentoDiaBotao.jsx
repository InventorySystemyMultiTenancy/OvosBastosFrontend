import { useState } from 'react';
import { api } from '../../api/client';
import { Modal } from '../Modal';
import { gerarRelatorioFechamentoDia } from '../../utils/relatoriosPdf';

const LABEL_FORMA = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  CARTAO_OUTRO: 'Cartão (não identificado)',
  BOLETO: 'Boleto',
  FIADO: 'Fiado',
};

const ICONE_FORMA = {
  PIX: '⚡',
  DINHEIRO: '💵',
  CARTAO_CREDITO: '💳',
  CARTAO_DEBITO: '💳',
  CARTAO_OUTRO: '💳',
  BOLETO: '🧾',
  FIADO: '📋',
};

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Botão de fechamento do dia (só admin, ver Dashboard.jsx): faturamento, lucro líquido e o
// valor vendido em cada forma de pagamento, com cartão já separado em crédito/débito — pra
// bater a caixa no fim do expediente sem precisar abrir a aba Financeiro. Sempre busca dados
// novos ao abrir (diferente do EstoquePorUnidadeBotao) porque isso muda a cada venda do dia.
export function FechamentoDiaBotao() {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [gerandoPdf, setGerandoPdf] = useState(false);

  function abrir() {
    setAberto(true);
    setCarregando(true);
    setErro('');
    api
      .get('/dashboard/fechamento-dia')
      .then(setDados)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  async function gerarPdf() {
    if (!dados) return;
    setGerandoPdf(true);
    try {
      await gerarRelatorioFechamentoDia(dados);
    } finally {
      setGerandoPdf(false);
    }
  }

  const formasComValor = dados
    ? Object.entries(dados.porFormaPagamento).filter(([, valor]) => valor > 0)
    : [];

  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={abrir}>🧾 Fechamento do dia</button>

      {aberto && (
        <Modal title="Fechamento do dia" onClose={() => setAberto(false)}>
          {erro && <div className="alert-box">{erro}</div>}
          {carregando ? (
            <p className="text-muted">Carregando...</p>
          ) : dados ? (
            <>
              <p className="text-muted" style={{ marginTop: 0 }}>
                {new Date(dados.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} ·{' '}
                {dados.quantidadeVendas} {dados.quantidadeVendas === 1 ? 'venda confirmada' : 'vendas confirmadas'}
              </p>

              <div className="stat-grid is-compacto" style={{ marginBottom: 20 }}>
                <div className="stat-tile">
                  <div className="stat-value">{formatBRL(dados.faturamento)}</div>
                  <div className="stat-label">Total vendido</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-value">{formatBRL(dados.custoProdutos)}</div>
                  <div className="stat-label">Custo dos produtos vendidos</div>
                </div>
                <div className="stat-tile">
                  <div className={`stat-value ${dados.lucroLiquido >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatBRL(dados.lucroLiquido)}
                  </div>
                  <div className="stat-label">Lucro líquido</div>
                </div>
              </div>

              <div className="section-title" style={{ marginTop: 0 }}>Por forma de pagamento</div>
              {formasComValor.length === 0 ? (
                <p className="text-muted">Nenhuma venda confirmada ainda hoje.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0' }}>
                  {formasComValor.map(([forma, valor]) => (
                    <li key={forma} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                      <span>{ICONE_FORMA[forma]} {LABEL_FORMA[forma] || forma}</span>
                      <strong style={{ marginLeft: 'auto' }}>{formatBRL(valor)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAberto(false)}>Fechar</button>
            <button type="button" className="btn btn-primary" onClick={gerarPdf} disabled={!dados || carregando || gerandoPdf}>
              📄 {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
