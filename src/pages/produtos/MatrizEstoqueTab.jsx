import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export function MatrizEstoqueTab() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  function carregar() {
    setCarregando(true);
    api.get('/estoque/matriz').then(setDados).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  // Corrige a quantidade contada de um produto — no pool central (naoDistribuido, sem caixaId)
  // ou já distribuído numa unidade (com caixaId) — pro valor exato da contagem física, sem
  // precisar passar por Recebimento nem pelo fluxo de Entrada/Saída (que somam um delta em vez
  // de fixar um valor final). Ver PUT /estoque/ajuste.
  async function salvarAjuste(produtoId, caixaId, valorAtual, valorNovo) {
    if (valorNovo === '' || Number.isNaN(Number(valorNovo)) || Number(valorNovo) === valorAtual) return;
    try {
      await api.put('/estoque/ajuste', { produtoId, caixaId: caixaId || undefined, quantidade: Number(valorNovo) });
      carregar();
    } catch (err) {
      alert(err.message);
      carregar();
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p>
            Quanto de cada produto está alocado em cada unidade agora. Os números são editáveis — corrija aqui
            direto depois de uma contagem física, sem precisar lançar um Recebimento.
          </p>
        </div>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {carregando ? (
        <p className="text-muted">Carregando...</p>
      ) : !dados || dados.produtos.length === 0 ? (
        <p className="text-muted">Nenhum produto cadastrado.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Não distribuído</th>
                {dados.caixas.map((c) => (
                  <th key={c.id}>
                    {c.nome}
                    <div className="text-muted" style={{ fontWeight: 400, fontSize: 11 }}>{c.unidade}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.produtos.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      defaultValue={p.naoDistribuido}
                      key={`${p.id}-pool-${p.naoDistribuido}`}
                      className="matriz-estoque-input"
                      title="Corrigir estoque não distribuído deste produto"
                      onBlur={(e) => salvarAjuste(p.id, null, p.naoDistribuido, e.target.value)}
                    />
                  </td>
                  {dados.caixas.map((c) => {
                    const valor = dados.celulas[`${p.id}-${c.id}`] || 0;
                    return (
                      <td key={c.id}>
                        <input
                          type="number"
                          min="0"
                          defaultValue={valor}
                          key={`${p.id}-${c.id}-${valor}`}
                          className="matriz-estoque-input"
                          title={`Corrigir estoque de "${p.nome}" em ${c.nome}`}
                          onBlur={(e) => salvarAjuste(p.id, c.id, valor, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
