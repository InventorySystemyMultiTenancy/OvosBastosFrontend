import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';
import { PainelCobrancaMaquininha } from '../components/PainelCobrancaMaquininha';
import { useCobrancaMaquininha } from '../hooks/useCobrancaMaquininha';
import { buildComprovanteLines } from '../utils/receiptLines';
import { printReceiptEscPosWithLogo } from '../utils/qzPrint';

const STATUS_LABEL = { ORCAMENTO: 'Orçamento', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada' };
const STATUS_BADGE = { ORCAMENTO: 'badge-amber', CONFIRMADA: 'badge-green', CANCELADA: 'badge-gray' };
const FORMAS_PAGAMENTO = ['PIX', 'DINHEIRO', 'CARTAO', 'BOLETO', 'FIADO'];

const STATUS_MP_ATIVOS = ['PENDENTE', 'EM_PROCESSO'];

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Vendas() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === 'ADMIN';
  const [vendas, setVendas] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCaixa, setFiltroCaixa] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [caixas, setCaixas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [modalConfirmar, setModalConfirmar] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [vencimento, setVencimento] = useState('');
  const [tipoCartaoManual, setTipoCartaoManual] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  const [comprovante, setComprovante] = useState(null);

  const [modalMaquininha, setModalMaquininha] = useState(null);
  const cobranca = useCobrancaMaquininha({
    vendaId: modalMaquininha?.id || null,
    onQuitado: () => carregar(),
  });

  function caixaTemMaquininha(caixaId) {
    const c = caixas.find((c) => c.id === caixaId);
    return Boolean(c?.mpConfigurado);
  }

  function abrirMaquininha(venda) {
    setModalMaquininha(venda);
  }

  function fecharMaquininha() {
    cobranca.reset();
    setModalMaquininha(null);
  }

  function carregar() {
    setCarregando(true);
    const params = new URLSearchParams();
    if (filtroStatus) params.set('status', filtroStatus);
    if (filtroCaixa) params.set('caixaId', filtroCaixa);
    if (filtroData) params.set('data', filtroData);
    const query = params.toString();
    api.get(`/vendas${query ? `?${query}` : ''}`).then(setVendas).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, [filtroStatus, filtroCaixa, filtroData]);
  useEffect(() => { api.get('/caixas').then(setCaixas).catch(() => {}); }, []);

  function abrirConfirmar(venda) {
    setModalConfirmar(venda);
    setFormaPagamento('PIX');
    setVencimento('');
    setTipoCartaoManual('');
  }

  async function confirmarVenda(e) {
    e.preventDefault();
    setConfirmando(true);
    try {
      await api.put(`/vendas/${modalConfirmar.id}/confirmar`, {
        formaPagamento,
        vencimento: formaPagamento === 'FIADO' ? vencimento || undefined : undefined,
        tipoCartaoManual: formaPagamento === 'CARTAO' ? tipoCartaoManual || undefined : undefined,
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

  async function reabrirVenda(venda) {
    if (
      !confirm(
        `Reabrir a venda #${venda.id}? O estoque vendido volta pro estoque e ela sai do faturamento até ser confirmada de novo — daí você escolhe a forma de pagamento (ou cancela o orçamento pra apagar a venda de vez).`
      )
    )
      return;
    try {
      await api.put(`/vendas/${venda.id}/reabrir`, {});
      carregar();
    } catch (err) {
      alert(err.message);
    }
  }

  async function verComprovante(venda) {
    const data = await api.get(`/vendas/${venda.id}/comprovante`);
    setComprovante(data);
  }

  async function imprimirDireto(venda) {
    try {
      const data = await api.get(`/vendas/${venda.id}/comprovante`);
      await printReceiptEscPosWithLogo(buildComprovanteLines(data));
    } catch (err) {
      alert(err.message || 'Erro ao imprimir. Verifique se o QZ Tray está instalado e rodando.');
    }
  }

  const columns = [
    { key: 'id', header: '#', render: (v) => <span className="vendas-col-id">{v.id}</span> },
    { key: 'cliente', header: 'Cliente', render: (v) => <span className="vendas-col-cliente">{v.cliente.nome}</span> },
    {
      key: 'vendedor',
      header: 'Vendedor',
      render: (v) => <span className="vendas-col-vendedor">{v.vendedor?.nome || 'Loja Online'}</span>,
    },
    { key: 'caixa', header: 'Unidade', render: (v) => <span className="vendas-col-unidade">{v.caixa?.nome || '—'}</span> },
    { key: 'status', header: 'Status', render: (v) => <span className={`badge ${STATUS_BADGE[v.status]}`}>{STATUS_LABEL[v.status]}</span> },
    {
      key: 'formaPagamento',
      header: 'Pagamento',
      render: (v) => (
        <span className="vendas-col-pagamento">
          {Number(v.valorDinheiro || 0) > 0 ? 'Dinheiro + Maquininha' : v.formaPagamento || '—'}
        </span>
      ),
    },
    { key: 'total', header: 'Total', render: (v) => <span className="vendas-col-total">{formatBRL(v.total)}</span> },
    {
      key: 'createdAt',
      header: 'Data',
      render: (v) => (
        <span className="vendas-col-data">
          {new Date(v.confirmadaEm || v.createdAt).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'origemPagamento',
      header: 'Origem',
      render: (v) => {
        const viaMaquininha = v.pagamentosPointMP?.some((p) => p.status === 'APROVADO');
        if (viaMaquininha) return <span className="badge badge-green">Maquininha</span>;
        if (v.formaPagamento === 'CARTAO' && v.tipoCartaoManual) return <span className="badge badge-amber">Por fora</span>;
        if (v.formaPagamento === 'CARTAO') return <span className="badge badge-gray">Cartão</span>;
        return <span className="text-muted">—</span>;
      },
    },
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
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => verComprovante(v)}>Comprovante</button>
              <button className="btn btn-secondary btn-sm" onClick={() => imprimirDireto(v)}>Imprimir</button>
              {ehAdmin && (
                <button className="btn btn-danger btn-sm" onClick={() => reabrirVenda(v)}>Reabrir</button>
              )}
            </>
          )}
          {v.status !== 'ORCAMENTO' && v.pagamentosPointMP?.some((p) => STATUS_MP_ATIVOS.includes(p.status)) && (
            <button className="btn btn-secondary btn-sm" onClick={() => abrirMaquininha(v)}>Maquininha</button>
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
          <p>Venda rápida, orçamentos e emissão  de comprovante.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/caixa')}>+ Nova venda</button>
      </div>

      <div className="vendas-filtros">
        <div className="vendas-filtro-campo">
          <label>Status</label>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ORCAMENTO">Orçamento</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
        <div className="vendas-filtro-campo">
          <label>Unidade</label>
          <select value={filtroCaixa} onChange={(e) => setFiltroCaixa(e.target.value)}>
            <option value="">Todas as unidades</option>
            {caixas.map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.unidade}</option>)}
          </select>
        </div>
        <div className="vendas-filtro-campo">
          <label>Data</label>
          <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} />
        </div>
        {(filtroStatus || filtroCaixa || filtroData) && (
          <button
            type="button"
            className="vendas-filtro-limpar"
            onClick={() => { setFiltroStatus(''); setFiltroCaixa(''); setFiltroData(''); }}
          >
            Limpar filtros
          </button>
        )}
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
            {formaPagamento === 'CARTAO' && (
              <div className="field">
                <label>Débito ou crédito? (opcional)</label>
                <select value={tipoCartaoManual} onChange={(e) => setTipoCartaoManual(e.target.value)}>
                  <option value="">Não sei / não informar</option>
                  <option value="DEBITO">Débito</option>
                  <option value="CREDITO">Crédito</option>
                </select>
                <p className="text-muted" style={{ marginTop: 6, fontSize: 12 }}>
                  Sem essa cobrança ter passado pela maquininha integrada, não dá pra saber automaticamente — informar
                  ajuda o fechamento do dia a separar certinho entre débito e crédito.
                </p>
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
          <PainelCobrancaMaquininha
            pagamentos={cobranca.pagamentos}
            resumo={cobranca.resumo}
            carregando={cobranca.carregando}
            enviando={cobranca.enviando}
            cancelando={cobranca.cancelando}
            erro={cobranca.erro}
            tempoRestante={cobranca.tempoRestante}
            onEnviar={cobranca.enviarCobranca}
            onCancelar={cobranca.cancelarAtiva}
          />
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={fecharMaquininha}>Fechar</button>
          </div>
        </Modal>
      )}

      {comprovante && (
        <Modal title={`Comprovante — Venda #${comprovante.numero}`} onClose={() => setComprovante(null)}>
          <div className="recibo-termico">
            <h3>Comprovante #{comprovante.numero}</h3>
            <p><strong>Cliente:</strong> {comprovante.cliente}</p>
            <p><strong>Vendedor:</strong> {comprovante.vendedor}</p>
            <p><strong>Data:</strong> {new Date(comprovante.data).toLocaleString('pt-BR')}</p>
            <p>
              <strong>Forma de pagamento:</strong>{' '}
              {comprovante.pagamentosMaquininha?.length > 1 ? (
                'Dividido'
              ) : Number(comprovante.valorDinheiro || 0) > 0 ? (
                <>
                  Dinheiro (<strong>{formatBRL(comprovante.valorDinheiro)}</strong>) + Maquininha (
                  <strong>{formatBRL(Number(comprovante.total) - Number(comprovante.valorDinheiro))}</strong>)
                </>
              ) : (
                comprovante.formaPagamento
              )}
            </p>
            {comprovante.pagamentosMaquininha?.length > 1 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 12px' }}>
                {Number(comprovante.valorDinheiro || 0) > 0 && (
                  <li>Dinheiro — <strong>{formatBRL(comprovante.valorDinheiro)}</strong></li>
                )}
                {comprovante.pagamentosMaquininha.map((p, idx) => (
                  <li key={idx}>Maquininha ({idx + 1}) — <strong>{formatBRL(p.valor)}</strong></li>
                ))}
              </ul>
            )}
            <div className="section-title">Itens</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0' }}>
              {comprovante.itens.map((i, idx) => (
                <li key={idx}><strong>{i.quantidade}x</strong> {i.produto} — <strong>{formatBRL(i.subtotal)}</strong></li>
              ))}
            </ul>
            <p><strong>Desconto:</strong> <strong>{formatBRL(comprovante.desconto)}</strong></p>
            {Number(comprovante.acrescimo) > 0 && (
              <p><strong>Acréscimo:</strong> <strong>{formatBRL(comprovante.acrescimo)}</strong></p>
            )}
            <p className="caixa-recibo-total" style={{ marginTop: 0 }}>Total: <strong>{formatBRL(comprovante.total)}</strong></p>
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={() => window.print()}>Imprimir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
