import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLETA_EMOJIS = Array.from({ length: 18 }, (_, i) => (i % 2 === 0 ? '🐔' : '🥚'));

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@eggcontrol.com');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await login(email, senha);
      navigate('/admin');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-roleta" aria-hidden="true">
        {ROLETA_EMOJIS.map((emoji, i) => (
          <span
            key={i}
            className="login-roleta-item"
            style={{ '--i': i, '--n': ROLETA_EMOJIS.length }}
          >
            {emoji}
          </span>
        ))}
      </div>

      <div className="login-card">
        <img src="/vrilllogo.png" alt="Vrill Ovos" className="login-logo" />
        <span className="login-tag">ERP EXCLUSIVO</span>
        <h1>VrillOvos</h1>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          Entre com sua conta para acessar o sistema.
        </p>

        {erro && <div className="login-error">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Senha</label>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-hint">
          Usuários de teste (seed): admin@eggcontrol.com / vendedor@eggcontrol.com / entregador@eggcontrol.com — senha: admin123
        </div>
      </div>
    </div>
  );
}
