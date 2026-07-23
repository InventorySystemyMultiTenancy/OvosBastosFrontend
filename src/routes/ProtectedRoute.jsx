import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ perfis }) {
  const { usuario } = useAuth();

  if (!usuario) return <Navigate to="/admin/login" replace />;
  if (perfis && !perfis.includes(usuario.perfil)) return <Navigate to="/admin" replace />;

  return <Outlet />;
}
