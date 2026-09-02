function formatBRL(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

// jsPDF + autotable são pesados (puxam html2canvas/dompurify) — import dinâmico
// pra não engordar o bundle inicial de quem nunca gera relatório (ex: catálogo público).
async function criarDocumento(titulo, subtitulo) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Ovos Bastos', 14, 18);

  doc.setFontSize(13);
  doc.text(titulo, 14, 28);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text(subtitulo, 14, 35);
  doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, 14, 40);
  doc.setTextColor(20, 20, 20);

  return { doc, autoTable };
}

export async function gerarRelatorioVendas(vendas, { de, ate }) {
  const periodo = de && ate ? `Período: ${formatData(de)} a ${formatData(ate)}` : 'Período: todas as vendas confirmadas';
  const { doc, autoTable } = await criarDocumento('Relatório de Vendas por Período', periodo);

  const total = vendas.reduce((soma, v) => soma + Number(v.total), 0);

  autoTable(doc, {
    startY: 46,
    head: [['#', 'Cliente', 'Vendedor', 'Pagamento', 'Total', 'Data']],
    body: vendas.map((v) => [
      v.id,
      v.cliente?.nome || '—',
      v.vendedor?.nome || 'Loja Online',
      v.formaPagamento || '—',
      formatBRL(v.total),
      formatData(v.confirmadaEm || v.createdAt),
    ]),
    headStyles: { fillColor: [240, 100, 92] },
    styles: { fontSize: 9 },
    foot: [['', '', '', 'Total', formatBRL(total), `${vendas.length} venda(s)`]],
    footStyles: { fillColor: [253, 236, 236], textColor: [20, 20, 20], fontStyle: 'bold' },
  });

  doc.save(`relatorio-vendas-${Date.now()}.pdf`);
}

export async function gerarRelatorioClientesAtivos(clientes) {
  const { doc, autoTable } = await criarDocumento(
    'Relatório de Clientes Ativos',
    `${clientes.length} cliente(s) cadastrado(s) e ativo(s)`
  );

  autoTable(doc, {
    startY: 46,
    head: [['Nome', 'Documento', 'Telefone', 'Cidade', 'Limite de crédito']],
    body: clientes.map((c) => [
      c.nome,
      c.documento || '—',
      c.telefone || '—',
      c.cidade || '—',
      formatBRL(c.limiteCredito),
    ]),
    headStyles: { fillColor: [240, 100, 92] },
    styles: { fontSize: 9 },
  });

  doc.save(`relatorio-clientes-${Date.now()}.pdf`);
}

export async function gerarRelatorioLucro(dados, { de, ate }) {
  const periodo = `Período: ${formatData(de)} a ${formatData(ate)}`;
  const { doc, autoTable } = await criarDocumento('Relatório de Lucro por Período', periodo);

  autoTable(doc, {
    startY: 46,
    head: [['Descrição', 'Fornecedor', 'Unidade', 'Valor', 'Pago em']],
    body: dados.contasPagas.map((c) => [
      c.descricao,
      c.fornecedor || '—',
      c.caixa?.nome || '—',
      formatBRL(c.valor),
      formatData(c.pagoEm),
    ]),
    headStyles: { fillColor: [240, 100, 92] },
    styles: { fontSize: 9 },
    foot: [['', '', '', formatBRL(dados.despesasTotal), `${dados.contasPagas.length} conta(s) paga(s)`]],
    footStyles: { fillColor: [253, 236, 236], textColor: [20, 20, 20], fontStyle: 'bold' },
  });

  const y = doc.lastAutoTable.finalY + 14;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Resumo do período', 14, y);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(`Faturamento: ${formatBRL(dados.faturamento)}`, 14, y + 8);
  doc.text(`Custo dos produtos vendidos: ${formatBRL(dados.custoProdutosTotal)}`, 14, y + 15);
  doc.text(`Despesas pagas: ${formatBRL(dados.despesasTotal)}`, 14, y + 22);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(dados.lucro >= 0 ? 30 : 200, dados.lucro >= 0 ? 120 : 40, 30);
  doc.text(`Lucro: ${formatBRL(dados.lucro)}`, 14, y + 31);
  doc.setTextColor(20, 20, 20);

  doc.save(`relatorio-lucro-${Date.now()}.pdf`);
}

export async function gerarRelatorioEstoqueAtual(produtos) {
  const { doc, autoTable } = await criarDocumento('Relatório de Estoque Atual', `${produtos.length} produto(s) ativo(s)`);

  const totalUnidades = produtos.reduce((soma, p) => soma + p.quantidade, 0);

  autoTable(doc, {
    startY: 46,
    head: [['Produto', 'Tipo', 'Unidade', 'Preço venda', 'Estoque', 'Mínimo', 'Situação']],
    body: produtos.map((p) => [
      p.nome,
      p.tipo || '—',
      p.unidade,
      formatBRL(p.precoVenda),
      p.quantidade,
      p.estoqueMinimo,
      p.quantidade <= p.estoqueMinimo ? 'Estoque baixo' : 'OK',
    ]),
    headStyles: { fillColor: [240, 100, 92] },
    styles: { fontSize: 9 },
    foot: [['', '', '', '', totalUnidades, '', 'Total de unidades']],
    footStyles: { fillColor: [253, 236, 236], textColor: [20, 20, 20], fontStyle: 'bold' },
  });

  doc.save(`relatorio-estoque-${Date.now()}.pdf`);
}
