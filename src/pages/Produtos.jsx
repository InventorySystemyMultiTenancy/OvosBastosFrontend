import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';

const PRODUTO_VAZIO = { nome: '', tipo: '', unidade: 'dúzia', precoVenda: '', precoCusto: '', estoqueMinimo: 0, quantidade: 0 };
const MOVIMENTO_VAZIO = { produtoId: '', quantidade: '', validade: '', motivo: '' };

export function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [alertas, setAlertas] = useState({ estoqueBaixo: [], validadeProxima: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [modalProduto, setModalProduto] = useState(false);
  const [formProduto, setFormProduto] = useState(PRODUTO_VAZIO);
  const [salvandoProduto, setSalvandoProduto] = useState(false);

  const [modalMovimento, setModalMovimento] = useState(null); // 'entrada' | 'saida' | null
  const [formMovimento, setFormMovimento] = useState(MOVIMENTO_VAZIO);
  const [salvandoMovimento, setSalvandoMovimento] = useState(false);

  function carregar() {
    setCarregando(true);
    Promise.all([api.get('/produtos'), api.get('/estoque/alertas')])
      .then(([p, a]) => {
        setProdutos(p);
        setAlertas(a);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function salvarProduto(e) {
    e.preventDefault();
    setSalvandoProduto(true);
    try {
      await api.post('/produtos', {
        ...formProduto,
        precoVenda: Number(formProduto.precoVenda),
        precoCusto: formProduto.precoCusto ? Number(formProduto.precoCusto) : undefined,
        estoqueMinimo: Number(formProduto.estoqueMinimo),
        quantidade: Number(formProduto.quantidade),
      });
      setModalProduto(false);
      setFormProduto(PRODUTO_VAZIO);
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvandoProduto(false);
    }
  }

  function abrirMovimento(tipo, produto) {
    setModalMovimento(tipo);
    setFormMovimento({ ...MOVIMENTO_VAZIO, produtoId: produto.id });
  }

  async function salvarMovimento(e) {
    e.preventDefault();
    setSalvandoMovimento(true);
    try {
      const payload = { produtoId: Number(formMovimento.produtoId), quantidade: Number(formMovimento.quantidade), motivo: formMovimento.motivo };
      if (modalMovimento === 'entrada') {
        await api.post('/estoque/entrada', { ...payload, validade: formMovimento.validade || undefined });
      } else {
        await api.post('/estoque/saida', payload);
      }
      setModalMovimento(null);
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvandoMovimento(false);
    }
  }

  const columns = [
    { key: 'nome', header: 'Produto' },
    { key: 'unidade', header: 'Unidade' },
    { key: 'precoVenda', header: 'Preço venda', render: (p) => Number(p.precoVenda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    {
      key: 'quantidade',
      header: 'Estoque',
      render: (p) => (
        <span>
          {p.quantidade}{' '}
          {p.quantidade <= p.estoqueMinimo && <span className="badge badge-red">baixo</span>}
        </span>
      ),
    },
    { key: 'estoqueMinimo', header: 'Estoque mínimo' },
    {
      key: 'acoes',
      header: '',
      render: (p) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => abrirMovimento('entrada', p)}>+ Entrada</button>
          <button className="btn btn-secondary btn-sm" onClick={() => abrirMovimento('saida', p)}>− Saída</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Estoque de Ovos</h1>
          <p>Entrada e saída automatizadas, controle por lote e validade.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalProduto(true)}>+ Novo produto</button>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {alertas.estoqueBaixo.length > 0 && (
        <div className="alert-box">
          Estoque baixo: {alertas.estoqueBaixo.map((p) => p.nome).join(', ')}
        </div>
      )}
      {alertas.validadeProxima.length > 0 && (
        <div className="alert-box">
          Lotes próximos da validade: {alertas.validadeProxima.map((l) => `${l.produto.nome} (${new Date(l.validade).toLocaleDateString('pt-BR')})`).join(', ')}
        </div>
      )}

      {carregando ? <p className="text-muted">Carregando...</p> : (
        <Table columns={columns} rows={produtos} rowKey={(p) => p.id} />
      )}

      {modalProduto && (
        <Modal title="Novo produto" onClose={() => setModalProduto(false)}>
          <form onSubmit={salvarProduto}>
            <div className="form-grid">
              <div className="field">
                <label>Nome *</label>
                <input value={formProduto.nome} onChange={(e) => setFormProduto({ ...formProduto, nome: e.target.value })} required />
              </div>
              <div className="field">
                <label>Tipo</label>
                <input value={formProduto.tipo} onChange={(e) => setFormProduto({ ...formProduto, tipo: e.target.value })} placeholder="branco, vermelho, caipira..." />
              </div>
              <div className="field">
                <label>Unidade</label>
                <input value={formProduto.unidade} onChange={(e) => setFormProduto({ ...formProduto, unidade: e.target.value })} />
              </div>
              <div className="field">
                <label>Preço de venda (R$) *</label>
                <input type="number" step="0.01" min="0" value={formProduto.precoVenda} onChange={(e) => setFormProduto({ ...formProduto, precoVenda: e.target.value })} required />
              </div>
              <div className="field">
                <label>Preço de custo (R$)</label>
                <input type="number" step="0.01" min="0" value={formProduto.precoCusto} onChange={(e) => setFormProduto({ ...formProduto, precoCusto: e.target.value })} />
              </div>
              <div className="field">
                <label>Estoque inicial</label>
                <input type="number" min="0" value={formProduto.quantidade} onChange={(e) => setFormProduto({ ...formProduto, quantidade: e.target.value })} />
              </div>
              <div className="field">
                <label>Estoque mínimo (alerta)</label>
                <input type="number" min="0" value={formProduto.estoqueMinimo} onChange={(e) => setFormProduto({ ...formProduto, estoqueMinimo: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalProduto(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvandoProduto}>{salvandoProduto ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modalMovimento && (
        <Modal title={modalMovimento === 'entrada' ? 'Entrada de estoque' : 'Saída de estoque'} onClose={() => setModalMovimento(null)}>
          <form onSubmit={salvarMovimento}>
            <div className="form-grid">
              <div className="field">
                <label>Quantidade *</label>
                <input type="number" min="1" value={formMovimento.quantidade} onChange={(e) => setFormMovimento({ ...formMovimento, quantidade: e.target.value })} required />
              </div>
              {modalMovimento === 'entrada' && (
                <div className="field">
                  <label>Validade do lote</label>
                  <input type="date" value={formMovimento.validade} onChange={(e) => setFormMovimento({ ...formMovimento, validade: e.target.value })} />
                </div>
              )}
              <div className="field">
                <label>Motivo / observação</label>
                <input value={formMovimento.motivo} onChange={(e) => setFormMovimento({ ...formMovimento, motivo: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalMovimento(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvandoMovimento}>{salvandoMovimento ? 'Salvando...' : 'Confirmar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
