import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem('eggcontrol_usuario');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (email, senha) => {
    const data = await api.post('/auth/login', { email, senha });
    localStorage.setItem('eggcontrol_token', data.token);
    localStorage.setItem('eggcontrol_usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('eggcontrol_token');
    localStorage.removeItem('eggcontrol_usuario');
    setUsuario(null);
  }, []);

  // Atualiza o usuário logado em memória + localStorage sem precisar de um novo login —
  // usado depois de trocar a foto de perfil, por exemplo.
  const atualizarUsuario = useCallback((parcial) => {
    setUsuario((atual) => {
      const atualizado = { ...atual, ...parcial };
      localStorage.setItem('eggcontrol_usuario', JSON.stringify(atualizado));
      return atualizado;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
