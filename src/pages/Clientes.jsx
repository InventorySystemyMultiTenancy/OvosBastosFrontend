import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';

const VAZIO = { nome: '', documento: '', telefone: '', email: '', endereco: '', cidade: '', limiteCredito: 0 };

export function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    setCarregando(true);
    api.get('/clientes').then(setClientes).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  function abrirNovo() {
    setEditando(null);
    setForm(VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(cliente) {
    setEditando(cliente);
    setForm({
      nome: cliente.nome,
      documento: cliente.documento || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      limiteCredito: cliente.limiteCredito,
    });
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editando) {
        await api.put(`/clientes/${editando.id}`, form);
      } else {
        await api.post('/clientes', form);
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function remover(cliente) {
    if (!confirm(`Remover o cliente "${cliente.nome}"?`)) return;
    await api.delete(`/clientes/${cliente.id}`);
    carregar();
  }

  const columns = [
    { key: 'nome', header: 'Cliente' },
    { key: 'cidade', header: 'Cidade', render: (c) => c.cidade || '—' },
    { key: 'telefone', header: 'Telefone', render: (c) => c.telefone || '—' },
    {
      key: 'limiteCredito',
      header: 'Limite de crédito',
      render: (c) => Number(c.limiteCredito).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    },
    {
      key: 'bandeja',
      header: 'Bandejas pendentes',
      render: (c) => (c.bandeja ? c.bandeja.emprestadas - c.bandeja.devolvidas : 0),
    },
    {
      key: 'acoes',
      header: '',
      render: (c) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => abrirEdicao(c)}>Editar</button>
          <button className="btn btn-danger btn-sm" onClick={() => remover(c)}>Remover</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>Cadastro, endereço, contatos e limite de crédito.</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo cliente</button>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {carregando ? <p className="text-muted">Carregando...</p> : (
        <Table columns={columns} rows={clientes} rowKey={(c) => c.id} />
      )}

      {modalAberto && (
        <Modal title={editando ? 'Editar cliente' : 'Novo cliente'} onClose={() => setModalAberto(false)}>
          <form onSubmit={salvar}>
            <div className="form-grid">
              <div className="field">
                <label>Nome *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="field">
                <label>Documento (CPF/CNPJ)</label>
                <input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
              </div>
              <div className="field">
                <label>Telefone</label>
                <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Endereço</label>
                <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
              </div>
              <div className="field">
                <label>Cidade</label>
                <input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </div>
              <div className="field">
                <label>Limite de crédito (R$)</label>
                <input type="number" step="0.01" min="0" value={form.limiteCredito} onChange={(e) => setForm({ ...form, limiteCredito: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
