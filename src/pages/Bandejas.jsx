import { useState } from 'react';
import { SaldosTab } from './bandejas/SaldosTab';
import { RevendasTab } from './bandejas/RevendasTab';

export function Bandejas() {
  const [aba, setAba] = useState('saldos');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Bandejas Retornáveis</h1>
        </div>
      </div>

      <div className="page-tabs">
        <button
          type="button"
          className={`page-tab${aba === 'saldos' ? ' is-active' : ''}`}
          onClick={() => setAba('saldos')}
        >
          Saldo por cliente
        </button>
        <button
          type="button"
          className={`page-tab${aba === 'revendas' ? ' is-active' : ''}`}
          onClick={() => setAba('revendas')}
        >
          Revendas
        </button>
      </div>

      {aba === 'saldos' ? <SaldosTab /> : <RevendasTab />}
    </div>
  );
}
