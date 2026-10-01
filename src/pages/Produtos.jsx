import { useState } from 'react';
import { ProdutosTab } from './produtos/ProdutosTab';
import { MatrizEstoqueTab } from './produtos/MatrizEstoqueTab';

export function Produtos() {
  const [aba, setAba] = useState('produtos');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Estoque de Ovos</h1>
        </div>
      </div>

      <div className="page-tabs">
        <button
          type="button"
          className={`page-tab${aba === 'produtos' ? ' is-active' : ''}`}
          onClick={() => setAba('produtos')}
        >
          Produtos
        </button>
        <button
          type="button"
          className={`page-tab${aba === 'matriz' ? ' is-active' : ''}`}
          onClick={() => setAba('matriz')}
        >
          Estoque por Unidade
        </button>
      </div>

      {aba === 'produtos' ? <ProdutosTab /> : <MatrizEstoqueTab />}
    </div>
  );
}
