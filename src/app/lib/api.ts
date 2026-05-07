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
  console.log('GET request to:', `${API_BASE}/api${path}`);
  
  const token = getAuthToken();
  console.log('Auth token:', token ? 'Present' : 'Missing');
  
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: createHeaders(),
  });
  
  console.log('Response status:', res.status);
  
  if (res.status === 401) {
    // Token expired or invalid
    removeAuthToken();
    window.location.href = '/select-role';
    throw new Error('Authentication required');
  }
  
  if (!res.ok) throw new Error('API error');
  const data = await res.json();
  console.log('Response data:', data);
  return data;
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
  console.log('PATCH request to:', `${API_BASE}/api${path}`);
  console.log('Request body:', body);
  
  const token = getAuthToken();
  console.log('Auth token:', token ? 'Present' : 'Missing');
  
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'PATCH',
    headers: createHeaders(),
    body: JSON.stringify(body),
  });

  console.log('Response status:', res.status);
  console.log('Response headers:', Object.fromEntries(res.headers.entries()));

  const data = await res.json().catch(() => null);
  console.log('Response data:', data);

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

// Payment-related API functions
export async function uploadPaymentReceipt(formData: FormData) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/payment-receipts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (res.status === 401) {
    removeAuthToken();
    window.location.href = '/select-role';
    throw new Error('Authentication required');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message ?? 'Failed to upload receipt');
  }

  return data;
}

export async function updatePaymentDetails(paymentDetails: any[]) {
  return await patchJSON('/users/payment-details', { payment_details: paymentDetails });
}

export async function getPaymentReceipts() {
  return await getJSON('/payment-receipts');
}

export async function verifyPaymentReceipt(receiptId: number, status: 'verified' | 'rejected', notes?: string) {
  return await patchJSON(`/payment-receipts/${receiptId}/verify`, { status, notes });
}

// Legacy API calls (for backward compatibility)
export async function getLegacyJSON(path: string) {
  const res = await fetch(`${API_BASE}/api/legacy${path}`);
  if (!res.ok) throw new Error('API error');
  return res.json();
}
