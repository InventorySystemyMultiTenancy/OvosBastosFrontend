import { useEffect, useState } from 'react';
import { api } from '../api/client';

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setResumo).catch((e) => setErro(e.message));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard Inteligente</h1>
          <p>Visão completa e atualizada de toda a operação.</p>
        </div>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {resumo && (
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-value">{formatBRL(resumo.faturamentoHoje)}</div>
            <div className="stat-label">Acumulado do dia em tempo real</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{resumo.pedidosHoje}</div>
            <div className="stat-label">Pedidos confirmados hoje</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{resumo.clientesComPedidoNoMes}</div>
            <div className="stat-label">Clientes com pedidos no mês</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{resumo.bandejasPendentes}</div>
            <div className="stat-label">Bandejas pendentes de devolução</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{resumo.estoqueDisponivel}</div>
            <div className="stat-label">Unidades disponíveis em estoque</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{resumo.produtosEstoqueBaixo}</div>
            <div className="stat-label">Produtos com estoque baixo</div>
          </div>
        </div>
      )}
    </div>
  );
}
