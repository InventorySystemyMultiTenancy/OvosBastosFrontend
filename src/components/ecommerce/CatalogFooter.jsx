import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JANELA_CLIQUES_MS = 600;
const CLIQUES_PARA_ENTRAR = 3;

export function CatalogFooter({ isStaff }) {
  const navigate = useNavigate();
  const cliques = useRef(0);
  const resetTimeoutRef = useRef(null);
  const [pulsando, setPulsando] = useState(false);

  useEffect(() => () => clearTimeout(resetTimeoutRef.current), []);

  function handleClickOvo() {
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

  return (
    <footer className="catalogo-footer">
      <div className="catalogo-footer-empresa">
        <strong>
          <button
            type="button"
            className={`catalogo-footer-ovo${pulsando ? ' is-pulsando' : ''}`}
            onClick={handleClickOvo}
            aria-label="Ovos Bastos"
          >
            🥚
          </button>{' '}
          Ovos Bastos
        </strong>
        <p>Distribuidora de ovos — caixas e dúzias direto do estoque para o seu negócio ou sua casa.</p>
      </div>
      <div className="catalogo-footer-credito">made by Selfmachine Developers</div>
    </footer>
  );
}
