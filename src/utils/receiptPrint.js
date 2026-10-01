function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

// Fallback via window.print() quando o QZ Tray (qzPrint.js) não está disponível — depende do
// driver da impressora tratar corretamente o job gráfico que o navegador manda, o que nem toda
// impressora térmica barata faz direito (ver qzPrint.js pro caminho mais confiável).
export function printReceiptLines(lines, { title = "Comprovante" } = {}) {
  const text = escapeHtml(lines.join("\n"));

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: 80mm 210mm; margin: 3mm 2mm; }
  body { margin: 0; }
  pre {
    margin: 0;
    font-family: "Courier New", monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #000;
  }
</style>
</head>
<body>
<pre>${text}</pre>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=400,height=640");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
