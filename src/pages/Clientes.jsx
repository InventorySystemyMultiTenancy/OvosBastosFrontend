import { useState } from 'react';
import { ClientesTab } from './clientes/ClientesTab';
import { FornecedoresTab } from './clientes/FornecedoresTab';

export function Clientes() {
  const [aba, setAba] = useState('clientes');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes & Fornecedores</h1>
        </div>
      </div>

      <div className="page-tabs">
        <button
          type="button"
          className={`page-tab${aba === 'clientes' ? ' is-active' : ''}`}
          onClick={() => setAba('clientes')}
        >
          Clientes
        </button>
        <button
          type="button"
          className={`page-tab${aba === 'fornecedores' ? ' is-active' : ''}`}
          onClick={() => setAba('fornecedores')}
        >
          Fornecedores
        </button>
      </div>

      {aba === 'clientes' ? <ClientesTab /> : <FornecedoresTab />}
    </div>
  );
}
