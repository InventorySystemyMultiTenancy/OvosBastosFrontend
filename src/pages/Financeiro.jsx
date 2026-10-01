import { useSearchParams } from 'react-router-dom';
import { VisaoGeralTab } from './financeiro/VisaoGeralTab';
import { FornecedoresTab } from './financeiro/FornecedoresTab';
import { CaixasTab } from './financeiro/CaixasTab';

const ABAS_VALIDAS = ['geral', 'fornecedores', 'caixas'];

export function Financeiro() {
  const [searchParams, setSearchParams] = useSearchParams();
  const abaParam = searchParams.get('aba');
  const aba = ABAS_VALIDAS.includes(abaParam) ? abaParam : 'geral';

  function irPara(novaAba) {
    setSearchParams(novaAba === 'geral' ? {} : { aba: novaAba });
  }

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
          onClick={() => irPara('geral')}
        >
          Visão Geral
        </button>
        <button
          type="button"
          className={`page-tab${aba === 'fornecedores' ? ' is-active' : ''}`}
          onClick={() => irPara('fornecedores')}
        >
          Fornecedores
        </button>
        <button
          type="button"
          className={`page-tab${aba === 'caixas' ? ' is-active' : ''}`}
          onClick={() => irPara('caixas')}
        >
          Caixas
        </button>
      </div>

      {aba === 'geral' && <VisaoGeralTab />}
      {aba === 'fornecedores' && <FornecedoresTab />}
      {aba === 'caixas' && <CaixasTab focarDivergencias={searchParams.get('divergencia') === '1'} />}
    </div>
  );
}
