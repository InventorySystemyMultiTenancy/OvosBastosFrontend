import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ perfis }) {
  const { usuario } = useAuth();
  const location = useLocation();

  if (!usuario) return <Navigate to="/admin/login" replace />;
  // Login travado a um caixa (Usuario.caixaId) só pode acessar a aba Caixa — barra
  // navegação direta por URL pra qualquer outra página, incluindo o Dashboard (index).
  if (usuario.caixaId && location.pathname !== '/admin/caixa') return <Navigate to="/admin/caixa" replace />;
  if (perfis && !perfis.includes(usuario.perfil)) return <Navigate to="/admin" replace />;

  return <Outlet />;
}
