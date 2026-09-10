import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const ESTADO_VAZIO = { pagamentos: [], resumo: null };

// Compartilhado entre Caixa.jsx (venda nova) e Vendas.jsx (orçamento existente): envia
// cobranças na maquininha (uma de cada vez, valor opcionalmente parcial — pagamento dividido
// entre débito e crédito), faz polling enquanto houver uma cobrança ativa, e avisa quando a
// venda está totalmente quitada (soma das aprovadas + dinheiro já recebido cobre o total).
// Os 3 endpoints (POST/DELETE/GET /vendas/:id/pagamento-maquininha) devolvem o mesmo formato
// { pagamentos, resumo }, então um único "aplicarResposta" trata a resposta dos três.
export function useCobrancaMaquininha({ vendaId, timeoutSegundos, onQuitado, onTimeout }) {
  const [estado, setEstado] = useState(ESTADO_VAZIO);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState('');
  const [tempoRestante, setTempoRestante] = useState(0);

  const vendaIdRef = useRef(vendaId);
  vendaIdRef.current = vendaId;
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const onQuitadoRef = useRef(onQuitado);
  onQuitadoRef.current = onQuitado;
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const timeoutRef = useRef(null);

  const pararTimers = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  useEffect(() => () => pararTimers(), [pararTimers]);

  // aplicarRespostaRef existe pra iniciarEspera poder chamar a versão mais recente de
  // aplicarResposta de dentro do polling/timeout sem os dois hooks precisarem depender um do
  // outro (evita recriar os timers toda vez que aplicarResposta muda de identidade).
  const aplicarRespostaRef = useRef(() => {});

  const iniciarEspera = useCallback(() => {
    if (!pollRef.current) {
      pollRef.current = setInterval(async () => {
        const id = vendaIdRef.current;
        if (!id) return;
        try {
          const resp = await api.get(`/vendas/${id}/pagamento-maquininha`);
          aplicarRespostaRef.current(resp);
        } catch {
          // falha pontual de rede não deve interromper a espera; a próxima tentativa cobre
        }
      }, 3000);
    }
    if (timeoutSegundos && !timeoutRef.current) {
      setTempoRestante(timeoutSegundos);
      tickRef.current = setInterval(() => setTempoRestante((t) => Math.max(t - 1, 0)), 1000);
      timeoutRef.current = setTimeout(async () => {
        pararTimers();
        const id = vendaIdRef.current;
        if (!id) return;
        try {
          const resp = await api.delete(`/vendas/${id}/pagamento-maquininha`);
          setEstado(resp);
          onTimeoutRef.current?.(resp);
        } catch {
          // cobrança pode já ter sido resolvida entre o disparo do timeout e a tentativa de
          // cancelar (ex: aprovada bem na hora) — reconsulta pra decidir com o estado real
          try {
            const resp = await api.get(`/vendas/${id}/pagamento-maquininha`);
            setEstado(resp);
            onTimeoutRef.current?.(resp);
          } catch {
            onTimeoutRef.current?.(estadoRef.current);
          }
        }
      }, timeoutSegundos * 1000);
    }
  }, [timeoutSegundos, pararTimers]);

  const aplicarResposta = useCallback(
    (resp) => {
      setEstado(resp);
      setErro('');
      if (resp.resumo.completo) {
        pararTimers();
        onQuitadoRef.current?.(resp);
        return;
      }
      if (resp.resumo.cobrancaAtiva) {
        iniciarEspera();
      } else {
        pararTimers();
      }
    },
    [pararTimers, iniciarEspera]
  );
  aplicarRespostaRef.current = aplicarResposta;

  const sincronizar = useCallback(async () => {
    if (!vendaId) return;
    setCarregando(true);
    setErro('');
    try {
      const resp = await api.get(`/vendas/${vendaId}/pagamento-maquininha`);
      aplicarResposta(resp);
      return resp;
    } catch (err) {
      setErro(err.message);
      throw err;
    } finally {
      setCarregando(false);
    }
  }, [vendaId, aplicarResposta]);

  const enviarCobranca = useCallback(
    async (valor) => {
      if (!vendaId) return;
      setEnviando(true);
      setErro('');
      try {
        const body = valor !== undefined && valor !== null && valor !== '' ? { valor: Number(valor) } : {};
        const resp = await api.post(`/vendas/${vendaId}/pagamento-maquininha`, body);
        aplicarResposta(resp);
        return resp;
      } catch (err) {
        setErro(err.message);
        throw err;
      } finally {
        setEnviando(false);
      }
    },
    [vendaId, aplicarResposta]
  );

  const cancelarAtiva = useCallback(async () => {
    if (!vendaId) return;
    setCancelando(true);
    setErro('');
    try {
      const resp = await api.delete(`/vendas/${vendaId}/pagamento-maquininha`);
      aplicarResposta(resp);
      return resp;
    } catch (err) {
      setErro(err.message);
      throw err;
    } finally {
      setCancelando(false);
    }
  }, [vendaId, aplicarResposta]);

  const reset = useCallback(() => {
    pararTimers();
    setEstado(ESTADO_VAZIO);
    setErro('');
    setTempoRestante(0);
  }, [pararTimers]);

  // Inerte enquanto vendaId é nulo; carrega sozinho assim que uma venda é atribuída.
  useEffect(() => {
    if (vendaId) {
      sincronizar().catch(() => {});
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendaId]);

  return {
    pagamentos: estado.pagamentos,
    resumo: estado.resumo,
    carregando,
    enviando,
    cancelando,
    erro,
    tempoRestante,
    sincronizar,
    enviarCobranca,
    cancelarAtiva,
    reset,
  };
}
