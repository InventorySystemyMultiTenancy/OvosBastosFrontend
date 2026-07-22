import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const CONTA_RECEBER_VAZIA = { clienteId: '', valor: '', vencimento: '' };
const CONTA_PAGAR_VAZIA = { descricao: '', fornecedor: '', valor: '', vencimento: '' };

export function Financeiro() {
  const [contasReceber, setContasReceber] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [fluxo, setFluxo] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [erro, setErro] = useState('');

  const [modalReceber, setModalReceber] = useState(false);
  const [formReceber, setFormReceber] = useState(CONTA_RECEBER_VAZIA);

  const [modalPagar, setModalPagar] = useState(false);
  const [formPagar, setFormPagar] = useState(CONTA_PAGAR_VAZIA);

  function carregar() {
    api.get('/financeiro/contas-receber').then(setContasReceber).catch((e) => setErro(e.message));
    api.get('/financeiro/contas-pagar').then(setContasPagar).catch((e) => setErro(e.message));
    api.get('/financeiro/fluxo-caixa?meses=6').then(setFluxo).catch((e) => setErro(e.message));
  }

  useEffect(carregar, []);
  useEffect(() => { api.get('/clientes').then(setClientes).catch(() => {}); }, []);

  async function criarContaReceber(e) {
    e.preventDefault();
    await api.post('/financeiro/contas-receber', {
      clienteId: Number(formReceber.clienteId),
      valor: Number(formReceber.valor),
      vencimento: formReceber.vencimento,
    });
    setModalReceber(false);
    setFormReceber(CONTA_RECEBER_VAZIA);
    carregar();
  }

  async function pagarReceber(conta) {
    await api.put(`/financeiro/contas-receber/${conta.id}/pagar`, {});
    carregar();
  }

  async function criarContaPagar(e) {
    e.preventDefault();
    await api.post('/financeiro/contas-pagar', {
      descricao: formPagar.descricao,
      fornecedor: formPagar.fornecedor,
      valor: Number(formPagar.valor),
      vencimento: formPagar.vencimento,
    });
    setModalPagar(false);
    setFormPagar(CONTA_PAGAR_VAZIA);
    carregar();
  }

  async function pagarConta(conta) {
    await api.put(`/financeiro/contas-pagar/${conta.id}/pagar`, {});
    carregar();
  }

  const maiorValor = Math.max(1, ...fluxo.flatMap((m) => [m.receitas, m.despesas]));

  const colunasReceber = [
    { key: 'cliente', header: 'Cliente', render: (c) => c.cliente.nome },
    { key: 'valor', header: 'Valor', render: (c) => formatBRL(c.valor) },
    { key: 'vencimento', header: 'Vencimento', render: (c) => new Date(c.vencimento).toLocaleDateString('pt-BR') },
    { key: 'pago', header: 'Status', render: (c) => <span className={`badge ${c.pago ? 'badge-green' : 'badge-amber'}`}>{c.pago ? 'Recebido' : 'Em aberto'}</span> },
    { key: 'acoes', header: '', render: (c) => (!c.pago ? <button className="btn btn-primary btn-sm" onClick={() => pagarReceber(c)}>Marcar recebido</button> : null) },
  ];

  const colunasPagar = [
    { key: 'descricao', header: 'Descrição' },
    { key: 'fornecedor', header: 'Fornecedor', render: (c) => c.fornecedor || '—' },
    { key: 'valor', header: 'Valor', render: (c) => formatBRL(c.valor) },
    { key: 'vencimento', header: 'Vencimento', render: (c) => new Date(c.vencimento).toLocaleDateString('pt-BR') },
    { key: 'pago', header: 'Status', render: (c) => <span className={`badge ${c.pago ? 'badge-green' : 'badge-amber'}`}>{c.pago ? 'Pago' : 'Em aberto'}</span> },
    { key: 'acoes', header: '', render: (c) => (!c.pago ? <button className="btn btn-primary btn-sm" onClick={() => pagarConta(c)}>Marcar pago</button> : null) },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Financeiro</h1>
          <p>Contas a pagar, contas a receber e fluxo de caixa.</p>
        </div>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      <div className="section-title" style={{ marginTop: 0 }}>Fluxo de caixa (últimos 6 meses)</div>
      <div className="card" style={{ marginBottom: 8 }}>
        {fluxo.map((m) => (
          <div key={m.mes} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <strong>{m.mes}</strong>
              <span className="text-muted">Receitas {formatBRL(m.receitas)} · Despesas {formatBRL(m.despesas)} · Saldo {formatBRL(m.saldo)}</span>
            </div>
            <div style={{ background: 'var(--color-primary-soft)', borderRadius: 6, height: 8, marginBottom: 4 }}>
              <div style={{ background: 'var(--color-success)', width: `${(m.receitas / maiorValor) * 100}%`, height: 8, borderRadius: 6 }} />
            </div>
            <div style={{ background: 'var(--color-primary-soft)', borderRadius: 6, height: 8 }}>
              <div style={{ background: 'var(--color-danger)', width: `${(m.despesas / maiorValor) * 100}%`, height: 8, borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>

      <div className="page-header" style={{ marginBottom: 8 }}>
        <div className="section-title" style={{ margin: 0 }}>Contas a Receber</div>
        <button className="btn btn-secondary btn-sm" onClick={() => setModalReceber(true)}>+ Nova conta a receber</button>
      </div>
      <Table columns={colunasReceber} rows={contasReceber} rowKey={(c) => c.id} />

      <div className="page-header" style={{ marginTop: 28, marginBottom: 8 }}>
        <div className="section-title" style={{ margin: 0 }}>Contas a Pagar</div>
        <button className="btn btn-secondary btn-sm" onClick={() => setModalPagar(true)}>+ Nova conta a pagar</button>
      </div>
      <Table columns={colunasPagar} rows={contasPagar} rowKey={(c) => c.id} />

      {modalReceber && (
        <Modal title="Nova conta a receber" onClose={() => setModalReceber(false)}>
          <form onSubmit={criarContaReceber}>
            <div className="form-grid">
              <div className="field">
                <label>Cliente *</label>
                <select value={formReceber.clienteId} onChange={(e) => setFormReceber({ ...formReceber, clienteId: e.target.value })} required>
                  <option value="">Selecione</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Valor (R$) *</label>
                <input type="number" min="0" step="0.01" value={formReceber.valor} onChange={(e) => setFormReceber({ ...formReceber, valor: e.target.value })} required />
              </div>
              <div className="field">
                <label>Vencimento *</label>
                <input type="date" value={formReceber.vencimento} onChange={(e) => setFormReceber({ ...formReceber, vencimento: e.target.value })} required />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalReceber(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {modalPagar && (
        <Modal title="Nova conta a pagar" onClose={() => setModalPagar(false)}>
          <form onSubmit={criarContaPagar}>
            <div className="form-grid">
              <div className="field">
                <label>Descrição *</label>
                <input value={formPagar.descricao} onChange={(e) => setFormPagar({ ...formPagar, descricao: e.target.value })} required />
              </div>
              <div className="field">
                <label>Fornecedor</label>
                <input value={formPagar.fornecedor} onChange={(e) => setFormPagar({ ...formPagar, fornecedor: e.target.value })} />
              </div>
              <div className="field">
                <label>Valor (R$) *</label>
                <input type="number" min="0" step="0.01" value={formPagar.valor} onChange={(e) => setFormPagar({ ...formPagar, valor: e.target.value })} required />
              </div>
              <div className="field">
                <label>Vencimento *</label>
                <input type="date" value={formPagar.vencimento} onChange={(e) => setFormPagar({ ...formPagar, vencimento: e.target.value })} required />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalPagar(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
