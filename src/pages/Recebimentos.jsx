import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';

const STATUS_LABEL = {
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_DISTRIBUICAO: 'Aguardando distribuição',
  CONCLUIDO: 'Concluído',
};
const STATUS_BADGE = {
  EM_ANDAMENTO: 'badge-amber',
  AGUARDANDO_DISTRIBUICAO: 'badge-amber',
  CONCLUIDO: 'badge-green',
};

function formatData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusPagamento(valorTotal, valorPago) {
  if (Number(valorPago) <= 0) return 'Aberto';
  if (Number(valorPago) >= Number(valorTotal)) return 'Pago';
  return 'Parcial';
}

export function Recebimentos() {
  const [recebimentos, setRecebimentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [caixas, setCaixas] = useState([]);

  const [modalNovo, setModalNovo] = useState(false);
  const [quantidadesRecebidas, setQuantidadesRecebidas] = useState({});
  const [precosCusto, setPrecosCusto] = useState({});
  const [observacao, setObservacao] = useState('');
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [erroNovo, setErroNovo] = useState('');

  const [selecionado, setSelecionado] = useState(null);
  const [fornecedorEscolhido, setFornecedorEscolhido] = useState('');
  const [precosFornecedorEscolhido, setPrecosFornecedorEscolhido] = useState(null);
  const [definindoFornecedor, setDefinindoFornecedor] = useState(false);
  const [quantidadesDistribuir, setQuantidadesDistribuir] = useState({}); // `${produtoId}-${caixaId}` -> qtd
  const [distribuindo, setDistribuindo] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState('');

  const hoje = new Date().getDay();
  const diaDeRecebimento = hoje === 4 || hoje === 0; // quinta ou domingo

  function carregar() {
    setCarregando(true);
    api.get('/recebimentos').then(setRecebimentos).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);
  useEffect(() => {
    api.get('/produtos').then(setProdutos).catch(() => {});
    api.get('/fornecedores').then(setFornecedores).catch(() => {});
    api.get('/caixas?ativo=true').then(setCaixas).catch(() => {});
  }, []);

  function abrirNovo() {
    setQuantidadesRecebidas({});
    // Pré-preenchido com o preço de custo atual de cada produto — editável aqui mesmo; o
    // valor confirmado vira o novo Produto.precoCusto definitivo (ver salvarNovo).
    setPrecosCusto(Object.fromEntries(produtos.map((p) => [p.id, p.precoCusto || ''])));
    setObservacao('');
    setErroNovo('');
    setModalNovo(true);
  }

  async function abrirDetalhe(recebimento) {
    setErroDetalhe('');
    setFornecedorEscolhido('');
    setPrecosFornecedorEscolhido(null);
    setQuantidadesDistribuir({});
    try {
      const detalhe = await api.get(`/recebimentos/${recebimento.id}`);
      setSelecionado(detalhe);
    } catch (err) {
      setErro(err.message);
    }
  }

  useEffect(() => {
    if (!fornecedorEscolhido) {
      setPrecosFornecedorEscolhido(null);
      return;
    }
    api.get(`/fornecedores/${fornecedorEscolhido}/precos`).then(setPrecosFornecedorEscolhido).catch(() => {});
  }, [fornecedorEscolhido]);

  const previaFornecedor = (() => {
    if (!selecionado || !precosFornecedorEscolhido) return null;
    const mapaPrecos = new Map(precosFornecedorEscolhido.map((p) => [p.produtoId, p.precoUnitario]));
    let valorEstimado = 0;
    const semPreco = [];
    selecionado.itens.forEach((i) => {
      const preco = mapaPrecos.get(i.produtoId);
      if (preco === null || preco === undefined) {
        semPreco.push(i.produto.nome);
      } else {
        valorEstimado += i.quantidadeRecebida * Number(preco);
      }
    });
    return { valorEstimado, semPreco };
  })();

  async function recarregarDetalhe(id) {
    const detalhe = await api.get(`/recebimentos/${id}`);
    setSelecionado(detalhe);
    setQuantidadesDistribuir({});
    carregar();
  }

  async function salvarNovo(e) {
    e.preventDefault();
    setSalvandoNovo(true);
    setErroNovo('');
    try {
      const itens = Object.entries(quantidadesRecebidas)
        .map(([produtoId, quantidade]) => ({
          produtoId: Number(produtoId),
          quantidade: Number(quantidade),
          precoCusto: precosCusto[produtoId] !== '' && precosCusto[produtoId] !== undefined ? Number(precosCusto[produtoId]) : undefined,
        }))
        .filter((i) => i.quantidade > 0);
      const criado = await api.post('/recebimentos', { itens, observacao: observacao.trim() || undefined });
      setModalNovo(false);
      carregar();
      setSelecionado(criado);
    } catch (err) {
      setErroNovo(err.message);
    } finally {
      setSalvandoNovo(false);
    }
  }

  async function salvarFornecedor(e) {
    e.preventDefault();
    if (!fornecedorEscolhido) return;
    setDefinindoFornecedor(true);
    setErroDetalhe('');
    try {
      await api.put(`/recebimentos/${selecionado.id}/fornecedor`, { fornecedorId: Number(fornecedorEscolhido) });
      await recarregarDetalhe(selecionado.id);
    } catch (err) {
      setErroDetalhe(err.message);
    } finally {
      setDefinindoFornecedor(false);
    }
  }

  async function confirmarDistribuicao(e) {
    e.preventDefault();
    const distribuicoes = Object.entries(quantidadesDistribuir)
      .map(([chave, quantidade]) => {
        const [produtoId, caixaId] = chave.split('-').map(Number);
        return { produtoId, caixaId, quantidade: Number(quantidade) };
      })
      .filter((d) => d.quantidade > 0);

    if (distribuicoes.length === 0) return;

    setDistribuindo(true);
    setErroDetalhe('');
    try {
      await api.post(`/recebimentos/${selecionado.id}/distribuir`, { distribuicoes });
      await recarregarDetalhe(selecionado.id);
    } catch (err) {
      setErroDetalhe(err.message);
    } finally {
      setDistribuindo(false);
    }
  }

  const columns = [
    { key: 'id', header: '#' },
    { key: 'createdAt', header: 'Data', render: (r) => formatData(r.createdAt) },
    { key: 'fornecedor', header: 'Fornecedor', render: (r) => r.fornecedor?.nome || '—' },
    { key: 'itens', header: 'Itens', render: (r) => r.itens.length },
    { key: 'status', header: 'Status', render: (r) => <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span> },
    {
      key: 'acoes',
      header: '',
      render: (r) => (
        <button className="btn btn-secondary btn-sm" onClick={() => abrirDetalhe(r)}>Ver detalhe</button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Recebimentos</h1>
          <p>Lance o que chegou da granja nas entregas de quinta e domingo, e distribua entre as unidades.</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo recebimento</button>
      </div>

      {diaDeRecebimento && (
        <div className="alert-box">Hoje costuma ser dia de recebimento — não esqueça de lançar a entrega.</div>
      )}

      {erro && <div className="alert-box">{erro}</div>}

      {carregando ? <p className="text-muted">Carregando...</p> : (
        <Table columns={columns} rows={recebimentos} rowKey={(r) => r.id} />
      )}

      {modalNovo && (
        <Modal title="Novo recebimento" onClose={() => setModalNovo(false)} className="is-largo">
          <form onSubmit={salvarNovo}>
            <p className="text-muted" style={{ marginBottom: 10 }}>
              Informe quanto chegou de cada produto. Deixe em branco o que não veio nessa entrega. O preço de custo já
              vem preenchido com o valor atual — mude se o fornecedor cobrou diferente dessa vez, e o novo valor fica
              valendo pra sempre.
            </p>
            <div className="table-wrap" style={{ marginBottom: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade recebida</th>
                    <th>Preço de custo (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nome}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          style={{ width: 100 }}
                          value={quantidadesRecebidas[p.id] || ''}
                          onChange={(e) => setQuantidadesRecebidas({ ...quantidadesRecebidas, [p.id]: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          style={{ width: 100 }}
                          value={precosCusto[p.id] ?? ''}
                          onChange={(e) => setPrecosCusto({ ...precosCusto, [p.id]: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="field">
              <label>Observação</label>
              <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </div>
            {erroNovo && <div className="alert-box">{erroNovo}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalNovo(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvandoNovo}>{salvandoNovo ? 'Salvando...' : 'Criar recebimento'}</button>
            </div>
          </form>
        </Modal>
      )}

      {selecionado && (
        <Modal title={`Recebimento #${selecionado.id}`} onClose={() => setSelecionado(null)}>
          <p>
            Status: <span className={`badge ${STATUS_BADGE[selecionado.status]}`}>{STATUS_LABEL[selecionado.status]}</span>
          </p>

          {selecionado.valorTotal !== null && selecionado.valorTotal !== undefined && (
            <p className="text-muted">
              Valor da entrega: <strong>{formatBRL(selecionado.valorTotal)}</strong> · pago: {formatBRL(selecionado.valorPago)} (
              {statusPagamento(selecionado.valorTotal, selecionado.valorPago)}) — gerencie o pagamento na aba Financeiro → Fornecedores.
            </p>
          )}

          <div className="section-title">Itens recebidos</div>
          <div className="table-wrap" style={{ marginBottom: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Recebido</th>
                  <th>Distribuído</th>
                  <th>Restante</th>
                </tr>
              </thead>
              <tbody>
                {selecionado.itens.map((i) => (
                  <tr key={i.id}>
                    <td>{i.produto.nome}</td>
                    <td>{i.quantidadeRecebida}</td>
                    <td>{i.quantidadeDistribuida}</td>
                    <td>{i.quantidadeRecebida - i.quantidadeDistribuida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {erroDetalhe && <div className="alert-box">{erroDetalhe}</div>}

          {selecionado.status === 'EM_ANDAMENTO' && (
            <form onSubmit={salvarFornecedor}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Fornecedor que entregou *</label>
                <select value={fornecedorEscolhido} onChange={(e) => setFornecedorEscolhido(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>

              {previaFornecedor && (
                <div style={{ marginBottom: 14 }}>
                  <p className="text-muted">Valor estimado da entrega: <strong>{formatBRL(previaFornecedor.valorEstimado)}</strong></p>
                  {previaFornecedor.semPreco.length > 0 && (
                    <p className="caixa-troco-falta" style={{ marginTop: 4 }}>
                      Sem preço cadastrado: {previaFornecedor.semPreco.join(', ')} — esses itens não vão contar no valor final
                      (cadastre o preço na aba Financeiro → Fornecedores antes de confirmar, se quiser que contem).
                    </p>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={definindoFornecedor || !fornecedorEscolhido}>
                  {definindoFornecedor ? 'Salvando...' : 'Confirmar fornecedor'}
                </button>
              </div>
            </form>
          )}

          {selecionado.status === 'AGUARDANDO_DISTRIBUICAO' && (
            <form onSubmit={confirmarDistribuicao}>
              <div className="section-title">Distribuir entre as unidades</div>
              <div className="table-wrap" style={{ marginBottom: 14 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      {caixas.map((c) => (
                        <th key={c.id}>{c.nome}<div className="text-muted" style={{ fontWeight: 400, fontSize: 11 }}>{c.unidade}</div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selecionado.itens
                      .filter((i) => i.quantidadeRecebida - i.quantidadeDistribuida > 0)
                      .map((i) => (
                        <tr key={i.id}>
                          <td>
                            {i.produto.nome}
                            <div className="text-muted" style={{ fontSize: 11 }}>restam {i.quantidadeRecebida - i.quantidadeDistribuida}</div>
                          </td>
                          {caixas.map((c) => {
                            const chave = `${i.produtoId}-${c.id}`;
                            return (
                              <td key={c.id}>
                                <input
                                  type="number"
                                  min="0"
                                  style={{ width: 80 }}
                                  value={quantidadesDistribuir[chave] || ''}
                                  onChange={(e) => setQuantidadesDistribuir({ ...quantidadesDistribuir, [chave]: e.target.value })}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="text-muted" style={{ marginBottom: 10 }}>
                Pode distribuir aos poucos — o que não for preenchido agora fica pendente pra próxima vez.
              </p>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={distribuindo}>
                  {distribuindo ? 'Distribuindo...' : 'Confirmar distribuição'}
                </button>
              </div>
            </form>
          )}

          {selecionado.status === 'CONCLUIDO' && (
            <p className="text-muted">
              Fornecedor: <strong>{selecionado.fornecedor?.nome}</strong> · totalmente distribuído em {formatData(selecionado.distribuidoEm)}.
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setSelecionado(null)}>Fechar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
