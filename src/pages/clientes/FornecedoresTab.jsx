import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';

const VAZIO = { nome: '', documento: '', telefone: '', email: '', endereco: '', cidade: '' };

export function FornecedoresTab() {
  const [fornecedores, setFornecedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    setCarregando(true);
    api.get('/fornecedores').then(setFornecedores).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  function abrirNovo() {
    setEditando(null);
    setForm(VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(fornecedor) {
    setEditando(fornecedor);
    setForm({
      nome: fornecedor.nome,
      documento: fornecedor.documento || '',
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
      endereco: fornecedor.endereco || '',
      cidade: fornecedor.cidade || '',
    });
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editando) {
        await api.put(`/fornecedores/${editando.id}`, form);
      } else {
        await api.post('/fornecedores', form);
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function remover(fornecedor) {
    if (!confirm(`Remover o fornecedor "${fornecedor.nome}"?`)) return;
    await api.delete(`/fornecedores/${fornecedor.id}`);
    carregar();
  }

  const columns = [
    { key: 'nome', header: 'Fornecedor' },
    { key: 'cidade', header: 'Cidade', render: (f) => f.cidade || '—' },
    { key: 'telefone', header: 'Telefone', render: (f) => f.telefone || '—' },
    { key: 'email', header: 'Email', render: (f) => f.email || '—' },
    {
      key: 'acoes',
      header: '',
      render: (f) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => abrirEdicao(f)}>Editar</button>
          <button className="btn btn-danger btn-sm" onClick={() => remover(f)}>Remover</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <p>Cadastro de granjas e fornecedores usados nos recebimentos.</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo fornecedor</button>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {carregando ? <p className="text-muted">Carregando...</p> : (
        <Table columns={columns} rows={fornecedores} rowKey={(f) => f.id} />
      )}

      {modalAberto && (
        <Modal title={editando ? 'Editar fornecedor' : 'Novo fornecedor'} onClose={() => setModalAberto(false)}>
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
