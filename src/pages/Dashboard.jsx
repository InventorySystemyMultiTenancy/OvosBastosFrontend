import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SparkLineArea } from '../components/dashboard/SparkLineArea';
import { ProdutoBarChart } from '../components/dashboard/ProdutoBarChart';
import { LucroPorProduto } from '../components/dashboard/LucroPorProduto';
import { TopClientesList } from '../components/dashboard/TopClientesList';
import { FiadoAlerta } from '../components/dashboard/FiadoAlerta';
import { RendimentoPorCaixa } from '../components/dashboard/RendimentoPorCaixa';
import { VendasPorDiaSemana } from '../components/dashboard/VendasPorDiaSemana';
import { VendasPorHora } from '../components/dashboard/VendasPorHora';
import { AlertaReposicao } from '../components/dashboard/AlertaReposicao';
import { EstoquePorUnidadeBotao } from '../components/dashboard/EstoquePorUnidadeBotao';
import { MelhoresProdutosPorCaixa } from '../components/dashboard/MelhoresProdutosPorCaixa';
import { CaixaDivergenciaAlerta } from '../components/dashboard/CaixaDivergenciaAlerta';
import { IconLucro, IconFaturamento, IconGastos, IconVendas, IconArrowUp, IconArrowDown, IconCalendar } from '../components/icons';

const PERIODOS = [
  { dias: 1, label: 'Hoje' },
  { dias: 7, label: '7 dias' },
  { dias: 30, label: '30 dias' },
  { dias: 90, label: '90 dias' },
];

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(data) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function labelPeriodoAtual(dias) {
  return dias === 1 ? 'Hoje' : `Últimos ${dias} dias`;
}

function labelPeriodoAnterior(dias) {
  return dias === 1 ? 'ontem' : `${dias} dias anteriores`;
}

function KpiCard({ label, sublabel, value, isNegative, iconClass, Icon, variacaoPct, dias, trendInverso, onClick }) {
  const temVariacao = variacaoPct !== null && variacaoPct !== undefined;
  const subiu = temVariacao && variacaoPct > 0;
  const desceu = temVariacao && variacaoPct < 0;
  // Pra gastos, subir é ruim — o badge inverte a cor (verde/vermelho) nesse caso.
  const trendClasse = !temVariacao ? 'is-neutral' : (trendInverso ? desceu : subiu) ? 'is-up' : (trendInverso ? subiu : desceu) ? 'is-down' : 'is-neutral';

  return (
    <div
      className={`dash-kpi-card${onClick ? ' is-clicavel' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="dash-kpi-top">
        <div>
          <div className="dash-kpi-label">{label}</div>
          <div className="dash-kpi-sublabel">{sublabel}</div>
        </div>
        <div className={`dash-kpi-icon ${iconClass}`}>
          <Icon />
        </div>
      </div>
      <div className={`dash-kpi-value${isNegative ? ' is-negativo' : ''}`}>{value}</div>
      <span className={`dash-kpi-trend ${trendClasse}`}>
        {temVariacao ? (
          <>
            {subiu ? <IconArrowUp /> : desceu ? <IconArrowDown /> : null}
            {Math.abs(variacaoPct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
          </>
        ) : (
          'novo'
        )}
        <span className="dash-kpi-trend-note">vs {labelPeriodoAnterior(dias)}</span>
      </span>
    </div>
  );
}

export function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const ehAdmin = usuario?.perfil === 'ADMIN';

  const [dias, setDias] = useState(30);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    api
      .get(`/dashboard?dias=${dias}`)
      .then(setResumo)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [dias]);

  const primeiroNome = usuario?.nome?.split(' ')[0];

  return (
    <div>
      <div className="dash-greeting-header">
        <div>
          <h1>Olá, {primeiroNome}!</h1>
          <p>Aqui está o resumo da sua operação.</p>
        </div>
        <div className="dash-greeting-controls">
          <span className="dash-date-pill">
            <IconCalendar />
            {formatData(new Date())}
          </span>
          <EstoquePorUnidadeBotao />
          <div className="dash-periodo-toggle">
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                type="button"
                className={`dash-periodo-btn${dias === p.dias ? ' is-active' : ''}`}
                onClick={() => setDias(p.dias)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {carregando || !resumo ? (
        <p className="text-muted">Carregando...</p>
      ) : (
        <>
          <div className="dash-kpi-grid">
            {ehAdmin && resumo.lucroLiquidoPeriodo !== null && (
              <KpiCard
                label="Lucro Líquido"
                sublabel={labelPeriodoAtual(resumo.periodoDias)}
                value={formatBRL(resumo.lucroLiquidoPeriodo)}
                isNegative={Number(resumo.lucroLiquidoPeriodo) < 0}
                iconClass="is-green"
                Icon={IconLucro}
                variacaoPct={resumo.variacaoLucroPct}
                dias={resumo.periodoDias}
                onClick={() => navigate(`/admin/lucro-por-unidade?dias=${dias}`)}
              />
            )}
            <KpiCard
              label="Faturamento"
              sublabel={labelPeriodoAtual(resumo.periodoDias)}
              value={formatBRL(resumo.faturamentoPeriodo)}
              iconClass="is-blue"
              Icon={IconFaturamento}
              variacaoPct={resumo.variacaoFaturamentoPct}
              dias={resumo.periodoDias}
            />
            {ehAdmin && resumo.despesasPeriodo !== null && (
              <KpiCard
                label="Gastos"
                sublabel={labelPeriodoAtual(resumo.periodoDias)}
                value={formatBRL(resumo.despesasPeriodo)}
                iconClass="is-orange"
                Icon={IconGastos}
                variacaoPct={resumo.variacaoDespesasPct}
                dias={resumo.periodoDias}
                trendInverso
              />
            )}
            <KpiCard
              label="Vendas"
              sublabel={labelPeriodoAtual(resumo.periodoDias)}
              value={resumo.pedidosPeriodo.toLocaleString('pt-BR')}
              iconClass="is-purple"
              Icon={IconVendas}
              variacaoPct={resumo.variacaoVendasPct}
              dias={resumo.periodoDias}
            />
          </div>

          {ehAdmin && resumo.divergenciasCaixa && resumo.divergenciasCaixa.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ marginTop: 0 }}>⚠️ Divergências de caixa</div>
              <CaixaDivergenciaAlerta divergencias={resumo.divergenciasCaixa} />
            </div>
          )}

          <div className="dash-grid-2">
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Rendimento por caixa</div>
              <RendimentoPorCaixa dados={resumo.rendimentoPorCaixa} mostrarSaldo={ehAdmin} />
            </div>
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Produtos mais vendidos</div>
              <ProdutoBarChart dados={resumo.vendasPorProduto} />
            </div>
          </div>

          {ehAdmin && resumo.lucroPorProduto && resumo.lucroPorProduto.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ marginTop: 0 }}>Lucro por produto</div>
              <LucroPorProduto dados={resumo.lucroPorProduto} />
            </div>
          )}

          <div className="dash-grid-2">
            <div className="card dash-card-amber">
              <AlertaReposicao />
            </div>
            <div className="card dash-card-purple">
              <div className="section-title" style={{ marginTop: 0 }}>Mais vendidos por unidade</div>
              <MelhoresProdutosPorCaixa dados={resumo.melhoresProdutosPorCaixa} />
            </div>
          </div>

          <div className="dash-grid-2">
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Dias com mais vendas</div>
              <VendasPorDiaSemana dados={resumo.vendasPorDiaSemana} melhor={resumo.melhorDiaSemana} />
            </div>
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Horário de pico</div>
              <VendasPorHora dados={resumo.vendasPorHora} melhor={resumo.melhorHora} />
            </div>
          </div>

          <div className="dash-secao-secundaria">
            <div className="section-title">Resumo rápido</div>
            <div className="stat-grid is-compacto">
              <div className="stat-tile">
                <div className="stat-value">{formatBRL(resumo.faturamentoHoje)}</div>
                <div className="stat-label">Acumulado do dia em tempo real</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value">{resumo.pedidosHoje}</div>
                <div className="stat-label">Pedidos confirmados hoje</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value">{formatBRL(resumo.faturamentoPeriodo)}</div>
                <div className="stat-label">Faturamento {resumo.periodoDias === 1 ? 'de hoje' : `nos últimos ${resumo.periodoDias} dias`}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value">{formatBRL(resumo.ticketMedio)}</div>
                <div className="stat-label">Ticket médio no período</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value">{resumo.bandejasPendentes}</div>
                <div className="stat-label">Bandejas pendentes de devolução</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value">{resumo.estoqueDisponivel}</div>
                <div className="stat-label">Unidades disponíveis em estoque</div>
              </div>
            </div>

            <div className="dash-grid-2">
              <div className="card">
                <div className="section-title" style={{ marginTop: 0 }}>Vendas por período</div>
                <SparkLineArea dados={resumo.vendasPorDia} />
              </div>
              <div className="card">
                <div className="section-title" style={{ marginTop: 0 }}>Quem mais compra</div>
                <TopClientesList dados={resumo.topClientes} />
              </div>
            </div>

            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Fiado em aberto</div>
              <FiadoAlerta fiado={resumo.fiado} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
