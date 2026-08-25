import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SparkLineArea } from '../components/dashboard/SparkLineArea';
import { ProdutoBarChart } from '../components/dashboard/ProdutoBarChart';
import { TopClientesList } from '../components/dashboard/TopClientesList';
import { FiadoAlerta } from '../components/dashboard/FiadoAlerta';
import { RendimentoPorCaixa } from '../components/dashboard/RendimentoPorCaixa';
import { VendasPorDiaSemana } from '../components/dashboard/VendasPorDiaSemana';
import { VendasPorHora } from '../components/dashboard/VendasPorHora';
import { AlertaReposicao } from '../components/dashboard/AlertaReposicao';
import { MelhoresProdutosPorCaixa } from '../components/dashboard/MelhoresProdutosPorCaixa';
import { CaixaDivergenciaAlerta } from '../components/dashboard/CaixaDivergenciaAlerta';

const PERIODOS = [
  { dias: 7, label: '7 dias' },
  { dias: 30, label: '30 dias' },
  { dias: 90, label: '90 dias' },
];

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Dashboard() {
  const { usuario } = useAuth();
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>O que mais importa na operação, de relance.</p>
        </div>
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

      {erro && <div className="alert-box">{erro}</div>}

      {carregando || !resumo ? (
        <p className="text-muted">Carregando...</p>
      ) : (
        <>
          {ehAdmin && resumo.lucroLiquidoPeriodo !== null && (
            <div className="dash-lucro-card">
              <div>
                <div className="dash-lucro-label">Lucro líquido — últimos {resumo.periodoDias} dias</div>
                <div className={`dash-lucro-hero${Number(resumo.lucroLiquidoPeriodo) < 0 ? ' is-negativo' : ''}`}>
                  {formatBRL(resumo.lucroLiquidoPeriodo)}
                </div>
              </div>
              <div className="dash-lucro-detalhe">
                <span><strong>Faturamento:</strong> {formatBRL(resumo.faturamentoPeriodo)}</span>
                <span><strong>Gastos:</strong> {formatBRL(resumo.despesasPeriodo)}</span>
              </div>
            </div>
          )}

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

          <div className="dash-grid-2">
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>🐣 Reposição recomendada · por Clara, IA da Vrill Ovos</div>
              <AlertaReposicao />
            </div>
            <div className="card">
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
                <div className="stat-label">Faturamento nos últimos {resumo.periodoDias} dias</div>
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
