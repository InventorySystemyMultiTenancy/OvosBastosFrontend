import { useCliqueTriploAdmin } from './useCliqueTriploAdmin';

export function CatalogFooter({ isStaff }) {
  const { pulsando, handleClick } = useCliqueTriploAdmin(isStaff);

  return (
    <footer className="catalogo-footer">
      <div className="catalogo-footer-empresa">
        <strong>
          <button
            type="button"
            className={`icone-ovo-admin${pulsando ? ' is-pulsando' : ''}`}
            onClick={handleClick}
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
