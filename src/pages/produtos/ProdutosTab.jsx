import { useEffect, useState } from 'react';
import { api, resolveUploadUrl } from '../../api/client';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';

const PRODUTO_VAZIO = { nome: '', tipo: '', unidade: 'dúzia', precoVenda: '', precoCusto: '', estoqueMinimo: 0, quantidade: 0 };
const MOVIMENTO_VAZIO = { produtoId: '', quantidade: '', validade: '', motivo: '' };

export function ProdutosTab() {
  const [produtos, setProdutos] = useState([]);
  const [alertas, setAlertas] = useState({ estoqueBaixo: [], validadeProxima: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [modalProduto, setModalProduto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formProduto, setFormProduto] = useState(PRODUTO_VAZIO);
  const [imagemArquivo, setImagemArquivo] = useState(null);
  const [imagemPreview, setImagemPreview] = useState(null);
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

  function abrirNovoProduto() {
    setEditandoId(null);
    setFormProduto(PRODUTO_VAZIO);
    setImagemArquivo(null);
    setImagemPreview(null);
    setModalProduto(true);
  }

  function abrirEditarProduto(produto) {
    setEditandoId(produto.id);
    setFormProduto({
      nome: produto.nome,
      tipo: produto.tipo || '',
      unidade: produto.unidade,
      precoVenda: produto.precoVenda,
      precoCusto: produto.precoCusto || '',
      estoqueMinimo: produto.estoqueMinimo,
      quantidade: produto.quantidade,
    });
    setImagemArquivo(null);
    setImagemPreview(resolveUploadUrl(produto.imagemUrl));
    setModalProduto(true);
  }

  function selecionarImagem(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setImagemArquivo(arquivo);
    setImagemPreview(URL.createObjectURL(arquivo));
  }

  async function salvarProduto(e) {
    e.preventDefault();
    setSalvandoProduto(true);
    try {
      const payload = {
        ...formProduto,
        precoVenda: Number(formProduto.precoVenda),
        precoCusto: formProduto.precoCusto ? Number(formProduto.precoCusto) : undefined,
        estoqueMinimo: Number(formProduto.estoqueMinimo),
        quantidade: Number(formProduto.quantidade),
      };

      const produtoSalvo = editandoId
        ? await api.put(`/produtos/${editandoId}`, payload)
        : await api.post('/produtos', payload);

      if (imagemArquivo) {
        const dados = new FormData();
        dados.append('imagem', imagemArquivo);
        await api.upload(`/produtos/${produtoSalvo.id}/imagem`, dados);
      }

      setModalProduto(false);
      setFormProduto(PRODUTO_VAZIO);
      setImagemArquivo(null);
      setImagemPreview(null);
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvandoProduto(false);
    }
  }

  async function excluirProduto(produto) {
    if (!confirm(`Excluir "${produto.nome}" do estoque?`)) return;
    try {
      await api.delete(`/produtos/${produto.id}`);
      carregar();
    } catch (err) {
      alert(err.message);
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
    {
      key: 'imagem',
      header: '',
      render: (p) =>
        p.imagemUrl ? (
          <img src={resolveUploadUrl(p.imagemUrl)} alt={p.nome} className="produto-thumb" />
        ) : (
          <div className="produto-thumb produto-thumb-vazio">🥚</div>
        ),
    },
    { key: 'nome', header: 'Produto' },
    { key: 'unidade', header: 'Unidade' },
    { key: 'precoVenda', header: 'Preço venda', render: (p) => Number(p.precoVenda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    {
      key: 'quantidade',
      header: 'Não distribuído',
      render: (p) => (
        <span>
          {p.quantidade}{' '}
          {p.estoqueTotal <= p.estoqueMinimo && <span className="badge badge-red">baixo</span>}
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
          <button className="btn btn-secondary btn-sm" onClick={() => abrirEditarProduto(p)}>Editar</button>
          <button className="btn btn-danger btn-sm" onClick={() => excluirProduto(p)}>Excluir</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <p>Entrada e saída automatizadas, controle por lote e validade. "Não distribuído" é o estoque recebido que ainda não foi alocado a nenhuma unidade — veja "Estoque por Unidade" para o que já está nas unidades.</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovoProduto}>+ Novo produto</button>
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
        <Modal title={editandoId ? 'Editar produto' : 'Novo produto'} onClose={() => setModalProduto(false)}>
          <form onSubmit={salvarProduto}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Imagem</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {imagemPreview ? (
                  <img src={imagemPreview} alt="Prévia" className="produto-thumb produto-thumb-lg" />
                ) : (
                  <div className="produto-thumb produto-thumb-lg produto-thumb-vazio">🥚</div>
                )}
                <input type="file" accept="image/*" onChange={selecionarImagem} />
              </div>
            </div>

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
              {!editandoId && (
                <div className="field">
                  <label>Estoque inicial</label>
                  <input type="number" min="0" value={formProduto.quantidade} onChange={(e) => setFormProduto({ ...formProduto, quantidade: e.target.value })} />
                </div>
              )}
              <div className="field">
                <label>Estoque mínimo (alerta)</label>
                <input type="number" min="0" value={formProduto.estoqueMinimo} onChange={(e) => setFormProduto({ ...formProduto, estoqueMinimo: e.target.value })} />
              </div>
            </div>
            {editandoId && (
              <p className="text-muted" style={{ marginTop: 10, fontSize: 12 }}>
                Estoque atual não muda por aqui — use "+ Entrada" / "− Saída" na tabela, ou registre um Recebimento.
              </p>
            )}
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
