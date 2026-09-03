import qz from "qz-tray";

const ESC = "\x1B";
const GS = "\x1D";
const INIT = `${ESC}@`; // reseta a impressora pro estado padrão
const CUT = `${GS}V${String.fromCharCode(66)}${String.fromCharCode(0)}`; // GS V 66 0 — alimenta e corte parcial, suportado pela maioria dos clones ESC/POS

// Nome do dispositivo tal como o QZ Tray/Windows enxerga a impressora térmica — mesma impressora
// física usada no SalgadosNFE (GLPrinter80, confirmado pelo usuário). Sobrescrevível por máquina
// via localStorage, caso algum caixa dessa loja use uma impressora diferente.
const PRINTER_NAME_KEY = "eggcontrol_thermalPrinterName";
const DEFAULT_PRINTER_NAME = "GLPrinter80";

export function getConfiguredPrinterName() {
  try {
    return window.localStorage.getItem(PRINTER_NAME_KEY) || DEFAULT_PRINTER_NAME;
  } catch {
    return DEFAULT_PRINTER_NAME;
  }
}

export function setConfiguredPrinterName(name) {
  try {
    window.localStorage.setItem(PRINTER_NAME_KEY, name);
  } catch {
    /* localStorage indisponível (modo privado etc.) — só afeta a conveniência de lembrar o nome */
  }
}

let connecting = null;

// QZ Tray precisa estar instalado e rodando na máquina (ícone na bandeja do Windows) — sem isso
// `qz.websocket.connect()` rejeita rápido (tenta as portas locais ws/wss e falha), então dá pra
// usar isso como teste de "está disponível" sem travar a tela.
function ensureConnected() {
  if (qz.websocket.isActive()) return Promise.resolve();
  if (!connecting) {
    connecting = qz.websocket.connect().catch((err) => {
      connecting = null;
      throw err;
    });
  }
  return connecting;
}

export async function isQzAvailable() {
  try {
    await ensureConnected();
    return true;
  } catch {
    return false;
  }
}

export async function listQzPrinters() {
  await ensureConnected();
  return qz.printers.find();
}

// A maioria dos clones ESC/POS baratos assume uma code page de 1 byte (CP437/CP850/CP860) em vez
// de UTF-8 — mandar "ã"/"ç" como UTF-8 cru sai como caractere errado no papel, já que não dá pra
// confirmar de antemão qual code page essa impressora específica está configurada. Tirar os
// acentos garante legibilidade em qualquer configuração; o fallback via navegador
// (receiptPrint.js) não precisa disso, pois quem rasteriza o texto lá é o próprio navegador.
const DIACRITIC_MARKS = /[̀-ͯ]/g;

function stripDiacritics(text) {
  return text.normalize("NFD").replace(DIACRITIC_MARKS, "");
}

// Manda o cupom como texto ESC/POS cru direto pro dispositivo via QZ Tray — sem passar pelo
// pipeline gráfico (GDI/rasterização) do navegador/Windows, que é onde a impressão pelo
// window.print() costuma falhar em impressoras térmicas baratas (sai em branco/cortada/minúscula).
export async function printReceiptEscPos(lines, { printerName } = {}) {
  await ensureConnected();

  const body = stripDiacritics(lines.join("\n"));
  const data = `${INIT}${body}\n\n\n${CUT}`;

  const config = qz.configs.create(printerName || getConfiguredPrinterName());
  await qz.print(config, [{ type: "raw", format: "plain", data }]);
}

const DEFAULT_LOGO_PATH = "/vrilllogo.png";

// Mesmo cupom, mas com a logo da Ovos Bastos impressa em cima do texto — QZ Tray converte a
// imagem pro formato raster do ESC/POS sozinho (`format: "image"`, `options.language: "ESCPOS"`),
// então não precisamos gerar o bitmap na mão. `data` precisa ser uma URL absoluta porque quem
// busca a imagem é o processo do QZ Tray (app Java separado rodando na máquina), não o navegador
// — um caminho relativo tipo "/vrilllogo.png" não significa nada pra ele.
// NÃO testado contra impressora física/QZ Tray real ainda — se a impressão da logo falhar (opção
// de imagem não suportada por esse driver/printerType específico, por exemplo), esse trecho é o
// primeiro a revisar. Por isso vai numa chamada separada e protegida por try/catch: se a logo
// falhar, o cupom em texto ainda sai normalmente.
export async function printReceiptEscPosWithLogo(lines, { printerName, logoUrl } = {}) {
  await ensureConnected();

  const config = qz.configs.create(printerName || getConfiguredPrinterName());
  const resolvedLogoUrl = logoUrl || `${window.location.origin}${DEFAULT_LOGO_PATH}`;

  try {
    await qz.print(config, [
      {
        type: "raw",
        format: "image",
        flavor: "file",
        data: resolvedLogoUrl,
        options: { language: "ESCPOS", dotDensity: "double" },
      },
    ]);
  } catch {
    // best-effort — segue pro texto mesmo se a logo não sair
  }

  const body = stripDiacritics(lines.join("\n"));
  const data = `${INIT}${body}\n\n\n${CUT}`;
  await qz.print(config, [{ type: "raw", format: "plain", data }]);
}
