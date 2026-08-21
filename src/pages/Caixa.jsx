import { useEffect, useMemo, useRef, useState } from 'react';
import { api, resolveUploadUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';

const CAIXA_STORAGE_KEY = 'eggcontrol_caixa_id';
const CAIXA_VAZIO = { nome: '', unidade: '' };

const FORMAS_PAGAMENTO = [
  { id: 'MAQUININHA', label: 'Maquininha', icon: '💳' },
  { id: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
  { id: 'DIVIDIDO', label: 'Dividir', icon: '➗' },
];

const LABEL_FORMA = { DINHEIRO: 'Dinheiro', CARTAO: 'Cartão' };

const TEMPO_LIMITE_PAGAMENTO_SEGUNDOS = 5 * 60;

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarTempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Caixa() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === 'ADMIN';
  const unidadeTravada = usuario?.caixaId || null;

  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');

  const [caixas, setCaixas] = useState([]);
  const [caixaId, setCaixaId] = useState(() => {
    if (unidadeTravada) return unidadeTravada;
    const salvo = localStorage.getItem(CAIXA_STORAGE_KEY);
    return salvo ? Number(salvo) : null;
  });
  const [modalCaixa, setModalCaixa] = useState(null);
  const [formCaixa, setFormCaixa] = useState(CAIXA_VAZIO);
  const [salvandoCaixa, setSalvandoCaixa] = useState(false);

  const [mpToken, setMpToken] = useState('');
  const [mpSalvandoToken, setMpSalvandoToken] = useState(false);
  const [mpDevices, setMpDevices] = useState([]);
  const [mpCarregandoDevices, setMpCarregandoDevices] = useState(false);
  const [mpDeviceSelecionado, setMpDeviceSelecionado] = useState('');
  const [mpAssociando, setMpAssociando] = useState(false);
  const [mpRemovendo, setMpRemovendo] = useState(false);
  const [mpErro, setMpErro] = useState('');

  const [carrinho, setCarrinho] = useState([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [valorRecebido, setValorRecebido] = useState('');
  const [valorDinheiroDividido, setValorDinheiroDividido] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [erroVenda, setErroVenda] = useState('');
  const [vendaConcluida, setVendaConcluida] = useState(null);

  const [pagamentoAndamento, setPagamentoAndamento] = useState(null);
  const [tempoRestante, setTempoRestante] = useState(0);
  const [erroPagamento, setErroPagamento] = useState('');
  const [cancelandoPagamento, setCancelandoPagamento] = useState(false);
  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const timeoutRef = useRef(null);

  function carregarProdutos() {
    setCarregando(true);
    const rota = caixaId ? `/caixas/${caixaId}/estoque` : '/produtos';
    api
      .get(rota)
      .then((lista) => setProdutos(caixaId ? lista : lista.map((p) => ({ ...p, quantidade: 0 }))))
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  // Estoque é por unidade: trocar de caixa refaz a busca e limpa o carrinho, já que a
  // quantidade disponível de cada item (e o carrinho montado) pertence à unidade anterior.
  useEffect(carregarProdutos, [caixaId]);
  useEffect(() => setCarrinho([]), [caixaId]);

  function carregarCaixas() {
    api.get('/caixas').then(setCaixas).catch(() => {});
  }

  useEffect(carregarCaixas, []);

  useEffect(() => {
    if (unidadeTravada || caixas.length === 0) return;
    const atual = caixas.find((c) => c.id === caixaId && c.ativo);
    if (!atual) setCaixaId(null);
  }, [caixas, caixaId, unidadeTravada]);

  const caixaAtual = caixas.find((c) => c.id === caixaId);
  const maquininhaDisponivel = Boolean(caixaAtual?.mpConfigurado);

  useEffect(() => {
    if ((formaPagamento === 'MAQUININHA' || formaPagamento === 'DIVIDIDO') && !maquininhaDisponivel) {
      setFormaPagamento('DINHEIRO');
    }
  }, [caixaId, maquininhaDisponivel, formaPagamento]);

  useEffect(() => () => pararTimersPagamento(), []);

  function selecionarCaixa(id) {
    setCaixaId(id);
    localStorage.setItem(CAIXA_STORAGE_KEY, String(id));
  }

  function abrirNovoCaixa() {
    setFormCaixa(CAIXA_VAZIO);
    setModalCaixa('novo');
  }

  function abrirEditarCaixa(caixa) {
    setFormCaixa({ nome: caixa.nome, unidade: caixa.unidade });
    setModalCaixa(caixa);
    setMpToken('');
    setMpErro('');
    setMpDevices([]);
    setMpDeviceSelecionado(caixa.mpDeviceId || '');
  }

  async function recarregarCaixaModal(caixaId) {
    const lista = await api.get('/caixas');
    setCaixas(lista);
    const atualizado = lista.find((c) => c.id === caixaId);
    if (atualizado) setModalCaixa(atualizado);
  }

  async function conectarMercadoPago() {
    if (!mpToken.trim()) return;
    setMpSalvandoToken(true);
    setMpErro('');
    try {
      const resultado = await api.post(`/caixas/${modalCaixa.id}/mercadopago/token`, { accessToken: mpToken.trim() });
      setMpDevices(resultado.devices || []);
      setMpToken('');
      await recarregarCaixaModal(modalCaixa.id);
    } catch (err) {
      setMpErro(err.message);
    } finally {
      setMpSalvandoToken(false);
    }
  }

  async function buscarMaquininhas() {
    setMpCarregandoDevices(true);
    setMpErro('');
    try {
      const devices = await api.get(`/caixas/${modalCaixa.id}/mercadopago/devices`);
      setMpDevices(devices || []);
    } catch (err) {
      setMpErro(err.message);
    } finally {
      setMpCarregandoDevices(false);
    }
  }

  async function associarMaquininha() {
    if (!mpDeviceSelecionado) return;
    setMpAssociando(true);
    setMpErro('');
    try {
      await api.post(`/caixas/${modalCaixa.id}/mercadopago/device`, { deviceId: mpDeviceSelecionado });
      await recarregarCaixaModal(modalCaixa.id);
    } catch (err) {
      setMpErro(err.message);
    } finally {
      setMpAssociando(false);
    }
  }

  async function removerMercadoPago() {
    if (!confirm('Remover a configuração do Mercado Pago deste caixa? A conta e a maquininha associadas serão desvinculadas.')) return;
    setMpRemovendo(true);
    setMpErro('');
    try {
      await api.delete(`/caixas/${modalCaixa.id}/mercadopago`);
      setMpDevices([]);
      setMpDeviceSelecionado('');
      await recarregarCaixaModal(modalCaixa.id);
    } catch (err) {
      setMpErro(err.message);
    } finally {
      setMpRemovendo(false);
    }
  }

  async function salvarCaixa(e) {
    e.preventDefault();
    setSalvandoCaixa(true);
    try {
      if (modalCaixa === 'novo') {
        const criado = await api.post('/caixas', formCaixa);
        carregarCaixas();
        selecionarCaixa(criado.id);
      } else {
        await api.put(`/caixas/${modalCaixa.id}`, formCaixa);
        carregarCaixas();
      }
      setModalCaixa(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvandoCaixa(false);
    }
  }

  async function desativarCaixa(caixa) {
    if (!confirm(`Desativar o caixa "${caixa.nome}"?`)) return;
    await api.put(`/caixas/${caixa.id}`, { ativo: false });
    carregarCaixas();
  }

  const caixasAtivos = useMemo(() => caixas.filter((c) => c.ativo), [caixas]);

  const categorias = useMemo(() => {
    const tipos = Array.from(new Set(produtos.map((p) => p.tipo).filter(Boolean)));
    return ['Todos', ...tipos];
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      const bateCategoria = categoriaAtiva === 'Todos' || p.tipo === categoriaAtiva;
      const bateBusca = !termo || p.nome.toLowerCase().includes(termo);
      return bateCategoria && bateBusca;
    });
  }, [produtos, categoriaAtiva, busca]);

  function quantidadeNoCarrinho(produtoId) {
    return carrinho.find((i) => i.produtoId === produtoId)?.quantidade || 0;
  }

  function adicionar(produto) {
    if (produto.quantidade <= 0) return;
    setCarrinho((atual) => {
      const existente = atual.find((i) => i.produtoId === produto.id);
      if (existente) {
        if (existente.quantidade >= produto.quantidade) return atual;
        return atual.map((i) => (i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i));
      }
      return [
        ...atual,
        {
          produtoId: produto.id,
          nome: produto.nome,
          precoVenda: produto.precoVenda,
          unidade: produto.unidade,
          quantidade: 1,
          estoqueDisponivel: produto.quantidade,
        },
      ];
    });
  }

  function aumentar(produtoId) {
    setCarrinho((atual) =>
      atual.map((i) => (i.produtoId === produtoId && i.quantidade < i.estoqueDisponivel ? { ...i, quantidade: i.quantidade + 1 } : i))
    );
  }

  function diminuir(produtoId) {
    setCarrinho((atual) =>
      atual.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i)).filter((i) => i.quantidade > 0)
    );
  }

  function removerItem(produtoId) {
    setCarrinho((atual) => atual.filter((i) => i.produtoId !== produtoId));
  }

  const subtotal = useMemo(() => carrinho.reduce((s, i) => s + Number(i.precoVenda) * i.quantidade, 0), [carrinho]);
  const totalItens = carrinho.reduce((s, i) => s + i.quantidade, 0);
  const total = Math.max(subtotal - (Number(desconto) || 0), 0);
  const troco = Math.max(Number(valorRecebido || 0) - total, 0);
  const faltaReceber = Math.max(total - Number(valorRecebido || 0), 0);
  const valorMaquininhaDividido = Math.max(total - (Number(valorDinheiroDividido) || 0), 0);
  const divisaoValida =
    formaPagamento !== 'DIVIDIDO' || (Number(valorDinheiroDividido) > 0 && Number(valorDinheiroDividido) < total);

  function limparVenda() {
    setCarrinho([]);
    setNomeCliente('');
    setDesconto(0);
    setFormaPagamento('DINHEIRO');
    setValorRecebido('');
    setValorDinheiroDividido('');
    setErroVenda('');
    setVendaConcluida(null);
  }

  function pararTimersPagamento() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }

  async function verificarStatusMaquininha(vendaId) {
    try {
      const pagamento = await api.get(`/vendas/${vendaId}/pagamento-maquininha`);
      setPagamentoAndamento((atual) => (atual ? { ...atual, pagamento } : atual));
      if (pagamento.status === 'APROVADO') {
        pararTimersPagamento();
        try {
          const venda = await api.get(`/vendas/${vendaId}`);
          setPagamentoAndamento(null);
          setVendaConcluida(venda);
          carregarProdutos();
        } catch (err) {
          setErroPagamento(err.message);
        }
      } else if (pagamento.status === 'REJEITADO' || pagamento.status === 'CANCELADO') {
        pararTimersPagamento();
        setErroPagamento(pagamento.status === 'REJEITADO' ? 'Pagamento recusado na maquininha.' : 'Cobrança cancelada.');
      }
    } catch {
      // falha pontual de rede não deve interromper a espera; a próxima consulta tenta de novo
    }
  }

  function abrirEsperaMaquininha(venda, pagamento) {
    setPagamentoAndamento({ venda, pagamento });
    setTempoRestante(TEMPO_LIMITE_PAGAMENTO_SEGUNDOS);
    setErroPagamento('');

    pollRef.current = setInterval(() => verificarStatusMaquininha(venda.id), 3000);
    tickRef.current = setInterval(() => setTempoRestante((t) => Math.max(t - 1, 0)), 1000);
    timeoutRef.current = setTimeout(async () => {
      pararTimersPagamento();
      await api.delete(`/vendas/${venda.id}/pagamento-maquininha`).catch(() => {});
      await api.put(`/vendas/${venda.id}/cancelar`, {}).catch(() => {});
      setErroPagamento('Tempo esgotado sem confirmação do pagamento. Cobrança cancelada.');
    }, TEMPO_LIMITE_PAGAMENTO_SEGUNDOS * 1000);
  }

  async function cancelarPagamentoMaquininha() {
    if (!pagamentoAndamento) return;
    setCancelandoPagamento(true);
    pararTimersPagamento();
    try {
      await api.delete(`/vendas/${pagamentoAndamento.venda.id}/pagamento-maquininha`).catch(() => {});
      await api.put(`/vendas/${pagamentoAndamento.venda.id}/cancelar`, {}).catch(() => {});
    } finally {
      setCancelandoPagamento(false);
      setPagamentoAndamento(null);
    }
  }

  function fecharPagamentoComErro() {
    setPagamentoAndamento(null);
    setErroPagamento('');
  }

  async function finalizarVenda(e) {
    e.preventDefault();
    if (carrinho.length === 0 || !caixaId || !divisaoValida) return;
    setEnviando(true);
    setErroVenda('');
    try {
      const viaMaquininha = formaPagamento === 'MAQUININHA' || formaPagamento === 'DIVIDIDO';
      const itens = carrinho.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade }));
      const body = {
        nomeCliente: nomeCliente.trim() || 'Cliente Balcão',
        itens,
        formaPagamento: viaMaquininha ? 'MAQUININHA' : formaPagamento,
        desconto: Number(desconto) || 0,
        caixaId,
        valorDinheiro: formaPagamento === 'DIVIDIDO' ? Number(valorDinheiroDividido) : undefined,
      };

      const venda = await api.post('/vendas/checkout', body);

      if (viaMaquininha) {
        try {
          const pagamento = await api.post(`/vendas/${venda.id}/pagamento-maquininha`, {});
          abrirEsperaMaquininha(venda, pagamento);
        } catch (err) {
          await api.put(`/vendas/${venda.id}/cancelar`, {}).catch(() => {});
          throw err;
        }
      } else {
        setVendaConcluida(venda);
        carregarProdutos();
      }
    } catch (err) {
      setErroVenda(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (vendaConcluida) {
    return (
      <div className="caixa-recibo-wrap">
        <div className="caixa-recibo">
          <div className="caixa-recibo-icone">✓</div>
          <h2>Venda #{vendaConcluida.id} concluída</h2>
          <p className="text-muted">Cliente: {vendaConcluida.cliente.nome}</p>
          {vendaConcluida.caixa && (
            <p className="text-muted">Caixa: {vendaConcluida.caixa.nome} · {vendaConcluida.caixa.unidade}</p>
          )}

          <div className="section-title">Itens</div>
          <ul className="caixa-recibo-itens">
            {vendaConcluida.itens.map((i) => (
              <li key={i.id}>
                <span>{i.quantidade}x {i.produto.nome}</span>
                <span>{formatBRL(Number(i.precoUnit) * i.quantidade)}</span>
              </li>
            ))}
          </ul>

          {Number(vendaConcluida.desconto) > 0 && (
            <p className="text-muted">Desconto aplicado: {formatBRL(vendaConcluida.desconto)}</p>
          )}
          <p className="caixa-recibo-total">Total: {formatBRL(vendaConcluida.total)}</p>
          {Number(vendaConcluida.valorDinheiro || 0) > 0 ? (
            <p className="text-muted">
              Pagamento: Dinheiro ({formatBRL(vendaConcluida.valorDinheiro)}) + Maquininha ({formatBRL(Number(vendaConcluida.total) - Number(vendaConcluida.valorDinheiro))})
            </p>
          ) : (
            <p className="text-muted">Pagamento: {LABEL_FORMA[vendaConcluida.formaPagamento] || vendaConcluida.formaPagamento}</p>
          )}

          {vendaConcluida.formaPagamento === 'DINHEIRO' && valorRecebido !== '' && (
            <p className="text-muted">Recebido: {formatBRL(valorRecebido)} · Troco: {formatBRL(troco)}</p>
          )}

          <div className="modal-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Imprimir</button>
            <button type="button" className="btn btn-primary" onClick={limparVenda}>Nova Venda</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="caixa-page">
      <div className="page-header">
        <div>
          <h1>Caixa</h1>
          <p>Monte o pedido do cliente, escolha a forma de pagamento e finalize a venda.</p>
        </div>
      </div>

      {unidadeTravada ? (
        <div className="caixa-unidade-bar">
          {caixaAtual?.ativo ? (
            <div className="caixa-unidade-lista">
              <div className="caixa-unidade-pill is-active">
                <span style={{ padding: '8px 14px' }}>
                  <strong>{caixaAtual.nome}</strong>
                  <span>{caixaAtual.unidade}</span>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-muted" style={{ margin: 0 }}>Sua unidade está inativa — fale com um administrador.</p>
          )}
        </div>
      ) : (
        <div className="caixa-unidade-bar">
          {caixasAtivos.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>
              {ehAdmin ? 'Nenhum caixa cadastrado ainda.' : 'Nenhum caixa disponível — peça para um administrador cadastrar.'}
            </p>
          ) : (
            <div className="caixa-unidade-lista">
              {caixasAtivos.map((c) => (
                <div key={c.id} className={`caixa-unidade-pill${caixaId === c.id ? ' is-active' : ''}`}>
                  <button type="button" onClick={() => selecionarCaixa(c.id)}>
                    <strong>{c.nome}</strong>
                    <span>{c.unidade}</span>
                  </button>
                  {ehAdmin && (
                    <span className="caixa-unidade-acoes">
                      <button type="button" title="Editar" onClick={() => abrirEditarCaixa(c)}>✎</button>
                      <button type="button" title="Desativar" onClick={() => desativarCaixa(c)}>×</button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {ehAdmin && (
            <button type="button" className="caixa-unidade-nova" onClick={abrirNovoCaixa}>+ Novo caixa/unidade</button>
          )}
        </div>
      )}

      {erro && <div className="alert-box">{erro}</div>}

      <div className="caixa-layout">
        <div className="caixa-produtos-col">
          <div className="caixa-filtros">
            <input
              className="caixa-busca"
              type="search"
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <div className="caixa-categorias">
              {categorias.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`caixa-categoria-pill${categoriaAtiva === c ? ' is-active' : ''}`}
                  onClick={() => setCategoriaAtiva(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {carregando ? (
            <p className="text-muted">Carregando produtos...</p>
          ) : produtosFiltrados.length === 0 ? (
            <p className="text-muted">Nenhum produto encontrado.</p>
          ) : (
            <div className="caixa-produtos-grid">
              {produtosFiltrados.map((p) => {
                const qtdCarrinho = quantidadeNoCarrinho(p.id);
                const disponivelRestante = p.quantidade - qtdCarrinho;
                const esgotado = p.quantidade <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`caixa-produto-btn${esgotado ? ' is-esgotado' : ''}`}
                    onClick={() => adicionar(p)}
                    disabled={esgotado || disponivelRestante <= 0}
                  >
                    {qtdCarrinho > 0 && <span className="caixa-produto-badge">{qtdCarrinho}</span>}
                    <div className="caixa-produto-img">
                      {p.imagemUrl ? <img src={resolveUploadUrl(p.imagemUrl)} alt={p.nome} /> : <span aria-hidden="true">🥚</span>}
                    </div>
                    <strong className="caixa-produto-nome">{p.nome}</strong>
                    <span className="text-muted caixa-produto-unidade">{p.unidade}</span>
                    <span className="caixa-produto-preco">{formatBRL(p.precoVenda)}</span>
                    {esgotado && <span className="caixa-produto-esgotado-tag">Esgotado</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="caixa-carrinho-col">
          <div className="caixa-carrinho-card">
            <div className="caixa-carrinho-topo">
              <div className="section-title" style={{ margin: 0 }}>Pedido atual</div>
              {carrinho.length > 0 && (
                <button type="button" className="caixa-limpar-btn" onClick={limparVenda}>Limpar</button>
              )}
            </div>

            {carrinho.length === 0 ? (
              <p className="text-muted">Nenhum item ainda. Clique nos produtos ao lado pra adicionar.</p>
            ) : (
              <ul className="caixa-itens-lista">
                {carrinho.map((i) => (
                  <li key={i.produtoId}>
                    <div className="caixa-item-info">
                      <strong>{i.nome}</strong>
                      <span className="text-muted">{formatBRL(i.precoVenda)} cada</span>
                    </div>
                    <div className="caixa-item-stepper">
                      <button type="button" onClick={() => diminuir(i.produtoId)} aria-label="Diminuir">−</button>
                      <span>{i.quantidade}</span>
                      <button
                        type="button"
                        onClick={() => aumentar(i.produtoId)}
                        disabled={i.quantidade >= i.estoqueDisponivel}
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>
                    <div className="caixa-item-subtotal">{formatBRL(i.precoVenda * i.quantidade)}</div>
                    <button type="button" className="caixa-item-remover" onClick={() => removerItem(i.produtoId)} aria-label="Remover item">×</button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={finalizarVenda}>
              <div className="caixa-resumo">
                <div className="caixa-resumo-linha">
                  <span>{totalItens} {totalItens === 1 ? 'item' : 'itens'} · Subtotal</span>
                  <span>{formatBRL(subtotal)}</span>
                </div>
                <div className="field">
                  <label>Desconto (R$)</label>
                  <input type="number" min="0" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
                </div>
                <div className="caixa-resumo-linha caixa-resumo-total">
                  <span>Total</span>
                  <span>{formatBRL(total)}</span>
                </div>
              </div>

              <div className="field" style={{ marginTop: 14, marginBottom: 14 }}>
                <label>Cliente</label>
                <input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Cliente Balcão" />
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label>Forma de pagamento *</label>
                <div className="ecommerce-payment-options" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {FORMAS_PAGAMENTO.map((f) => {
                    const indisponivel = (f.id === 'MAQUININHA' || f.id === 'DIVIDIDO') && !maquininhaDisponivel;
                    return (
                      <button
                        type="button"
                        key={f.id}
                        className={`ecommerce-payment-option${formaPagamento === f.id ? ' is-active' : ''}`}
                        onClick={() => setFormaPagamento(f.id)}
                        disabled={indisponivel}
                        title={indisponivel ? 'Configure a maquininha deste caixa em "Editar caixa"' : undefined}
                      >
                        <span>{f.icon}</span>
                        {f.label}
                      </button>
                    );
                  })}
                </div>
                {caixaId && !maquininhaDisponivel && (
                  <p className="text-muted" style={{ marginTop: 6, fontSize: 12 }}>
                    Este caixa não tem maquininha configurada. {ehAdmin ? 'Configure em "Editar caixa".' : 'Peça para um administrador configurar.'}
                  </p>
                )}
              </div>

              {formaPagamento === 'DINHEIRO' && (
                <div className="caixa-troco-box">
                  <div className="field">
                    <label>Valor recebido (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(e.target.value)}
                      placeholder={total.toFixed(2)}
                    />
                  </div>
                  {valorRecebido !== '' && (
                    faltaReceber > 0 ? (
                      <p className="caixa-troco-falta">Falta receber {formatBRL(faltaReceber)}</p>
                    ) : (
                      <p className="caixa-troco-valor">Troco: {formatBRL(troco)}</p>
                    )
                  )}
                </div>
              )}

              {formaPagamento === 'DIVIDIDO' && (
                <div className="caixa-troco-box">
                  <div className="field">
                    <label>Valor em dinheiro (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valorDinheiroDividido}
                      onChange={(e) => setValorDinheiroDividido(e.target.value)}
                      placeholder="0,00"
                      autoFocus
                    />
                  </div>
                  {valorDinheiroDividido !== '' && (
                    divisaoValida ? (
                      <p className="caixa-troco-valor">Na maquininha: {formatBRL(valorMaquininhaDividido)}</p>
                    ) : (
                      <p className="caixa-troco-falta">
                        {Number(valorDinheiroDividido) >= total
                          ? 'O valor em dinheiro precisa ser menor que o total — senão é só "Dinheiro".'
                          : 'Informe um valor em dinheiro maior que zero.'}
                      </p>
                    )
                  )}
                </div>
              )}

              {!caixaId && caixasAtivos.length > 0 && (
                <p className="caixa-troco-falta" style={{ marginBottom: 10 }}>Selecione um caixa/unidade acima para vender.</p>
              )}

              {erroVenda && <div className="alert-box">{erroVenda}</div>}

              <button
                type="submit"
                className="btn btn-primary caixa-finalizar-btn"
                disabled={enviando || carrinho.length === 0 || !caixaId || !divisaoValida}
              >
                {enviando
                  ? 'Enviando...'
                  : formaPagamento === 'MAQUININHA'
                    ? `Cobrar na Maquininha · ${formatBRL(total)}`
                    : formaPagamento === 'DIVIDIDO'
                      ? `Cobrar na Maquininha · ${formatBRL(valorMaquininhaDividido)}`
                      : `Finalizar Venda · ${formatBRL(total)}`}
              </button>
            </form>
          </div>
        </div>
      </div>

      {modalCaixa && (
        <Modal title={modalCaixa === 'novo' ? 'Novo caixa/unidade' : `Editar ${modalCaixa.nome}`} onClose={() => setModalCaixa(null)}>
          <form onSubmit={salvarCaixa}>
            <div className="form-grid">
              <div className="field">
                <label>Nome do caixa *</label>
                <input
                  value={formCaixa.nome}
                  onChange={(e) => setFormCaixa({ ...formCaixa, nome: e.target.value })}
                  placeholder="Caixa 1"
                  required
                />
              </div>
              <div className="field">
                <label>Unidade *</label>
                <input
                  value={formCaixa.unidade}
                  onChange={(e) => setFormCaixa({ ...formCaixa, unidade: e.target.value })}
                  placeholder="Matriz"
                  required
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalCaixa(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvandoCaixa}>{salvandoCaixa ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>

          {modalCaixa !== 'novo' && (
            <div>
              <div className="section-title">Maquininha Mercado Pago (Point)</div>
              {mpErro && <div className="alert-box">{mpErro}</div>}

              {modalCaixa.mpUserId ? (
                <>
                  <p className="text-muted">
                    Conta conectada: <strong>{modalCaixa.mpNicknameConta || modalCaixa.mpUserId}</strong>
                  </p>
                  <p className="text-muted">
                    Maquininha associada: {modalCaixa.mpDeviceId ? <strong>{modalCaixa.mpDeviceId}</strong> : 'nenhuma'}
                  </p>
                  <div className="field">
                    <label>Selecionar maquininha</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={mpDeviceSelecionado} onChange={(e) => setMpDeviceSelecionado(e.target.value)}>
                        <option value="">{mpDevices.length ? 'Selecione...' : 'Clique em "Buscar" ao lado'}</option>
                        {mpDevices.map((d) => (
                          <option key={d.id} value={d.id}>{d.id}{d.pos_id ? ` — ${d.pos_id}` : ''}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={buscarMaquininhas} disabled={mpCarregandoDevices}>
                        {mpCarregandoDevices ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>
                  </div>
                  <div className="modal-actions" style={{ justifyContent: 'flex-start', gap: 8 }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={associarMaquininha} disabled={mpAssociando || !mpDeviceSelecionado}>
                      {mpAssociando ? 'Associando...' : 'Associar maquininha'}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={removerMercadoPago} disabled={mpRemovendo}>
                      {mpRemovendo ? 'Removendo...' : 'Remover configuração'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted">
                    Cole o Access Token de produção da conta Mercado Pago deste caixa (Painel do Desenvolvedor MP → Suas integrações → Credenciais de produção).
                  </p>
                  <div className="field">
                    <label>Access Token</label>
                    <input
                      type="password"
                      value={mpToken}
                      onChange={(e) => setMpToken(e.target.value)}
                      placeholder="APP_USR-..."
                      autoComplete="off"
                    />
                  </div>
                  <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={conectarMercadoPago} disabled={mpSalvandoToken || !mpToken.trim()}>
                      {mpSalvandoToken ? 'Conectando...' : 'Conectar conta'}
                    </button>
                  </div>

                  {mpDevices.length > 0 && (
                    <div className="field">
                      <label>Selecionar maquininha</label>
                      <select value={mpDeviceSelecionado} onChange={(e) => setMpDeviceSelecionado(e.target.value)}>
                        <option value="">Selecione...</option>
                        {mpDevices.map((d) => (
                          <option key={d.id} value={d.id}>{d.id}{d.pos_id ? ` — ${d.pos_id}` : ''}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={associarMaquininha}
                        disabled={mpAssociando || !mpDeviceSelecionado}
                      >
                        {mpAssociando ? 'Associando...' : 'Associar maquininha'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Modal>
      )}

      {pagamentoAndamento && (
        <Modal title="Cobrança na maquininha" onClose={erroPagamento ? fecharPagamentoComErro : undefined}>
          <p className="text-muted">
            Valor cobrado agora:{' '}
            <strong>
              {formatBRL(Number(pagamentoAndamento.venda.total) - Number(pagamentoAndamento.venda.valorDinheiro || 0))}
            </strong>
            {Number(pagamentoAndamento.venda.valorDinheiro || 0) > 0 && (
              <> · já recebido em dinheiro: <strong>{formatBRL(pagamentoAndamento.venda.valorDinheiro)}</strong></>
            )}
          </p>

          {erroPagamento ? (
            <>
              <div className="alert-box">{erroPagamento}</div>
              <p className="text-muted">O pedido não foi finalizado. Você pode tentar novamente ou escolher outra forma de pagamento.</p>
              <div className="modal-actions">
                <button type="button" className="btn btn-primary" onClick={fecharPagamentoComErro}>Entendi</button>
              </div>
            </>
          ) : (
            <>
              <p>
                Status:{' '}
                <span className="badge badge-amber">
                  {pagamentoAndamento.pagamento?.status === 'EM_PROCESSO' ? 'Em processamento' : 'Aguardando pagamento'}
                </span>
              </p>
              <p className="text-muted">Peça para o cliente inserir ou aproximar o cartão na maquininha.</p>
              <p className="caixa-troco-falta" style={{ marginBottom: 0 }}>Cancela automaticamente em {formatarTempo(tempoRestante)}</p>

              <div className="modal-actions">
                <button type="button" className="btn btn-danger" onClick={cancelarPagamentoMaquininha} disabled={cancelandoPagamento}>
                  {cancelandoPagamento ? 'Cancelando...' : 'Cancelar'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
