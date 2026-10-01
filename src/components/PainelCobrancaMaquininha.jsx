import { useEffect, useState } from 'react';

const STATUS_MP_LABEL = { PENDENTE: 'Pendente', EM_PROCESSO: 'Em processamento', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado', CANCELADO: 'Cancelado' };
const STATUS_MP_BADGE = { PENDENTE: 'badge-amber', EM_PROCESSO: 'badge-amber', APROVADO: 'badge-green', REJEITADO: 'badge-red', CANCELADO: 'badge-gray' };

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarTempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Painel de cobrança na maquininha, compartilhado entre Vendas.jsx (orçamento existente) e
// Caixa.jsx (venda nova) — recebe o estado do hook useCobrancaMaquininha como props, cada
// página decide o título/copy do <Modal> que o envolve. Deixa o valor de cada cobrança
// editável (pré-preenchido com o que falta) pra permitir dividir entre débito e crédito:
// enviar uma parte, esperar aprovar, enviar o resto depois — tudo no mesmo pedido.
export function PainelCobrancaMaquininha({ pagamentos, resumo, carregando, enviando, cancelando, erro, tempoRestante, onEnviar, onCancelar }) {
  const [valorInput, setValorInput] = useState('');

  useEffect(() => {
    if (resumo && !resumo.cobrancaAtiva && !resumo.completo) {
      setValorInput(resumo.valorRestante.toFixed(2));
    }
  }, [resumo]);

  if (!resumo) {
    return carregando ? <p className="text-muted">Carregando...</p> : null;
  }

  return (
    <div>
      <p className="text-muted">
        Total do pedido: <strong>{formatBRL(resumo.total)}</strong>
      </p>
      {resumo.valorDinheiro > 0 && (
        <p className="text-muted">Já recebido em dinheiro: <strong>{formatBRL(resumo.valorDinheiro)}</strong></p>
      )}

      {pagamentos.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0' }}>
          {pagamentos.map((p, idx) => (
            <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              <span className="text-muted">Cobrança {idx + 1}</span>
              <span className={`badge ${STATUS_MP_BADGE[p.status] || 'badge-gray'}`}>{STATUS_MP_LABEL[p.status] || p.status}</span>
              <strong style={{ marginLeft: 'auto' }}>{formatBRL(p.valor)}</strong>
            </li>
          ))}
        </ul>
      )}

      {erro && <div className="alert-box">{erro}</div>}

      {resumo.completo ? (
        <p className="text-muted">Pagamento completo — venda confirmada.</p>
      ) : resumo.cobrancaAtiva ? (
        <>
          <p>
            Status:{' '}
            <span className={`badge ${STATUS_MP_BADGE[resumo.cobrancaAtiva.status] || 'badge-amber'}`}>
              {STATUS_MP_LABEL[resumo.cobrancaAtiva.status] || resumo.cobrancaAtiva.status}
            </span>
          </p>
          <p className="text-muted">Peça para o cliente inserir ou aproximar o cartão na maquininha.</p>
          {tempoRestante > 0 && (
            <p className="caixa-troco-falta" style={{ marginBottom: 0 }}>Cancela automaticamente em {formatarTempo(tempoRestante)}</p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-danger" onClick={onCancelar} disabled={cancelando}>
              {cancelando ? 'Cancelando...' : 'Cancelar cobrança'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-muted">Falta cobrar: <strong>{formatBRL(resumo.valorRestante)}</strong></p>
          <div className="field">
            <label>Valor desta cobrança (R$)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={resumo.valorRestante}
              value={valorInput}
              onChange={(e) => setValorInput(e.target.value)}
              autoFocus
            />
          </div>
          {pagamentos.length > 0 && (
            <p className="text-muted" style={{ fontSize: 12 }}>
              Pra dividir entre débito e crédito, digite só a parte desta cobrança — o restante fica disponível pra enviar em seguida.
            </p>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onEnviar(valorInput)}
              disabled={enviando || !valorInput || Number(valorInput) <= 0}
            >
              {enviando ? 'Enviando...' : `Enviar cobrança · ${formatBRL(valorInput || 0)}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
