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
  doc.setFont(undefined, 'bold');
  doc.setTextColor(dados.lucro >= 0 ? 30 : 200, dados.lucro >= 0 ? 120 : 40, 30);
  doc.text(`Lucro (faturamento − custo dos produtos): ${formatBRL(dados.lucro)}`, 14, y + 24);
  doc.setTextColor(20, 20, 20);
  doc.setFont(undefined, 'normal');
  doc.text(`Despesas pagas no período (não descontadas do lucro acima): ${formatBRL(dados.despesasTotal)}`, 14, y + 34);

  doc.save(`relatorio-lucro-${Date.now()}.pdf`);
}

const LABEL_FORMA_FECHAMENTO = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  CARTAO_OUTRO: 'Cartão (não identificado)',
  BOLETO: 'Boleto',
  FIADO: 'Fiado',
};

export async function gerarRelatorioFechamentoDia(dados) {
  const dia = `Data: ${formatData(dados.data)} · ${dados.quantidadeVendas} venda(s) confirmada(s)`;
  const { doc, autoTable } = await criarDocumento('Fechamento do Dia', dia);

  const linhas = Object.entries(dados.porFormaPagamento)
    .filter(([, valor]) => valor > 0)
    .map(([forma, valor]) => [LABEL_FORMA_FECHAMENTO[forma] || forma, formatBRL(valor)]);

  autoTable(doc, {
    startY: 46,
    head: [['Forma de pagamento', 'Valor']],
    body: linhas,
    headStyles: { fillColor: [240, 100, 92] },
    styles: { fontSize: 9 },
    foot: [['Total vendido no dia', formatBRL(dados.faturamento)]],
    footStyles: { fillColor: [253, 236, 236], textColor: [20, 20, 20], fontStyle: 'bold' },
  });

  const y = doc.lastAutoTable.finalY + 14;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Resumo do dia', 14, y);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(`Faturamento: ${formatBRL(dados.faturamento)}`, 14, y + 8);
  doc.text(`Custo dos produtos vendidos: ${formatBRL(dados.custoProdutos)}`, 14, y + 15);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(dados.lucroLiquido >= 0 ? 30 : 200, dados.lucroLiquido >= 0 ? 120 : 40, 30);
  doc.text(`Lucro líquido (venda total − custo dos produtos): ${formatBRL(dados.lucroLiquido)}`, 14, y + 24);
  doc.setTextColor(20, 20, 20);
  doc.setFont(undefined, 'normal');

  doc.save(`fechamento-dia-${Date.now()}.pdf`);
}

// Relatório gerado na hora que uma sessão de caixa fecha: quanto vendeu em cada forma de
// pagamento (dinheiro incluso) e, quando a maquininha Mercado Pago está configurada nesse
// caixa, uma comparação lado a lado com o que a própria conta Mercado Pago registrou no mesmo
// intervalo — pra bater com o relatório que a maquininha também consegue imprimir.
export async function gerarRelatorioFechamentoCaixa({ caixaNome, abertaEm, fechadaEm, valorAbertura, valorFechamento, resumoVendas, relatorioMaquininha }) {
  const periodo = `${caixaNome} · ${new Date(abertaEm).toLocaleString('pt-BR')} a ${new Date(fechadaEm).toLocaleString('pt-BR')}`;
  const { doc, autoTable } = await criarDocumento('Fechamento de Caixa', periodo);

  const linhas = Object.entries(resumoVendas.porFormaPagamento)
    .filter(([, valor]) => valor > 0)
    .map(([forma, valor]) => [LABEL_FORMA_FECHAMENTO[forma] || forma, formatBRL(valor)]);

  autoTable(doc, {
    startY: 46,
    head: [['Forma de pagamento', 'Valor']],
    body: linhas,
    headStyles: { fillColor: [240, 100, 92] },
    styles: { fontSize: 9 },
    foot: [['Total vendido na sessão', formatBRL(resumoVendas.faturamento)]],
    footStyles: { fillColor: [253, 236, 236], textColor: [20, 20, 20], fontStyle: 'bold' },
  });

  let y = doc.lastAutoTable.finalY + 14;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Fundo de caixa', 14, y);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(`Abertura: ${formatBRL(valorAbertura)}`, 14, y + 8);
  doc.text(`Fechamento: ${formatBRL(valorFechamento)}`, 14, y + 15);

  y += 30;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Comparação com a maquininha (Mercado Pago)', 14, y);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);

  if (!relatorioMaquininha?.disponivel) {
    doc.setTextColor(150, 60, 40);
    doc.text(relatorioMaquininha?.motivo || 'Relatório da maquininha indisponível.', 14, y + 8);
    doc.setTextColor(20, 20, 20);
  } else {
    const credSistema = resumoVendas.porFormaPagamento.CARTAO_CREDITO || 0;
    const debSistema = resumoVendas.porFormaPagamento.CARTAO_DEBITO || 0;
    autoTable(doc, {
      startY: y + 4,
      head: [['', 'Sistema', 'Maquininha (Mercado Pago)']],
      body: [
        ['Crédito', formatBRL(credSistema), formatBRL(relatorioMaquininha.totais.credit_card)],
        ['Débito', formatBRL(debSistema), formatBRL(relatorioMaquininha.totais.debit_card)],
        ['Total cartão', formatBRL(credSistema + debSistema), formatBRL(relatorioMaquininha.totalGeral)],
      ],
      headStyles: { fillColor: [240, 100, 92] },
      styles: { fontSize: 9 },
    });
  }

  doc.save(`fechamento-caixa-${Date.now()}.pdf`);
}

function formatPct(pct) {
  if (pct === null || pct === undefined) return 'novo';
  const sinal = pct > 0 ? '+' : '';
  return `${sinal}${Number(pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

// Relatório completo do dashboard (botão "Imprimir" no topo): tudo que aparece na tela,
// respeitando o período escolhido (Hoje/7/30/90 dias ou data personalizada). Os gráficos
// viram tabelas — mesmo dado, só que legível no papel. Abre direto o diálogo de impressão
// numa aba nova; se o navegador bloquear o pop-up, baixa o PDF.
export async function gerarRelatorioDashboard(resumo, { periodoLabel, comparacaoLabel, ehAdmin }) {
  const desde = formatData(resumo.periodoDesde);
  const ate = formatData(resumo.periodoAte);
  const { doc, autoTable } = await criarDocumento('Relatório do Dashboard', `${periodoLabel} (${desde} a ${ate})`);

  const estilo = {
    headStyles: { fillColor: [240, 100, 92] },
    styles: { fontSize: 9 },
    footStyles: { fillColor: [253, 236, 236], textColor: [20, 20, 20], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  };

  let y = 48;
  function secao(titulo) {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 18;
    }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(titulo, 14, y);
    doc.setFont(undefined, 'normal');
    y += 3;
  }
  function tabela(opcoes) {
    autoTable(doc, { ...estilo, ...opcoes, startY: y });
    y = doc.lastAutoTable.finalY + 12;
  }
  function vazio(texto) {
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(texto, 14, y + 5);
    doc.setTextColor(20, 20, 20);
    y += 14;
  }

  // Indicadores principais (cards do topo)
  secao('Indicadores do período');
  const indicadores = [];
  if (ehAdmin && resumo.lucroLiquidoPeriodo !== null) {
    indicadores.push(['Lucro Líquido', formatBRL(resumo.lucroLiquidoPeriodo), formatPct(resumo.variacaoLucroPct)]);
  }
  indicadores.push(['Faturamento', formatBRL(resumo.faturamentoPeriodo), formatPct(resumo.variacaoFaturamentoPct)]);
  if (ehAdmin && resumo.despesasPeriodo !== null) {
    indicadores.push(['Gastos', formatBRL(resumo.despesasPeriodo), formatPct(resumo.variacaoDespesasPct)]);
  }
  indicadores.push(['Vendas', resumo.pedidosPeriodo.toLocaleString('pt-BR'), formatPct(resumo.variacaoVendasPct)]);
  indicadores.push(['Ticket médio', formatBRL(resumo.ticketMedio), '—']);
  if (ehAdmin && resumo.custoProdutosPeriodo !== null) {
    indicadores.push(['Custo dos produtos vendidos', formatBRL(resumo.custoProdutosPeriodo), '—']);
  }
  tabela({ head: [['Indicador', 'Valor', `Variação vs ${comparacaoLabel}`]], body: indicadores });

  if (ehAdmin && resumo.divergenciasCaixa?.length > 0) {
    secao('Divergências de caixa (em aberto)');
    tabela({
      head: [['Caixa', 'Fechou com', 'Abriu com', 'Diferença', 'Aberto em']],
      body: resumo.divergenciasCaixa.map((d) => [
        `${d.caixaNome}${d.caixaUnidade ? ` (${d.caixaUnidade})` : ''}`,
        `${formatBRL(d.valorFechamento)} · ${d.usuarioFechamento || 'alguém'}`,
        `${formatBRL(d.valorAbertura)} · ${d.usuarioAbertura}`,
        `${Number(d.divergencia) > 0 ? '+' : ''}${formatBRL(d.divergencia)}`,
        new Date(d.abertaEm).toLocaleString('pt-BR'),
      ]),
    });
  }

  secao('Rendimento por caixa');
  if (resumo.rendimentoPorCaixa.length === 0) {
    vazio('Nenhuma venda no período.');
  } else {
    tabela({
      head: [['Caixa', 'Pedidos', 'Receitas', 'Ticket médio', ...(ehAdmin ? ['Despesas', 'Saldo'] : [])]],
      body: resumo.rendimentoPorCaixa.map((c) => [
        `${c.nome}${c.unidade ? ` (${c.unidade})` : ''}`,
        c.pedidos,
        formatBRL(c.receitas),
        formatBRL(c.ticketMedio),
        ...(ehAdmin ? [formatBRL(c.despesas), formatBRL(c.saldo)] : []),
      ]),
    });
  }

  secao('Produtos mais vendidos');
  if (resumo.vendasPorProduto.length === 0) {
    vazio('Nenhum produto vendido no período.');
  } else {
    tabela({
      head: [['Produto', 'Unidades vendidas', 'Receita']],
      body: resumo.vendasPorProduto.map((p) => [p.nome, p.quantidade.toLocaleString('pt-BR'), formatBRL(p.receita)]),
    });
  }

  if (ehAdmin && resumo.lucroPorProduto?.length > 0) {
    secao('Lucro por produto');
    const corpo = [];
    resumo.lucroPorProduto.forEach((p) => {
      const linha = (nome, b, negrito) => {
        const celulas = [
          nome,
          b.quantidade.toLocaleString('pt-BR'),
          formatBRL(b.precoVenda),
          b.precoCusto !== null ? formatBRL(b.precoCusto) : '—',
          formatBRL(b.receita),
          b.custoTotal !== null ? formatBRL(b.custoTotal) : '—',
          b.lucroTotal !== null ? formatBRL(b.lucroTotal) : '—',
        ];
        return negrito ? celulas.map((content) => ({ content, styles: { fontStyle: 'bold' } })) : celulas;
      };
      corpo.push(linha(p.nome, p, true));
      // Detalhe por nível (Unidade/Dúzia/Bandeja...) só quando o produto vendeu em mais de um.
      if (p.niveis?.length > 1) p.niveis.forEach((n) => corpo.push(linha(`   ${n.nome}`, n, false)));
    });
    tabela({
      head: [['Produto', 'Qtd.', 'Preço médio', 'Custo médio', 'Receita', 'Custo total', 'Lucro']],
      body: corpo,
      styles: { fontSize: 8 },
    });
  }

  secao('Mais vendidos por unidade');
  if (resumo.melhoresProdutosPorCaixa.length === 0) {
    vazio('Nenhuma venda no período.');
  } else {
    tabela({
      head: [['Caixa', 'Produto', 'Unidades', 'Receita']],
      body: resumo.melhoresProdutosPorCaixa.flatMap((c) =>
        c.produtos.map((p, i) => [
          i === 0 ? `${c.nome}${c.unidade ? ` (${c.unidade})` : ''}` : '',
          p.nome,
          p.quantidade.toLocaleString('pt-BR'),
          formatBRL(p.receita),
        ])
      ),
    });
  }

  secao('Dias com mais vendas');
  tabela({
    head: [['Dia da semana', 'Pedidos', 'Total']],
    body: resumo.vendasPorDiaSemana.map((d) => [d.label, d.pedidos, formatBRL(d.total)]),
  });

  secao('Horário de pico');
  const horasComVenda = resumo.vendasPorHora.filter((h) => h.pedidos > 0);
  if (horasComVenda.length === 0) {
    vazio('Nenhuma venda no período.');
  } else {
    tabela({
      head: [['Horário', 'Pedidos', 'Total']],
      body: horasComVenda.map((h) => [h.label, h.pedidos, formatBRL(h.total)]),
    });
  }

  secao('Resumo rápido');
  tabela({
    head: [['Indicador', 'Valor']],
    body: [
      ['Acumulado do dia (hoje)', formatBRL(resumo.faturamentoHoje)],
      ['Pedidos confirmados hoje', resumo.pedidosHoje],
      ['Faturamento do período', formatBRL(resumo.faturamentoPeriodo)],
      ['Ticket médio no período', formatBRL(resumo.ticketMedio)],
      ['Clientes com pedido no mês', resumo.clientesComPedidoNoMes],
      ['Bandejas pendentes de devolução', resumo.bandejasPendentes],
      ['Unidades disponíveis em estoque', resumo.estoqueDisponivel],
      ['Produtos com estoque baixo', resumo.produtosEstoqueBaixo],
    ],
  });

  secao('Vendas por dia');
  tabela({
    head: [['Data', 'Pedidos', 'Total']],
    body: resumo.vendasPorDia.map((d) => [d.data.split('-').reverse().join('/'), d.pedidos, formatBRL(d.total)]),
    foot: [['Total', resumo.pedidosPeriodo, formatBRL(resumo.faturamentoPeriodo)]],
  });

  secao('Quem mais compra');
  if (resumo.topClientes.length === 0) {
    vazio('Nenhum cliente comprou no período.');
  } else {
    tabela({
      head: [['Cliente', 'Pedidos', 'Total']],
      body: resumo.topClientes.map((c) => [c.nome, c.pedidos, formatBRL(c.total)]),
    });
  }

  secao('Fiado em aberto');
  const { fiado } = resumo;
  tabela({
    head: [['Cliente', 'Valor', 'Vencimento', 'Situação']],
    body: fiado.contas.length
      ? fiado.contas.map((c) => [c.cliente, formatBRL(c.valor), formatData(c.vencimento), c.vencida ? 'Vencida' : 'A vencer'])
      : [['Nenhuma conta em aberto', '', '', '']],
    foot: [
      [`Em aberto: ${fiado.quantidadeEmAberto} conta(s)`, formatBRL(fiado.totalEmAberto), `Vencidas: ${fiado.quantidadeVencida}`, formatBRL(fiado.totalVencido)],
    ],
  });

  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Página ${i} de ${totalPaginas}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }
  doc.setTextColor(20, 20, 20);

  doc.autoPrint();
  const janela = window.open(doc.output('bloburl'), '_blank');
  if (!janela) doc.save(`relatorio-dashboard-${Date.now()}.pdf`);
}

export async function gerarRelatorioEstoqueAtual(produtos) {
  const { doc, autoTable } = await criarDocumento('Relatório de Estoque Atual', `${produtos.length} produto(s) ativo(s)`);

  const totalUnidades = produtos.reduce((soma, p) => soma + p.quantidade, 0);

  autoTable(doc, {
    startY: 46,
    head: [['Produto', 'Tipo', 'Unidade', 'Preço venda', 'Estoque', 'Mínimo', 'Situação']],
    body: produtos.map((p) => {
      const base = (p.niveisVenda || []).find((n) => n.ehBase);
      return [
        p.nome,
        p.tipo || '—',
        base ? base.nome : '—',
        base ? formatBRL(base.preco) : '—',
        p.quantidade,
        p.estoqueMinimo,
        p.quantidade <= p.estoqueMinimo ? 'Estoque baixo' : 'OK',
      ];
    }),
    headStyles: { fillColor: [240, 100, 92] },
    styles: { fontSize: 9 },
    foot: [['', '', '', '', totalUnidades, '', 'Total de unidades']],
    footStyles: { fillColor: [253, 236, 236], textColor: [20, 20, 20], fontStyle: 'bold' },
  });

  doc.save(`relatorio-estoque-${Date.now()}.pdf`);
}
