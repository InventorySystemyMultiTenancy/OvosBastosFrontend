import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', perfis: ['ADMIN', 'VENDEDOR', 'ENTREGADOR'] },
  { to: '/clientes', label: 'Clientes', perfis: ['ADMIN', 'VENDEDOR'] },
  { to: '/produtos', label: 'Estoque', perfis: ['ADMIN', 'VENDEDOR'] },
  { to: '/bandejas', label: 'Bandejas', perfis: ['ADMIN', 'VENDEDOR'] },
  { to: '/vendas', label: 'Vendas', perfis: ['ADMIN', 'VENDEDOR'] },
  { to: '/financeiro', label: 'Financeiro', perfis: ['ADMIN'] },
];

const PERFIL_LABEL = { ADMIN: 'Administrador', VENDEDOR: 'Vendedor', ENTREGADOR: 'Entregador' };

export function Layout() {
  const { usuario, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">🥚 EggControl</div>
        <div className="sidebar-tagline">Gestão de distribuidoras de ovos</div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.filter((item) => item.perfis.includes(usuario?.perfil)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-name">{usuario?.nome}</div>
          <div className="sidebar-user-role">{PERFIL_LABEL[usuario?.perfil] || usuario?.perfil}</div>
          <button className="sidebar-logout" onClick={logout}>Sair</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
