const envApiBase = ((import.meta as any).env?.VITE_API_BASE as string | undefined) 
  || ((import.meta as any).env?.VITE_API_URL as string | undefined);

const defaultApiBase = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  ? 'https://discmansalay.onrender.com'
  : 'http://localhost:8000';

const rawApiBase = envApiBase || defaultApiBase;

export const API_BASE = rawApiBase.replace(/\/api\/?$/, '').replace(/\/+$/, '');

export function getStorageUrl(path: string | null | undefined): string {
  if (!path) return '';
  let str = String(path).trim();

  // Strip wrapping quotes if any
  str = str.replace(/^["']|["']$/g, '');

  // If path is a JSON stringified array/object (e.g. '["attractions/image.jpg"]')
  if ((str.startsWith('[') && str.endsWith(']')) || (str.startsWith('{') && str.endsWith('}'))) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) {
        str = String(parsed[0]).trim();
      } else if (typeof parsed === 'string') {
        str = parsed.trim();
      }
    } catch {}
  }

  if (!str) return '';

  // Return absolute web or data/blob URLs directly
  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('data:') ||
    str.startsWith('blob:')
  ) {
    return str;
  }

  // Handle frontend public assets (assets/..., /assets/..., images/..., /images/...)
  if (
    str.startsWith('/assets') ||
    str.startsWith('assets/') ||
    str.startsWith('/images') ||
    str.startsWith('images/') ||
    str.startsWith('/favicon') ||
    str.startsWith('favicon')
  ) {
    return str.startsWith('/') ? str : `/${str}`;
  }

  // If path already starts with /storage/ or storage/
  if (str.startsWith('/storage/') || str.startsWith('storage/')) {
    const cleanStorage = str.startsWith('/') ? str : `/${str}`;
    return `${API_BASE}${cleanStorage}`;
  }

  // If path starts with public/ (e.g. public/attractions/...)
  if (str.startsWith('/public/') || str.startsWith('public/')) {
    const stripped = str.replace(/^\/?public\//, '');
    return `${API_BASE}/storage/${stripped}`;
  }

  // Uploaded backend files (attractions/, products/, accommodations/, events/, etc.)
  const cleanPath = str.replace(/^\/+/, '');
  return `${API_BASE}/storage/${cleanPath}`;
}

export const formatImageUrl = getStorageUrl;

/**
 * Clean & decode HTML entities (e.g., &amp; -> &, &#039; -> ', &quot; -> ")
 */
export function decodeHtml(str: string | null | undefined): string {
  if (!str) return '';
  let result = String(str);
  // Handle double encoded entities (e.g. &amp;amp;)
  for (let i = 0; i < 2; i++) {
    if (!result.includes('&')) break;
    result = result
      .replace(/&amp;/g, '&')
      .replace(/&#039;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ');
  }
  return result;
}

/**
 * Real-time view counter tracking helper
 */
export function recordView(id: string | number, type: 'attraction' | 'accommodation' | 'resort' | 'product' | 'enterprise') {
  if (!id) return;
  try {
    const key = `view_count_${type}_${id}`;
    const localCountsStr = localStorage.getItem('discover-mansalay:view_counts');
    const localCounts = localCountsStr ? JSON.parse(localCountsStr) : {};
    localCounts[key] = (Number(localCounts[key]) || 0) + 1;
    localStorage.setItem('discover-mansalay:view_counts', JSON.stringify(localCounts));

    // Non-blocking sync to backend
    fetch(`${API_BASE}/api/public/views/increment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: id,
        item_type: type,
      }),
    }).catch(() => {});

    // Broadcast instant real-time event
    window.dispatchEvent(new CustomEvent('viewsUpdated', { detail: { id, type, views: localCounts[key] } }));
    window.dispatchEvent(new Event('contentUpdated'));
  } catch {}
}

// Token management
export function getAuthToken(): string | null {
  return localStorage.getItem('discover-mansalay:token') || localStorage.getItem('token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('discover-mansalay:token', token);
  localStorage.setItem('token', token); // For backward compatibility
  // Save when the token was issued so handleUnauthorized can detect fresh logins
  localStorage.setItem('discover-mansalay:tokenSetAt', Date.now().toString());
}

export function removeAuthToken(): void {
  localStorage.removeItem('discover-mansalay:token');
  localStorage.removeItem('token');
  localStorage.removeItem('discover-mansalay:tokenSetAt');
}

export function getCurrentUserRole(): 'admin' | 'resort' | 'enterprise' | 'tourist' {
  const isAdmin = localStorage.getItem('discover-mansalay:isAdmin') === 'true';
  if (isAdmin) return 'admin';

  const userType = localStorage.getItem('discover-mansalay:userType') || localStorage.getItem('userType');
  if (userType && userType.toLowerCase() === 'admin') return 'admin';

  const userStr = localStorage.getItem('discover-mansalay:currentUser') || localStorage.getItem('user');
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u) {
        if (u.role === 'admin' || u.is_admin || u.user_type === 'admin') return 'admin';
        if (u.role) return u.role.toLowerCase();
      }
    } catch {}
  }
  if (userType) {
    const lowered = userType.toLowerCase();
    if (lowered === 'admin' || lowered === 'resort' || lowered === 'enterprise') {
      return lowered as any;
    }
  }
  return 'tourist';
}

// Clears all auth data and redirects to the correct login page based on role.
// If a 401 fires within 15 seconds of login, the token is fresh — this is a
// backend/race-condition issue, not a session expiry.  In that case we clear
// the bad data but do NOT redirect so the dashboard catch-blocks can handle it.
function handleUnauthorized(): void {
  const tokenSetAt = localStorage.getItem('discover-mansalay:tokenSetAt');
  const isJustLoggedIn = tokenSetAt && (Date.now() - parseInt(tokenSetAt, 10)) < 15_000;

  const userType = localStorage.getItem('discover-mansalay:userType');
  removeAuthToken();
  localStorage.removeItem('discover-mansalay:userType');
  localStorage.removeItem('discover-mansalay:isAdmin');
  localStorage.removeItem('discover-mansalay:currentUser');

  // Fresh login — don't redirect. The component's catch block will handle it.
  if (isJustLoggedIn) return;

  switch (userType) {
    case 'resort':
      window.location.href = '/resort/login';
      break;
    case 'enterprise':
      window.location.href = '/enterprise/login';
      break;
    case 'admin':
      window.location.href = '/admin/login';
      break;
    default:
      window.location.href = '/tourist/login';
      break;
  }
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
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: createHeaders(),
  });
  
  if (res.status === 401) {
    console.error('401 Unauthorized - Token expired or invalid');
    handleUnauthorized();
    throw new Error('Authentication required');
  }
  
  // For other errors (404, 405, etc.), just throw without redirecting
  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`);
    throw new Error(`API error: ${res.status}`);
  }
  
  return res.json();
}

export async function postJSON(path: string, body: unknown, requireAuth: boolean = true) {
  const isFormData = body instanceof FormData;
  
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: createHeaders(requireAuth, isFormData),
    body: isFormData ? (body as FormData) : JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (res.status === 401 && requireAuth) {
    console.error('401 Unauthorized - Token expired or invalid');
    handleUnauthorized();
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    const errorMessage = data?.message || data?.error || `HTTP ${res.status}: ${res.statusText}`;
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
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'PATCH',
    headers: createHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (res.status === 401) {
    console.error('401 Unauthorized - Token expired or invalid');
    handleUnauthorized();
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
    handleUnauthorized();
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
    handleUnauthorized();
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
    handleUnauthorized();
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

export async function sendChatMessage(room: string, message: string, language?: 'filipino' | 'english') {
  return await postJSON('/chat/send', { room, message, language: language || 'filipino' });
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
  fee_amount?: number;
  gcash_name?: string;
  gcash_number?: string;
  qr_code?: string | null;
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
  return await getJSON('/payment-settings');
}

// Admin: Update subscription amount
export async function updatePaymentSettings(subscriptionAmount: number) {
  return await putJSON('/payment-settings', { subscription_amount: subscriptionAmount });
}
export const updateAdminPaymentSettings = updatePaymentSettings;

// Admin: Get all payment methods
export async function getAdminPaymentMethods(): Promise<PaymentMethod[]> {
  return await getJSON('/payment-methods');
}

// Admin: Create payment method
export async function createPaymentMethod(data: PaymentMethodInput): Promise<{ message: string; payment_method: PaymentMethod }> {
  return await postJSON('/payment-methods', data);
}

// Admin: Update payment method
export async function updatePaymentMethod(id: number, data: Partial<PaymentMethodInput>): Promise<{ message: string; payment_method: PaymentMethod }> {
  return await putJSON(`/payment-methods/${id}`, data);
}

// Admin: Delete payment method
export async function deletePaymentMethod(id: number): Promise<{ message: string }> {
  return await deleteJSON(`/payment-methods/${id}`);
}

// Admin: Toggle payment method enabled status
export async function togglePaymentMethod(id: number): Promise<{ message: string; payment_method: PaymentMethod }> {
  return await patchJSON(`/payment-methods/${id}/toggle`, {});
}

// Public: Get payment settings for users (enterprise/resort)
export async function getPublicPaymentSettings(): Promise<PublicPaymentSettings> {
  try {
    const res = await getPublicJSON('/subscription/settings');
    if (res) {
      return {
        subscription_amount: res.subscription_amount ?? res.fee_amount ?? 500,
        payment_methods: res.payment_methods ?? [
          {
            id: 1,
            name: 'GCash',
            account_name: res.gcash_name ?? 'Mansalay Tourism Office',
            account_number: res.gcash_number ?? '09123456789',
            instructions: 'Send subscription fee via GCash and upload receipt.',
          },
        ],
        fee_amount: res.fee_amount ?? 500,
        gcash_name: res.gcash_name ?? 'Mansalay Tourism Office',
        gcash_number: res.gcash_number ?? '09123456789',
        qr_code: res.qr_code ?? null,
      };
    }
  } catch (err) {
    console.warn('Could not load payment settings from API, using defaults:', err);
  }

  return {
    subscription_amount: 500,
    payment_methods: [
      {
        id: 1,
        name: 'GCash',
        account_name: 'Mansalay Tourism Office',
        account_number: '09123456789',
        instructions: 'Send subscription fee via GCash and upload receipt.',
      },
    ],
    fee_amount: 500,
    gcash_name: 'Mansalay Tourism Office',
    gcash_number: '09123456789',
    qr_code: null,
  };
}

// Landmark API Functions
export async function getPublicLandmarks() {
  return await getPublicJSON('/landmarks');
}

export async function createLandmark(data: {
  name: string;
  type: 'resort' | 'enterprise';
  category?: string;
  description?: string;
  address?: string;
  latitude: number;
  longitude: number;
  image?: string;
}) {
  return await postJSON('/landmarks', data, true);
}


// Password Reset API Functions
export async function sendPasswordResetCode(email: string): Promise<{ message: string; expires_in: number }> {
  return await postJSON('/password/forgot', { email }, false);
}

export async function resetPassword(email: string, code: string, password: string, password_confirmation: string): Promise<{ message: string }> {
  return await postJSON('/password/reset', { email, code, password, password_confirmation }, false);
}


// Get platform statistics (public endpoint)
export async function getPlatformStats() {
  return getPublicJSON('/stats');
}


// Review API functions
export async function submitReview(orderId: number, productId: number, rating: number, comment: string) {
  return postJSON('/reviews', {
    order_id: orderId,
    product_id: productId,
    rating,
    comment,
  });
}

export async function getOrderReviewStatus(orderId: number) {
  return getJSON(`/orders/${orderId}/reviews`);
}

export async function getProductReviews(productId: number) {
  return getPublicJSON(`/products/${productId}/reviews`);
}


// Messaging API functions
export async function sendMessage(receiverId: number, message: string) {
  return postJSON('/messages/send', {
    receiver_id: receiverId,
    message,
  });
}

export async function getConversation(otherUserId: number) {
  return getJSON(`/messages/conversation/${otherUserId}`);
}

export async function getMessagesInbox() {
  return getJSON('/messages/inbox');
}

export async function getUnreadMessageCount() {
  return getJSON('/messages/unread-count');
}


// ============================================================================
// Notification API
// ============================================================================

export interface ApiNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, any> | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  success: boolean;
  notifications: ApiNotification[];
  unread_count: number;
}

export async function getNotifications(): Promise<NotificationListResponse> {
  return getJSON('/notifications');
}

export async function getUnreadNotificationCount(): Promise<{ success: boolean; unread_count: number }> {
  return getJSON('/notifications/unread-count');
}

export async function markNotificationAsRead(id: number) {
  return patchJSON(`/notifications/${id}/read`, {});
}

export async function markAllNotificationsAsRead() {
  return postJSON('/notifications/mark-all-read', {});
}

export async function deleteNotification(id: number) {
  return deleteJSON(`/notifications/${id}`);
}

// ============================================================================
// OSRM Real Road Routing & Mansalay Polygon Geofence API
// ============================================================================

export const OSRM_BASE_URL = (import.meta as any).env?.VITE_OSRM_API_URL || 'https://router.project-osrm.org';

/**
 * Official 2D Boundary Polygon Vertices for Mansalay, Oriental Mindoro
 * Format: [Latitude, Longitude]
 */
export const MANSALAY_POLYGON_VERTICES: [number, number][] = [
  [12.6150, 121.3250],
  [12.6180, 121.4100],
  [12.5950, 121.4850],
  [12.5650, 121.5250],
  [12.5100, 121.5450],
  [12.4450, 121.5200],
  [12.4250, 121.4650],
  [12.4220, 121.3900],
  [12.4500, 121.3300],
  [12.5300, 121.3180],
  [12.6150, 121.3250],
];

/**
 * Client-Side Point-in-Polygon Check (Ray-Casting Algorithm)
 */
export function isPointInMansalayPolygon(lat: number, lng: number): boolean {
  const polygon = MANSALAY_POLYGON_VERTICES;
  const numVertices = polygon.length;
  let inside = false;

  for (let i = 0, j = numVertices - 1; i < numVertices; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < ((xj - xi) * (lng - yi)) / (yj - yi + 1e-12) + xi);

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

export interface OSRMRouteResponse {
  code: string;
  routes: Array<{
    distance: number; // meters
    duration: number; // seconds
    geometry: {
      coordinates: [number, number][]; // [lng, lat] format from GeoJSON
      type: string;
    };
    legs: Array<{
      distance: number;
      duration: number;
      summary: string;
      steps: Array<{
        distance: number;
        duration: number;
        name: string;
        maneuver: {
          type: string;
          modifier?: string;
          location: [number, number];
        };
      }>;
    }>;
  }>;
}

export async function getOSRMRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<OSRMRouteResponse | null> {
  try {
    const url = `${OSRM_BASE_URL}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('OSRM routing request failed:', res.statusText);
      return null;
    }
    const data: OSRMRouteResponse = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }
    return data;
  } catch (err) {
    console.error('OSRM route fetch error:', err);
    return null;
  }
}
