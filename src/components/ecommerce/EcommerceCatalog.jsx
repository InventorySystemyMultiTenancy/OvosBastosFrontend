import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, resolveUploadUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ScrollVideoBackground } from './ScrollVideoBackground';
import { CatalogHeader } from './CatalogHeader';
import { CompanyShowcase } from './CompanyShowcase';
import { CatalogFooter } from './CatalogFooter';
import { slugCategoria, capitalizarCategoria } from './categoriaUtils';

const SEM_CATEGORIA = 'Outros';

const FORMAS_BASE = [
  { id: 'PIX', label: 'Pix', icon: '💠' },
  { id: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
  { id: 'CARTAO', label: 'Cartão', icon: '💳' },
  { id: 'BOLETO', label: 'Boleto', icon: '🧾' },
];
const FORMA_FIADO = { id: 'FIADO', label: 'Fiado', icon: '🤝' };

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ProdutoCard({ produto, quantidadeNoCarrinho, onAdicionar, onRemover }) {
  const niveis = produto.niveisVenda || [];
  const [nivelId, setNivelId] = useState(() => (niveis.find((n) => n.ehBase) || niveis[0])?.id);
  const nivel = niveis.find((n) => n.id === nivelId) || niveis[0];

  if (!nivel) return null;

  const qtdCarrinho = quantidadeNoCarrinho(nivel.id);
  const disponivelRestante = produto.quantidade - qtdCarrinho * nivel.quantidadeGrao;
  const esgotado = produto.quantidade < nivel.quantidadeGrao;
  const estoqueBaixo = !esgotado && produto.quantidade <= produto.estoqueMinimo;
  const imagem = nivel.imagemUrl || produto.imagemUrl;

  return (
    <div className={`ecommerce-card${esgotado ? ' is-esgotado' : ''}`}>
      {imagem ? (
        <div className="ecommerce-card-media ecommerce-card-media-foto">
          <img src={resolveUploadUrl(imagem)} alt={produto.nome} loading="lazy" />
        </div>
      ) : (
        <div className="ecommerce-card-media" aria-hidden="true">🥚</div>
      )}
      <div className="ecommerce-card-body">
        <div className="ecommerce-card-tags">
          {produto.tipo && <span className="badge badge-pink">{produto.tipo}</span>}
          {esgotado && <span className="badge badge-red">esgotado</span>}
          {estoqueBaixo && <span className="badge badge-amber">últimas unidades</span>}
        </div>
        <h3>{produto.nome}</h3>
        {niveis.length > 1 ? (
          <div className="ecommerce-card-niveis">
            {niveis.map((n) => (
              <button
                type="button"
                key={n.id}
                className={`ecommerce-card-nivel-pill${n.id === nivel.id ? ' is-active' : ''}`}
                onClick={() => setNivelId(n.id)}
              >
                {n.nome}
              </button>
            ))}
          </div>
        ) : (
          <p className="ecommerce-card-unidade">{nivel.nome}</p>
        )}
        <div className="ecommerce-card-footer">
          <span className="ecommerce-card-price">{formatBRL(nivel.preco)}</span>
          {qtdCarrinho > 0 ? (
            <div className="ecommerce-stepper">
              <button type="button" onClick={() => onRemover(produto, nivel)} aria-label="Diminuir">−</button>
              <span>{qtdCarrinho}</span>
              <button
                type="button"
                onClick={() => onAdicionar(produto, nivel)}
                disabled={disponivelRestante < nivel.quantidadeGrao}
                aria-label="Aumentar"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={esgotado}
              onClick={() => onAdicionar(produto, nivel)}
            >
              {esgotado ? 'Esgotado' : '+ Adicionar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EcommerceCatalog() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const isStaff = !!usuario;
  const chaveCarrinho = isStaff ? 'eggcontrol_carrinho_staff' : 'eggcontrol_carrinho_publico';

  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [carrinho, setCarrinho] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(chaveCarrinho) || '[]');
    } catch {
      return [];
    }
  });

  const [busca, setBusca] = useState('');

  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [nomeCliente, setNomeCliente] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [vencimento, setVencimento] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroCheckout, setErroCheckout] = useState('');
  const [pedidoConcluido, setPedidoConcluido] = useState(null);

  const catalogoRef = useRef(null);
  const categoriasRef = useRef(null);
  const pageRef = useRef(null);

  useEffect(() => {
    setCarregando(true);
    const path = isStaff ? '/produtos' : '/loja/catalogo';
    api
      .get(path)
      .then(setProdutos)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [isStaff]);

  useEffect(() => {
    localStorage.setItem(chaveCarrinho, JSON.stringify(carrinho));
  }, [carrinho, chaveCarrinho]);

  const categorias = useMemo(() => {
    const tipos = Array.from(new Set(produtos.map((p) => (p.tipo && p.tipo.trim() ? p.tipo : SEM_CATEGORIA))));
    return tipos.sort((a, b) => (a === SEM_CATEGORIA ? 1 : b === SEM_CATEGORIA ? -1 : a.localeCompare(b)));
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((p) => p.nome.toLowerCase().includes(termo) || (p.tipo || '').toLowerCase().includes(termo));
  }, [produtos, busca]);

  const produtosPorCategoria = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return categorias
      .map((categoria) => {
        const itens = produtos.filter((p) => {
          const categoriaProduto = p.tipo && p.tipo.trim() ? p.tipo : SEM_CATEGORIA;
          if (categoriaProduto !== categoria) return false;
          return !termo || p.nome.toLowerCase().includes(termo) || categoria.toLowerCase().includes(termo);
        });
        return { categoria, itens };
      })
      .filter((grupo) => grupo.itens.length > 0);
  }, [produtos, categorias, busca]);

  useEffect(() => {
    if (carregando || produtosFiltrados.length === 0 || !catalogoRef.current) return;
    let cancelled = false;
    (async () => {
      const { default: gsap } = await import('gsap');
      if (cancelled || !catalogoRef.current) return;
      gsap.fromTo(
        catalogoRef.current.querySelectorAll('.ecommerce-card'),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [carregando, produtosFiltrados]);

  useEffect(() => {
    if (carregando || produtosPorCategoria.length === 0 || !categoriasRef.current) return;
    let cancelled = false;
    (async () => {
      const { default: gsap } = await import('gsap');
      if (cancelled || !categoriasRef.current) return;
      gsap.fromTo(
        categoriasRef.current.querySelectorAll('.ecommerce-card'),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [carregando, produtosPorCategoria]);

  function quantidadeNoCarrinho(produtoId, nivelId) {
    return carrinho.find((i) => i.produtoId === produtoId && i.nivelVendaId === nivelId)?.quantidade || 0;
  }

  function totalGraoComprometido(produtoId) {
    return carrinho
      .filter((i) => i.produtoId === produtoId)
      .reduce((soma, i) => soma + i.quantidade * i.quantidadeGrao, 0);
  }

  function adicionar(produto, nivel) {
    if (produto.quantidade < nivel.quantidadeGrao) return;
    setCarrinho((atual) => {
      if (totalGraoComprometido(produto.id) + nivel.quantidadeGrao > produto.quantidade) return atual;
      const existente = atual.find((i) => i.produtoId === produto.id && i.nivelVendaId === nivel.id);
      if (existente) {
        return atual.map((i) => (i === existente ? { ...i, quantidade: i.quantidade + 1 } : i));
      }
      return [
        ...atual,
        {
          produtoId: produto.id,
          nivelVendaId: nivel.id,
          nome: nivel.ehBase ? produto.nome : `${produto.nome} — ${nivel.nome}`,
          precoVenda: nivel.preco,
          quantidadeGrao: nivel.quantidadeGrao,
          quantidade: 1,
        },
      ];
    });
  }

  function remover(produto, nivel) {
    setCarrinho((atual) =>
      atual
        .map((i) => (i.produtoId === produto.id && i.nivelVendaId === nivel.id ? { ...i, quantidade: i.quantidade - 1 } : i))
        .filter((i) => i.quantidade > 0)
    );
  }

  const totalItens = carrinho.reduce((soma, i) => soma + i.quantidade, 0);
  const subtotal = useMemo(
    () => carrinho.reduce((soma, i) => soma + Number(i.precoVenda) * i.quantidade, 0),
    [carrinho]
  );

  const formasDisponiveis = isStaff ? [...FORMAS_BASE, FORMA_FIADO] : FORMAS_BASE;

  function fecharCheckout() {
    setCheckoutAberto(false);
    setErroCheckout('');
    if (pedidoConcluido) {
      setPedidoConcluido(null);
      setNomeCliente('');
      setFormaPagamento('PIX');
      setVencimento('');
    }
  }

  async function submeterPedido(e) {
    e.preventDefault();
    setEnviando(true);
    setErroCheckout('');
    try {
      const itens = carrinho.map((i) => ({ produtoId: i.produtoId, nivelVendaId: i.nivelVendaId, quantidade: i.quantidade }));
      const body = { nomeCliente, itens, formaPagamento };
      if (isStaff && formaPagamento === 'FIADO') body.vencimento = vencimento || undefined;

      const path = isStaff ? '/vendas/checkout' : '/loja/pedidos';
      const venda = await api.post(path, body);
      setPedidoConcluido(venda);
      setCarrinho([]);
    } catch (err) {
      setErroCheckout(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="catalogo-theme ecommerce-page-shell">
      <ScrollVideoBackground videoSrc="/videoeggscroll.mp4" containerRef={pageRef} />

      <div className="ecommerce-content" ref={pageRef}>
        <CatalogHeader categorias={categorias} busca={busca} onBusca={setBusca} isStaff={isStaff} />

        <main className="ecommerce-catalog-section" ref={catalogoRef}>
          <div className="catalogo-intro">
            <h2>Catálogo</h2>
          </div>

          {erro && <div className="alert-box">{erro}</div>}

          {carregando ? (
            <p className="text-muted">Carregando catálogo...</p>
          ) : produtosFiltrados.length === 0 ? (
            <p className="text-muted">Nenhum produto encontrado.</p>
          ) : (
            <div className="ecommerce-grid">
              {produtosFiltrados.map((p) => (
                <ProdutoCard
                  key={p.id}
                  produto={p}
                  quantidadeNoCarrinho={quantidadeNoCarrinho(p.id)}
                  onAdicionar={adicionar}
                  onRemover={remover}
                />
              ))}
            </div>
          )}
        </main>

        <CompanyShowcase />

        {produtosPorCategoria.length > 0 && (
          <section className="categorias-lista" ref={categoriasRef}>
            {produtosPorCategoria.map(({ categoria, itens }) => (
              <section id={`categoria-${slugCategoria(categoria)}`} className="categoria-secao" key={categoria}>
                <h3 className="categoria-secao-titulo">{capitalizarCategoria(categoria)}</h3>
                <div className="ecommerce-grid">
                  {itens.map((p) => (
                    <ProdutoCard
                      key={p.id}
                      produto={p}
                      quantidadeNoCarrinho={(nivelId) => quantidadeNoCarrinho(p.id, nivelId)}
                      onAdicionar={adicionar}
                      onRemover={remover}
                    />
                  ))}
                </div>
              </section>
            ))}
          </section>
        )}

        <CatalogFooter isStaff={isStaff} />
      </div>

      {carrinho.length > 0 && !checkoutAberto && (
        <div className="ecommerce-cart-bar">
          <div className="ecommerce-cart-summary">
            <span>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
            <strong>{formatBRL(subtotal)}</strong>
          </div>
          <button className="btn btn-primary" onClick={() => setCheckoutAberto(true)}>Finalizar pedido</button>
        </div>
      )}

      {checkoutAberto && (
        <div className="ecommerce-checkout-overlay" onClick={fecharCheckout}>
          <div className="ecommerce-checkout-drawer" onClick={(e) => e.stopPropagation()}>
            {pedidoConcluido ? (
              <div className="ecommerce-success">
                <div className="ecommerce-success-icon">✓</div>
                <h3>Pedido confirmado!</h3>
                <p className="text-muted">Pedido #{pedidoConcluido.id} para {pedidoConcluido.cliente.nome}</p>
                <div className="section-title">Itens</div>
                <ul className="ecommerce-success-itens">
                  {pedidoConcluido.itens.map((i) => (
                    <li key={i.id}>{i.quantidade}x {i.produto.nome}{i.nivelVenda && !i.nivelVenda.ehBase ? ` — ${i.nivelVenda.nome}` : ''} — {formatBRL(Number(i.precoUnit) * i.quantidade)}</li>
                  ))}
                </ul>
                <p className="ecommerce-success-total">Total: {formatBRL(pedidoConcluido.total)}</p>
                <div className="modal-actions">
                  {isStaff && (
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/vendas')}>Ver em Vendas</button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={fecharCheckout}>Novo pedido</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submeterPedido}>
                <h3>Finalizar pedido</h3>
                <p className="text-muted" style={{ marginBottom: 18 }}>
                  {isStaff ? 'Sem precisar cadastrar cliente — só o nome.' : 'Sem login, sem cadastro. Só o seu nome.'}
                </p>

                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Nome *</label>
                  <input
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Como podemos te chamar?"
                    required
                    autoFocus
                  />
                </div>

                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Forma de pagamento *</label>
                  <div className="ecommerce-payment-options">
                    {formasDisponiveis.map((f) => (
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

                {isStaff && formaPagamento === 'FIADO' && (
                  <div className="field" style={{ marginBottom: 16 }}>
                    <label>Vencimento (opcional, padrão 30 dias)</label>
                    <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
                  </div>
                )}

                <div className="ecommerce-checkout-resumo">
                  <span>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
                  <strong>{formatBRL(subtotal)}</strong>
                </div>

                {erroCheckout && <div className="alert-box" style={{ marginTop: 14 }}>{erroCheckout}</div>}

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={fecharCheckout}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={enviando || carrinho.length === 0}>
                    {enviando ? 'Enviando...' : 'Confirmar pedido'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
