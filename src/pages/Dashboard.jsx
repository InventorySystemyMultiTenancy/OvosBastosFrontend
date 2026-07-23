import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { SparkLineArea } from '../components/dashboard/SparkLineArea';
import { ProdutoBarChart } from '../components/dashboard/ProdutoBarChart';
import { TopClientesList } from '../components/dashboard/TopClientesList';
import { FiadoAlerta } from '../components/dashboard/FiadoAlerta';

const PERIODOS = [
  { dias: 7, label: '7 dias' },
  { dias: 30, label: '30 dias' },
  { dias: 90, label: '90 dias' },
];

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Dashboard() {
  const [dias, setDias] = useState(30);
  const [resumo, setResumo] = useState(null);
  const [lucroMes, setLucroMes] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    Promise.all([
      api.get(`/dashboard?dias=${dias}`),
      api.get('/financeiro/fluxo-caixa?meses=1'),
    ])
      .then(([dash, fluxo]) => {
        setResumo(dash);
        setLucroMes(fluxo[0] || null);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [dias]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard Inteligente</h1>
          <p>Visão completa e atualizada de toda a operação.</p>
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
          <div className="stat-grid">
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
              <div className="stat-value">{resumo.clientesComPedidoNoMes}</div>
              <div className="stat-label">Clientes com pedidos no mês</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{resumo.bandejasPendentes}</div>
              <div className="stat-label">Bandejas pendentes de devolução</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{resumo.estoqueDisponivel}</div>
              <div className="stat-label">Unidades disponíveis em estoque</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{resumo.produtosEstoqueBaixo}</div>
              <div className="stat-label">Produtos com estoque baixo</div>
            </div>
          </div>

          {lucroMes && (
            <div className="dash-lucro-card">
              <div>
                <div className="dash-lucro-label">Lucro líquido — {lucroMes.mes}</div>
                <div className={`dash-lucro-hero${Number(lucroMes.saldo) < 0 ? ' is-negativo' : ''}`}>
                  {formatBRL(lucroMes.saldo)}
                </div>
              </div>
              <div className="dash-lucro-detalhe">
                <span><strong>Receitas:</strong> {formatBRL(lucroMes.receitas)}</span>
                <span><strong>Despesas:</strong> {formatBRL(lucroMes.despesas)}</span>
              </div>
            </div>
          )}

          <div className="dash-grid-2">
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Vendas por período</div>
              <SparkLineArea dados={resumo.vendasPorDia} />
            </div>
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Vendas por produto</div>
              <ProdutoBarChart dados={resumo.vendasPorProduto} />
            </div>
          </div>

          <div className="dash-grid-2">
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Quem mais compra</div>
              <TopClientesList dados={resumo.topClientes} />
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
