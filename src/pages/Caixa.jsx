import { useEffect, useMemo, useState } from 'react';
import { api, resolveUploadUrl } from '../api/client';

const FORMAS_PAGAMENTO = [
  { id: 'PIX', label: 'Pix', icon: '💠' },
  { id: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
  { id: 'CARTAO', label: 'Cartão', icon: '💳' },
  { id: 'BOLETO', label: 'Boleto', icon: '🧾' },
  { id: 'FIADO', label: 'Fiado', icon: '🤝' },
];

const LABEL_FORMA = { PIX: 'Pix', DINHEIRO: 'Dinheiro', CARTAO: 'Cartão', BOLETO: 'Boleto', FIADO: 'Fiado' };

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Caixa() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');

  const [carrinho, setCarrinho] = useState([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [valorRecebido, setValorRecebido] = useState('');
  const [vencimento, setVencimento] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [erroVenda, setErroVenda] = useState('');
  const [vendaConcluida, setVendaConcluida] = useState(null);

  function carregarProdutos() {
    setCarregando(true);
    api.get('/produtos').then(setProdutos).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregarProdutos, []);

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

  function limparVenda() {
    setCarrinho([]);
    setNomeCliente('');
    setDesconto(0);
    setFormaPagamento('PIX');
    setValorRecebido('');
    setVencimento('');
    setErroVenda('');
    setVendaConcluida(null);
  }

  async function finalizarVenda(e) {
    e.preventDefault();
    if (carrinho.length === 0) return;
    setEnviando(true);
    setErroVenda('');
    try {
      const itens = carrinho.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade }));
      const body = {
        nomeCliente: nomeCliente.trim() || 'Cliente Balcão',
        itens,
        formaPagamento,
        desconto: Number(desconto) || 0,
      };
      if (formaPagamento === 'FIADO') body.vencimento = vencimento || undefined;

      const venda = await api.post('/vendas/checkout', body);
      setVendaConcluida(venda);
      carregarProdutos();
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
          <p className="text-muted">Pagamento: {LABEL_FORMA[vendaConcluida.formaPagamento] || vendaConcluida.formaPagamento}</p>

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
                <div className="ecommerce-payment-options">
                  {FORMAS_PAGAMENTO.map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      className={`ecommerce-payment-option${formaPagamento === f.id ? ' is-active' : ''}`}
                      onClick={() => setFormaPagamento(f.id)}
                    >
                      <span>{f.icon}</span>
                      {f.label}
                    </button>
                  ))}
                </div>
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

              {formaPagamento === 'FIADO' && (
                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Vencimento (opcional, padrão 30 dias)</label>
                  <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
                </div>
              )}

              {erroVenda && <div className="alert-box">{erroVenda}</div>}

              <button
                type="submit"
                className="btn btn-primary caixa-finalizar-btn"
                disabled={enviando || carrinho.length === 0}
              >
                {enviando ? 'Finalizando...' : `Finalizar Venda · ${formatBRL(total)}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
