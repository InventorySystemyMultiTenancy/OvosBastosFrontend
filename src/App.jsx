import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { Produtos } from './pages/Produtos';
import { Bandejas } from './pages/Bandejas';
import { Vendas } from './pages/Vendas';
import { Financeiro } from './pages/Financeiro';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />

              <Route element={<ProtectedRoute perfis={['ADMIN', 'VENDEDOR']} />}>
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/bandejas" element={<Bandejas />} />
                <Route path="/vendas" element={<Vendas />} />
              </Route>

              <Route element={<ProtectedRoute perfis={['ADMIN']} />}>
                <Route path="/financeiro" element={<Financeiro />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
