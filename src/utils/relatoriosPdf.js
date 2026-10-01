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

// ---------- Relatório completo do dashboard ----------

const COR = {
  primaria: [240, 100, 92],
  verde: [34, 150, 90],
  vermelho: [205, 50, 50],
  roxo: [134, 90, 214],
  azul: [59, 130, 246],
  laranja: [230, 140, 20],
  texto: [20, 20, 20],
  muted: [110, 110, 110],
  borda: [225, 225, 230],
  fundo: [248, 248, 250],
  trilho: [238, 238, 242],
};

const LABEL_URGENCIA = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

function formatBRLCompacto(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function formatNumero(valor) {
  return Number(valor || 0).toLocaleString('pt-BR');
}

function nomeCaixa(nome, unidade) {
  return unidade ? `${nome} (${unidade})` : nome;
}

// Relatório do botão "Imprimir relatório" do dashboard: todas as informações da tela no
// período escolhido, organizadas em seções — cada uma com gráfico (desenhado direto no PDF,
// não print da tela) e a tabela com os números. reposicao e estoqueUnidades vêm de endpoints
// à parte (os mesmos dos cards/botões do dashboard) e podem vir null se a busca falhar.
// janela: aba aberta no clique (antes do await, pra não cair no bloqueador de pop-up).
export async function gerarRelatorioDashboard({ resumo, reposicao, estoqueUnidades, periodoLabel, comparacaoLabel, ehAdmin, janela }) {
  const periodo = `${periodoLabel} · ${formatData(resumo.periodoDesde)} a ${formatData(resumo.periodoAte)}`;
  const { doc, autoTable } = await criarDocumento('Relatório do Dashboard', periodo);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  const W = pageW - M * 2;
  let y = 50;

  const corTexto = (c) => doc.setTextColor(...c);

  function garantirEspaco(altura) {
    if (y + altura > pageH - 16) {
      doc.addPage();
      y = 18;
    }
  }

  function secao(titulo, alturaMinima = 40) {
    garantirEspaco(alturaMinima + 10);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    corTexto(COR.texto);
    doc.text(titulo, M, y);
    doc.setDrawColor(...COR.primaria);
    doc.setLineWidth(0.7);
    doc.line(M, y + 2, M + 16, y + 2);
    doc.setLineWidth(0.2);
    doc.setFont(undefined, 'normal');
    y += 8;
  }

  function nota(texto) {
    doc.setFontSize(8.5);
    const linhas = doc.splitTextToSize(texto, W);
    garantirEspaco(linhas.length * 4 + 2);
    corTexto(COR.muted);
    doc.text(linhas, M, y + 2);
    corTexto(COR.texto);
    y += linhas.length * 4 + 6;
  }

  function tabela(opcoes) {
    autoTable(doc, {
      headStyles: { fillColor: COR.primaria, fontSize: 8.5 },
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      footStyles: { fillColor: [253, 236, 236], textColor: COR.texto, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [252, 250, 250] },
      margin: { left: M, right: M, top: 18 },
      showFoot: 'lastPage',
      ...opcoes,
      startY: y,
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Cards de indicador (topo do dashboard), 3 por linha.
  function cards(lista) {
    const porLinha = 3;
    const gap = 4;
    const w = (W - gap * (porLinha - 1)) / porLinha;
    const h = 25;
    lista.forEach((c, i) => {
      const col = i % porLinha;
      if (col === 0) {
        if (i > 0) y += h + gap;
        garantirEspaco(h);
      }
      const x = M + col * (w + gap);
      doc.setFillColor(...COR.fundo);
      doc.setDrawColor(...COR.borda);
      doc.roundedRect(x, y, w, h, 2, 2, 'FD');
      doc.setFillColor(...c.cor);
      doc.rect(x, y + 3, 1.4, h - 6, 'F');

      doc.setFontSize(8);
      corTexto(COR.muted);
      doc.text(c.label, x + 5, y + 6.5);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      corTexto(c.negativo ? COR.vermelho : COR.texto);
      doc.text(c.valor, x + 5, y + 14.5);
      doc.setFont(undefined, 'normal');
      if (c.variacao !== undefined) {
        const pct = c.variacao;
        doc.setFontSize(7.5);
        if (pct === null) {
          corTexto(COR.muted);
          doc.text(`novo · sem base de comparação`, x + 5, y + 20.5);
        } else {
          const bom = c.inverso ? pct < 0 : pct > 0;
          const ruim = c.inverso ? pct > 0 : pct < 0;
          corTexto(bom ? COR.verde : ruim ? COR.vermelho : COR.muted);
          const sinal = pct > 0 ? '+' : '';
          doc.text(`${sinal}${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs ${comparacaoLabel}`, x + 5, y + 20.5);
        }
      }
    });
    corTexto(COR.texto);
    y += h + 8;
  }

  // Barras horizontais: bom pra nomes compridos (produtos, clientes, caixas).
  function barrasHorizontais(itens, { cor = COR.primaria, formatar = formatBRL, larguraLabel = 55 } = {}) {
    if (itens.length === 0) return;
    const max = Math.max(1, ...itens.map((i) => Math.abs(i.valor)));
    const linhaH = 7;
    const larguraValor = 30;
    const xBarra = M + larguraLabel;
    const wBarra = W - larguraLabel - larguraValor;
    itens.forEach((item) => {
      garantirEspaco(linhaH);
      doc.setFontSize(8);
      corTexto(COR.texto);
      doc.text(doc.splitTextToSize(item.label, larguraLabel - 3)[0], M, y + 4.4);
      doc.setFillColor(...COR.trilho);
      doc.rect(xBarra, y + 1.3, wBarra, 4.4, 'F');
      doc.setFillColor(...(item.cor || cor));
      doc.rect(xBarra, y + 1.3, Math.max((wBarra * Math.abs(item.valor)) / max, 0.8), 4.4, 'F');
      doc.setFont(undefined, 'bold');
      corTexto(item.cor && item.cor === COR.vermelho ? COR.vermelho : COR.texto);
      doc.text(formatar(item.valor), M + W, y + 4.4, { align: 'right' });
      doc.setFont(undefined, 'normal');
      y += linhaH;
    });
    corTexto(COR.texto);
    y += 5;
  }

  // Colunas verticais: bom pra sequências curtas (dias da semana, horas).
  function barrasVerticais(itens, { cor = COR.azul, altura = 48, formatar = formatBRLCompacto } = {}) {
    garantirEspaco(altura + 14);
    const topo = y + 6;
    const base = y + altura;
    const slot = W / itens.length;
    const larg = Math.min(slot * 0.62, 18);
    const max = Math.max(1, ...itens.map((i) => i.valor));

    doc.setDrawColor(...COR.borda);
    doc.line(M, base, M + W, base);
    itens.forEach((it, i) => {
      const cx = M + slot * i + slot / 2;
      const h = ((base - topo) * it.valor) / max;
      if (h > 0) {
        doc.setFillColor(...(it.destaque ? COR.primaria : cor));
        doc.rect(cx - larg / 2, base - h, larg, h, 'F');
      }
      if (formatar && it.valor > 0) {
        doc.setFontSize(6.5);
        corTexto(COR.muted);
        doc.text(formatar(it.valor), cx, base - h - 1.5, { align: 'center' });
      }
      doc.setFontSize(7.5);
      corTexto(it.destaque ? COR.primaria : COR.texto);
      doc.text(it.label, cx, base + 4.5, { align: 'center' });
    });
    corTexto(COR.texto);
    y = base + 11;
  }

  // Linha com área preenchida (vendas por dia).
  function grafLinha(pontos) {
    const altura = 55;
    garantirEspaco(altura + 14);
    const xL = M + 20;
    const xR = M + W;
    const topo = y + 4;
    const base = y + altura;
    const max = Math.max(1, ...pontos.map((p) => p.valor));
    const passo = pontos.length > 1 ? (xR - xL) / (pontos.length - 1) : 0;
    const coords = pontos.map((p, i) => ({ x: pontos.length > 1 ? xL + passo * i : (xL + xR) / 2, y: base - ((base - topo) * p.valor) / max }));

    doc.setFontSize(6.5);
    [0, 0.5, 1].forEach((f) => {
      const gy = base - (base - topo) * f;
      doc.setDrawColor(...COR.borda);
      doc.line(xL, gy, xR, gy);
      corTexto(COR.muted);
      doc.text(formatBRLCompacto(max * f), xL - 2, gy + 1.5, { align: 'right' });
    });

    // Área: um polígono só (base -> pontos -> base), em coordenadas relativas do doc.lines.
    if (coords.length > 1) {
      const trechos = [[0, coords[0].y - base]];
      for (let i = 1; i < coords.length; i++) trechos.push([coords[i].x - coords[i - 1].x, coords[i].y - coords[i - 1].y]);
      trechos.push([0, base - coords[coords.length - 1].y]);
      doc.setFillColor(253, 225, 222);
      doc.lines(trechos, coords[0].x, base, [1, 1], 'F', true);
    }
    doc.setDrawColor(...COR.primaria);
    doc.setLineWidth(0.6);
    for (let i = 0; i < coords.length - 1; i++) doc.line(coords[i].x, coords[i].y, coords[i + 1].x, coords[i + 1].y);
    doc.setLineWidth(0.2);
    if (coords.length <= 31) {
      doc.setFillColor(...COR.primaria);
      coords.forEach((c) => doc.circle(c.x, c.y, 0.7, 'F'));
    }

    // Até ~7 rótulos de data no eixo, sempre com o primeiro e o último.
    const qtdRotulos = Math.min(pontos.length, 7);
    const indices = new Set(
      Array.from({ length: qtdRotulos }, (_, k) => Math.round((k * (pontos.length - 1)) / Math.max(qtdRotulos - 1, 1)))
    );
    doc.setFontSize(7);
    corTexto(COR.texto);
    indices.forEach((i) => doc.text(pontos[i].label, coords[i].x, base + 4.5, { align: 'center' }));
    y = base + 11;
  }

  // 1. Indicadores
  secao('Indicadores do período', 30);
  const listaCards = [];
  if (ehAdmin && resumo.lucroLiquidoPeriodo !== null) {
    listaCards.push({ label: 'Lucro Líquido', valor: formatBRL(resumo.lucroLiquidoPeriodo), cor: COR.verde, negativo: resumo.lucroLiquidoPeriodo < 0, variacao: resumo.variacaoLucroPct });
  }
  listaCards.push({ label: 'Faturamento', valor: formatBRL(resumo.faturamentoPeriodo), cor: COR.azul, variacao: resumo.variacaoFaturamentoPct });
  if (ehAdmin && resumo.despesasPeriodo !== null) {
    listaCards.push({ label: 'Gastos', valor: formatBRL(resumo.despesasPeriodo), cor: COR.laranja, variacao: resumo.variacaoDespesasPct, inverso: true });
  }
  listaCards.push({ label: 'Vendas', valor: formatNumero(resumo.pedidosPeriodo), cor: COR.roxo, variacao: resumo.variacaoVendasPct });
  listaCards.push({ label: 'Ticket médio', valor: formatBRL(resumo.ticketMedio), cor: COR.primaria });
  if (ehAdmin && resumo.custoProdutosPeriodo !== null) {
    listaCards.push({ label: 'Custo dos produtos vendidos', valor: formatBRL(resumo.custoProdutosPeriodo), cor: COR.muted });
  }
  cards(listaCards);
  if (ehAdmin && resumo.custoProdutosPeriodo !== null) {
    nota(
      `Lucro Líquido = faturamento ${formatBRL(resumo.faturamentoPeriodo)} - custo dos produtos vendidos ${formatBRL(resumo.custoProdutosPeriodo)}. ` +
        'Gastos operacionais não entram no lucro, aparecem à parte no indicador "Gastos".'
    );
    y += 4;
  }

  // 2. Divergências de caixa
  if (ehAdmin && resumo.divergenciasCaixa?.length > 0) {
    secao('Divergências de caixa (em aberto)', 25);
    tabela({
      head: [['Caixa', 'Fundo deixado no fechamento', 'Fundo informado na abertura', 'Diferença', 'Aberto em']],
      body: resumo.divergenciasCaixa.map((d) => [
        nomeCaixa(d.caixaNome, d.caixaUnidade),
        `${formatBRL(d.valorFechamento)} (${d.usuarioFechamento || 'alguém'})`,
        `${formatBRL(d.valorAbertura)} (${d.usuarioAbertura})`,
        { content: `${Number(d.divergencia) > 0 ? '+' : ''}${formatBRL(d.divergencia)}`, styles: { textColor: Number(d.divergencia) > 0 ? COR.verde : COR.vermelho, fontStyle: 'bold' } },
        new Date(d.abertaEm).toLocaleString('pt-BR'),
      ]),
    });
  }

  // 3. Rendimento por caixa
  secao('Rendimento por caixa');
  if (resumo.rendimentoPorCaixa.length === 0) {
    nota('Nenhuma venda no período.');
  } else {
    barrasHorizontais(resumo.rendimentoPorCaixa.map((c) => ({ label: nomeCaixa(c.nome, c.unidade), valor: c.receitas })), { cor: COR.verde });
    tabela({
      head: [['Caixa', 'Pedidos', 'Receitas', 'Ticket médio', ...(ehAdmin ? ['Despesas', 'Saldo'] : [])]],
      body: resumo.rendimentoPorCaixa.map((c) => [
        nomeCaixa(c.nome, c.unidade),
        formatNumero(c.pedidos),
        formatBRL(c.receitas),
        formatBRL(c.ticketMedio),
        ...(ehAdmin ? [formatBRL(c.despesas), formatBRL(c.saldo)] : []),
      ]),
    });
  }

  // 4. Produtos mais vendidos
  secao('Produtos mais vendidos');
  if (resumo.vendasPorProduto.length === 0) {
    nota('Nenhum produto vendido no período.');
  } else {
    barrasHorizontais(resumo.vendasPorProduto.map((p) => ({ label: p.nome, valor: p.receita })), { cor: COR.roxo });
    const totalReceita = resumo.vendasPorProduto.reduce((s, p) => s + p.receita, 0);
    tabela({
      head: [['Produto', 'Unidades vendidas', 'Receita', '% da receita']],
      body: resumo.vendasPorProduto.map((p) => [
        p.nome,
        formatNumero(p.quantidade),
        formatBRL(p.receita),
        `${totalReceita > 0 ? ((p.receita / totalReceita) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : 0}%`,
      ]),
    });
  }

  // 5. Lucro por produto
  if (ehAdmin && resumo.lucroPorProduto?.length > 0) {
    secao('Lucro por produto');
    const comLucro = resumo.lucroPorProduto.filter((p) => p.lucroTotal !== null);
    barrasHorizontais(
      comLucro.map((p) => ({ label: p.nome, valor: p.lucroTotal, cor: p.lucroTotal < 0 ? COR.vermelho : COR.verde })),
      { cor: COR.verde }
    );
    const corpo = [];
    resumo.lucroPorProduto.forEach((p) => {
      const linha = (nome, b, principal) =>
        [
          nome,
          formatNumero(b.quantidade),
          formatBRL(b.precoVenda),
          b.precoCusto !== null ? formatBRL(b.precoCusto) : 'sem custo',
          b.lucroUnitario !== null ? formatBRL(b.lucroUnitario) : '—',
          formatBRL(b.receita),
          b.custoTotal !== null ? formatBRL(b.custoTotal) : '—',
          b.lucroTotal !== null ? formatBRL(b.lucroTotal) : '—',
        ].map((content) => ({ content, styles: principal ? { fontStyle: 'bold' } : { textColor: COR.muted } }));
      corpo.push(linha(p.nome, p, true));
      // Detalhe por nível de venda (Unidade/Dúzia/Bandeja...) quando vendeu em mais de um.
      if (p.niveis?.length > 1) p.niveis.forEach((n) => corpo.push(linha(`   ${n.nome}`, n, false)));
    });
    tabela({
      head: [['Produto', 'Vendidos', 'Preço venda', 'Custo', 'Lucro/un', 'Receita', 'Custo total', 'Lucro total']],
      body: corpo,
      styles: { fontSize: 7.5, cellPadding: 1.5 },
    });
  }

  // 6. Mais vendidos por unidade
  secao('Mais vendidos por unidade', 25);
  if (resumo.melhoresProdutosPorCaixa.length === 0) {
    nota('Nenhuma venda no período.');
  } else {
    tabela({
      head: [['Caixa', 'Posição', 'Produto', 'Unidades', 'Receita']],
      body: resumo.melhoresProdutosPorCaixa.flatMap((c) =>
        c.produtos.map((p, i) => [
          i === 0 ? { content: nomeCaixa(c.nome, c.unidade), styles: { fontStyle: 'bold' } } : '',
          `${i + 1}º`,
          p.nome,
          formatNumero(p.quantidade),
          formatBRL(p.receita),
        ])
      ),
    });
  }

  // 7. Dias com mais vendas
  secao('Dias com mais vendas', 60);
  if (resumo.vendasPorDiaSemana.every((d) => d.pedidos === 0)) {
    nota('Nenhuma venda no período.');
  } else {
    const melhorDia = resumo.melhorDiaSemana;
    barrasVerticais(
      resumo.vendasPorDiaSemana.map((d) => ({ label: d.label, valor: d.total, destaque: melhorDia && d.diaSemana === melhorDia.diaSemana })),
      { cor: COR.azul }
    );
    if (melhorDia?.total > 0) nota(`Melhor dia da semana: ${melhorDia.label} · ${formatBRL(melhorDia.total)} em ${formatNumero(melhorDia.pedidos)} pedido(s).`);
    tabela({
      head: [['Dia da semana', 'Pedidos', 'Total vendido']],
      body: resumo.vendasPorDiaSemana.map((d) => [d.label, formatNumero(d.pedidos), formatBRL(d.total)]),
    });
  }

  // 8. Horário de pico
  secao('Horário de pico', 60);
  const horasComVenda = resumo.vendasPorHora.filter((h) => h.pedidos > 0);
  if (horasComVenda.length === 0) {
    nota('Nenhuma venda no período.');
  } else {
    const primeira = horasComVenda[0].hora;
    const ultima = horasComVenda[horasComVenda.length - 1].hora;
    const faixa = resumo.vendasPorHora.slice(primeira, ultima + 1);
    const melhorHora = resumo.melhorHora;
    barrasVerticais(
      faixa.map((h) => ({ label: h.label, valor: h.total, destaque: melhorHora && h.hora === melhorHora.hora })),
      { cor: COR.azul, formatar: faixa.length <= 12 ? formatBRLCompacto : null }
    );
    if (melhorHora?.total > 0) nota(`Horário de pico: ${melhorHora.label} · ${formatBRL(melhorHora.total)} em ${formatNumero(melhorHora.pedidos)} pedido(s).`);
    tabela({
      head: [['Horário', 'Pedidos', 'Total vendido']],
      body: horasComVenda.map((h) => [`${h.label} às ${String(h.hora + 1).padStart(2, '0')}h`, formatNumero(h.pedidos), formatBRL(h.total)]),
    });
  }

  // 9. Vendas por dia
  secao('Vendas por período (dia a dia)', 70);
  grafLinha(resumo.vendasPorDia.map((d) => ({ label: d.data.split('-').reverse().slice(0, 2).join('/'), valor: d.total })));
  const melhorDiaPeriodo = resumo.vendasPorDia.reduce((m, d) => (d.total > (m?.total || 0) ? d : m), null);
  if (melhorDiaPeriodo) nota(`Melhor dia no período: ${melhorDiaPeriodo.data.split('-').reverse().join('/')} · ${formatBRL(melhorDiaPeriodo.total)}.`);
  tabela({
    head: [['Data', 'Pedidos', 'Total vendido']],
    body: resumo.vendasPorDia.map((d) => [d.data.split('-').reverse().join('/'), formatNumero(d.pedidos), formatBRL(d.total)]),
    foot: [['Total do período', formatNumero(resumo.pedidosPeriodo), formatBRL(resumo.faturamentoPeriodo)]],
  });

  // 10. Quem mais compra
  secao('Quem mais compra');
  if (resumo.topClientes.length === 0) {
    nota('Nenhum cliente comprou no período.');
  } else {
    barrasHorizontais(resumo.topClientes.map((c) => ({ label: c.nome, valor: c.total })), { cor: COR.primaria });
    tabela({
      head: [['Posição', 'Cliente', 'Pedidos', 'Total comprado']],
      body: resumo.topClientes.map((c, i) => [`${i + 1}º`, c.nome, formatNumero(c.pedidos), formatBRL(c.total)]),
    });
  }

  // 11. Fiado em aberto
  secao('Fiado em aberto', 30);
  const { fiado } = resumo;
  cards([
    { label: 'Total em aberto', valor: formatBRL(fiado.totalEmAberto), cor: COR.laranja },
    { label: 'Contas em aberto', valor: formatNumero(fiado.quantidadeEmAberto), cor: COR.laranja },
    { label: 'Total vencido', valor: `${formatBRL(fiado.totalVencido)} (${fiado.quantidadeVencida})`, cor: COR.vermelho, negativo: fiado.totalVencido > 0 },
  ]);
  if (fiado.contas.length === 0) {
    nota('Nenhum fiado em aberto no momento.');
  } else {
    tabela({
      head: [['Cliente', 'Valor', 'Vencimento', 'Situação']],
      body: fiado.contas.map((c) => [
        c.cliente,
        formatBRL(c.valor),
        formatData(c.vencimento),
        { content: c.vencida ? 'Vencida' : 'A vencer', styles: { textColor: c.vencida ? COR.vermelho : COR.texto, fontStyle: c.vencida ? 'bold' : 'normal' } },
      ]),
    });
    if (fiado.quantidadeEmAberto > fiado.contas.length) {
      nota(`Mostrando as ${fiado.contas.length} contas com vencimento mais próximo de ${fiado.quantidadeEmAberto} em aberto.`);
    }
  }

  // 12. Resumo rápido
  secao('Resumo rápido', 30);
  tabela({
    head: [['Indicador', 'Valor']],
    body: [
      ['Acumulado do dia em tempo real (hoje)', formatBRL(resumo.faturamentoHoje)],
      ['Pedidos confirmados hoje', formatNumero(resumo.pedidosHoje)],
      [`Faturamento do período (${periodoLabel.toLowerCase()})`, formatBRL(resumo.faturamentoPeriodo)],
      ['Ticket médio no período', formatBRL(resumo.ticketMedio)],
      ['Clientes com pedido no mês', formatNumero(resumo.clientesComPedidoNoMes)],
      ['Bandejas pendentes de devolução', formatNumero(resumo.bandejasPendentes)],
      ['Unidades disponíveis em estoque', formatNumero(resumo.estoqueDisponivel)],
      ['Produtos com estoque baixo', formatNumero(resumo.produtosEstoqueBaixo)],
    ],
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  });

  // 13. Estoque por unidade (botão "Estoque por unidade")
  if (estoqueUnidades?.unidades?.length > 0) {
    secao('Estoque atual por unidade');
    barrasHorizontais(
      estoqueUnidades.unidades.map((u) => ({ label: u.unidade, valor: u.total })),
      { cor: COR.azul, formatar: (v) => `${formatNumero(v)} un.` }
    );
    tabela({
      head: [['Unidade', 'Produto', 'Quantidade']],
      body: estoqueUnidades.unidades.flatMap((u) => [
        ...u.produtos.map((p, i) => [i === 0 ? { content: u.unidade, styles: { fontStyle: 'bold' } } : '', p.nome, formatNumero(p.quantidade)]),
        [{ content: `Total ${u.unidade}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [253, 236, 236] } }, { content: formatNumero(u.total), styles: { fontStyle: 'bold', fillColor: [253, 236, 236] } }],
      ]),
    });
  }

  // 14. Reposição recomendada (card da Clara)
  if (reposicao) {
    secao('Reposição recomendada', 25);
    if (reposicao.resumo) nota(reposicao.resumo);
    if (!reposicao.itens?.length) {
      nota('Nenhuma unidade com risco de ruptura no momento.');
    } else {
      tabela({
        head: [['Produto', 'Unidade', 'Em estoque', 'Cobertura', 'Urgência', 'Motivo']],
        body: reposicao.itens.map((d) => [
          d.produtoNome,
          nomeCaixa(d.caixaNome, d.caixaUnidade),
          formatNumero(d.estoqueAtual),
          d.coberturaDias == null ? '—' : `~${Number(d.coberturaDias).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`,
          { content: LABEL_URGENCIA[d.urgencia] || d.urgencia, styles: { textColor: d.urgencia === 'alta' ? COR.vermelho : COR.texto, fontStyle: 'bold' } },
          d.motivo || '—',
        ]),
        columnStyles: { 5: { cellWidth: 55 } },
      });
    }
    if (reposicao.modoFallback) nota('Cálculo automático (Clara, a IA, ainda não foi configurada).');
    else if (reposicao.geradoEm) nota(`Análise da Clara gerada em ${new Date(reposicao.geradoEm).toLocaleString('pt-BR')}.`);
  }

  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    corTexto([150, 150, 150]);
    doc.text(`Relatório do Dashboard · ${periodo}`, M, pageH - 8);
    doc.text(`Página ${i} de ${totalPaginas}`, pageW - M, pageH - 8, { align: 'right' });
  }
  corTexto(COR.texto);

  doc.autoPrint();
  const url = doc.output('bloburl');
  if (janela && !janela.closed) janela.location.href = url;
  else doc.save(`relatorio-dashboard-${Date.now()}.pdf`);
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
