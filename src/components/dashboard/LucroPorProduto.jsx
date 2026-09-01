import { Table } from '../Table';

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const COLUNAS = [
  { key: 'nome', header: 'Produto', render: (p) => p.nome },
  { key: 'quantidade', header: 'Vendidos', render: (p) => p.quantidade },
  { key: 'precoVenda', header: 'Preço venda', render: (p) => formatBRL(p.precoVenda) },
  {
    key: 'precoCusto',
    header: 'Custo',
    render: (p) => (p.precoCusto === null ? <span className="text-muted">sem custo</span> : formatBRL(p.precoCusto)),
  },
  {
    key: 'lucroUnitario',
    header: 'Lucro/un',
    render: (p) =>
      p.lucroUnitario === null ? (
        <span className="text-muted">—</span>
      ) : (
        <span className={p.lucroUnitario >= 0 ? 'text-success' : 'text-danger'}>{formatBRL(p.lucroUnitario)}</span>
      ),
  },
  {
    key: 'lucroTotal',
    header: 'Lucro total',
    render: (p) =>
      p.lucroTotal === null ? (
        <span className="text-muted">—</span>
      ) : (
        <span className={p.lucroTotal >= 0 ? 'text-success' : 'text-danger'}>{formatBRL(p.lucroTotal)}</span>
      ),
  },
];

export function LucroPorProduto({ dados }) {
  if (!dados || dados.length === 0) return <p className="text-muted">Sem vendas no período.</p>;

  return (
    <Table
      columns={COLUNAS}
      rows={dados}
      rowKey={(p) => p.produtoId ?? 'outros'}
      emptyMessage="Sem vendas no período."
    />
  );
}
