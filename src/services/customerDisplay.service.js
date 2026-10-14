// Comunicação com o display de cliente (VFD/LED8, protocolo LED8N / DSP800)
// via Web Serial API. Suportado apenas em navegadores Chromium (Chrome/Edge).

const ESC = 0x1b;
const CMD_QUERY = 0x51; // 'Q'
const CR = 0x0d;

const STATUS_BYTES = {
  total: 0x41, // 'A'
  pagar: 0x42, // 'B'
  troco: 0x43, // 'C'
};

export const DisplayErrorCode = {
  UNSUPPORTED: 'UNSUPPORTED',
  NO_PORT_SELECTED: 'NO_PORT_SELECTED',
  PORT_BUSY: 'PORT_BUSY',
  DISCONNECTED: 'DISCONNECTED',
  WRITE_FAILED: 'WRITE_FAILED',
  INVALID_TYPE: 'INVALID_TYPE',
};

export class CustomerDisplayError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'CustomerDisplayError';
    this.code = code;
    this.cause = cause;
  }
}

export class CustomerDisplayService {
  constructor({ baudRate = 2400 } = {}) {
    this.baudRate = baudRate;
    this.port = null;
    this.writer = null;
    this.listeners = new Set();
    this._handleDisconnect = this._handleDisconnect.bind(this);
  }

  static isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  get isConnected() {
    return this.port != null && this.writer != null;
  }

  /** @param {(status: "connected" | "disconnected", error?: CustomerDisplayError) => void} listener */
  onStatusChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(status, error) {
    for (const listener of this.listeners) listener(status, error);
  }

  /** Tenta religar em uma porta já autorizada anteriormente, sem abrir o seletor. */
  async autoReconnect() {
    if (!CustomerDisplayService.isSupported() || this.isConnected) return false;

    const ports = await navigator.serial.getPorts();
    if (ports.length === 0) return false;

    try {
      await this._openPort(ports[0]);
      return true;
    } catch {
      return false;
    }
  }

  /** Abre o seletor nativo de portas (precisa ser chamado a partir de um clique do usuário). */
  async connect(options = {}) {
    if (!CustomerDisplayService.isSupported()) {
      throw new CustomerDisplayError(
        DisplayErrorCode.UNSUPPORTED,
        'Este navegador não suporta a Web Serial API. Utilize Google Chrome ou Microsoft Edge.',
      );
    }

    if (this.isConnected) return;

    let port;
    try {
      port = await navigator.serial.requestPort();
    } catch (cause) {
      throw new CustomerDisplayError(DisplayErrorCode.NO_PORT_SELECTED, 'Nenhuma porta serial foi selecionada.', cause);
    }

    await this._openPort(port, options);
  }

  async _openPort(port, { baudRate = this.baudRate } = {}) {
    try {
      await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none' });
    } catch (cause) {
      throw new CustomerDisplayError(
        DisplayErrorCode.PORT_BUSY,
        'Não foi possível abrir a porta serial. Verifique se ela não está em uso por outro programa.',
        cause,
      );
    }

    this.port = port;
    this.baudRate = baudRate;
    this.writer = port.writable.getWriter();
    navigator.serial.addEventListener('disconnect', this._handleDisconnect);
    this._emit('connected');
  }

  _handleDisconnect(event) {
    if (event.target !== this.port) return;
    this._cleanup();
    this._emit(
      'disconnected',
      new CustomerDisplayError(DisplayErrorCode.DISCONNECTED, 'O display de cliente foi desconectado.'),
    );
  }

  async disconnect() {
    await this._cleanup();
    this._emit('disconnected');
  }

  async _cleanup() {
    if (CustomerDisplayService.isSupported()) {
      navigator.serial.removeEventListener('disconnect', this._handleDisconnect);
    }

    if (this.writer) {
      const writer = this.writer;
      this.writer = null;
      try {
        await writer.close();
      } catch {
        // stream pode já estar em erro (ex: dispositivo desconectado) -- ignorar
      }
      try {
        writer.releaseLock();
      } catch {
        // já liberado
      }
    }

    if (this.port) {
      const port = this.port;
      this.port = null;
      try {
        await port.close();
      } catch {
        // ignorar -- porta pode já ter sido fechada pelo sistema operacional
      }
    }
  }

  async _write(bytes) {
    if (!this.isConnected) {
      throw new CustomerDisplayError(DisplayErrorCode.DISCONNECTED, 'Display de cliente não está conectado.');
    }

    try {
      await this.writer.write(new Uint8Array(bytes));
    } catch (cause) {
      await this._cleanup();
      const error = new CustomerDisplayError(
        DisplayErrorCode.WRITE_FAILED,
        'Falha ao enviar dados para o display.',
        cause,
      );
      this._emit('disconnected', error);
      throw error;
    }
  }

  /**
   * @param {number | string} value
   * @param {"total" | "pagar" | "troco"} type
   */
  async sendAmount(value, type = 'total') {
    const statusByte = STATUS_BYTES[type];
    if (!statusByte) {
      throw new CustomerDisplayError(
        DisplayErrorCode.INVALID_TYPE,
        `Tipo de exibição inválido: "${type}". Use "total", "pagar" ou "troco".`,
      );
    }

    const formatted = Number(value).toFixed(2);
    const contentBytes = Array.from(new TextEncoder().encode(formatted));
    await this._write([ESC, CMD_QUERY, statusByte, ...contentBytes, CR]);
  }

  async clear() {
    await this.sendAmount(0, 'total');
  }
}

// Instância única compartilhada pelo app -- só existe uma porta COM1 no caixa.
export const customerDisplay = new CustomerDisplayService();
