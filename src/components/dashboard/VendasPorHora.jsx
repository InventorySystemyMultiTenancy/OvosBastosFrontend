function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const HORAS_EIXO = [0, 6, 12, 18, 23];

export function VendasPorHora({ dados, melhor }) {
  if (!dados || dados.every((h) => h.pedidos === 0)) return <p className="text-muted">Sem vendas no período.</p>;

  const maxValor = Math.max(1, ...dados.map((h) => h.total));

  return (
    <div className="dash-hourchart">
      <div className="dash-hourbars">
        {dados.map((h) => (
          <div
            key={h.hora}
            className={`dash-hourbar${melhor && h.hora === melhor.hora && h.total > 0 ? ' is-pico' : ''}`}
            title={`${h.label} · ${formatBRL(h.total)} · ${h.pedidos} ${h.pedidos === 1 ? 'pedido' : 'pedidos'}`}
          >
            <div className="dash-hourbar-fill" style={{ height: `${Math.max((h.total / maxValor) * 100, h.total > 0 ? 4 : 0)}%` }} />
          </div>
        ))}
      </div>
      <div className="dash-hourbars-eixo">
        {HORAS_EIXO.map((h) => (
          <span key={h}>{String(h).padStart(2, '0')}h</span>
        ))}
      </div>
      {melhor && melhor.total > 0 && (
        <div className="dash-chart-summary text-muted">
          Horário de pico: {melhor.label} · {formatBRL(melhor.total)}
        </div>
      )}
    </div>
  );
}
