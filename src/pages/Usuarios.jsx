import { useEffect, useMemo, useState } from 'react';
import { api, resolveUploadUrl } from '../api/client';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';

const PERFIS = ['ADMIN', 'VENDEDOR', 'ENTREGADOR'];
const PERFIL_LABEL = { ADMIN: 'Administrador', VENDEDOR: 'Vendedor', ENTREGADOR: 'Entregador' };

const VAZIO = { nome: '', email: '', senha: '', perfil: 'VENDEDOR', ativo: true, unidade: '' };

export function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [caixas, setCaixas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  function carregar() {
    setCarregando(true);
    api.get('/auth/usuarios').then(setUsuarios).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);
  useEffect(() => { api.get('/caixas').then(setCaixas).catch(() => {}); }, []);

  // Unidades = nomes distintos entre os caixas cadastrados — não existe uma tabela própria
  // pra unidade, ela é só o texto livre que já fica em Caixa.unidade.
  const unidades = useMemo(() => [...new Set(caixas.map((c) => c.unidade))].sort(), [caixas]);

  function abrirNovo() {
    setEditando(null);
    setForm(VAZIO);
    setErroForm('');
    setModalAberto(true);
  }

  function abrirEdicao(usuario) {
    setEditando(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      perfil: usuario.perfil,
      ativo: usuario.ativo,
      unidade: usuario.unidade || '',
    });
    setErroForm('');
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErroForm('');
    try {
      const unidade = form.perfil !== 'ADMIN' && form.unidade ? form.unidade : null;
      if (editando) {
        await api.put(`/auth/usuarios/${editando.id}`, {
          nome: form.nome,
          perfil: form.perfil,
          ativo: form.ativo,
          unidade,
          senha: form.senha || undefined,
        });
      } else {
        await api.post('/auth/usuarios', {
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          perfil: form.perfil,
          unidade,
        });
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      setErroForm(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const columns = [
    {
      key: 'foto',
      header: '',
      render: (u) =>
        u.fotoUrl ? (
          <img src={resolveUploadUrl(u.fotoUrl)} alt="" className="usuario-thumb" />
        ) : (
          <span className="usuario-thumb usuario-thumb-vazio">{(u.nome || '?').charAt(0).toUpperCase()}</span>
        ),
    },
    { key: 'nome', header: 'Nome' },
    { key: 'email', header: 'Email' },
    { key: 'perfil', header: 'Perfil', render: (u) => PERFIL_LABEL[u.perfil] || u.perfil },
    { key: 'unidade', header: 'Unidade designada', render: (u) => u.unidade || '—' },
    {
      key: 'ativo',
      header: 'Status',
      render: (u) => <span className={`badge ${u.ativo ? 'badge-green' : 'badge-gray'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span>,
    },
    {
      key: 'acoes',
      header: '',
      render: (u) => (
        <button className="btn btn-secondary btn-sm" onClick={() => abrirEdicao(u)}>Editar</button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Usuários</h1>
          <p>Logins de funcionário — designe uma unidade pra travar o acesso só à aba Caixa e aos caixas daquela loja.</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo usuário</button>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {carregando ? <p className="text-muted">Carregando...</p> : (
        <Table columns={columns} rows={usuarios} rowKey={(u) => u.id} />
      )}

      {modalAberto && (
        <Modal title={editando ? 'Editar usuário' : 'Novo usuário'} onClose={() => setModalAberto(false)}>
          <form onSubmit={salvar}>
            <div className="form-grid">
              <div className="field">
                <label>Nome *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="field">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={Boolean(editando)}
                />
              </div>
              <div className="field">
                <label>{editando ? 'Nova senha (opcional)' : 'Senha *'}</label>
                <input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  autoComplete="new-password"
                  required={!editando}
                />
              </div>
              <div className="field">
                <label>Perfil *</label>
                <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value, unidade: e.target.value === 'ADMIN' ? '' : form.unidade })}>
                  {PERFIS.map((p) => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
                </select>
              </div>
              {form.perfil !== 'ADMIN' && (
                <div className="field">
                  <label>Unidade designada</label>
                  <select value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })}>
                    <option value="">Sem restrição — vê tudo que o perfil permite</option>
                    {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {form.unidade && (
                    <p className="text-muted" style={{ marginTop: 6, fontSize: 12 }}>
                      Com uma unidade designada, esse login só vê a aba Caixa e só vende pelos caixas dessa unidade.
                    </p>
                  )}
                </div>
              )}
              {editando && (
                <div className="field">
                  <label>Status</label>
                  <select value={form.ativo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, ativo: e.target.value === 'true' })}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              )}
            </div>
            {erroForm && <div className="alert-box">{erroForm}</div>}
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
