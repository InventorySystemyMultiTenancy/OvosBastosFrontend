import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { IconChevronDown } from '../components/icons';

const PERIODOS = [
  { dias: 1, label: 'Hoje' },
  { dias: 7, label: '7 dias' },
  { dias: 30, label: '30 dias' },
  { dias: 90, label: '90 dias' },
];

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDiaSemana(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function UnidadeBloco({ dados, aberto, onToggle }) {
  const diasComVenda = dados.porDia.filter((d) => d.faturamento > 0 || d.despesas > 0);

  return (
    <div className="card lucro-unidade-card">
      <button type="button" className="dash-melhores-caixa-header lucro-unidade-header" onClick={onToggle} aria-expanded={aberto}>
        <span className="lucro-unidade-nome">{dados.unidade}</span>
        <span className="lucro-unidade-resumo">
          <span>Faturamento <strong>{formatBRL(dados.faturamento)}</strong></span>
          <span>Gastos <strong>{formatBRL(dados.despesas)}</strong></span>
          <span className={dados.lucro >= 0 ? 'text-success' : 'text-danger'}>
            Lucro <strong>{formatBRL(dados.lucro)}</strong>
          </span>
          <span className="text-muted">{dados.pedidos} {dados.pedidos === 1 ? 'venda' : 'vendas'}</span>
        </span>
        <IconChevronDown className={`dash-melhores-caixa-seta${aberto ? ' is-aberto' : ''}`} />
      </button>

      {aberto && (
        <div className="lucro-unidade-detalhe">
          {diasComVenda.length === 0 ? (
            <p className="text-muted" style={{ marginTop: 12 }}>Sem vendas nesta unidade no período.</p>
          ) : (
            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>Dia</th>
                    <th>Vendas</th>
                    <th>Faturamento</th>
                    <th>Gastos</th>
                    <th>Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {diasComVenda.map((d) => (
                    <tr key={d.data}>
                      <td style={{ textTransform: 'capitalize' }}>{formatDiaSemana(d.data)}</td>
                      <td>{d.pedidos}</td>
                      <td>{formatBRL(d.faturamento)}</td>
                      <td>{formatBRL(d.despesas)}</td>
                      <td className={d.lucro >= 0 ? 'text-success' : 'text-danger'}>{formatBRL(d.lucro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LucroPorUnidade() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dias = [1, 7, 30, 90].includes(Number(searchParams.get('dias'))) ? Number(searchParams.get('dias')) : 30;

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  // Primeira unidade (maior lucro, já vem ordenado assim do backend) começa aberta —
  // as outras só quando o admin quiser olhar, senão a tela fica comprida demais.
  const [abertas, setAbertas] = useState(() => new Set([0]));

  useEffect(() => {
    setCarregando(true);
    setErro('');
    api
      .get(`/dashboard/lucro-por-unidade?dias=${dias}`)
      .then(setDados)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [dias]);

  function alternar(indice) {
    setAbertas((atual) => {
      const novo = new Set(atual);
      if (novo.has(indice)) novo.delete(indice);
      else novo.add(indice);
      return novo;
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/admin" className="lucro-unidade-voltar">← Voltar ao Dashboard</Link>
          <h1 style={{ marginTop: 8 }}>Lucro por unidade</h1>
          <p>Faturamento, gastos e lucro detalhados dia a dia, por loja — não por caixa individual.</p>
        </div>
        <div className="dash-periodo-toggle">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              type="button"
              className={`dash-periodo-btn${dias === p.dias ? ' is-active' : ''}`}
              onClick={() => setSearchParams({ dias: String(p.dias) })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {carregando ? (
        <p className="text-muted">Carregando...</p>
      ) : !dados || dados.unidades.length === 0 ? (
        <p className="text-muted">Nenhuma venda confirmada no período.</p>
      ) : (
        <div className="lucro-unidade-lista">
          {dados.unidades.map((u, i) => (
            <UnidadeBloco key={u.unidade} dados={u} aberto={abertas.has(i)} onToggle={() => alternar(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
