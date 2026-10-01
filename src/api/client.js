const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

function getToken() {
  return localStorage.getItem('eggcontrol_token');
}

export function resolveUploadUrl(caminho) {
  if (!caminho) return null;
  if (/^https?:\/\//i.test(caminho)) return caminho;
  return `${ORIGIN}${caminho}`;
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch rejeita (em vez de responder com um status) quando a requisição nem chega a
    // alcançar o backend — servidor fora do ar, sem internet, CORS bloqueado, etc. Sem isso
    // quem usa via o erro cru do navegador ("Failed to fetch"), sem nenhuma pista do que fazer.
    throw new Error('Não foi possível conectar ao servidor. Verifique sua internet ou se o servidor está no ar, e tente de novo.');
  }

  if (res.status === 401) {
    localStorage.removeItem('eggcontrol_token');
    localStorage.removeItem('eggcontrol_usuario');
    if (window.location.pathname !== '/admin/login') {
      window.location.assign('/admin/login');
    }
    throw new Error('Sessão expirada');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || 'Erro na requisição');
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
};
