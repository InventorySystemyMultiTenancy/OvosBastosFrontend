import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';

const STATUS_LABEL = { ORCAMENTO: 'Orçamento', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada' };
const STATUS_BADGE = { ORCAMENTO: 'badge-amber', CONFIRMADA: 'badge-green', CANCELADA: 'badge-gray' };
const FORMAS_PAGAMENTO = ['PIX', 'DINHEIRO', 'CARTAO', 'BOLETO', 'FIADO'];

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Vendas() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [modalConfirmar, setModalConfirmar] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [vencimento, setVencimento] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  const [comprovante, setComprovante] = useState(null);

  function carregar() {
    setCarregando(true);
    const path = filtroStatus ? `/vendas?status=${filtroStatus}` : '/vendas';
    api.get(path).then(setVendas).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, [filtroStatus]);

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
    { key: 'status', header: 'Status', render: (v) => <span className={`badge ${STATUS_BADGE[v.status]}`}>{STATUS_LABEL[v.status]}</span> },
    { key: 'formaPagamento', header: 'Pagamento', render: (v) => v.formaPagamento || '—' },
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
        <button className="btn btn-primary" onClick={() => navigate('/')}>+ Nova venda</button>
      </div>

      <div className="toolbar">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ORCAMENTO">Orçamento</option>
          <option value="CONFIRMADA">Confirmada</option>
          <option value="CANCELADA">Cancelada</option>
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

      {comprovante && (
        <Modal title={`Comprovante — Venda #${comprovante.numero}`} onClose={() => setComprovante(null)}>
          <p><strong>Cliente:</strong> {comprovante.cliente}</p>
          <p><strong>Vendedor:</strong> {comprovante.vendedor}</p>
          <p><strong>Data:</strong> {new Date(comprovante.data).toLocaleString('pt-BR')}</p>
          <p><strong>Forma de pagamento:</strong> {comprovante.formaPagamento}</p>
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
