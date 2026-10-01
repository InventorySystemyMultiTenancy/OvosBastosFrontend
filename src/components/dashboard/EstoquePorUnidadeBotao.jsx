import { useState } from 'react';
import { api } from '../../api/client';
import { Modal } from '../Modal';

export function EstoquePorUnidadeBotao() {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  function abrir() {
    setAberto(true);
    if (dados) return;
    setCarregando(true);
    setErro('');
    api
      .get('/dashboard/estoque-por-unidade')
      .then(setDados)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  const unidades = dados?.unidades || [];

  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={abrir}>📦 Estoque por unidade</button>

      {aberto && (
        <Modal title="Quanto cada unidade deveria ter" onClose={() => setAberto(false)}>
          <p className="text-muted" style={{ marginTop: 0, marginBottom: 14 }}>
            O que sobrou distribuído em cada unidade agora, produto a produto.
          </p>
          {erro && <div className="alert-box">{erro}</div>}
          {carregando ? (
            <p className="text-muted">Carregando...</p>
          ) : unidades.length === 0 ? (
            <p className="text-muted">Nenhum estoque distribuído a unidades ainda.</p>
          ) : (
            <div className="dash-melhores-caixas">
              {unidades.map((u) => {
                const maxQtd = Math.max(1, ...u.produtos.map((p) => p.quantidade));
                return (
                  <div key={u.unidade} className="dash-melhores-caixa-bloco">
                    <div className="dash-melhores-caixa-header">
                      <span>{u.unidade}</span>
                      <span className="text-muted" style={{ fontWeight: 500 }}>
                        deveria ter {u.total} {u.total === 1 ? 'unidade' : 'unidades'} no total
                      </span>
                    </div>
                    <ul className="dash-melhores-caixa-lista">
                      {u.produtos.map((p, i) => (
                        <li key={p.produtoId}>
                          <span className="dash-melhores-rank">{i + 1}º</span>
                          <span className="dash-melhores-main">
                            <span className="dash-melhores-nome" title={p.nome}>{p.nome}</span>
                            <span className="dash-melhores-track">
                              <span className="dash-melhores-fill" style={{ width: `${Math.max((p.quantidade / maxQtd) * 100, 4)}%` }} />
                            </span>
                          </span>
                          <span className="dash-melhores-qtd">{p.quantidade} un.</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAberto(false)}>Fechar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
