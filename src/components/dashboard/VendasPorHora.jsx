function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Sem centavos — 8 blocos lado a lado não têm espaço pro valor completo.
function formatBRLCompacto(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const TAMANHO_BLOCO = 3;

// Agrupa as 24 horas em blocos de 3h — 24 barrinhas finas eram informação demais pra
// enxergar de relance; em blocos o gráfico fica simétrico com as outras barras do dashboard.
function agruparPorBloco(dados) {
  const blocos = [];
  for (let i = 0; i < dados.length; i += TAMANHO_BLOCO) {
    const fatia = dados.slice(i, i + TAMANHO_BLOCO);
    const horaInicio = fatia[0].hora;
    const horaFim = fatia[fatia.length - 1].hora;
    blocos.push({
      horaInicio,
      horaFim,
      label: `${String(horaInicio).padStart(2, '0')}h`,
      total: fatia.reduce((s, h) => s + h.total, 0),
      pedidos: fatia.reduce((s, h) => s + h.pedidos, 0),
    });
  }
  return blocos;
}

export function VendasPorHora({ dados, melhor }) {
  if (!dados || dados.every((h) => h.pedidos === 0)) return <p className="text-muted">Sem vendas no período.</p>;

  const blocos = agruparPorBloco(dados);
  const maxValor = Math.max(1, ...blocos.map((b) => b.total));

  return (
    <div>
      <div className="dash-vbar-chart is-denso">
        {blocos.map((b) => {
          const ehPico = melhor && melhor.hora >= b.horaInicio && melhor.hora <= b.horaFim && b.total > 0;
          return (
            <div className="dash-vbar-col" key={b.horaInicio} title={`${b.label}–${String(b.horaFim + 1).padStart(2, '0')}h · ${formatBRL(b.total)}`}>
              <span className="dash-vbar-value">{formatBRLCompacto(b.total)}</span>
              <div className="dash-vbar-track">
                <div
                  className={`dash-vbar-fill${ehPico ? ' is-pico' : ''}`}
                  style={{ height: `${Math.max((b.total / maxValor) * 100, b.total > 0 ? 3 : 0)}%` }}
                />
              </div>
              <span className="dash-vbar-label">{b.label}</span>
            </div>
          );
        })}
      </div>
      {melhor && melhor.total > 0 && (
        <div className="dash-chart-summary text-muted">
          Horário de pico: {melhor.label} · {formatBRL(melhor.total)}
        </div>
      )}
    </div>
  );
}
