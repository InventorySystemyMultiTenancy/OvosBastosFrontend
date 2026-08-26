import { useEffect, useMemo, useRef, useState } from 'react';
import { api, resolveUploadUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  IconBasket,
  IconSearch,
  IconGrid,
  IconCartao,
  IconDinheiro,
  IconDividir,
  IconPlus,
  IconChevronDown,
  IconVendas,
} from '../components/icons';

const CAIXA_STORAGE_KEY = 'eggcontrol_caixa_id';
const CAIXA_VAZIO = { nome: '', unidade: '' };
const PRODUTOS_POR_PAGINA = 8;

const FORMAS_PAGAMENTO = [
  { id: 'MAQUININHA', label: 'Maquininha', Icon: IconCartao },
  { id: 'DINHEIRO', label: 'Dinheiro', Icon: IconDinheiro },
  { id: 'DIVIDIDO', label: 'Dividir', Icon: IconDividir },
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
  const unidadeTravada = usuario?.unidade || null;

  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [categoriasAbertas, setCategoriasAbertas] = useState(false);
  const categoriasRef = useRef(null);
  const [produtosVisiveis, setProdutosVisiveis] = useState(PRODUTOS_POR_PAGINA);

  useEffect(() => {
    if (!categoriasAbertas) return;
    function aoClicarFora(e) {
      if (categoriasRef.current && !categoriasRef.current.contains(e.target)) setCategoriasAbertas(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [categoriasAbertas]);

  const [caixas, setCaixas] = useState([]);
  const [caixaId, setCaixaId] = useState(() => {
    // Se o login for travado a uma unidade, o efeito abaixo confirma (ou troca) essa
    // escolha assim que a lista de caixas carregar — uma unidade pode ter mais de um
    // caixa físico, então não dá mais pra saber qual escolher só com o que tem aqui.
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
  const [carrinhoMobileAberto, setCarrinhoMobileAberto] = useState(false);
  const [nomeCliente, setNomeCliente] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [valorRecebido, setValorRecebido] = useState('');
  const [valorDinheiroDividido, setValorDinheiroDividido] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [erroVenda, setErroVenda] = useState('');
  const [vendaConcluida, setVendaConcluida] = useState(null);

  const [sessaoInfo, setSessaoInfo] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(false);
  const [valorAberturaInput, setValorAberturaInput] = useState('');
  const [abrindoCaixaFisico, setAbrindoCaixaFisico] = useState(false);
  const [erroAbrirCaixaFisico, setErroAbrirCaixaFisico] = useState('');
  const [avisoDivergencia, setAvisoDivergencia] = useState(null);

  const [modalFecharCaixa, setModalFecharCaixa] = useState(false);
  const [valorFechamentoInput, setValorFechamentoInput] = useState('');
  const [observacaoFechamento, setObservacaoFechamento] = useState('');
  const [fechandoCaixaFisico, setFechandoCaixaFisico] = useState(false);
  const [erroFecharCaixaFisico, setErroFecharCaixaFisico] = useState('');

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

  function carregarSessao() {
    if (!caixaId) { setSessaoInfo(null); return; }
    setCarregandoSessao(true);
    api
      .get(`/caixas/${caixaId}/sessao-atual`)
      .then(setSessaoInfo)
      .catch(() => setSessaoInfo(null))
      .finally(() => setCarregandoSessao(false));
  }

  useEffect(carregarSessao, [caixaId]);

  async function abrirCaixaFisico(e) {
    e.preventDefault();
    setAbrindoCaixaFisico(true);
    setErroAbrirCaixaFisico('');
    try {
      const resultado = await api.post(`/caixas/${caixaId}/sessoes/abrir`, { valorAbertura: Number(valorAberturaInput) });
      setValorAberturaInput('');
      carregarSessao();
      carregarProdutos();
      if (resultado.divergenciaDetectada) {
        // Pra não-admin o backend não manda valorEsperadoAbertura/divergenciaAbertura —
        // aqui só sobra o aviso genérico, sem revelar o quanto ficou de diferença.
        setAvisoDivergencia(
          resultado.valorEsperadoAbertura !== undefined
            ? {
                valorEsperado: Number(resultado.valorEsperadoAbertura),
                valorAbertura: Number(resultado.valorAbertura),
                divergencia: Number(resultado.divergenciaAbertura),
              }
            : {}
        );
      }
    } catch (err) {
      setErroAbrirCaixaFisico(err.message);
    } finally {
      setAbrindoCaixaFisico(false);
    }
  }

  function abrirModalFecharCaixa() {
    setValorFechamentoInput('');
    setObservacaoFechamento('');
    setErroFecharCaixaFisico('');
    setModalFecharCaixa(true);
  }

  async function fecharCaixaFisico(e) {
    e.preventDefault();
    setFechandoCaixaFisico(true);
    setErroFecharCaixaFisico('');
    try {
      await api.put(`/caixas/${caixaId}/sessoes/fechar`, {
        valorFechamento: Number(valorFechamentoInput),
        observacao: observacaoFechamento.trim() || undefined,
      });
      setModalFecharCaixa(false);
      carregarSessao();
    } catch (err) {
      setErroFecharCaixaFisico(err.message);
    } finally {
      setFechandoCaixaFisico(false);
    }
  }

  function carregarCaixas() {
    api.get('/caixas').then(setCaixas).catch(() => {});
  }

  useEffect(carregarCaixas, []);

  useEffect(() => {
    if (caixas.length === 0) return;
    // Login travado a uma unidade só pode escolher entre os caixas ativos daquela
    // unidade — se sobrar só um, já seleciona ele sozinho (a maioria das lojas tem um).
    const permitidos = unidadeTravada
      ? caixas.filter((c) => c.ativo && c.unidade === unidadeTravada)
      : caixas.filter((c) => c.ativo);
    const atual = permitidos.find((c) => c.id === caixaId);
    if (!atual) setCaixaId(permitidos.length === 1 ? permitidos[0].id : null);
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
  // Vendedor travado a uma unidade só vê/escolhe entre os caixas daquela unidade —
  // admin (ou login sem restrição) continua vendo todos.
  const caixasVisiveis = useMemo(
    () => (unidadeTravada ? caixasAtivos.filter((c) => c.unidade === unidadeTravada) : caixasAtivos),
    [caixasAtivos, unidadeTravada]
  );

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

  // Volta pra primeira página de produtos sempre que o filtro muda — senão "carregar mais"
  // fica com uma contagem que não bate com a lista nova.
  useEffect(() => setProdutosVisiveis(PRODUTOS_POR_PAGINA), [categoriaAtiva, busca, caixaId]);

  const produtosParaExibir = produtosFiltrados.slice(0, produtosVisiveis);
  const temMaisProdutos = produtosVisiveis < produtosFiltrados.length;

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
    setCarrinhoMobileAberto(false);
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
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconBasket /> Caixa</h1>
          <p>Selecione os produtos para adicionar ao pedido.</p>
        </div>

        <div className="caixa-unidade-bar">
          {caixasVisiveis.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>
              {ehAdmin
                ? 'Nenhum caixa cadastrado ainda.'
                : unidadeTravada
                  ? `Nenhum caixa ativo em ${unidadeTravada} — fale com um administrador.`
                  : 'Nenhum caixa disponível — peça para um administrador cadastrar.'}
            </p>
          ) : (
            <div className="caixa-unidade-lista">
              {caixasVisiveis.map((c) => (
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
            <button
              type="button"
              className="caixa-unidade-nova"
              onClick={abrirNovoCaixa}
              title="Novo caixa/unidade"
              aria-label="Novo caixa/unidade"
            >
              <IconPlus />
            </button>
          )}
        </div>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {caixaId && carregandoSessao ? (
        <p className="text-muted">Verificando situação do caixa...</p>
      ) : caixaId && !sessaoInfo?.sessaoAberta ? (
        <div className="caixa-abertura-gate card">
          <div className="caixa-abertura-icone">🔒</div>
          <h2>Caixa fechado</h2>
          <p className="text-muted">Conte o dinheiro físico no caixa e informe o valor abaixo para abrir e começar a vender.</p>
          {sessaoInfo?.ultimoFechamento && (
            <p className="text-muted">
              {sessaoInfo.ultimoFechamento.valorFechamento !== undefined ? (
                <>
                  Último fechamento: <strong>{formatBRL(sessaoInfo.ultimoFechamento.valorFechamento)}</strong> por{' '}
                  {sessaoInfo.ultimoFechamento.usuarioFechamento?.nome || '—'} em{' '}
                  {new Date(sessaoInfo.ultimoFechamento.fechadaEm).toLocaleString('pt-BR')}
                </>
              ) : (
                <>
                  Fechado por {sessaoInfo.ultimoFechamento.usuarioFechamento?.nome || '—'} em{' '}
                  {new Date(sessaoInfo.ultimoFechamento.fechadaEm).toLocaleString('pt-BR')}. Conte o dinheiro físico com atenção antes de informar o valor.
                </>
              )}
            </p>
          )}
          <form onSubmit={abrirCaixaFisico} className="caixa-abertura-form">
            <div className="field">
              <label>Valor contado no caixa agora (R$) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorAberturaInput}
                onChange={(e) => setValorAberturaInput(e.target.value)}
                placeholder="0,00"
                autoFocus
                required
              />
            </div>
            {erroAbrirCaixaFisico && <div className="alert-box">{erroAbrirCaixaFisico}</div>}
            <button type="submit" className="btn btn-primary" disabled={abrindoCaixaFisico || valorAberturaInput === ''}>
              {abrindoCaixaFisico ? 'Abrindo...' : 'Abrir caixa'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {caixaId && sessaoInfo?.sessaoAberta && (
            <div className="caixa-sessao-bar">
              <span>
                Caixa aberto por <strong>{sessaoInfo.sessaoAberta.usuarioAbertura.nome}</strong> às{' '}
                {new Date(sessaoInfo.sessaoAberta.abertaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Abertura: {formatBRL(sessaoInfo.sessaoAberta.valorAbertura)}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={abrirModalFecharCaixa}>Fechar caixa</button>
            </div>
          )}

      <div className="caixa-layout">
        <div className="caixa-produtos-col">
          <div className="caixa-filtros">
            <div className="caixa-busca-row">
              <div className="caixa-icone-campo">
                <IconSearch className="caixa-icone-campo-icone" />
                <input
                  className="caixa-busca"
                  type="search"
                  placeholder="Buscar produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <div className="caixa-categorias-menu" ref={categoriasRef}>
                <button
                  type="button"
                  className="caixa-ver-categorias-btn"
                  onClick={() => setCategoriasAbertas((v) => !v)}
                >
                  <IconGrid /> Ver categorias
                </button>
                {categoriasAbertas && (
                  <div className="caixa-categorias-dropdown">
                    {categorias.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={categoriaAtiva === c ? 'is-active' : ''}
                        onClick={() => { setCategoriaAtiva(c); setCategoriasAbertas(false); }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
            <>
              <div className="caixa-produtos-grid">
                {produtosParaExibir.map((p) => {
                  const qtdCarrinho = quantidadeNoCarrinho(p.id);
                  const disponivelRestante = p.quantidade - qtdCarrinho;
                  const esgotado = p.quantidade <= 0;
                  return (
                    <div key={p.id} className={`caixa-produto-card${esgotado ? ' is-esgotado' : ''}`}>
                      {qtdCarrinho > 0 && <span className="caixa-produto-badge">{qtdCarrinho}</span>}
                      <div className="caixa-produto-img">
                        {p.imagemUrl ? <img src={resolveUploadUrl(p.imagemUrl)} alt={p.nome} /> : <span aria-hidden="true">🥚</span>}
                      </div>
                      <div className="caixa-produto-corpo">
                        <strong className="caixa-produto-nome">{p.nome}</strong>
                        <span className="caixa-produto-unidade">{p.unidade}</span>
                        <div className="caixa-produto-rodape">
                          {esgotado ? (
                            <span className="caixa-produto-esgotado-label">Esgotado</span>
                          ) : (
                            <>
                              <span className="caixa-produto-preco">{formatBRL(p.precoVenda)}</span>
                              <button
                                type="button"
                                className="caixa-produto-add"
                                onClick={() => adicionar(p)}
                                disabled={disponivelRestante <= 0}
                                aria-label={`Adicionar ${p.nome}`}
                              >
                                <IconPlus />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {temMaisProdutos && (
                <div className="caixa-carregar-mais-wrap">
                  <button
                    type="button"
                    className="caixa-carregar-mais-btn"
                    onClick={() => setProdutosVisiveis((v) => v + PRODUTOS_POR_PAGINA)}
                  >
                    Carregar mais produtos <IconChevronDown />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className={`caixa-carrinho-col${carrinhoMobileAberto ? ' is-aberto-mobile' : ''}`}>
          <div className="caixa-carrinho-card">
            <div className="caixa-carrinho-topo">
              <div className="caixa-carrinho-titulo"><IconVendas /> Pedido atual</div>
              <div className="caixa-carrinho-topo-acoes">
                {carrinho.length > 0 && (
                  <button type="button" className="caixa-limpar-btn" onClick={limparVenda}>Limpar</button>
                )}
                <button
                  type="button"
                  className="caixa-fechar-carrinho-mobile"
                  onClick={() => setCarrinhoMobileAberto(false)}
                  aria-label="Fechar carrinho"
                >
                  ✕
                </button>
              </div>
            </div>

            {carrinho.length === 0 ? (
              <div className="caixa-carrinho-vazio">
                <IconVendas />
                <p>Nenhum item ainda.</p>
                <span>Clique nos produtos ao lado para adicionar.</span>
              </div>
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
                  <span>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
                  <span>Subtotal <strong>{formatBRL(subtotal)}</strong></span>
                </div>
                <div className="field">
                  <label>Desconto (R$)</label>
                  <input type="number" min="0" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
                </div>
                <div className="caixa-resumo-total-box">
                  <span>Total</span>
                  <span>{formatBRL(total)}</span>
                </div>
              </div>

              <div className="field caixa-campo-cliente">
                <label>Cliente</label>
                <div className="caixa-icone-campo">
                  <IconSearch className="caixa-icone-campo-icone" />
                  <input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Buscar cliente..." />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label>Forma de pagamento *</label>
                <div className="caixa-formas-pagamento">
                  {FORMAS_PAGAMENTO.map((f) => {
                    const indisponivel = (f.id === 'MAQUININHA' || f.id === 'DIVIDIDO') && !maquininhaDisponivel;
                    return (
                      <button
                        type="button"
                        key={f.id}
                        className={`caixa-forma-btn is-${f.id.toLowerCase()}${formaPagamento === f.id ? ' is-active' : ''}`}
                        onClick={() => setFormaPagamento(f.id)}
                        disabled={indisponivel}
                        title={indisponivel ? 'Configure a maquininha deste caixa em "Editar caixa"' : undefined}
                      >
                        <span className="caixa-forma-icone"><f.Icon /></span>
                        {f.label}
                      </button>
                    );
                  })}
                </div>
                {caixaId && !maquininhaDisponivel && (
                  <p className="alert-box caixa-aviso-maquininha">
                    ⚠️ Este caixa não tem maquininha configurada. {ehAdmin ? 'Configure em "Editar caixa".' : 'Peça para um administrador configurar.'}
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

      <button
        type="button"
        className="caixa-fab-carrinho"
        onClick={() => setCarrinhoMobileAberto(true)}
        aria-label="Abrir carrinho"
      >
        <IconVendas />
        {totalItens > 0 && <span className="caixa-fab-badge">{totalItens}</span>}
      </button>
        </>
      )}

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
                  list="unidades-existentes"
                  required
                />
                <datalist id="unidades-existentes">
                  {[...new Set(caixas.map((c) => c.unidade))].map((u) => <option key={u} value={u} />)}
                </datalist>
                <p className="text-muted" style={{ marginTop: 6, fontSize: 12 }}>
                  Usar o nome de uma unidade já existente cadastra mais um caixa pra mesma loja.
                </p>
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

      {modalFecharCaixa && (
        <Modal title="Fechar caixa" onClose={() => setModalFecharCaixa(false)}>
          <form onSubmit={fecharCaixaFisico}>
            <p className="text-muted" style={{ marginBottom: 16 }}>
              Conte o dinheiro físico que está no caixa agora e informe o valor abaixo para encerrar o turno.
            </p>
            <div className="field">
              <label>Valor contado no caixa (R$) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorFechamentoInput}
                onChange={(e) => setValorFechamentoInput(e.target.value)}
                placeholder="0,00"
                autoFocus
                required
              />
            </div>
            <div className="field">
              <label>Observação (opcional)</label>
              <input
                value={observacaoFechamento}
                onChange={(e) => setObservacaoFechamento(e.target.value)}
                placeholder="Ex: troco reforçado, sangria feita, etc."
              />
            </div>
            {erroFecharCaixaFisico && <div className="alert-box">{erroFecharCaixaFisico}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalFecharCaixa(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={fechandoCaixaFisico || valorFechamentoInput === ''}>
                {fechandoCaixaFisico ? 'Fechando...' : 'Fechar caixa'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {avisoDivergencia && (
        <Modal title="Divergência na contagem do caixa" onClose={() => setAvisoDivergencia(null)}>
          {avisoDivergencia.valorEsperado !== undefined ? (
            <>
              <p>
                O fechamento anterior deste caixa registrou <strong>{formatBRL(avisoDivergencia.valorEsperado)}</strong>, mas a
                contagem de agora encontrou <strong>{formatBRL(avisoDivergencia.valorAbertura)}</strong>.
              </p>
              <p className={avisoDivergencia.divergencia > 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>
                Diferença: {avisoDivergencia.divergencia > 0 ? '+' : ''}{formatBRL(avisoDivergencia.divergencia)}
              </p>
            </>
          ) : (
            <p>A contagem de abertura não bateu com o valor esperado a partir do último fechamento.</p>
          )}
          <p className="text-muted">O administrador foi notificado dessa divergência no Dashboard e no Financeiro.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={() => setAvisoDivergencia(null)}>Entendi, continuar</button>
          </div>
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
