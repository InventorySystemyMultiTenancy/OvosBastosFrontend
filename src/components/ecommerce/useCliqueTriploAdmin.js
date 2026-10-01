import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JANELA_CLIQUES_MS = 600;
const CLIQUES_PARA_ENTRAR = 3;

export function useCliqueTriploAdmin(isStaff) {
  const navigate = useNavigate();
  const cliques = useRef(0);
  const resetTimeoutRef = useRef(null);
  const [pulsando, setPulsando] = useState(false);

  useEffect(() => () => clearTimeout(resetTimeoutRef.current), []);

  function handleClick() {
    cliques.current += 1;
    setPulsando(true);
    setTimeout(() => setPulsando(false), 150);

    clearTimeout(resetTimeoutRef.current);

    if (cliques.current >= CLIQUES_PARA_ENTRAR) {
      cliques.current = 0;
      navigate(isStaff ? '/admin' : '/admin/login');
      return;
    }

    resetTimeoutRef.current = setTimeout(() => {
      cliques.current = 0;
    }, JANELA_CLIQUES_MS);
  }

  return { pulsando, handleClick };
}
