import { useState } from 'react';
import { VisaoGeralTab } from './financeiro/VisaoGeralTab';
import { FornecedoresTab } from './financeiro/FornecedoresTab';

export function Financeiro() {
  const [aba, setAba] = useState('geral');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Financeiro</h1>
          <p>Contas a pagar, contas a receber, fluxo de caixa, relatórios e pagamentos a fornecedores.</p>
        </div>
      </div>

      <div className="page-tabs">
        <button
          type="button"
          className={`page-tab${aba === 'geral' ? ' is-active' : ''}`}
          onClick={() => setAba('geral')}
        >
          Visão Geral
        </button>
        <button
          type="button"
          className={`page-tab${aba === 'fornecedores' ? ' is-active' : ''}`}
          onClick={() => setAba('fornecedores')}
        >
          Fornecedores
        </button>
      </div>

      {aba === 'geral' ? <VisaoGeralTab /> : <FornecedoresTab />}
    </div>
  );
}
