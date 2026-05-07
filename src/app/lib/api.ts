export const API_BASE = 'http://localhost:8000';

// Token management
export function getAuthToken(): string | null {
  return localStorage.getItem('discover-mansalay:token') || localStorage.getItem('token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('discover-mansalay:token', token);
  localStorage.setItem('token', token); // For backward compatibility
}

export function removeAuthToken(): void {
  localStorage.removeItem('discover-mansalay:token');
  localStorage.removeItem('token');
}

// Create headers with authentication
function createHeaders(includeAuth: boolean = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

// Public API calls (no authentication)
export async function getPublicJSON(path: string) {
  const res = await fetch(`${API_BASE}/api/public${path}`);
  if (!res.ok) throw new Error('API error');
  return res.json();
}

// Authenticated API calls
export async function getJSON(path: string) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: createHeaders(),
  });
  
  if (res.status === 401) {
    // Token expired or invalid
    removeAuthToken();
    window.location.href = '/select-role';
    throw new Error('Authentication required');
  }
  
  if (!res.ok) throw new Error('API error');
  return res.json();
}

export async function postJSON(path: string, body: unknown, requireAuth: boolean = true) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: createHeaders(requireAuth),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (res.status === 401 && requireAuth) {
    removeAuthToken();
    window.location.href = '/select-role';
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    throw new Error(data?.message ?? 'API error');
  }

  return data;
}

export async function patchJSON(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'PATCH',
    headers: createHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (res.status === 401) {
    removeAuthToken();
    window.location.href = '/select-role';
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    throw new Error(data?.message ?? 'API error');
  }

  return data;
}

export async function putJSON(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'PUT',
    headers: createHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (res.status === 401) {
    removeAuthToken();
    window.location.href = '/select-role';
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    throw new Error(data?.message ?? 'API error');
  }

  return data;
}

export async function deleteJSON(path: string) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'DELETE',
    headers: createHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (res.status === 401) {
    removeAuthToken();
    window.location.href = '/select-role';
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    throw new Error(data?.message ?? 'API error');
  }

  return data;
}

// Legacy API calls (for backward compatibility)
export async function getLegacyJSON(path: string) {
  const res = await fetch(`${API_BASE}/api/legacy${path}`);
  if (!res.ok) throw new Error('API error');
  return res.json();
}
