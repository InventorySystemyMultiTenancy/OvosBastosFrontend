import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', perfis: ['ADMIN', 'VENDEDOR', 'ENTREGADOR'] },
  { to: '/admin/caixa', label: 'Caixa', perfis: ['ADMIN', 'VENDEDOR'] },
  { to: '/admin/clientes', label: 'Clientes', perfis: ['ADMIN', 'VENDEDOR'] },
  { to: '/admin/produtos', label: 'Estoque', perfis: ['ADMIN', 'VENDEDOR'] },
  { to: '/admin/recebimentos', label: 'Recebimentos', perfis: ['ADMIN'] },
  { to: '/admin/bandejas', label: 'Bandejas', perfis: ['ADMIN', 'VENDEDOR'] },
  { to: '/admin/vendas', label: 'Vendas', perfis: ['ADMIN', 'VENDEDOR'] },
  { to: '/admin/financeiro', label: 'Financeiro', perfis: ['ADMIN'] },
  { to: '/admin/usuarios', label: 'Usuários', perfis: ['ADMIN'] },
];

const PERFIL_LABEL = { ADMIN: 'Administrador', VENDEDOR: 'Vendedor', ENTREGADOR: 'Entregador' };

const TICKER_OVOS = Array.from({ length: 48 });

export function Layout() {
  const { usuario, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="admin-header">
        <div className="admin-header-ticker" aria-hidden="true">
          <div className="admin-header-ticker-track">
            {TICKER_OVOS.map((_, i) => (
              <span key={i}>🥚</span>
            ))}
          </div>
        </div>

        <div className="admin-header-inner">
          <div className="admin-header-brand">
            <img src="/vrilllogo.png" alt="Vrill Ovos" className="admin-header-logo-img" />
            <span className="admin-header-logo">VrillOvos</span>
          </div>

          <nav className="admin-header-nav">
            {NAV_ITEMS.filter((item) => item.perfis.includes(usuario?.perfil))
              // Login travado a um caixa (Usuario.caixaId) só vê a aba Caixa — ele nem
              // consegue navegar pras outras (ver ProtectedRoute), então nem mostra o link.
              .filter((item) => !usuario?.caixaId || item.to === '/admin/caixa')
              .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) => `admin-header-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="admin-header-user">
            <div className="admin-header-user-info">
              <span className="admin-header-user-name">{usuario?.nome}</span>
              <span className="admin-header-user-role">{PERFIL_LABEL[usuario?.perfil] || usuario?.perfil}</span>
            </div>
            <button className="admin-header-logout" onClick={logout}>Sair</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="main-content-bg" aria-hidden="true" />
        <div className="main-content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
