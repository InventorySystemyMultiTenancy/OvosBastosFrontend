// Primitivas de formatação em texto puro pro cupom não fiscal (comprovante interno) — 40 colunas é
// o padrão de fonte normal numa impressora térmica de 80mm. Compartilhado pelos dois caminhos de
// impressão (window.print() em receiptPrint.js e ESC/POS cru via QZ Tray em qzPrint.js).
export const RECEIPT_LINE_WIDTH = 40;
export const RECEIPT_SEPARATOR = "-".repeat(RECEIPT_LINE_WIDTH);

export function money(value) {
  return `R$ ${Number(value || 0).toFixed(2)}`;
}

export function padLine(left, right) {
  left = String(left);
  right = String(right);
  const gap = Math.max(1, RECEIPT_LINE_WIDTH - left.length - right.length);
  return left + " ".repeat(gap) + right;
}

export function centerLine(text) {
  text = String(text);
  if (text.length >= RECEIPT_LINE_WIDTH) return text;
  return " ".repeat(Math.floor((RECEIPT_LINE_WIDTH - text.length) / 2)) + text;
}
