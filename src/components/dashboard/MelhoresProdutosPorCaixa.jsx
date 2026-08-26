import { useState } from 'react';
import { IconChevronDown } from '../icons';

export function MelhoresProdutosPorCaixa({ dados }) {
  // Fechado por padrão — mostrar os 5 produtos de cada caixa de uma vez só deixa o card
  // poluído quando há várias unidades; o admin abre só a(s) que quer ver.
  const [abertos, setAbertos] = useState(() => new Set());

  if (!dados || dados.length === 0) return <p className="text-muted">Sem vendas no período.</p>;

  function alternar(chave) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  return (
    <div className="dash-melhores-caixas">
      {dados.map((c) => {
        const chave = c.caixaId ?? 'sem-caixa';
        const aberto = abertos.has(chave);
        const maxQtd = Math.max(1, ...c.produtos.map((p) => p.quantidade));
        return (
          <div key={chave} className="dash-melhores-caixa-bloco">
            <button
              type="button"
              className="dash-melhores-caixa-header"
              onClick={() => alternar(chave)}
              aria-expanded={aberto}
            >
              <span>
                {c.nome}
                {c.unidade && <span className="text-muted"> · {c.unidade}</span>}
              </span>
              <IconChevronDown className={`dash-melhores-caixa-seta${aberto ? ' is-aberto' : ''}`} />
            </button>

            {aberto && (
              <ul className="dash-melhores-caixa-lista">
                {c.produtos.map((p, i) => (
                  <li key={p.produtoId}>
                    <span className="dash-melhores-rank">{i + 1}º</span>
                    <span className="dash-melhores-main">
                      <span className="dash-melhores-nome" title={p.nome}>{p.nome}</span>
                      <span className="dash-melhores-track">
                        <span className="dash-melhores-fill" style={{ width: `${Math.max((p.quantidade / maxQtd) * 100, 4)}%` }} />
                      </span>
                    </span>
                    <span className="dash-melhores-qtd">{p.quantidade} un.</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
