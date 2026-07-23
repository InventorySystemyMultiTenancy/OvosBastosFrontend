export function CatalogHeader({ categorias, categoriaAtiva, onCategoria, busca, onBusca }) {
  return (
    <header className="catalogo-header">
      <div className="catalogo-header-top">
        <div className="catalogo-header-logo">
          <span aria-hidden="true">🥚</span> Ovos Bastos
        </div>

        <input
          className="catalogo-busca"
          type="search"
          placeholder="Buscar ovos..."
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
        />
      </div>

      {categorias.length > 1 && (
        <nav className="catalogo-categorias" aria-label="Categorias">
          {categorias.map((categoria) => (
            <button
              type="button"
              key={categoria}
              className={`catalogo-categoria-pill${categoriaAtiva === categoria ? ' is-active' : ''}`}
              onClick={() => onCategoria(categoria)}
            >
              {categoria}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
