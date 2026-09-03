import { RECEIPT_SEPARATOR, centerLine, padLine, money } from "./receiptFormat";

const COMPANY_NAME = "Ovos Bastos";

// Monta as linhas de texto do cupom não fiscal (comprovante interno, não substitui nota fiscal) —
// usado tanto no <pre> do fallback via window.print() quanto mandado cru (ESC/POS) pro QZ Tray.
function buildLines({ title, date, infoLines = [], items, discount = 0, surcharge = 0, total, paymentLines }) {
  const lines = [];

  lines.push(centerLine(COMPANY_NAME));
  lines.push(RECEIPT_SEPARATOR);
  lines.push(title);
  if (date) lines.push(new Date(date).toLocaleString("pt-BR"));
  lines.push(...infoLines);
  lines.push(RECEIPT_SEPARATOR);

  for (const item of items) lines.push(padLine(item.label, money(item.total)));

  lines.push(RECEIPT_SEPARATOR);
  if (discount > 0) lines.push(padLine("Desconto", `-${money(discount)}`));
  if (surcharge > 0) lines.push(padLine("Acréscimo", `+${money(surcharge)}`));
  lines.push(padLine("TOTAL", money(total)));
  lines.push(...paymentLines);
  lines.push(RECEIPT_SEPARATOR);
  lines.push(centerLine("Comprovante não fiscal"));
  lines.push(centerLine("Obrigado pela preferência!"));

  return lines;
}

function itemLabel(nome, nivelVenda) {
  return nivelVenda && !nivelVenda.ehBase ? `${nome} — ${nivelVenda.nome}` : nome;
}

// Recibo impresso na hora, direto da tela "Venda concluída" do Caixa (venda recém-fechada).
export function buildVendaConcluidaLines(venda, { valorRecebido } = {}) {
  const items = venda.itens.map((i) => ({
    label: `${i.quantidade}x ${itemLabel(i.produto.nome, i.nivelVenda)}`,
    total: Number(i.precoUnit) * i.quantidade,
  }));

  const infoLines = [`Cliente: ${venda.cliente.nome}`];
  if (venda.caixa) infoLines.push(`Caixa: ${venda.caixa.nome} - ${venda.caixa.unidade}`);

  const paymentLines = [];
  const valorDinheiro = Number(venda.valorDinheiro || 0);
  if (valorDinheiro > 0) {
    paymentLines.push("Pagamento: Dinheiro + Maquininha");
    paymentLines.push(padLine("  Dinheiro", money(valorDinheiro)));
    paymentLines.push(padLine("  Maquininha", money(Number(venda.total) - valorDinheiro)));
  } else {
    paymentLines.push(`Pagamento: ${venda.formaPagamento === "DINHEIRO" ? "Dinheiro" : venda.formaPagamento === "CARTAO" ? "Cartão" : venda.formaPagamento}`);
  }

  if (venda.formaPagamento === "DINHEIRO" && valorRecebido !== undefined && valorRecebido !== "") {
    const recebido = Number(valorRecebido);
    const troco = Math.max(recebido - Number(venda.total), 0);
    paymentLines.push(padLine("Recebido", money(recebido)));
    paymentLines.push(padLine("Troco", money(troco)));
  }

  return buildLines({
    title: `Venda #${venda.id}`,
    date: venda.createdAt,
    infoLines,
    items,
    discount: Number(venda.desconto) || 0,
    surcharge: Number(venda.acrescimo) || 0,
    total: venda.total,
    paymentLines,
  });
}

// Recibo reimpresso a partir da aba Vendas (histórico), botão "Comprovante".
export function buildComprovanteLines(comprovante) {
  const items = comprovante.itens.map((i) => ({
    label: `${i.quantidade}x ${i.produto}`,
    total: i.subtotal,
  }));

  const infoLines = [`Cliente: ${comprovante.cliente}`, `Vendedor: ${comprovante.vendedor}`];

  const paymentLines = [];
  const valorDinheiro = Number(comprovante.valorDinheiro || 0);
  if (valorDinheiro > 0) {
    paymentLines.push("Pagamento: Dinheiro + Maquininha");
    paymentLines.push(padLine("  Dinheiro", money(valorDinheiro)));
    paymentLines.push(padLine("  Maquininha", money(Number(comprovante.total) - valorDinheiro)));
  } else {
    paymentLines.push(`Pagamento: ${comprovante.formaPagamento}`);
  }

  return buildLines({
    title: `Comprovante #${comprovante.numero}`,
    date: comprovante.data,
    infoLines,
    items,
    discount: Number(comprovante.desconto) || 0,
    surcharge: Number(comprovante.acrescimo) || 0,
    total: comprovante.total,
    paymentLines,
  });
}
