import { useMemo, useRef, useState } from 'react';

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDiaCurto(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

const LARGURA = 640;
const ALTURA = 220;
const PAD_X = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 34;

export function SparkLineArea({ dados }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const { pontos, maxValor, linha, area, baseline } = useMemo(() => {
    const maxValor = Math.max(1, ...dados.map((d) => d.total));
    const larguraUtil = LARGURA - PAD_X * 2;
    const alturaUtil = ALTURA - PAD_TOP - PAD_BOTTOM;
    const passo = dados.length > 1 ? larguraUtil / (dados.length - 1) : 0;
    const baseline = PAD_TOP + alturaUtil;

    const pontos = dados.map((d, i) => ({
      ...d,
      x: PAD_X + i * passo,
      y: baseline - (d.total / maxValor) * alturaUtil,
    }));

    const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = pontos.length
      ? `${linha} L ${pontos[pontos.length - 1].x.toFixed(1)} ${baseline} L ${pontos[0].x.toFixed(1)} ${baseline} Z`
      : '';

    return { pontos, maxValor, linha, area, baseline };
  }, [dados]);

  function handleMove(e) {
    if (!svgRef.current || pontos.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xRelativo = ((e.clientX - rect.left) / rect.width) * LARGURA;
    let indice = 0;
    let menorDist = Infinity;
    pontos.forEach((p, i) => {
      const dist = Math.abs(p.x - xRelativo);
      if (dist < menorDist) {
        menorDist = dist;
        indice = i;
      }
    });
    setHoverIndex(indice);
  }

  if (dados.length === 0) return <p className="text-muted">Sem dados no período.</p>;

  const ativo = hoverIndex !== null ? pontos[hoverIndex] : null;

  return (
    <div className="dash-chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        preserveAspectRatio="none"
        className="dash-chart-svg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <line x1={PAD_X} y1={PAD_TOP} x2={LARGURA - PAD_X} y2={PAD_TOP} className="dash-chart-grid" />
        <line x1={PAD_X} y1={baseline} x2={LARGURA - PAD_X} y2={baseline} className="dash-chart-grid" />

        <path d={area} className="dash-chart-area" />
        <path d={linha} className="dash-chart-line" />

        {/* Ponto "vivo" no dado mais recente — pulsa como um monitor de batimento. */}
        {pontos.length > 0 && (
          <>
            <circle cx={pontos[pontos.length - 1].x} cy={pontos[pontos.length - 1].y} r="5" className="dash-chart-dot" />
            <circle cx={pontos[pontos.length - 1].x} cy={pontos[pontos.length - 1].y} r="5" className="dash-chart-dot-live" />
          </>
        )}

        {ativo && (
          <>
            <line x1={ativo.x} y1={PAD_TOP} x2={ativo.x} y2={baseline} className="dash-chart-guide" />
            <circle cx={ativo.x} cy={ativo.y} r="5" className="dash-chart-dot" />
          </>
        )}

        <text x={pontos[0].x} y={ALTURA - 10} className="dash-chart-axis-label" textAnchor="start">
          {formatDiaCurto(pontos[0].data)}
        </text>
        <text x={pontos[pontos.length - 1].x} y={ALTURA - 10} className="dash-chart-axis-label" textAnchor="end">
          {formatDiaCurto(pontos[pontos.length - 1].data)}
        </text>
      </svg>

      {ativo && (
        <div className="dash-tooltip" style={{ left: `${(ativo.x / LARGURA) * 100}%` }}>
          <strong>{formatDiaCurto(ativo.data)}</strong>
          <span>{formatBRL(ativo.total)}</span>
          <span className="text-muted">{ativo.pedidos} {ativo.pedidos === 1 ? 'pedido' : 'pedidos'}</span>
        </div>
      )}

      <div className="dash-chart-summary text-muted">Melhor dia no período: {formatBRL(maxValor)}</div>
    </div>
  );
}
