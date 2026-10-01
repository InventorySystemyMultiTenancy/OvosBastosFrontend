import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';

export function SaldosTab() {
  const [bandejas, setBandejas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [modal, setModal] = useState(null); // { tipo, cliente }
  const [quantidade, setQuantidade] = useState('');
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    setCarregando(true);
    api.get('/bandejas').then(setBandejas).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  function abrir(tipo, cliente) {
    setModal({ tipo, cliente });
    setQuantidade('');
    setValor('');
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (modal.tipo === 'emprestimo') {
        await api.post(`/bandejas/${modal.cliente.id}/emprestimo`, { quantidade: Number(quantidade) });
      } else {
        await api.post(`/bandejas/${modal.cliente.id}/devolucao`, {
          quantidade: Number(quantidade),
          valor: valor ? Number(valor) : undefined,
        });
      }
      setModal(null);
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const columns = [
    { key: 'cliente', header: 'Cliente', render: (b) => b.cliente.nome },
    { key: 'emprestadas', header: 'Emprestadas' },
    { key: 'devolvidas', header: 'Devolvidas' },
    {
      key: 'saldo',
      header: 'Saldo',
      render: (b) => <span className={`badge ${b.saldo > 0 ? 'badge-amber' : 'badge-green'}`}>{b.saldo}</span>,
    },
    {
      key: 'acoes',
      header: '',
      render: (b) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => abrir('emprestimo', b.cliente)}>+ Empréstimo</button>
          <button className="btn btn-secondary btn-sm" onClick={() => abrir('revenda', b.cliente)}>+ Revenda</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <p>Acompanhe cada bandeja emprestada, revendida (devolvida) e pendente por cliente.</p>
        </div>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {carregando ? <p className="text-muted">Carregando...</p> : (
        <Table columns={columns} rows={bandejas} rowKey={(b) => b.id} />
      )}

      {modal && (
        <Modal
          title={`${modal.tipo === 'emprestimo' ? 'Registrar empréstimo' : 'Registrar revenda'} — ${modal.cliente.nome}`}
          onClose={() => setModal(null)}
        >
          <form onSubmit={salvar}>
            <div className="form-grid">
              <div className="field">
                <label>Quantidade de bandejas *</label>
                <input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required autoFocus />
              </div>
              {modal.tipo === 'revenda' && (
                <div className="field">
                  <label>Valor cobrado pelo cliente (R$)</label>
                  <input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
                </div>
              )}
            </div>
            {modal.tipo === 'revenda' && (
              <p className="text-muted" style={{ marginTop: 10, fontSize: 12 }}>
                Esse valor entra como despesa já paga e desconta do lucro líquido da Vrill Ovos.
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Confirmar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
