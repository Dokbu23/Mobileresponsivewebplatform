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
function createHeaders(includeAuth: boolean = true, isFormData: boolean = false): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

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
    // Token expired or invalid - redirect to login
    console.error('401 Unauthorized - Token expired or invalid');
    removeAuthToken();
    window.location.href = '/select-role';
    throw new Error('Authentication required');
  }
  
  // For other errors (404, 405, etc.), just throw without redirecting
  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`);
    throw new Error(`API error: ${res.status}`);
  }
  
  const data = await res.json();
  console.log('Response data:', data);
  return data;
}

export async function postJSON(path: string, body: unknown, requireAuth: boolean = true) {
  console.log('POST request to:', `${API_BASE}/api${path}`);
  console.log('Request body:', body);
  
  const token = getAuthToken();
  console.log('Auth token:', token ? 'Present' : 'Missing');

  const isFormData = body instanceof FormData;
  if (isFormData) {
    try {
      const fd = body as FormData;
      for (const pair of fd.entries()) {
        const key = pair[0];
        const value: any = pair[1];
        if (typeof File !== 'undefined' && value instanceof File) {
          console.log('FormData entry:', key, 'File ->', value.name, value.type, `${value.size} bytes`);
        } else {
          console.log('FormData entry:', key, value);
        }
      }
    } catch (e) {
      console.warn('Could not iterate FormData entries', e);
    }
  }
  
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: createHeaders(requireAuth, isFormData),
    body: isFormData ? body : JSON.stringify(body),
  });

  console.log('Response status:', res.status);
  console.log('Response headers:', Object.fromEntries(res.headers.entries()));

  const data = await res.json().catch(() => null);
  console.log('Response data:', data);

  if (res.status === 401 && requireAuth) {
    console.error('401 Unauthorized - Token expired or invalid');
    removeAuthToken();
    window.location.href = '/select-role';
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    const errorMessage = data?.message || data?.error || `HTTP ${res.status}: ${res.statusText}`;
    console.error('API Error:', errorMessage);
    if (data?.errors) {
      console.error('Validation errors:', data.errors);
    }

    // Build a more descriptive error message including the first validation message
    let errorDetail = '';
    if (data?.errors) {
      const keys = Object.keys(data.errors || {});
      if (keys.length) {
        const first = data.errors[keys[0]];
        if (Array.isArray(first) && first.length > 0) {
          errorDetail = ` - ${first[0]}`;
        }
      }
    }

    // Pass through additional error data (like requires_verification)
    const error: any = new Error(errorMessage + errorDetail);
    if (data?.requires_verification) {
      error.requires_verification = true;
      error.email = data.email;
    }
    if (data?.errors) {
      error.validation = data.errors;
    }
    throw error;
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
    console.error('401 Unauthorized - Token expired or invalid');
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
    console.error('401 Unauthorized - Token expired or invalid');
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
    console.error('401 Unauthorized - Token expired or invalid');
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
    console.error('401 Unauthorized - Token expired or invalid');
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

// Chat API (FAQ-based chat)
export async function getChatHistory(room: string) {
  return await getJSON(`/chat/history?room=${encodeURIComponent(room)}`);
}

export async function sendChatMessage(room: string, message: string) {
  return await postJSON('/chat/send', { room, message });
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

// Payment Settings API Functions (Admin)
export interface PaymentMethod {
  id: number;
  name: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentSettings {
  subscription_amount: number;
  updated_at: string;
}

export interface PublicPaymentSettings {
  subscription_amount: number;
  payment_methods: Array<{
    id: number;
    name: string;
    account_name: string;
    account_number: string;
    instructions: string | null;
  }>;
}

export interface PaymentMethodInput {
  name: string;
  account_name: string;
  account_number: string;
  instructions?: string | null;
  enabled?: boolean;
}

// Admin: Get payment settings (subscription amount)
export async function getAdminPaymentSettings(): Promise<PaymentSettings> {
  return await getJSON('/admin/payment-settings');
}

// Admin: Update subscription amount
export async function updateAdminPaymentSettings(amount: number): Promise<{ message: string; subscription_amount: number }> {
  return await putJSON('/admin/payment-settings', { subscription_amount: amount });
}

// Admin: Get all payment methods
export async function getAdminPaymentMethods(): Promise<PaymentMethod[]> {
  return await getJSON('/admin/payment-methods');
}

// Admin: Create payment method
export async function createPaymentMethod(data: PaymentMethodInput): Promise<{ message: string; payment_method: PaymentMethod }> {
  return await postJSON('/admin/payment-methods', data);
}

// Admin: Update payment method
export async function updatePaymentMethod(id: number, data: Partial<PaymentMethodInput>): Promise<{ message: string; payment_method: PaymentMethod }> {
  return await putJSON(`/admin/payment-methods/${id}`, data);
}

// Admin: Delete payment method
export async function deletePaymentMethod(id: number): Promise<{ message: string }> {
  return await deleteJSON(`/admin/payment-methods/${id}`);
}

// Admin: Toggle payment method enabled status
export async function togglePaymentMethod(id: number): Promise<{ message: string; payment_method: PaymentMethod }> {
  return await patchJSON(`/admin/payment-methods/${id}/toggle`, {});
}

// Public: Get payment settings for users (enterprise/resort)
export async function getPublicPaymentSettings(): Promise<PublicPaymentSettings> {
  return await getJSON('/subscription/settings');
}


// Password Reset API Functions
export async function sendPasswordResetCode(email: string): Promise<{ message: string; expires_in: number }> {
  return await postJSON('/password/forgot', { email }, false);
}

export async function resetPassword(email: string, code: string, password: string, password_confirmation: string): Promise<{ message: string }> {
  return await postJSON('/password/reset', { email, code, password, password_confirmation }, false);
}
