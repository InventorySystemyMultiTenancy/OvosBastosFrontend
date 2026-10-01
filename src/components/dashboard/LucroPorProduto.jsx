import { Fragment, useState } from 'react';

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ValorLucro({ valor }) {
  if (valor === null) return <span className="text-muted">—</span>;
  return <span className={valor >= 0 ? 'text-success' : 'text-danger'}>{formatBRL(valor)}</span>;
}

function Celulas({ item }) {
  return (
    <>
      <td>{item.quantidade}</td>
      <td>{formatBRL(item.precoVenda)}</td>
      <td>{item.precoCusto === null ? <span className="text-muted">sem custo</span> : formatBRL(item.precoCusto)}</td>
      <td><ValorLucro valor={item.lucroUnitario} /></td>
      <td><ValorLucro valor={item.lucroTotal} /></td>
    </>
  );
}

export function LucroPorProduto({ dados }) {
  const [abertos, setAbertos] = useState(() => new Set());

  if (!dados || dados.length === 0) return <p className="text-muted">Sem vendas no período.</p>;

  function alternar(produtoId) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(produtoId)) novo.delete(produtoId);
      else novo.add(produtoId);
      return novo;
    });
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Produto</th>
            <th>Vendidos</th>
            <th>Preço venda</th>
            <th>Custo</th>
            <th>Lucro/un</th>
            <th>Lucro total</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((p) => {
            const chave = p.produtoId ?? 'outros';
            const niveis = p.niveis || [];
            // Só um nível vendido no período: o detalhamento repetiria a mesma linha do
            // produto, então nem mostra a seta de expandir.
            const temDetalhe = niveis.length > 1;
            const aberto = temDetalhe && abertos.has(chave);
            return (
              <Fragment key={chave}>
                <tr
                  className={temDetalhe ? 'linha-lucro-produto is-expansivel' : 'linha-lucro-produto'}
                  onClick={temDetalhe ? () => alternar(chave) : undefined}
                >
                  <td className="linha-lucro-seta">{temDetalhe ? (aberto ? '▾' : '▸') : ''}</td>
                  <td>{p.nome}</td>
                  <Celulas item={p} />
                </tr>
                {aberto &&
                  niveis.map((n) => (
                    <tr key={`${chave}-${n.nivelVendaId ?? 'sem-nivel'}`} className="linha-lucro-nivel">
                      <td></td>
                      <td className="linha-lucro-nivel-nome">{n.nome}</td>
                      <Celulas item={n} />
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
