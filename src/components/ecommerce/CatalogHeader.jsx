import { slugCategoria, capitalizarCategoria } from './categoriaUtils';
import { useCliqueTriploAdmin } from './useCliqueTriploAdmin';

export function CatalogHeader({ categorias, busca, onBusca, isStaff }) {
  const { pulsando, handleClick } = useCliqueTriploAdmin(isStaff);

  return (
    <header className="catalogo-header">
      <div className="catalogo-header-top">
        <div className="catalogo-header-logo">
          <button
            type="button"
            className={`icone-ovo-admin${pulsando ? ' is-pulsando' : ''}`}
            onClick={handleClick}
            aria-label="Ovos Bastos"
          >
            <img src="/vrilllogo.png" alt="" className="logo-vrill-icone" />
          </button>{' '}
          Ovos Bastos
        </div>

        <input
          className="catalogo-busca"
          type="search"
          placeholder="Buscar ovos..."
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
        />
      </div>

      {categorias.length > 0 && (
        <nav className="catalogo-categorias" aria-label="Categorias">
          {categorias.map((categoria) => (
            <a
              key={categoria}
              href={`#categoria-${slugCategoria(categoria)}`}
              className="catalogo-categoria-pill"
            >
              {capitalizarCategoria(categoria)}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
