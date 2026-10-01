function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Sem centavos — 7 colunas lado a lado não têm espaço pro valor completo.
function formatBRLCompacto(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function VendasPorDiaSemana({ dados, melhor }) {
  if (!dados || dados.every((d) => d.pedidos === 0)) return <p className="text-muted">Sem vendas no período.</p>;

  const maxValor = Math.max(1, ...dados.map((d) => d.total));

  return (
    <div className="dash-vbar-chart is-denso">
      {dados.map((d) => {
        const ehPico = melhor && d.diaSemana === melhor.diaSemana && d.total > 0;
        return (
          <div className="dash-vbar-col" key={d.diaSemana}>
            <span className="dash-vbar-value" title={formatBRL(d.total)}>{formatBRLCompacto(d.total)}</span>
            <div className="dash-vbar-track">
              <div
                className={`dash-vbar-fill${ehPico ? ' is-pico' : ''}`}
                style={{ height: `${Math.max((d.total / maxValor) * 100, d.total > 0 ? 3 : 0)}%` }}
              />
            </div>
            <span className="dash-vbar-label">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
