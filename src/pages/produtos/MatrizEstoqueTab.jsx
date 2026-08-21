import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export function MatrizEstoqueTab() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setCarregando(true);
    api.get('/estoque/matriz').then(setDados).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <p>Quanto de cada produto está alocado em cada unidade agora.</p>
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
                  <td>{p.naoDistribuido}</td>
                  {dados.caixas.map((c) => (
                    <td key={c.id}>{dados.celulas[`${p.id}-${c.id}`] || 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
