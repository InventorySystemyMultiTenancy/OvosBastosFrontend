import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { Produtos } from './pages/Produtos';
import { Bandejas } from './pages/Bandejas';
import { Vendas } from './pages/Vendas';
import { Caixa } from './pages/Caixa';
import { Financeiro } from './pages/Financeiro';
import { Catalogo } from './pages/Catalogo';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Catalogo />} />

          <Route path="/admin/login" element={<Login />} />

          <Route path="/admin" element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />

              <Route element={<ProtectedRoute perfis={['ADMIN', 'VENDEDOR']} />}>
                <Route path="clientes" element={<Clientes />} />
                <Route path="produtos" element={<Produtos />} />
                <Route path="bandejas" element={<Bandejas />} />
                <Route path="vendas" element={<Vendas />} />
                <Route path="caixa" element={<Caixa />} />
              </Route>

              <Route element={<ProtectedRoute perfis={['ADMIN']} />}>
                <Route path="financeiro" element={<Financeiro />} />
              </Route>
            </Route>
          </Route>

          {/* Compatibilidade com links/rotas antigas */}
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />
          <Route path="/loja" element={<Navigate to="/" replace />} />
          <Route path="/ecommerce" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
