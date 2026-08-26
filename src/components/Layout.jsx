import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, resolveUploadUrl } from '../api/client';
import {
  IconDashboard,
  IconCaixa,
  IconClientes,
  IconEstoque,
  IconRecebimentos,
  IconBandejas,
  IconVendas,
  IconFinanceiro,
  IconUsuarios,
  IconLogout,
  IconChevronDown,
  IconCamera,
} from './icons';

const SIDEBAR_COLAPSADA_KEY = 'eggcontrol_sidebar_colapsada';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', perfis: ['ADMIN', 'VENDEDOR', 'ENTREGADOR'], Icon: IconDashboard },
  { to: '/admin/caixa', label: 'Caixa', perfis: ['ADMIN', 'VENDEDOR'], Icon: IconCaixa },
  { to: '/admin/clientes', label: 'Clientes', perfis: ['ADMIN', 'VENDEDOR'], Icon: IconClientes },
  { to: '/admin/produtos', label: 'Estoque', perfis: ['ADMIN', 'VENDEDOR'], Icon: IconEstoque },
  { to: '/admin/recebimentos', label: 'Recebimentos', perfis: ['ADMIN'], Icon: IconRecebimentos },
  { to: '/admin/bandejas', label: 'Bandejas', perfis: ['ADMIN', 'VENDEDOR'], Icon: IconBandejas },
  { to: '/admin/vendas', label: 'Vendas', perfis: ['ADMIN', 'VENDEDOR'], Icon: IconVendas },
  { to: '/admin/financeiro', label: 'Financeiro', perfis: ['ADMIN'], Icon: IconFinanceiro },
  { to: '/admin/usuarios', label: 'Usuários', perfis: ['ADMIN'], Icon: IconUsuarios },
];

const PERFIL_LABEL = { ADMIN: 'Administrador', VENDEDOR: 'Vendedor', ENTREGADOR: 'Entregador' };

export function Layout() {
  const { usuario, logout, atualizarUsuario } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState('');
  const inputFotoRef = useRef(null);
  // Só afeta telas grandes (o botão fica escondido no mobile) — lembra a preferência do
  // usuário entre acessos.
  const [colapsada, setColapsada] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLAPSADA_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_COLAPSADA_KEY, colapsada ? '1' : '0'); } catch { /* ignora (ex: modo privado) */ }
  }, [colapsada]);

  const itensVisiveis = NAV_ITEMS.filter((item) => item.perfis.includes(usuario?.perfil))
    // Login travado a uma unidade (Usuario.unidade) só vê a aba Caixa — ele nem
    // consegue navegar pras outras (ver ProtectedRoute), então nem mostra o link.
    .filter((item) => !usuario?.unidade || item.to === '/admin/caixa');

  // Autoatendimento: qualquer perfil (admin, vendedor, entregador) troca a própria foto
  // clicando no avatar — sem precisar de tela separada. Envia assim que escolhe o arquivo.
  async function enviarFoto(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    setEnviandoFoto(true);
    setErroFoto('');
    try {
      const dados = new FormData();
      dados.append('foto', arquivo);
      const atualizado = await api.upload('/auth/me/foto', dados);
      atualizarUsuario({ fotoUrl: atualizado.fotoUrl });
    } catch (err) {
      setErroFoto(err.message);
    } finally {
      setEnviandoFoto(false);
    }
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className={`sidebar-backdrop${menuAberto ? ' is-visible' : ''}`}
        onClick={() => setMenuAberto(false)}
        aria-hidden={!menuAberto}
        tabIndex={-1}
      />

      <aside className={`sidebar${menuAberto ? ' is-open' : ''}${colapsada ? ' is-colapsada' : ''}`}>
        <Link to="/admin" className="sidebar-brand" onClick={() => setMenuAberto(false)}>
          <img src="/vrilllogo.png" alt="Vrill Ovos" className="sidebar-brand-logo" />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">VRILLOVOS</span>
            <span className="sidebar-brand-tag">Qualidade em cada ovo</span>
          </div>
        </Link>

        <nav className="sidebar-nav">
          {itensVisiveis.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setMenuAberto(false)}
            >
              <item.Icon className="sidebar-link-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <button
              type="button"
              className="sidebar-user-avatar"
              onClick={() => inputFotoRef.current?.click()}
              disabled={enviandoFoto}
              title="Trocar foto de perfil"
              aria-label="Trocar foto de perfil"
            >
              {usuario?.fotoUrl ? (
                <img src={resolveUploadUrl(usuario.fotoUrl)} alt="" className="sidebar-user-avatar-img" />
              ) : (
                <span>{(usuario?.nome || '?').charAt(0).toUpperCase()}</span>
              )}
              <span className="sidebar-user-avatar-hover">
                {enviandoFoto ? <span className="sidebar-user-avatar-spinner" /> : <IconCamera />}
              </span>
            </button>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              onChange={enviarFoto}
              style={{ display: 'none' }}
            />
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{usuario?.nome}</span>
              <span className="sidebar-user-role">{PERFIL_LABEL[usuario?.perfil] || usuario?.perfil}</span>
            </div>
          </div>
          {erroFoto && <p className="sidebar-user-erro-foto">{erroFoto}</p>}
          <button type="button" className="sidebar-logout" onClick={logout}>
            <IconLogout className="sidebar-link-icon" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Fora da <aside> de propósito: a sidebar tem overflow-x:hidden (pra animar o
          recolhimento sem vazar texto), o que cortaria a metade do botão que fica por
          cima da página. Como elemento independente, position:fixed, ele fica sempre
          inteiro visível, sobre a sidebar E sobre o conteúdo da página. */}
      <button
        type="button"
        className={`sidebar-toggle${colapsada ? ' is-colapsada' : ''}`}
        onClick={() => setColapsada((v) => !v)}
        aria-label={colapsada ? 'Expandir menu' : 'Recolher menu'}
        title={colapsada ? 'Expandir menu' : 'Recolher menu'}
      >
        <IconChevronDown className={`sidebar-toggle-icone${colapsada ? ' is-colapsada' : ''}`} />
      </button>

      <div className={`app-main${colapsada ? ' is-colapsada' : ''}`}>
        <header className="mobile-topbar">
          <button type="button" className="mobile-menu-btn" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <span />
            <span />
            <span />
          </button>
          <Link to="/admin" className="sidebar-brand-name mobile-topbar-brand">VRILLOVOS</Link>
        </header>

        <main className="main-content">
          <div className="main-content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
