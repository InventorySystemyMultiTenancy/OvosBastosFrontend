import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';

const STATUS_LABEL = { ORCAMENTO: 'Orçamento', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada' };
const STATUS_BADGE = { ORCAMENTO: 'badge-amber', CONFIRMADA: 'badge-green', CANCELADA: 'badge-gray' };
const FORMAS_PAGAMENTO = ['PIX', 'DINHEIRO', 'CARTAO', 'BOLETO', 'FIADO'];

const STATUS_MP_LABEL = { PENDENTE: 'Pendente', EM_PROCESSO: 'Em processamento', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado', CANCELADO: 'Cancelado' };
const STATUS_MP_BADGE = { PENDENTE: 'badge-amber', EM_PROCESSO: 'badge-amber', APROVADO: 'badge-green', REJEITADO: 'badge-red', CANCELADO: 'badge-gray' };
const STATUS_MP_ATIVOS = ['PENDENTE', 'EM_PROCESSO'];

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Vendas() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCaixa, setFiltroCaixa] = useState('');
  const [caixas, setCaixas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [modalConfirmar, setModalConfirmar] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [vencimento, setVencimento] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  const [comprovante, setComprovante] = useState(null);

  const [modalMaquininha, setModalMaquininha] = useState(null);
  const [pagamentoMp, setPagamentoMp] = useState(null);
  const [enviandoMp, setEnviandoMp] = useState(false);
  const [cancelandoMp, setCancelandoMp] = useState(false);
  const [erroMp, setErroMp] = useState('');
  const pollMpRef = useRef(null);

  useEffect(() => () => {
    if (pollMpRef.current) clearInterval(pollMpRef.current);
  }, []);

  function caixaTemMaquininha(caixaId) {
    const c = caixas.find((c) => c.id === caixaId);
    return Boolean(c?.mpConfigurado);
  }

  function pararPollingMp() {
    if (pollMpRef.current) {
      clearInterval(pollMpRef.current);
      pollMpRef.current = null;
    }
  }

  function iniciarPollingMp(vendaId) {
    pararPollingMp();
    pollMpRef.current = setInterval(async () => {
      try {
        const pagamento = await api.get(`/vendas/${vendaId}/pagamento-maquininha`);
        setPagamentoMp(pagamento);
        if (!STATUS_MP_ATIVOS.includes(pagamento.status)) {
          pararPollingMp();
          if (pagamento.status === 'APROVADO') carregar();
        }
      } catch {
        pararPollingMp();
      }
    }, 3000);
  }

  function abrirMaquininha(venda) {
    setModalMaquininha(venda);
    setPagamentoMp(venda.pagamentoPointMP || null);
    setErroMp('');
    if (venda.pagamentoPointMP && STATUS_MP_ATIVOS.includes(venda.pagamentoPointMP.status)) {
      iniciarPollingMp(venda.id);
    }
  }

  function fecharMaquininha() {
    pararPollingMp();
    setModalMaquininha(null);
    setPagamentoMp(null);
  }

  async function enviarCobrancaMaquininha() {
    const vendaId = modalMaquininha.id;
    setEnviandoMp(true);
    setErroMp('');
    try {
      const pagamento = await api.post(`/vendas/${vendaId}/pagamento-maquininha`, {});
      setPagamentoMp(pagamento);
      iniciarPollingMp(vendaId);
    } catch (err) {
      setErroMp(err.message);
    } finally {
      setEnviandoMp(false);
    }
  }

  async function cancelarCobrancaMaquininha() {
    const vendaId = modalMaquininha.id;
    setCancelandoMp(true);
    setErroMp('');
    try {
      const pagamento = await api.delete(`/vendas/${vendaId}/pagamento-maquininha`);
      setPagamentoMp(pagamento);
    } catch (err) {
      setErroMp(err.message);
    } finally {
      setCancelandoMp(false);
      pararPollingMp();
    }
  }

  function carregar() {
    setCarregando(true);
    const params = new URLSearchParams();
    if (filtroStatus) params.set('status', filtroStatus);
    if (filtroCaixa) params.set('caixaId', filtroCaixa);
    const query = params.toString();
    api.get(`/vendas${query ? `?${query}` : ''}`).then(setVendas).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, [filtroStatus, filtroCaixa]);
  useEffect(() => { api.get('/caixas').then(setCaixas).catch(() => {}); }, []);

  function abrirConfirmar(venda) {
    setModalConfirmar(venda);
    setFormaPagamento('PIX');
    setVencimento('');
  }

  async function confirmarVenda(e) {
    e.preventDefault();
    setConfirmando(true);
    try {
      await api.put(`/vendas/${modalConfirmar.id}/confirmar`, {
        formaPagamento,
        vencimento: formaPagamento === 'FIADO' ? vencimento || undefined : undefined,
      });
      setModalConfirmar(null);
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setConfirmando(false);
    }
  }

  async function cancelarVenda(venda) {
    if (!confirm(`Cancelar o orçamento #${venda.id}?`)) return;
    await api.put(`/vendas/${venda.id}/cancelar`, {});
    carregar();
  }

  async function verComprovante(venda) {
    const data = await api.get(`/vendas/${venda.id}/comprovante`);
    setComprovante(data);
  }

  const columns = [
    { key: 'id', header: '#' },
    { key: 'cliente', header: 'Cliente', render: (v) => v.cliente.nome },
    { key: 'vendedor', header: 'Vendedor', render: (v) => v.vendedor?.nome || 'Loja Online' },
    { key: 'caixa', header: 'Unidade', render: (v) => v.caixa?.nome || '—' },
    { key: 'status', header: 'Status', render: (v) => <span className={`badge ${STATUS_BADGE[v.status]}`}>{STATUS_LABEL[v.status]}</span> },
    {
      key: 'formaPagamento',
      header: 'Pagamento',
      render: (v) => (Number(v.valorDinheiro || 0) > 0 ? 'Dinheiro + Maquininha' : v.formaPagamento || '—'),
    },
    { key: 'total', header: 'Total', render: (v) => formatBRL(v.total) },
    { key: 'createdAt', header: 'Data', render: (v) => new Date(v.createdAt).toLocaleDateString('pt-BR') },
    {
      key: 'acoes',
      header: '',
      render: (v) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {v.status === 'ORCAMENTO' && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => abrirConfirmar(v)}>Confirmar</button>
              {caixaTemMaquininha(v.caixaId) && (
                <button className="btn btn-secondary btn-sm" onClick={() => abrirMaquininha(v)}>Maquininha</button>
              )}
              <button className="btn btn-danger btn-sm" onClick={() => cancelarVenda(v)}>Cancelar</button>
            </>
          )}
          {v.status === 'CONFIRMADA' && (
            <button className="btn btn-secondary btn-sm" onClick={() => verComprovante(v)}>Comprovante</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vendas</h1>
          <p>Venda rápida, orçamentos e emissão de comprovante.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/caixa')}>+ Nova venda</button>
      </div>

      <div className="toolbar">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ORCAMENTO">Orçamento</option>
          <option value="CONFIRMADA">Confirmada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <select value={filtroCaixa} onChange={(e) => setFiltroCaixa(e.target.value)}>
          <option value="">Todas as unidades</option>
          {caixas.map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.unidade}</option>)}
        </select>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {carregando ? <p className="text-muted">Carregando...</p> : (
        <Table columns={columns} rows={vendas} rowKey={(v) => v.id} />
      )}

      {modalConfirmar && (
        <Modal title={`Confirmar venda #${modalConfirmar.id}`} onClose={() => setModalConfirmar(null)}>
          <form onSubmit={confirmarVenda}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Forma de pagamento *</label>
              <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {formaPagamento === 'FIADO' && (
              <div className="field">
                <label>Vencimento (opcional, padrão 30 dias)</label>
                <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </div>
            )}
            <p className="text-muted" style={{ marginTop: 12 }}>Total: {formatBRL(modalConfirmar.total)}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalConfirmar(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={confirmando}>{confirmando ? 'Confirmando...' : 'Confirmar venda'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modalMaquininha && (
        <Modal title={`Cobrar na maquininha — Venda #${modalMaquininha.id}`} onClose={fecharMaquininha}>
          <p className="text-muted">Total: {formatBRL(modalMaquininha.total)}</p>
          {Number(modalMaquininha.valorDinheiro || 0) > 0 && (
            <p className="text-muted">
              Já recebido em dinheiro: {formatBRL(modalMaquininha.valorDinheiro)} · Cobrado na maquininha: {formatBRL(Number(modalMaquininha.total) - Number(modalMaquininha.valorDinheiro))}
            </p>
          )}
          {erroMp && <div className="alert-box">{erroMp}</div>}

          {pagamentoMp ? (
            <>
              <p>
                Status: <span className={`badge ${STATUS_MP_BADGE[pagamentoMp.status] || 'badge-gray'}`}>
                  {STATUS_MP_LABEL[pagamentoMp.status] || pagamentoMp.status}
                </span>
              </p>
              {STATUS_MP_ATIVOS.includes(pagamentoMp.status) && (
                <p className="text-muted">Aguardando o cliente concluir o pagamento na maquininha...</p>
              )}
              {pagamentoMp.status === 'APROVADO' && <p className="text-muted">Pagamento aprovado — venda confirmada.</p>}
              {pagamentoMp.status === 'REJEITADO' && <p className="text-muted">Pagamento rejeitado. Você pode tentar novamente.</p>}

              <div className="modal-actions">
                {STATUS_MP_ATIVOS.includes(pagamentoMp.status) && (
                  <button type="button" className="btn btn-danger" onClick={cancelarCobrancaMaquininha} disabled={cancelandoMp}>
                    {cancelandoMp ? 'Cancelando...' : 'Cancelar cobrança'}
                  </button>
                )}
                {['REJEITADO', 'CANCELADO'].includes(pagamentoMp.status) && (
                  <button type="button" className="btn btn-primary" onClick={enviarCobrancaMaquininha} disabled={enviandoMp}>
                    {enviandoMp ? 'Enviando...' : 'Tentar novamente'}
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={fecharMaquininha}>Fechar</button>
              </div>
            </>
          ) : (
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={fecharMaquininha}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={enviarCobrancaMaquininha} disabled={enviandoMp}>
                {enviandoMp ? 'Enviando...' : 'Enviar cobrança'}
              </button>
            </div>
          )}
        </Modal>
      )}

      {comprovante && (
        <Modal title={`Comprovante — Venda #${comprovante.numero}`} onClose={() => setComprovante(null)}>
          <p><strong>Cliente:</strong> {comprovante.cliente}</p>
          <p><strong>Vendedor:</strong> {comprovante.vendedor}</p>
          <p><strong>Data:</strong> {new Date(comprovante.data).toLocaleString('pt-BR')}</p>
          <p>
            <strong>Forma de pagamento:</strong>{' '}
            {Number(comprovante.valorDinheiro || 0) > 0
              ? `Dinheiro (${formatBRL(comprovante.valorDinheiro)}) + Maquininha (${formatBRL(Number(comprovante.total) - Number(comprovante.valorDinheiro))})`
              : comprovante.formaPagamento}
          </p>
          <div className="section-title">Itens</div>
          <ul style={{ paddingLeft: 18 }}>
            {comprovante.itens.map((i, idx) => (
              <li key={idx}>{i.quantidade}x {i.produto} — {formatBRL(i.subtotal)}</li>
            ))}
          </ul>
          <p><strong>Desconto:</strong> {formatBRL(comprovante.desconto)}</p>
          <p style={{ fontSize: 18, fontWeight: 700 }}>Total: {formatBRL(comprovante.total)}</p>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={() => window.print()}>Imprimir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
