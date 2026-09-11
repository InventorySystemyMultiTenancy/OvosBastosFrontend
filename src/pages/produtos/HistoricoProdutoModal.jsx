import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Modal } from '../../components/Modal';

const LABEL_CAMPO = {
  nome: 'Nome',
  tipo: 'Categoria',
  precoCusto: 'Preço de custo',
  estoqueMinimo: 'Estoque mínimo',
  preco: 'Preço',
  quantidadeGrao: 'Quantidade em grão-base',
  ehBase: 'Nível de referência',
  ativo: 'Ativo',
  precoManual: 'Preço travado manualmente',
};

const CAMPO_MOEDA = new Set(['precoCusto', 'preco']);
const CAMPO_BOOLEANO = new Set(['ehBase', 'ativo', 'precoManual']);

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarValorCampo(campo, valor) {
  if (valor === null || valor === undefined) return '—';
  if (CAMPO_MOEDA.has(campo)) return formatBRL(valor);
  if (CAMPO_BOOLEANO.has(campo)) return valor === 'true' ? 'Sim' : 'Não';
  return valor;
}

function formatarDataHora(data) {
  return new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Junta as duas fontes de auditoria de um produto numa única linha do tempo: alterações de
// catálogo (HistoricoAlteracao — nome, preços, níveis de venda) e movimentações de estoque
// (MovimentacaoEstoque — entrada/saída manual, recebimento, distribuição). Vê ProdutosTab.jsx.
export function HistoricoProdutoModal({ produto, onClose }) {
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setItens(null);
    setErro('');
    Promise.all([
      api.get(`/produtos/${produto.id}/historico`),
      api.get(`/estoque/historico?produtoId=${produto.id}`),
    ])
      .then(([alteracoes, movimentacoes]) => {
        const linhasAlteracoes = alteracoes.map((a) => ({
          id: `alt-${a.id}`,
          createdAt: a.createdAt,
          usuario: a.usuario?.nome || null,
          icone: '✏️',
          descricao:
            a.entidade === 'NivelVendaProduto'
              ? `Nível "${a.nivelNome || a.entidadeId}" — ${LABEL_CAMPO[a.campo] || a.campo}: ${formatarValorCampo(a.campo, a.valorAntigo)} → ${formatarValorCampo(a.campo, a.valorNovo)}`
              : `${LABEL_CAMPO[a.campo] || a.campo}: ${formatarValorCampo(a.campo, a.valorAntigo)} → ${formatarValorCampo(a.campo, a.valorNovo)}`,
          motivo: a.motivo,
        }));
        const linhasMovimentacoes = movimentacoes.map((m) => ({
          id: `mov-${m.id}`,
          createdAt: m.createdAt,
          usuario: m.usuario?.nome || null,
          icone: m.tipo === 'ENTRADA' ? '📥' : '📤',
          descricao: `${m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} de ${m.quantidade} (grão-base)${m.caixa ? ` — ${m.caixa.nome}` : ' — não distribuído'}`,
          motivo: m.motivo,
        }));
        setItens([...linhasAlteracoes, ...linhasMovimentacoes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .catch((e) => setErro(e.message));
  }, [produto.id]);

  return (
    <Modal title={`Histórico — ${produto.nome}`} onClose={onClose}>
      {erro && <div className="alert-box">{erro}</div>}
      {itens === null ? (
        <p className="text-muted">Carregando...</p>
      ) : itens.length === 0 ? (
        <p className="text-muted">Nenhuma alteração registrada ainda para este produto.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 420, overflowY: 'auto' }}>
          {itens.map((item) => (
            <li key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
                <span>{item.icone} {item.descricao}</span>
                <span className="text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatarDataHora(item.createdAt)}</span>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                {item.usuario || 'Sistema'}{item.motivo ? ` · ${item.motivo}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  );
}
