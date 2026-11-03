import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
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
import { FechamentoDiaBotao } from '../components/dashboard/FechamentoDiaBotao';
import { MelhoresProdutosPorCaixa } from '../components/dashboard/MelhoresProdutosPorCaixa';
import { CaixaDivergenciaAlerta } from '../components/dashboard/CaixaDivergenciaAlerta';
import { gerarRelatorioDashboard } from '../utils/relatoriosPdf';
import { IconLucro, IconFaturamento, IconGastos, IconVendas, IconArrowUp, IconArrowDown, IconCalendar } from '../components/icons';

const PERIODOS = [{ dias: 1, label: 'Hoje' }];

// Enquanto "Mês atual" ou "Hoje" estão selecionados, o dashboard se atualiza sozinho.
const INTERVALO_ATUALIZACAO_MS = 30 * 1000;

const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function dataISOLocal(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

// Nome do mês, com o ano só quando não é o ano atual (ex: em janeiro, "Dezembro/2025").
function nomeMes(data) {
  const nome = NOMES_MES[data.getMonth()];
  return data.getFullYear() === new Date().getFullYear() ? nome : `${nome}/${data.getFullYear()}`;
}

// Mês fechado `offset` meses atrás (1 = mês anterior, 2 = mês retrasado): do dia 1 ao
// último dia. Vira um periodoCustom normal (de/ate) com mesOffset pra marcar o botão ativo.
function periodoMes(offset) {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() - offset + 1, 0);
  return { de: dataISOLocal(inicio), ate: dataISOLocal(fim), mesOffset: offset, mesLabel: nomeMes(inicio) };
}

const MESES_ATALHO = [1, 2];

// Mês em andamento: do dia 1 até hoje. O "ate" é recalculado a cada atualização automática,
// então na virada do dia (ou do mês) o período acompanha sozinho.
function periodoMesAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { de: dataISOLocal(inicio), ate: dataISOLocal(hoje), mesAtual: true, mesLabel: `${nomeMes(inicio)} (até hoje)` };
}

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(data) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDataCurta(isoDate) {
  const [, mes, dia] = isoDate.split('-');
  return `${dia}/${mes}`;
}

function labelPeriodoAtual(dias, custom) {
  if (custom?.mesLabel) return custom.mesLabel;
  if (custom) return `${formatDataCurta(custom.de)} a ${formatDataCurta(custom.ate)}`;
  return dias === 1 ? 'Hoje' : `Últimos ${dias} dias`;
}

function labelPeriodoAnterior(dias, custom) {
  if (custom?.mesLabel) {
    const [ano, mes] = custom.de.split('-').map(Number);
    const anterior = nomeMes(new Date(ano, mes - 2, 1));
    return custom.mesAtual ? `mesmos dias de ${anterior}` : anterior;
  }
  if (custom) return 'período anterior de mesmo tamanho';
  return dias === 1 ? 'ontem' : `${dias} dias anteriores`;
}

function KpiCard({ label, sublabel, value, isNegative, iconClass, Icon, variacaoPct, dias, periodoCustom, trendInverso, onClick, detalhe }) {
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
        <span className="dash-kpi-trend-note">vs {labelPeriodoAnterior(dias, periodoCustom)}</span>
      </span>
      {detalhe && <div className="dash-kpi-detalhe">{detalhe}</div>}
    </div>
  );
}

export function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const ehAdmin = usuario?.perfil === 'ADMIN';

  const [dias, setDias] = useState(1);
  // { de, ate, mesOffset?, mesLabel? } | null — abre no mês anterior fechado por padrão.
  const [periodoCustom, setPeriodoCustom] = useState(() => periodoMes(1));
  const mesesAtalho = MESES_ATALHO.map(periodoMes);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [modalData, setModalData] = useState(false);
  const [dataDeInput, setDataDeInput] = useState('');
  const [dataAteInput, setDataAteInput] = useState('');
  const [erroData, setErroData] = useState('');
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    setCarregando(true);
    const query = periodoCustom ? `de=${periodoCustom.de}&ate=${periodoCustom.ate}` : `dias=${dias}`;
    api
      .get(`/dashboard?${query}`)
      .then(setResumo)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [dias, periodoCustom]);

  // Atualização em tempo real pros períodos que terminam "agora" (Mês atual e Hoje): busca de
  // novo a cada 30s em segundo plano, sem mostrar "carregando". No Mês atual, se o dia virou,
  // troca o período (o efeito acima recarrega com o novo "ate").
  const periodoAoVivo = periodoCustom ? Boolean(periodoCustom.mesAtual) : dias === 1;
  useEffect(() => {
    if (!periodoAoVivo) return undefined;
    const id = setInterval(() => {
      if (document.hidden) return;
      if (periodoCustom?.mesAtual) {
        const novo = periodoMesAtual();
        if (novo.de !== periodoCustom.de || novo.ate !== periodoCustom.ate) {
          setPeriodoCustom(novo);
          return;
        }
      }
      const query = periodoCustom ? `de=${periodoCustom.de}&ate=${periodoCustom.ate}` : `dias=${dias}`;
      api.get(`/dashboard?${query}`).then(setResumo).catch(() => {});
    }, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(id);
  }, [periodoAoVivo, periodoCustom, dias]);

  function selecionarPeriodoRelativo(d) {
    setPeriodoCustom(null);
    setDias(d);
  }

  const periodoEscolhidoNaMao = periodoCustom && !periodoCustom.mesOffset && !periodoCustom.mesAtual;

  function abrirModalData() {
    setDataDeInput(periodoEscolhidoNaMao ? periodoCustom.de : '');
    setDataAteInput(periodoEscolhidoNaMao ? periodoCustom.ate : '');
    setErroData('');
    setModalData(true);
  }

  function aplicarPeriodoCustom(e) {
    e.preventDefault();
    if (!dataDeInput || !dataAteInput) return;
    if (dataDeInput > dataAteInput) {
      setErroData('A data "de" não pode ser depois da data "até".');
      return;
    }
    setPeriodoCustom({ de: dataDeInput, ate: dataAteInput });
    setModalData(false);
  }

  // Relatório completo do dashboard no período selecionado (gráficos + tabelas), gerado
  // em PDF — ver gerarRelatorioDashboard. A aba é aberta já no clique, antes dos awaits,
  // senão o navegador trata como pop-up e bloqueia; reposição e estoque por unidade vêm
  // dos mesmos endpoints dos cards e, se falharem, o relatório sai sem essas seções.
  async function imprimirRelatorio() {
    if (!resumo) return;
    const janela = window.open('', '_blank');
    if (janela) janela.document.write('<p style="font-family:sans-serif;padding:24px">Gerando relatório...</p>');
    setImprimindo(true);
    try {
      const [reposicao, estoqueUnidades] = await Promise.allSettled([
        api.get('/dashboard/analise-reposicao'),
        api.get('/dashboard/estoque-por-unidade'),
      ]);
      await gerarRelatorioDashboard({
        resumo,
        reposicao: reposicao.status === 'fulfilled' ? reposicao.value : null,
        estoqueUnidades: estoqueUnidades.status === 'fulfilled' ? estoqueUnidades.value : null,
        periodoLabel: labelPeriodoAtual(resumo.periodoDias, periodoCustom),
        comparacaoLabel: labelPeriodoAnterior(resumo.periodoDias, periodoCustom),
        ehAdmin,
        janela,
      });
    } catch (e) {
      if (janela) janela.close();
      setErro(`Não foi possível gerar o relatório: ${e.message}`);
    } finally {
      setImprimindo(false);
    }
  }

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
          {ehAdmin && <FechamentoDiaBotao />}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={imprimirRelatorio}
            disabled={carregando || !resumo || imprimindo}
            title="Imprimir todas as informações do dashboard no período selecionado"
          >
            🖨️ {imprimindo ? 'Gerando...' : 'Imprimir relatório'}
          </button>
          <div className="dash-periodo-toggle">
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                type="button"
                className={`dash-periodo-btn${!periodoCustom && dias === p.dias ? ' is-active' : ''}`}
                onClick={() => selecionarPeriodoRelativo(p.dias)}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className={`dash-periodo-btn${periodoCustom?.mesAtual ? ' is-active' : ''}`}
              onClick={() => setPeriodoCustom(periodoMesAtual())}
              title="Do dia 1 deste mês até hoje, atualizando sozinho"
            >
              Mês atual
            </button>
            {mesesAtalho.map((m) => (
              <button
                key={m.mesOffset}
                type="button"
                className={`dash-periodo-btn${periodoCustom?.mesOffset === m.mesOffset ? ' is-active' : ''}`}
                onClick={() => setPeriodoCustom(m)}
                title={`${formatDataCurta(m.de)} a ${formatDataCurta(m.ate)}`}
              >
                {m.mesLabel}
              </button>
            ))}
            <button
              type="button"
              className={`dash-periodo-btn${periodoEscolhidoNaMao ? ' is-active' : ''}`}
              onClick={abrirModalData}
            >
              📅 {periodoEscolhidoNaMao ? `${formatDataCurta(periodoCustom.de)} – ${formatDataCurta(periodoCustom.ate)}` : 'Escolher data'}
            </button>
            {periodoEscolhidoNaMao && (
              <button
                type="button"
                className="dash-periodo-btn dash-periodo-limpar"
                onClick={() => setPeriodoCustom(periodoMes(1))}
                aria-label="Limpar período personalizado"
                title="Voltar pro mês anterior"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {modalData && (
        <Modal title="Escolher período" onClose={() => setModalData(false)}>
          <form onSubmit={aplicarPeriodoCustom}>
            <div className="form-grid">
              <div className="field">
                <label>De</label>
                <input type="date" value={dataDeInput} onChange={(e) => setDataDeInput(e.target.value)} required />
              </div>
              <div className="field">
                <label>Até</label>
                <input type="date" value={dataAteInput} onChange={(e) => setDataAteInput(e.target.value)} required />
              </div>
            </div>
            {erroData && <div className="alert-box" style={{ marginTop: 12 }}>{erroData}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalData(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Aplicar</button>
            </div>
          </form>
        </Modal>
      )}

      {erro && <div className="alert-box">{erro}</div>}

      {carregando || !resumo ? (
        <p className="text-muted">Carregando...</p>
      ) : (
        <>
          <div className="dash-kpi-grid">
            {ehAdmin && resumo.lucroLiquidoPeriodo !== null && (
              <KpiCard
                label="Lucro Líquido"
                sublabel={labelPeriodoAtual(resumo.periodoDias, periodoCustom)}
                value={formatBRL(resumo.lucroLiquidoPeriodo)}
                isNegative={Number(resumo.lucroLiquidoPeriodo) < 0}
                iconClass="is-green"
                Icon={IconLucro}
                variacaoPct={resumo.variacaoLucroPct}
                dias={resumo.periodoDias}
                periodoCustom={periodoCustom}
                detalhe={
                  resumo.custoProdutosPeriodo !== null
                    ? `Faturamento ${formatBRL(resumo.faturamentoPeriodo)} − custo dos produtos vendidos ${formatBRL(resumo.custoProdutosPeriodo)} (gastos operacionais não entram aqui, veja o card "Gastos")`
                    : undefined
                }
                onClick={() =>
                  navigate(
                    periodoCustom
                      ? `/admin/lucro-por-unidade?de=${periodoCustom.de}&ate=${periodoCustom.ate}`
                      : `/admin/lucro-por-unidade?dias=${dias}`
                  )
                }
              />
            )}
            <KpiCard
              label="Faturamento"
              sublabel={labelPeriodoAtual(resumo.periodoDias, periodoCustom)}
              value={formatBRL(resumo.faturamentoPeriodo)}
              iconClass="is-blue"
              Icon={IconFaturamento}
              variacaoPct={resumo.variacaoFaturamentoPct}
              dias={resumo.periodoDias}
              periodoCustom={periodoCustom}
            />
            {ehAdmin && resumo.despesasPeriodo !== null && (
              <KpiCard
                label="Gastos"
                sublabel={labelPeriodoAtual(resumo.periodoDias, periodoCustom)}
                value={formatBRL(resumo.despesasPeriodo)}
                iconClass="is-orange"
                Icon={IconGastos}
                variacaoPct={resumo.variacaoDespesasPct}
                dias={resumo.periodoDias}
                periodoCustom={periodoCustom}
                trendInverso
              />
            )}
            <KpiCard
              label="Vendas"
              sublabel={labelPeriodoAtual(resumo.periodoDias, periodoCustom)}
              value={resumo.pedidosPeriodo.toLocaleString('pt-BR')}
              iconClass="is-purple"
              Icon={IconVendas}
              variacaoPct={resumo.variacaoVendasPct}
              dias={resumo.periodoDias}
              periodoCustom={periodoCustom}
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
                <div className="stat-label">
                  Faturamento {periodoCustom ? `de ${labelPeriodoAtual(resumo.periodoDias, periodoCustom)}` : resumo.periodoDias === 1 ? 'de hoje' : `nos últimos ${resumo.periodoDias} dias`}
                </div>
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
