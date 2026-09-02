import { useEffect, useMemo, useState } from 'react';
import { api, resolveUploadUrl } from '../../api/client';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';

const PRODUTO_VAZIO = { nome: '', tipo: '', unidade: 'dúzia', precoVenda: '', precoCusto: '', estoqueMinimo: 0, quantidade: 0 };
const MOVIMENTO_VAZIO = { produtoId: '', caixaId: '', quantidade: '', validade: '', motivo: '' };
const NOVA_CATEGORIA = '__nova__';
const EMBALAGEM_VAZIA = { nome: '', quantidadeBandejas: '', preco: '' };

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProdutosTab() {
  const [produtos, setProdutos] = useState([]);
  const [alertas, setAlertas] = useState({ estoqueBaixo: [], validadeProxima: [] });
  const [caixas, setCaixas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [modalProduto, setModalProduto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formProduto, setFormProduto] = useState(PRODUTO_VAZIO);
  const [modoNovaCategoria, setModoNovaCategoria] = useState(false);
  const [imagemArquivo, setImagemArquivo] = useState(null);
  const [imagemPreview, setImagemPreview] = useState(null);
  const [salvandoProduto, setSalvandoProduto] = useState(false);

  const [embalagens, setEmbalagens] = useState([]);
  const [formEmbalagem, setFormEmbalagem] = useState(EMBALAGEM_VAZIA);
  const [salvandoEmbalagem, setSalvandoEmbalagem] = useState(false);

  const [unidadesPorPacote, setUnidadesPorPacote] = useState(1);
  const [novoFatorUnidade, setNovoFatorUnidade] = useState('');
  const [ativandoUnidade, setAtivandoUnidade] = useState(false);

  const categoriasExistentes = useMemo(
    () => Array.from(new Set(produtos.map((p) => p.tipo).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [produtos]
  );

  const [modalMovimento, setModalMovimento] = useState(null); // 'entrada' | 'saida' | null
  const [formMovimento, setFormMovimento] = useState(MOVIMENTO_VAZIO);
  const [salvandoMovimento, setSalvandoMovimento] = useState(false);

  function carregar() {
    setCarregando(true);
    Promise.all([api.get('/produtos'), api.get('/estoque/alertas'), api.get('/caixas?ativo=true')])
      .then(([p, a, c]) => {
        setProdutos(p);
        setAlertas(a);
        setCaixas(c);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  function carregarEmbalagens(produtoId) {
    api.get(`/produtos/${produtoId}/embalagens`).then(setEmbalagens).catch(() => setEmbalagens([]));
  }

  function abrirNovoProduto() {
    setEditandoId(null);
    setFormProduto(PRODUTO_VAZIO);
    setModoNovaCategoria(false);
    setImagemArquivo(null);
    setImagemPreview(null);
    setEmbalagens([]);
    setFormEmbalagem(EMBALAGEM_VAZIA);
    setUnidadesPorPacote(1);
    setNovoFatorUnidade('');
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
    // Se o produto já tem um tipo fora da lista atual (não deveria acontecer, mas por
    // segurança), abre direto no campo de texto em vez de um <select> sem essa opção.
    setModoNovaCategoria(Boolean(produto.tipo) && !categoriasExistentes.includes(produto.tipo));
    setImagemArquivo(null);
    setImagemPreview(resolveUploadUrl(produto.imagemUrl));
    setFormEmbalagem(EMBALAGEM_VAZIA);
    setUnidadesPorPacote(produto.unidadesPorPacote || 1);
    setNovoFatorUnidade('');
    carregarEmbalagens(produto.id);
    setModalProduto(true);
  }

  async function ativarVendaPorUnidade(e) {
    e.preventDefault();
    const fator = Number(novoFatorUnidade);
    if (!fator || fator < 1) return;
    setAtivandoUnidade(true);
    try {
      const atualizado = await api.post(`/produtos/${editandoId}/ativar-venda-unitaria`, { unidadesPorPacote: fator });
      setUnidadesPorPacote(atualizado.unidadesPorPacote);
      setNovoFatorUnidade('');
      carregarEmbalagens(editandoId);
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setAtivandoUnidade(false);
    }
  }

  async function enviarImagemEmbalagem(embalagem, arquivo) {
    const dados = new FormData();
    dados.append('imagem', arquivo);
    try {
      await api.upload(`/produtos/${editandoId}/embalagens/${embalagem.id}/imagem`, dados);
      carregarEmbalagens(editandoId);
    } catch (err) {
      alert(err.message);
    }
  }

  async function adicionarEmbalagem(e) {
    e.preventDefault();
    setSalvandoEmbalagem(true);
    try {
      await api.post(`/produtos/${editandoId}/embalagens`, {
        nome: formEmbalagem.nome.trim(),
        quantidadeBandejas: Number(formEmbalagem.quantidadeBandejas),
        preco: Number(formEmbalagem.preco),
      });
      setFormEmbalagem(EMBALAGEM_VAZIA);
      carregarEmbalagens(editandoId);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvandoEmbalagem(false);
    }
  }

  async function removerEmbalagem(embalagem) {
    if (!confirm(`Remover a caixa "${embalagem.nome}"?`)) return;
    try {
      await api.delete(`/produtos/${editandoId}/embalagens/${embalagem.id}`);
      carregarEmbalagens(editandoId);
    } catch (err) {
      alert(err.message);
    }
  }

  function selecionarCategoria(valor) {
    if (valor === NOVA_CATEGORIA) {
      setModoNovaCategoria(true);
      setFormProduto({ ...formProduto, tipo: '' });
    } else {
      setFormProduto({ ...formProduto, tipo: valor });
    }
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

      if (editandoId) {
        setModalProduto(false);
        setFormProduto(PRODUTO_VAZIO);
        setImagemArquivo(null);
        setImagemPreview(null);
      } else {
        // Produto recém-criado: mantém o modal aberto, agora em modo edição, pra dar pra
        // cadastrar as caixas dele na hora sem precisar reabrir.
        setEditandoId(produtoSalvo.id);
        setImagemArquivo(null);
        setImagemPreview(resolveUploadUrl(produtoSalvo.imagemUrl));
        setUnidadesPorPacote(produtoSalvo.unidadesPorPacote || 1);
        carregarEmbalagens(produtoSalvo.id);
      }
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
        await api.post('/estoque/saida', { ...payload, caixaId: Number(formMovimento.caixaId) });
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
                <label>Categoria</label>
                {modoNovaCategoria ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={formProduto.tipo}
                      onChange={(e) => setFormProduto({ ...formProduto, tipo: e.target.value })}
                      placeholder="Nome da nova categoria"
                      autoFocus
                    />
                    {categoriasExistentes.length > 0 && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => selecionarCategoria('')}>
                        Cancelar
                      </button>
                    )}
                  </div>
                ) : (
                  <select value={formProduto.tipo} onChange={(e) => selecionarCategoria(e.target.value)}>
                    <option value="">Sem categoria</option>
                    {categoriasExistentes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value={NOVA_CATEGORIA}>+ Nova categoria...</option>
                  </select>
                )}
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

          {editandoId && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 18 }}>
              <div className="section-title" style={{ marginTop: 0 }}>Caixas deste produto</div>
              <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
                Uma caixa é um jeito de vender várias bandejas de uma vez, com preço fechado — não tem estoque
                próprio, na venda ela desconta as bandejas direto do estoque deste produto.
              </p>

              {embalagens.length > 0 && (
                <ul className="produto-embalagens-lista">
                  {embalagens.map((emb) => (
                    <li key={emb.id}>
                      <span className="produto-embalagem-thumb">
                        {emb.imagemUrl || imagemPreview ? (
                          <img src={emb.imagemUrl ? resolveUploadUrl(emb.imagemUrl) : imagemPreview} alt={emb.nome} />
                        ) : (
                          <span aria-hidden="true">📦</span>
                        )}
                      </span>
                      <span>
                        <strong>{emb.nome}</strong>
                        <span className="text-muted"> · {emb.quantidadeBandejas} {formProduto.unidade}</span>
                      </span>
                      <span>{formatBRL(emb.preco)}</span>
                      <label className="btn btn-secondary btn-sm produto-embalagem-foto-btn">
                        Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const arquivo = e.target.files?.[0];
                            if (arquivo) enviarImagemEmbalagem(emb, arquivo);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removerEmbalagem(emb)}>Remover</button>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={adicionarEmbalagem} className="form-grid produto-embalagem-form">
                <div className="field">
                  <label>Nome</label>
                  <input
                    value={formEmbalagem.nome}
                    onChange={(e) => setFormEmbalagem({ ...formEmbalagem, nome: e.target.value })}
                    placeholder="Ex: Caixa com 30 bandejas"
                    required
                  />
                </div>
                <div className="field">
                  <label>Bandejas por caixa</label>
                  <input
                    type="number"
                    min="1"
                    value={formEmbalagem.quantidadeBandejas}
                    onChange={(e) => setFormEmbalagem({ ...formEmbalagem, quantidadeBandejas: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Preço da caixa (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formEmbalagem.preco}
                    onChange={(e) => setFormEmbalagem({ ...formEmbalagem, preco: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-secondary" disabled={salvandoEmbalagem}>
                  {salvandoEmbalagem ? 'Adicionando...' : '+ Adicionar caixa'}
                </button>
              </form>
            </div>
          )}

          {editandoId && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 18 }}>
              <div className="section-title" style={{ marginTop: 0 }}>Venda por unidade avulsa</div>
              {unidadesPorPacote > 1 ? (
                <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
                  Ativada: 1 {formProduto.unidade || 'unidade'} tem <strong>{unidadesPorPacote}</strong> unidades
                  individuais. O estoque deste produto passou a ser contado nessa unidade menor.
                </p>
              ) : (
                <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
                  Permite vender abaixo de "1 {formProduto.unidade || 'unidade'}" — ex: 2 ovos soltos de uma dúzia.
                  Ative informando quantas unidades individuais cabem em 1 {formProduto.unidade || 'unidade'}.
                </p>
              )}
              <form onSubmit={ativarVendaPorUnidade} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Unidades individuais por {formProduto.unidade || 'unidade'}</label>
                  <input
                    type="number"
                    min="1"
                    value={novoFatorUnidade}
                    onChange={(e) => setNovoFatorUnidade(e.target.value)}
                    placeholder={String(unidadesPorPacote)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary" disabled={ativandoUnidade || !novoFatorUnidade}>
                  {ativandoUnidade ? 'Salvando...' : unidadesPorPacote > 1 ? 'Atualizar' : 'Ativar'}
                </button>
              </form>
            </div>
          )}
        </Modal>
      )}

      {modalMovimento && (
        <Modal title={modalMovimento === 'entrada' ? 'Entrada de estoque' : 'Saída para uma unidade'} onClose={() => setModalMovimento(null)}>
          <form onSubmit={salvarMovimento}>
            {modalMovimento === 'saida' && (
              <p className="text-muted" style={{ marginTop: 0, marginBottom: 14 }}>
                Tira do não distribuído e envia pra uma unidade. Pode repetir quantas vezes quiser pra redistribuir.
              </p>
            )}
            <div className="form-grid">
              {modalMovimento === 'saida' && (
                <div className="field">
                  <label>Unidade de destino *</label>
                  <select value={formMovimento.caixaId} onChange={(e) => setFormMovimento({ ...formMovimento, caixaId: e.target.value })} required>
                    <option value="" disabled>Selecione...</option>
                    {caixas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome} — {c.unidade}</option>
                    ))}
                  </select>
                </div>
              )}
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
