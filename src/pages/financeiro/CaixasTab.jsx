import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Table } from '../../components/Table';

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDataHora(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR') : '—';
}

const FILTRO_VAZIO = { caixaId: '', usuarioId: '', de: '', ate: '', apenasDivergencia: false };

export function CaixasTab() {
  const [sessoes, setSessoes] = useState([]);
  const [caixas, setCaixas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [revisando, setRevisando] = useState(null);

  function carregar() {
    setCarregando(true);
    setErro('');
    const params = new URLSearchParams();
    if (filtro.caixaId) params.set('caixaId', filtro.caixaId);
    if (filtro.usuarioId) params.set('usuarioId', filtro.usuarioId);
    if (filtro.de) params.set('de', filtro.de);
    if (filtro.ate) params.set('ate', filtro.ate);
    if (filtro.apenasDivergencia) params.set('apenasDivergencia', 'true');

    api
      .get(`/financeiro/sessoes-caixa?${params.toString()}`)
      .then(setSessoes)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, [filtro]);
  useEffect(() => {
    api.get('/caixas').then(setCaixas).catch(() => {});
    api.get('/auth/usuarios').then(setUsuarios).catch(() => {});
  }, []);

  async function revisarDivergencia(sessao) {
    setRevisando(sessao.id);
    try {
      await api.put(`/financeiro/sessoes-caixa/${sessao.id}/revisar-divergencia`, {});
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setRevisando(null);
    }
  }

  const divergenciasEmAberto = useMemo(
    () => sessoes.filter((s) => s.divergenciaAbertura !== null && Number(s.divergenciaAbertura) !== 0 && !s.divergenciaRevisada).length,
    [sessoes]
  );

  const colunas = [
    {
      key: 'caixa',
      header: 'Unidade',
      render: (s) => (
        <span>
          <strong>{s.caixa.nome}</strong>
          <span className="text-muted" style={{ display: 'block', fontSize: 12 }}>{s.caixa.unidade}</span>
        </span>
      ),
    },
    {
      key: 'abertura',
      header: 'Abertura',
      render: (s) => (
        <span>
          {formatBRL(s.valorAbertura)}
          <span className="text-muted" style={{ display: 'block', fontSize: 12 }}>
            {s.usuarioAbertura.nome} · {formatDataHora(s.abertaEm)}
          </span>
        </span>
      ),
    },
    {
      key: 'fechamento',
      header: 'Fechamento',
      render: (s) =>
        s.status === 'FECHADA' ? (
          <span>
            {formatBRL(s.valorFechamento)}
            <span className="text-muted" style={{ display: 'block', fontSize: 12 }}>
              {s.usuarioFechamento?.nome} · {formatDataHora(s.fechadaEm)}
            </span>
          </span>
        ) : (
          <span className="badge badge-green">Em andamento</span>
        ),
    },
    {
      key: 'divergencia',
      header: 'Divergência na abertura',
      render: (s) => {
        if (s.divergenciaAbertura === null) return <span className="text-muted">—</span>;
        const valor = Number(s.divergenciaAbertura);
        if (valor === 0) return <span className="badge badge-green">Confere</span>;
        return (
          <span>
            <strong className={valor > 0 ? 'text-success' : 'text-danger'}>
              {valor > 0 ? '+' : ''}{formatBRL(valor)}
            </strong>
            {s.divergenciaRevisada ? (
              <span className="badge badge-gray" style={{ marginLeft: 6 }}>Revisada</span>
            ) : (
              <span className="badge badge-red" style={{ marginLeft: 6 }}>Pendente</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'acoes',
      header: '',
      render: (s) =>
        s.divergenciaAbertura !== null && Number(s.divergenciaAbertura) !== 0 && !s.divergenciaRevisada ? (
          <button className="btn btn-secondary btn-sm" onClick={() => revisarDivergencia(s)} disabled={revisando === s.id}>
            {revisando === s.id ? 'Marcando...' : 'Marcar revisada'}
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      {erro && <div className="alert-box">{erro}</div>}

      {divergenciasEmAberto > 0 && (
        <div className="alert-box" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
          {divergenciasEmAberto} {divergenciasEmAberto === 1 ? 'divergência pendente' : 'divergências pendentes'} de revisão nesta listagem.
        </div>
      )}

      <div className="section-title" style={{ marginTop: 0 }}>Filtros</div>
      <div className="form-grid" style={{ marginBottom: 20 }}>
        <div className="field">
          <label>Unidade/Caixa</label>
          <select value={filtro.caixaId} onChange={(e) => setFiltro({ ...filtro, caixaId: e.target.value })}>
            <option value="">Todas</option>
            {caixas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} — {c.unidade}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Funcionário</label>
          <select value={filtro.usuarioId} onChange={(e) => setFiltro({ ...filtro, usuarioId: e.target.value })}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>De</label>
          <input type="date" value={filtro.de} onChange={(e) => setFiltro({ ...filtro, de: e.target.value })} />
        </div>
        <div className="field">
          <label>Até</label>
          <input type="date" value={filtro.ate} onChange={(e) => setFiltro({ ...filtro, ate: e.target.value })} />
        </div>
      </div>
      <div className="field" style={{ marginTop: -8, marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
          <input
            type="checkbox"
            checked={filtro.apenasDivergencia}
            onChange={(e) => setFiltro({ ...filtro, apenasDivergencia: e.target.checked })}
          />
          Mostrar apenas sessões com divergência
        </label>
      </div>

      <div className="section-title">Aberturas e fechamentos de caixa</div>
      {carregando ? (
        <p className="text-muted">Carregando...</p>
      ) : (
        <Table columns={colunas} rows={sessoes} rowKey={(s) => s.id} emptyMessage="Nenhuma sessão de caixa encontrada para esse filtro." />
      )}
    </div>
  );
}
