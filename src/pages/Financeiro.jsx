import { useState } from 'react';
import { VisaoGeralTab } from './financeiro/VisaoGeralTab';
import { FornecedoresTab } from './financeiro/FornecedoresTab';
import { CaixasTab } from './financeiro/CaixasTab';

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
        <button
          type="button"
          className={`page-tab${aba === 'caixas' ? ' is-active' : ''}`}
          onClick={() => setAba('caixas')}
        >
          Caixas
        </button>
      </div>

      {aba === 'geral' && <VisaoGeralTab />}
      {aba === 'fornecedores' && <FornecedoresTab />}
      {aba === 'caixas' && <CaixasTab />}
    </div>
  );
}
