import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Modal } from '../../components/Modal';

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_LABEL = { ABERTO: 'Aberto', PARCIAL: 'Parcial', PAGO: 'Pago' };
const STATUS_BADGE = { ABERTO: 'badge-amber', PARCIAL: 'badge-amber', PAGO: 'badge-green' };

export function FornecedoresTab() {
  const [pagamentos, setPagamentos] = useState(null);
  const [matriz, setMatriz] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [fornecedorId, setFornecedorId] = useState('');
  const [precos, setPrecos] = useState([]);
  const [carregandoPrecos, setCarregandoPrecos] = useState(false);
  const [salvandoPrecos, setSalvandoPrecos] = useState(false);

  const [modalPagar, setModalPagar] = useState(null); // recebimento sendo pago
  const [valorPagamento, setValorPagamento] = useState('');
  const [registrandoPagamento, setRegistrandoPagamento] = useState(false);
  const [erroPagamento, setErroPagamento] = useState('');

  function carregar() {
    setCarregando(true);
    Promise.all([api.get('/financeiro/fornecedores-pagamentos'), api.get('/financeiro/fornecedores-produtos')])
      .then(([p, m]) => {
        setPagamentos(p);
        setMatriz(m);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  function carregarPrecos(id) {
    setCarregandoPrecos(true);
    api
      .get(`/fornecedores/${id}/precos`)
      .then(setPrecos)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregandoPrecos(false));
  }

  useEffect(() => {
    if (fornecedorId) carregarPrecos(fornecedorId);
  }, [fornecedorId]);

  function mudarPreco(produtoId, valor) {
    setPrecos((atual) => atual.map((p) => (p.produtoId === produtoId ? { ...p, precoUnitario: valor } : p)));
  }

  async function salvarPrecos() {
    setSalvandoPrecos(true);
    try {
      const linhas = precos
        .filter((p) => p.precoUnitario !== null && p.precoUnitario !== '')
        .map((p) => ({ produtoId: p.produtoId, precoUnitario: Number(p.precoUnitario) }));
      await api.put(`/fornecedores/${fornecedorId}/precos`, { precos: linhas });
      carregarPrecos(fornecedorId);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvandoPrecos(false);
    }
  }

  function abrirPagamento(recebimento) {
    setModalPagar(recebimento);
    setValorPagamento(String(recebimento.restante));
    setErroPagamento('');
  }

  async function confirmarPagamento(e) {
    e.preventDefault();
    setRegistrandoPagamento(true);
    setErroPagamento('');
    try {
      await api.post(`/recebimentos/${modalPagar.id}/pagamentos`, { valor: Number(valorPagamento) });
      setModalPagar(null);
      carregar();
    } catch (err) {
      setErroPagamento(err.message);
    } finally {
      setRegistrandoPagamento(false);
    }
  }

  const totais = useMemo(() => {
    if (!pagamentos) return null;
    return pagamentos.reduce(
      (acc, f) => ({
        valorTotal: acc.valorTotal + f.valorTotal,
        valorPago: acc.valorPago + f.valorPago,
        valorEmAberto: acc.valorEmAberto + f.valorEmAberto,
      }),
      { valorTotal: 0, valorPago: 0, valorEmAberto: 0 }
    );
  }, [pagamentos]);

  const fornecedorAtual = pagamentos?.find((f) => f.id === Number(fornecedorId));

  return (
    <div>
      {erro && <div className="alert-box">{erro}</div>}

      {carregando ? (
        <p className="text-muted">Carregando...</p>
      ) : (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>Pagamentos a fornecedores</div>
          <div className="stat-grid is-compacto" style={{ marginBottom: 28 }}>
            <div className="stat-tile">
              <div className="stat-value">{formatBRL(totais.valorTotal)}</div>
              <div className="stat-label">Total devido pelas entregas</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{formatBRL(totais.valorPago)}</div>
              <div className="stat-label">Já pago</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{formatBRL(totais.valorEmAberto)}</div>
              <div className="stat-label">Em aberto</div>
            </div>
          </div>

          <div className="section-title">Produtos trazidos por fornecedor</div>
          {matriz && matriz.fornecedores.length > 0 ? (
            <div className="table-wrap" style={{ marginBottom: 28 }}>
              <table>
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    {matriz.produtos.map((p) => <th key={p.id}>{p.nome}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {matriz.fornecedores.map((f) => (
                    <tr key={f.id}>
                      <td>{f.nome}</td>
                      {matriz.produtos.map((p) => (
                        <td key={p.id}>{matriz.celulas[`${f.id}-${p.id}`] || 0}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted" style={{ marginBottom: 28 }}>Nenhuma entrega com fornecedor definido ainda.</p>
          )}

          <div className="section-title">Preços e entregas por fornecedor</div>
          <div className="field" style={{ maxWidth: 340, marginBottom: 20 }}>
            <label>Fornecedor</label>
            <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Selecione um fornecedor...</option>
              {pagamentos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

          {fornecedorId && (
            <>
              <div className="section-title" style={{ marginTop: 0 }}>Preço por produto</div>
              {carregandoPrecos ? (
                <p className="text-muted">Carregando...</p>
              ) : (
                <div className="table-wrap" style={{ marginBottom: 14 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Preço cobrado (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {precos.map((p) => (
                        <tr key={p.produtoId}>
                          <td>{p.nome}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              style={{ width: 110 }}
                              value={p.precoUnitario ?? ''}
                              onChange={(e) => mudarPreco(p.produtoId, e.target.value)}
                              placeholder="0,00"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="modal-actions" style={{ justifyContent: 'flex-start', marginBottom: 28 }}>
                <button className="btn btn-primary btn-sm" onClick={salvarPrecos} disabled={salvandoPrecos}>
                  {salvandoPrecos ? 'Salvando...' : 'Salvar preços'}
                </button>
              </div>

              <div className="section-title" style={{ marginTop: 0 }}>Entregas</div>
              {fornecedorAtual && fornecedorAtual.recebimentos.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Data</th>
                        <th>Valor total</th>
                        <th>Pago</th>
                        <th>Restante</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fornecedorAtual.recebimentos.map((r) => (
                        <tr key={r.id}>
                          <td>{r.id}</td>
                          <td>{new Date(r.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td>{formatBRL(r.valorTotal)}</td>
                          <td>{formatBRL(r.valorPago)}</td>
                          <td>{formatBRL(r.restante)}</td>
                          <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                          <td>
                            {r.status !== 'PAGO' && (
                              <button className="btn btn-secondary btn-sm" onClick={() => abrirPagamento(r)}>Registrar pagamento</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">Nenhuma entrega desse fornecedor ainda.</p>
              )}
            </>
          )}
        </>
      )}

      {modalPagar && (
        <Modal title={`Registrar pagamento — Entrega #${modalPagar.id}`} onClose={() => setModalPagar(null)}>
          <form onSubmit={confirmarPagamento}>
            <p className="text-muted" style={{ marginBottom: 14 }}>Restante devido: {formatBRL(modalPagar.restante)}</p>
            <div className="field">
              <label>Valor a pagar agora (R$) *</label>
              <input
                type="number"
                min="0.01"
                max={modalPagar.restante}
                step="0.01"
                value={valorPagamento}
                onChange={(e) => setValorPagamento(e.target.value)}
                required
                autoFocus
              />
            </div>
            <p className="text-muted" style={{ marginTop: 6, fontSize: 12 }}>
              Deixe o valor cheio pra marcar a entrega como paga, ou reduza pra registrar um pagamento parcial.
            </p>
            {erroPagamento && <div className="alert-box">{erroPagamento}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalPagar(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={registrandoPagamento}>
                {registrandoPagamento ? 'Salvando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
