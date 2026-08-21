import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Table } from '../../components/Table';

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function RevendasTab() {
  const [revendas, setRevendas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setCarregando(true);
    api.get('/bandejas/revendas').then(setRevendas).catch((e) => setErro(e.message)).finally(() => setCarregando(false));
  }, []);

  const totalGasto = revendas.reduce((s, r) => s + Number(r.valor), 0);
  const totalBandejas = revendas.reduce((s, r) => s + r.quantidade, 0);
  const ticketMedio = totalBandejas > 0 ? totalGasto / totalBandejas : 0;

  const columns = [
    { key: 'createdAt', header: 'Data', render: (r) => new Date(r.createdAt).toLocaleDateString('pt-BR') },
    { key: 'cliente', header: 'Cliente', render: (r) => r.cliente.nome },
    { key: 'quantidade', header: 'Bandejas' },
    { key: 'valor', header: 'Valor pago', render: (r) => formatBRL(r.valor) },
    {
      key: 'unitario',
      header: 'R$ por bandeja',
      render: (r) => formatBRL(Number(r.valor) / r.quantidade),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <p>Todo valor pago aos clientes ao revenderem bandejas de volta — já descontado do lucro líquido.</p>
        </div>
      </div>

      {erro && <div className="alert-box">{erro}</div>}

      {!carregando && (
        <div className="stat-grid is-compacto">
          <div className="stat-tile">
            <div className="stat-value">{formatBRL(totalGasto)}</div>
            <div className="stat-label">Total pago em revendas</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{totalBandejas}</div>
            <div className="stat-label">Bandejas revendidas</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{formatBRL(ticketMedio)}</div>
            <div className="stat-label">Preço médio por bandeja</div>
          </div>
        </div>
      )}

      {carregando ? <p className="text-muted">Carregando...</p> : (
        <Table columns={columns} rows={revendas} rowKey={(r) => r.id} emptyMessage="Nenhuma revenda registrada ainda." />
      )}
    </div>
  );
}
