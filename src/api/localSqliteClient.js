const defaultApiUrl = () => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8787';
  const host = window.location.hostname;
  if (host === '127.0.0.1' || host === 'localhost' || host === '::1') return 'http://127.0.0.1:8787';
  return '';
};

const API_URL = import.meta.env.VITE_LOCAL_API_URL ?? defaultApiUrl();
const API_TOKEN = import.meta.env.VITE_LOCAL_API_TOKEN || '';

const jsonClone = (value) => JSON.parse(JSON.stringify(value));

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { 'X-Pincel-Luz-Api-Key': API_TOKEN } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(`API local indisponivel em ${API_URL}. Nada foi salvo fora do SQLite. Inicie com npm run dev:full ou npm run local-api. Detalhe: ${error.message}`);
  }
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text };
  }
  if (!response.ok) throw new Error(payload?.error || `Erro HTTP ${response.status}`);
  return payload;
}

const queryString = (params) => {
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      urlParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  });
  const query = urlParams.toString();
  return query ? `?${query}` : '';
};

const makeEntity = (entityName) => ({
  async list(sort, limit, skip) {
    const payload = await request(`/api/local/entities/${encodeURIComponent(entityName)}${queryString({ sort, limit, skip })}`);
    return payload.data || [];
  },

  async filter(filters = {}, sort, limit, skip) {
    const payload = await request(`/api/local/entities/${encodeURIComponent(entityName)}${queryString({ filter: filters, sort, limit, skip })}`);
    return payload.data || [];
  },

  async create(data = {}) {
    const payload = await request(`/api/local/entities/${encodeURIComponent(entityName)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return payload.data;
  },

  async bulkCreate(items = []) {
    const payload = await request(`/api/local/entities/${encodeURIComponent(entityName)}/bulk`, {
      method: 'POST',
      body: JSON.stringify(items),
    });
    return payload.data || [];
  },

  async update(id, data = {}) {
    const payload = await request(`/api/local/entities/${encodeURIComponent(entityName)}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return payload.data;
  },

  async delete(id) {
    return request(`/api/local/entities/${encodeURIComponent(entityName)}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
});

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const localSqliteClient = {
  isLocal: true,
  isSqlite: true,
  apiUrl: API_URL,
  entities: new Proxy({}, {
    get(target, entityName) {
      if (typeof entityName !== 'string') return target[entityName];
      if (!target[entityName]) target[entityName] = makeEntity(entityName);
      return target[entityName];
    },
  }),
  auth: {
    async me() {
      return {
        id: 'local-user',
        full_name: 'Usuario Local',
        email: 'local@pinceldeluz.local',
        role: 'admin',
      };
    },
    logout() {
      return undefined;
    },
    redirectToLogin() {
      return undefined;
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (!file) throw new Error('Arquivo nao informado.');
        const base64 = await fileToBase64(file);
        return request('/api/local/uploads', {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            base64,
          }),
        });
      },
      async InvokeLLM() {
        throw new Error('IA externa nao esta habilitada no modo local.');
      },
    },
  },
  functions: {
    async invoke(name, payload = {}) {
      const response = await request('/api/local/functions', {
        method: 'POST',
        body: JSON.stringify({ name, payload: jsonClone(payload) }),
      });
      return response;
    },
  },
};
