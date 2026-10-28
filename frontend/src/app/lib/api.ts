import { toast } from 'sonner';
import {
  MAX_IMAGE_INPUT_BYTES,
  MediaProcessingProgress,
  prepareMediaFiles,
  prepareMediaFormData,
} from './mediaCompression';

function resolveApiBase(): string {
  // 1. If running in browser, check current hostname:
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Local development (localhost, 127.0.0.1, or local WiFi/LAN IP)
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.endsWith('.local')
    ) {
      return 'http://localhost:8000';
    }
    if (host.includes('discovermansalay.cyou')) {
      return 'https://api.discovermansalay.cyou';
    }
  }

  // 2. If deployed (e.g. EC2, Render, production domain)
  const envApiBase = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)
    || ((import.meta as any).env?.VITE_API_BASE as string | undefined)
    || ((import.meta as any).env?.VITE_API_URL as string | undefined);

  if (envApiBase && !envApiBase.includes('localhost') && !envApiBase.includes('127.0.0.1')) {
    return envApiBase;
  }

  return 'https://api.discovermansalay.cyou';
}

const rawApiBase = resolveApiBase();
export const API_BASE = rawApiBase.replace(/\/api\/?$/, '').replace(/\/+$/, '');

class MediaUploadHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'MediaUploadHttpError';
  }
}

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

export function normalizeImageUrl(url: string): string {
  if (!url) return '';
  const trimmedUrl = url.trim();
  const storageIndex = trimmedUrl.indexOf('storage/');
  if (storageIndex !== -1) {
    return trimmedUrl.substring(storageIndex);
  }
  return trimmedUrl.replace(/^\/+/, '');
}

function imageFilename(url: string): string {
  const normalizedUrl = normalizeImageUrl(url).split(/[?#]/, 1)[0];
  return normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1);
}

function imageIdentity(url: string): string {
  const normalized = normalizeImageUrl(url).split(/[?#]/, 1)[0].toLowerCase();
  const filename = imageFilename(url).toLowerCase();
  return normalized || filename;
}

export function parseImageGallery(rawGallery: unknown, coverImage: unknown): string[] {
  let parsedImages: string[] = [];

  if (Array.isArray(rawGallery)) {
    parsedImages = rawGallery.filter((image): image is string => typeof image === 'string');
  } else if (typeof rawGallery === 'string' && rawGallery.trim()) {
    try {
      const parsed = JSON.parse(rawGallery);
      if (Array.isArray(parsed)) {
        parsedImages = parsed.filter((image): image is string => typeof image === 'string');
      } else if (rawGallery.includes(',')) {
        parsedImages = rawGallery.split(',').map(image => image.trim());
      } else {
        parsedImages = [rawGallery];
      }
    } catch {
      parsedImages = rawGallery.includes(',')
        ? rawGallery.split(',').map(image => image.trim())
        : [rawGallery];
    }
  }

  const formattedCover = typeof coverImage === 'string' && coverImage.trim()
    ? formatImageUrl(coverImage)
    : '';

  if (parsedImages.length === 0 && formattedCover) {
    if (coverImage.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(coverImage);
        parsedImages = Array.isArray(parsed) ? parsed.filter((image): image is string => typeof image === 'string') : [coverImage];
      } catch {
        parsedImages = [coverImage];
      }
    } else {
      parsedImages = [coverImage];
    }
  }

  const uniqueImages: string[] = [];
  const seenPaths = new Set<string>();
  const seenFilenames = new Set<string>();

  const addUniqueImage = (image: string): void => {
    const formattedImage = formatImageUrl(image);
    if (!formattedImage) return;

    const normalizedPath = imageIdentity(formattedImage);
    const filename = imageFilename(formattedImage).toLowerCase();
    if (
      !normalizedPath ||
      seenPaths.has(normalizedPath) ||
      (filename && seenFilenames.has(filename))
    ) {
      return;
    }

    seenPaths.add(normalizedPath);
    if (filename) seenFilenames.add(filename);
    uniqueImages.push(formattedImage);
  };

  if (formattedCover) {
    addUniqueImage(formattedCover);
  }

  parsedImages.forEach(image => {
    addUniqueImage(image);
  });

  return uniqueImages;
}

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
 * Strip "(Itinerary)" or "(itenerary)" from titles and names
 */
export function cleanItineraryTitle(str: string | null | undefined): string {
  if (!str) return '';
  return decodeHtml(str)
    .replace(/\s*\([iI]t[ie]nerary\)/gi, '')
    .trim();
}

/**
 * Sanitize all localStorage caches to permanently remove "(Itinerary)" from existing saved objects
 */
export function sanitizeStoredItineraryTitles() {
  if (typeof window === 'undefined') return;
  const keys = [
    'discover-mansalay:custom_attractions',
    'discover-mansalay:custom_itinerarys',
    'discover-mansalay:published_itineraries',
    'discover-mansalay:custom_events',
    'discover-mansalay:custom_products',
    'discover-mansalay:wishlist'
  ];

  keys.forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw && (raw.includes('(Itinerary)') || raw.includes('(itinerary)') || raw.includes('(Itenerary)'))) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.map((item: any) => {
            if (!item || typeof item !== 'object') return item;
            return {
              ...item,
              name: item.name ? cleanItineraryTitle(item.name) : item.name,
              title: item.title ? cleanItineraryTitle(item.title) : item.title,
            };
          });
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
      }
    } catch {}
  });

  // Also sanitize custom trips
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('discover-mansalay:custom-trips')) {
        const raw = localStorage.getItem(k);
        if (raw && (raw.includes('(Itinerary)') || raw.includes('(itinerary)') || raw.includes('(Itenerary)'))) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.map((item: any) => ({
              ...item,
              title: item.title ? cleanItineraryTitle(item.title) : item.title,
              name: item.name ? cleanItineraryTitle(item.name) : item.name,
            }));
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        }
      }
    }
  } catch {}
}

/**
 * Purge legacy mock/custom localStorage caches so deleted/ghost items
 * (such as "Sunset Weekend") never resurrect on public pages.
 */
export function purgeLegacyMockAndDeletedCaches() {
  if (typeof window === 'undefined') return;
  const legacyMockKeys = [
    'discover-mansalay:published_itineraries',
    'discover-mansalay:custom_itinerarys',
    'discover-mansalay:custom_attractions',
    'discover-mansalay:custom_products',
    'discover-mansalay:custom_events',
    'discover-mansalay:custom_cultures',
    'discover-mansalay:custom_histories',
  ];

  legacyMockKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });
}

/**
 * Synchronize deleted / archived / restored records across all active UI views and local state.
 */
export function purgeClientRecord(
  id: string | number,
  action: 'deleted' | 'archived' | 'restored',
  source?: string
) {
  if (typeof window === 'undefined') return;
  const strId = String(id);
  const possibleIds = new Set<string>([strId, `ep_${strId}`, `post-${strId}`, `room-${strId}`]);

  try {
    let deletedList: string[] = [];
    const delStr = localStorage.getItem('discover-mansalay:deleted_posts');
    if (delStr) deletedList = JSON.parse(delStr);

    let archivedList: string[] = [];
    const archStr = localStorage.getItem('discover-mansalay:archived_posts');
    if (archStr) archivedList = JSON.parse(archStr);

    if (action === 'deleted') {
      possibleIds.forEach(pid => {
        if (!deletedList.includes(pid)) deletedList.push(pid);
        archivedList = archivedList.filter(x => x !== pid);
      });
    } else if (action === 'archived') {
      possibleIds.forEach(pid => {
        if (!archivedList.includes(pid)) archivedList.push(pid);
        deletedList = deletedList.filter(x => x !== pid);
      });
    } else if (action === 'restored') {
      possibleIds.forEach(pid => {
        deletedList = deletedList.filter(x => x !== pid);
        archivedList = archivedList.filter(x => x !== pid);
      });
    }

    localStorage.setItem('discover-mansalay:deleted_posts', JSON.stringify(deletedList));
    localStorage.setItem('discover-mansalay:archived_posts', JSON.stringify(archivedList));

    // Also scrub from wishlist or saved places if deleted/archived
    if (action === 'deleted' || action === 'archived') {
      const wishStr = localStorage.getItem('discover-mansalay:wishlist');
      if (wishStr) {
        try {
          const wish = JSON.parse(wishStr);
          if (Array.isArray(wish)) {
            const filtered = wish.filter((w: any) => !possibleIds.has(String(w?.id || w)));
            localStorage.setItem('discover-mansalay:wishlist', JSON.stringify(filtered));
          }
        } catch {}
      }
    }

    // Broadcast across windows and components
    window.dispatchEvent(new Event('contentUpdated'));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('itineraryUpdated'));
  } catch (err) {
    console.error('Error synchronizing client record purge:', err);
  }
}

if (typeof window !== 'undefined') {
  try {
    sanitizeStoredItineraryTitles();
    purgeLegacyMockAndDeletedCaches();
  } catch {}
}

/**
 * Real-time view counter tracking helper
 */
export function recordView(
  id: string | number,
  type: 'attraction' | 'accommodation' | 'resort' | 'product' | 'enterprise' | 'culture' | 'history' | string
) {
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
      headers['X-Auth-Token'] = token;
    }
  }

  return headers;
}

// Public API calls (no authentication)
export async function getPublicJSON(path: string) {
  const res = await fetch(`${API_BASE}/api/public${path}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

// Authenticated API calls
export async function getJSON(path: string) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: createHeaders(),
  });

  if (res.status === 401) {
    console.warn(`401 Unauthorized on ${path}`);
    const isBackground = path.includes('/notifications') || path.includes('/messages/unread');
    if (!isBackground) {
      handleUnauthorized();
    }
    throw new Error('Authentication required');
  }

  // For other errors (404, 405, etc.), just throw without redirecting
  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`);
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

const activeMediaUploads = new Set<string>();

function lockMediaUpload(key: string): () => void {
  if (activeMediaUploads.has(key)) {
    throw new Error('An upload to this destination is already processing. Please wait for it to finish.');
  }
  activeMediaUploads.add(key);
  return () => activeMediaUploads.delete(key);
}

interface MediaUploadProgressHandlers {
  onProcessingProgress?: MediaProcessingProgress;
  onUploadProgress?: (loaded: number, total: number) => void;
}

export async function postJSON(
  path: string,
  body: unknown,
  requireAuth: boolean = true,
  progressHandlers: MediaUploadProgressHandlers = {}
) {
  const isFormData = body instanceof FormData;
  const progressToastId = `media-upload:${Date.now()}`;
  const releaseUpload = isFormData ? lockMediaUpload(`POST:${path}`) : () => undefined;
  let res: Response;

  try {
    if (isFormData) {
      const prepared = await prepareMediaFormData(body as FormData, (file, phase, percent) => {
        progressHandlers.onProcessingProgress?.(file, phase, percent);
        toast.loading(
          `${phase === 'checking' ? 'Preparing' : 'Compressing'} ${file.name} (${percent}%)`,
          { id: progressToastId }
        );
      });
      const imageSummary = prepared.media.filter(media => media.kind === 'image');
      const originalBytes = prepared.media.reduce((sum, media) => sum + media.originalSize, 0);
      const compressedBytes = prepared.media.reduce((sum, media) => sum + media.compressedSize, 0);
      const fileSummary = describePreparedMedia(prepared.media);
      const message = imageSummary.length > 0
        ? `Prepared ${imageSummary.length} image${imageSummary.length === 1 ? '' : 's'} (${fileSummary}): ${formatMediaBytes(originalBytes)} → ${formatMediaBytes(compressedBytes)}. Uploading…`
        : prepared.media.length > 0
          ? `Video compressed (${fileSummary}): ${formatMediaBytes(originalBytes)} → ${formatMediaBytes(compressedBytes)}. Uploading…`
          : '';
      if (message) toast.loading(message, { id: progressToastId });

      res = await sendFormDataWithProgress(
        `${API_BASE}/api${path}`,
        prepared.formData,
        createHeaders(requireAuth, true),
        (loaded, total) => {
          if (total > 0) {
            progressHandlers.onUploadProgress?.(loaded, total);
            toast.loading(`Uploading media (${Math.floor((loaded / total) * 100)}%)`, { id: progressToastId });
          }
        }
      );
    } else {
      res = await fetch(`${API_BASE}/api${path}`, {
        method: 'POST',
        headers: createHeaders(requireAuth),
        body: JSON.stringify(body),
      });
    }
  } catch (error) {
    toast.dismiss(progressToastId);
    releaseUpload();
    throw error;
  }

  const data = await res.json().catch(() => null);

  if (res.status === 401 && requireAuth) {
    console.error('401 Unauthorized - Token expired or invalid');
    handleUnauthorized();
    toast.dismiss(progressToastId);
    releaseUpload();
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    const errorMessage = data?.message || data?.error || (res.status === 413
      ? 'The upload exceeds the server or proxy request-size limit. The browser prepared the files, but the hosting request limit may need to be raised.'
      : `HTTP ${res.status}: ${res.statusText}`);
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
    error.status = res.status;
    if (data?.requires_verification) {
      error.requires_verification = true;
      error.email = data.email;
    }
    if (data?.errors) {
      error.validation = data.errors;
    }
    toast.dismiss(progressToastId);
    releaseUpload();
    throw error;
  }

  toast.dismiss(progressToastId);
  releaseUpload();
  return data;
}

function formatMediaBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function describePreparedMedia(media: Array<{ file: File; originalSize: number; compressedSize: number }>): string {
  const summaries = media.slice(0, 3).map(item =>
    `${item.file.name} ${formatMediaBytes(item.originalSize)} → ${formatMediaBytes(item.compressedSize)}`
  );
  return summaries.length < media.length
    ? `${summaries.join('; ')}; +${media.length - summaries.length} more`
    : summaries.join('; ');
}

function sendFormDataWithProgress(
  url: string,
  body: FormData,
  headers: HeadersInit,
  onProgress: (loaded: number, total: number) => void,
  method: string = 'POST'
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    const setHeader = (name: string, value: string) => {
      if (name.toLowerCase() !== 'content-type') xhr.setRequestHeader(name, value);
    };
    if (headers instanceof Headers) {
      headers.forEach((value, name) => setHeader(name, value));
    } else {
      Object.entries(headers as Record<string, string>).forEach(([name, value]) => setHeader(name, value));
    }
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      resolve(new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: { 'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json' },
      }));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading media.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'));
    xhr.send(body);
  });
}

export async function sendMediaFormData(
  url: string,
  body: FormData,
  options: { method?: string; headers?: HeadersInit }
): Promise<Response> {
  const progressToastId = `media-upload:${Date.now()}`;
  const releaseUpload = lockMediaUpload(`${options.method || 'POST'}:${url}`);
  try {
    const prepared = await prepareMediaFormData(body, (file, phase, percent) => {
      toast.loading(
        `${phase === 'checking' ? 'Preparing' : 'Compressing'} ${file.name} (${percent}%)`,
        { id: progressToastId }
      );
    });
    const imageCount = prepared.media.filter(media => media.kind === 'image').length;
    const originalBytes = prepared.media.reduce((sum, media) => sum + media.originalSize, 0);
    const compressedBytes = prepared.media.reduce((sum, media) => sum + media.compressedSize, 0);
    if (prepared.media.length > 0) {
      const label = imageCount > 0
        ? `Prepared ${imageCount} image${imageCount === 1 ? '' : 's'} (${describePreparedMedia(prepared.media)})`
        : `Video compressed (${describePreparedMedia(prepared.media)})`;
      toast.loading(`${label}: ${formatMediaBytes(originalBytes)} → ${formatMediaBytes(compressedBytes)}. Uploading…`, {
        id: progressToastId,
      });
    }

    return await sendFormDataWithProgress(
      url,
      prepared.formData,
      options.headers || {},
      (loaded, total) => {
        if (total > 0) {
          toast.loading(`Uploading media (${Math.floor((loaded / total) * 100)}%)`, { id: progressToastId });
        }
      },
      options.method || 'POST'
    );
  } finally {
    toast.dismiss(progressToastId);
    releaseUpload();
  }
}

export interface MediaUploadResult {
  url: string;
  mime_type: string;
  sha256: string;
}

export const IMAGE_UPLOAD_LIMIT_BYTES = MAX_IMAGE_INPUT_BYTES;
export const VIDEO_UPLOAD_LIMIT_BYTES = 2048 * 1024 * 1024;

export function getMediaUploadLimitBytes(file: File): number {
  const videoExtensions = ['.mp4', '.mov', '.webm', '.ogv', '.ogg', '.mpeg', '.mpg', '.mkv'];
  const lowerName = file.name.toLowerCase();
  const isVideo = file.type.startsWith('video/') || videoExtensions.some(extension => lowerName.endsWith(extension));
  return isVideo ? VIDEO_UPLOAD_LIMIT_BYTES : IMAGE_UPLOAD_LIMIT_BYTES;
}

interface MediaUploadSessionResponse {
  upload_id: string;
  chunk_size: number;
  received_chunks: number[];
  status: 'uploading' | 'complete';
  url: string | null;
  mime_type: string | null;
  sha256: string | null;
}

export interface MediaUploadOptions {
  prepared?: boolean;
  onProcessingProgress?: MediaProcessingProgress;
  operationKey?: string;
  uploadId?: string;
}

export async function uploadMediaInChunks(
  file: File,
  onProgress?: (uploadedBytes: number, totalBytes: number) => void,
  signal?: AbortSignal,
  options: MediaUploadOptions = {}
): Promise<MediaUploadResult> {
  const releaseUpload = lockMediaUpload(`chunk:${file.name}:${file.size}:${file.lastModified}`);
  try {
    return await uploadMediaInChunksInternal(file, onProgress, signal, options);
  } finally {
    releaseUpload();
  }
}

async function uploadMediaInChunksInternal(
  file: File,
  onProgress?: (uploadedBytes: number, totalBytes: number) => void,
  signal?: AbortSignal,
  options: MediaUploadOptions = {}
): Promise<MediaUploadResult> {
  const maxBytes = getMediaUploadLimitBytes(file);
  if (file.size > maxBytes) {
    const limitLabel = maxBytes === VIDEO_UPLOAD_LIMIT_BYTES ? '2 GB' : '100 MB';
    throw new Error(`${file.name} exceeds the ${limitLabel} upload limit.`);
  }

  let uploadFile = file;
  if (!options.prepared) {
    const [prepared] = await prepareMediaFiles(
      [file],
      options.onProcessingProgress,
      signal
    );
    uploadFile = prepared.file;
  }

  const processedLimit = getMediaUploadLimitBytes(uploadFile);
  if (uploadFile.size > processedLimit) {
    throw new Error(`${uploadFile.name} exceeds the configured upload limit after compression.`);
  }

  const token = getAuthToken();
  if (!token) throw new Error('Sign in before uploading media.');
  if (!globalThis.crypto?.subtle) {
    throw new Error('Resumable uploads require a secure browser context (HTTPS).');
  }

  const fingerprint = await mediaFingerprint(uploadFile);
  const resumeKey = `discover-mansalay:media-upload:${fingerprint}:${uploadFile.name}:${uploadFile.size}:${uploadFile.lastModified}`;
  const savedUploadId = localStorage.getItem(resumeKey);
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Auth-Token': token,
    'Content-Type': 'application/json',
  };
  const initializeResponse = await fetch(`${API_BASE}/api/media/uploads`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filename: uploadFile.name,
      file_size: uploadFile.size,
      fingerprint,
      ...(options.operationKey ? { operation_key: options.operationKey } : {}),
      ...((options.uploadId || savedUploadId) ? { upload_id: options.uploadId || savedUploadId } : {}),
    }),
    signal,
  });
  const upload = await readUploadResponse(initializeResponse);
  try {
    localStorage.setItem(resumeKey, upload.upload_id);
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') throw error;
    toast.warning('Browser storage is full. This upload can continue, but it cannot resume automatically if interrupted.');
  }

  if (upload.status === 'complete') {
    if (!upload.url || !upload.mime_type || !upload.sha256) {
      throw new Error('The server returned an incomplete completed-upload response.');
    }
    localStorage.removeItem(resumeKey);
    return {
      url: upload.url,
      mime_type: upload.mime_type,
      sha256: upload.sha256,
    };
  }

  const chunkSize = upload.chunk_size;
  const chunkCount = Math.ceil(uploadFile.size / chunkSize);
  const received = new Set<number>(upload.received_chunks);
  let completedBytes = [...received].reduce((total, index) => {
    return total + Math.min(chunkSize, uploadFile.size - index * chunkSize);
  }, 0);
  onProgress?.(completedBytes, uploadFile.size);

  for (let index = 0; index < chunkCount; index++) {
    if (received.has(index)) continue;
    if (signal?.aborted) throw new DOMException('Upload cancelled.', 'AbortError');

    const start = index * chunkSize;
    const chunk = uploadFile.slice(start, Math.min(uploadFile.size, start + chunkSize));
    let uploaded = false;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3 && !uploaded; attempt++) {
      try {
        await sendMediaChunk(upload.upload_id, index, chunk, token, signal, loaded => {
          onProgress?.(completedBytes + Math.min(loaded, chunk.size), uploadFile.size);
        });
        uploaded = true;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Upload chunk failed.');
        if (
          signal?.aborted ||
          (error instanceof DOMException && error.name === 'AbortError') ||
          lastError.message === 'Authentication required.' ||
          (error instanceof MediaUploadHttpError && error.status === 413)
        ) {
          throw error;
        }
        if (attempt < 2) {
          await new Promise(resolve => window.setTimeout(resolve, 400 * (attempt + 1)));
        }
      }
    }

    if (!uploaded) throw lastError || new Error('Upload chunk failed after retries.');
    completedBytes += chunk.size;
    onProgress?.(completedBytes, uploadFile.size);
  }

  const completeResponse = await fetch(`${API_BASE}/api/media/uploads/${upload.upload_id}/complete`, {
    method: 'POST',
    headers,
    signal,
  });
  const completed = await readUploadResponse(completeResponse);
  if (!completed.url || !completed.mime_type || !completed.sha256) {
    throw new Error('The server did not return a completed media upload.');
  }

  localStorage.removeItem(resumeKey);
  return {
    url: completed.url,
    mime_type: completed.mime_type,
    sha256: completed.sha256,
  };
}

async function mediaFingerprint(file: File): Promise<string> {
  const sampleSize = 64 * 1024;
  const first = await file.slice(0, sampleSize).arrayBuffer();
  const last = await file.slice(Math.max(sampleSize, file.size - sampleSize)).arrayBuffer();
  const [firstHash, lastHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', first),
    crypto.subtle.digest('SHA-256', last),
  ]);
  const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${toHex(firstHash)}${toHex(lastHash)}`;
}

function sendMediaChunk(
  uploadId: string,
  index: number,
  chunk: Blob,
  token: string,
  signal: AbortSignal | undefined,
  onProgress: (loaded: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abortRequest = () => xhr.abort();
    const removeAbortListener = () => signal?.removeEventListener('abort', abortRequest);
    xhr.open('POST', `${API_BASE}/api/media/uploads/${uploadId}/chunks/${index}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('X-Auth-Token', token);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = event => onProgress(event.loaded);
    xhr.onload = () => {
      removeAbortListener();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      let message = `Upload failed with HTTP ${xhr.status}.`;
      if (xhr.status === 413) {
        message = 'The server or reverse proxy rejected this 4 MiB upload chunk (HTTP 413). Its request-body limit must be at least 5 MiB.';
      }
      try {
        const response = JSON.parse(xhr.responseText);
        message = response.message || response.error || message;
      } catch {
        // Keep the status-based error when the server response is not JSON.
      }
      if (xhr.status === 401) handleUnauthorized();
      reject(new MediaUploadHttpError(xhr.status, message));
    };
    xhr.onerror = () => {
      removeAbortListener();
      reject(new Error('Network error while uploading a media chunk.'));
    };
    xhr.onabort = () => {
      removeAbortListener();
      reject(new DOMException('Upload cancelled.', 'AbortError'));
    };
    signal?.addEventListener('abort', abortRequest, { once: true });
    if (signal?.aborted) {
      xhr.abort();
      return;
    }
    xhr.send(chunk);
  });
}

async function readUploadResponse(response: Response): Promise<MediaUploadSessionResponse> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Authentication required.');
    }
    const errorData = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const message = typeof errorData.message === 'string'
      ? errorData.message
      : typeof errorData.error === 'string'
        ? errorData.error
        : response.status === 413
          ? 'The server or reverse proxy rejected this upload request (HTTP 413). Check the configured request-body limit.'
          : `Upload failed with HTTP ${response.status}.`;
    throw new MediaUploadHttpError(response.status, message);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('The server returned an invalid upload response.');
  }
  const upload = data as Record<string, unknown>;
  const invalidResponse = (): never => {
    throw new Error('The server returned an invalid upload response.');
  };
  const uploadId = typeof upload.upload_id === 'string' ? upload.upload_id : invalidResponse();
  const chunkSize = Number.isSafeInteger(upload.chunk_size) && Number(upload.chunk_size) > 0
    ? Number(upload.chunk_size)
    : invalidResponse();
  const rawChunks = Array.isArray(upload.received_chunks) ? upload.received_chunks : invalidResponse();
  const receivedChunks = rawChunks.map(index => Number.isSafeInteger(index) && Number(index) >= 0
    ? Number(index)
    : invalidResponse());
  const status = upload.status === 'complete'
    ? 'complete'
    : upload.status === 'uploading' ? 'uploading' : invalidResponse();
  const url = upload.url === null
    ? null
    : typeof upload.url === 'string' ? upload.url : invalidResponse();
  const mimeType = upload.mime_type === null
    ? null
    : typeof upload.mime_type === 'string' ? upload.mime_type : invalidResponse();
  const checksum = upload.sha256 === null
    ? null
    : typeof upload.sha256 === 'string' ? upload.sha256 : invalidResponse();

  return {
    upload_id: uploadId,
    chunk_size: chunkSize,
    received_chunks: receivedChunks,
    status,
    url,
    mime_type: mimeType,
    sha256: checksum,
  };
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
  const res = await sendMediaFormData(`${API_BASE}/api/payment-receipts`, formData, {
    headers: { 'Authorization': `Bearer ${token}` },
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
  try {
    return await getJSON(`/chat/history?room=${encodeURIComponent(room)}`);
  } catch {
    try {
      const res = await fetch(`${API_BASE}/api/public/chat/history?room=${encodeURIComponent(room)}`);
      return await res.json();
    } catch {
      return { messages: [] };
    }
  }
}

export async function sendChatMessage(room: string, message: string, language?: 'filipino' | 'english') {
  const payload = { room, message, language: language || 'filipino' };
  try {
    if (getAuthToken()) {
      return await postJSON('/chat/send', payload);
    }
    const res = await fetch(`${API_BASE}/api/public/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    const res = await fetch(`${API_BASE}/api/public/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  }
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
  let apiLandmarks: any[] = [];
  try {
    const res = await getPublicJSON('/landmarks');
    if (Array.isArray(res)) {
      apiLandmarks = res;
    }
  } catch {}

  try {
    const localStr = localStorage.getItem('discover-mansalay:local_landmarks');
    if (localStr) {
      const local: any[] = JSON.parse(localStr);
      if (Array.isArray(local) && local.length > 0) {
        const apiIds = new Set(apiLandmarks.map((l: any) => String(l.id)));
        const uniqueLocal = local.filter((l: any) => !apiIds.has(String(l.id)));
        return [...uniqueLocal, ...apiLandmarks];
      }
    }
  } catch {}

  return apiLandmarks;
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
  images?: File[];
  virtual_tour_scenes?: any[];
}) {
  let created: any = null;
  try {
    if (data.images && data.images.length > 0) {
      // Use FormData for multipart file upload
      const form = new FormData();
      form.append('name', data.name);
      form.append('type', data.type);
      if (data.category) form.append('category', data.category);
      if (data.description) form.append('description', data.description);
      if (data.address) form.append('address', data.address);
      form.append('latitude', String(data.latitude));
      form.append('longitude', String(data.longitude));
      if (data.image) form.append('image', data.image);
      if (data.virtual_tour_scenes) {
        form.append('virtual_tour_scenes', JSON.stringify(data.virtual_tour_scenes));
      }
      data.images.forEach((file) => form.append('images[]', file));

      const token = getAuthToken();
      const res = await sendMediaFormData(`${API_BASE}/landmarks`, form, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Upload failed');
      created = json;
    } else {
      created = await postJSON('/landmarks', {
        name: data.name, type: data.type, category: data.category,
        description: data.description, address: data.address,
        latitude: data.latitude, longitude: data.longitude,
        image: data.image, virtual_tour_scenes: data.virtual_tour_scenes,
      }, true);
    }
  } catch (err) {
    console.warn('Backend landmark creation endpoint error, storing locally:', err);
  }

  // Always mirror in localStorage to ensure instant availability and 360 scene persistence
  try {
    const localStr = localStorage.getItem('discover-mansalay:local_landmarks');
    const local = localStr ? JSON.parse(localStr) : [];
    const newLandmark = {
      id: created?.landmark?.id || created?.id || `local-lm-${Date.now()}`,
      ...data,
      images: created?.landmark?.images || null,
      image: created?.landmark?.image || data.image || null,
      created_at: new Date().toISOString(),
      is_active: true,
    };
    local.unshift(newLandmark);
    localStorage.setItem('discover-mansalay:local_landmarks', JSON.stringify(local));

    if (data.virtual_tour_scenes && data.virtual_tour_scenes.length > 0) {
      localStorage.setItem(`discover-mansalay:landmark_360_scenes_${newLandmark.id}`, JSON.stringify(data.virtual_tour_scenes));
    }

    return created || { landmark: newLandmark };
  } catch {}

  return created;
}


// Password Reset API Functions
export async function sendPasswordResetCode(email: string): Promise<{ message: string; expires_in: number }> {
  return await postJSON('/password/forgot', { email }, false);
}

export async function verifyPasswordResetCode(email: string, code: string): Promise<{ valid: boolean; message: string }> {
  return await postJSON('/password/verify-code', { email, code }, false);
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
  try {
    return await getJSON('/notifications');
  } catch {
    return { success: true, notifications: [], unread_count: 0 };
  }
}

export async function getUnreadNotificationCount(): Promise<{ success: boolean; unread_count: number }> {
  try {
    return await getJSON('/notifications/unread-count');
  } catch {
    return { success: true, unread_count: 0 };
  }
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

// ============================================================================
// Google Maps Directions API — Accurate Philippines Road Routing
// Re-exported from lib/googleMaps.ts for a single import point.
// Falls back to OSRM when no VITE_GOOGLE_MAPS_API_KEY is set.
// ============================================================================

export { getGoogleMapsRoute, hasGoogleMapsKey, loadGoogleMapsAPI } from './googleMaps';
export type { GoogleRouteResult, GoogleRouteStep } from './googleMaps';
export { getMapboxRoute, hasMapboxToken } from './mapbox';
export type { MapboxRouteResult, MapboxRouteStep } from './mapbox';

/**
 * Primary route-fetching function for the app.
 * Tries Google Maps Directions API first (if enabled),
 * then Mapbox Directions API (100k free reqs, highly accurate turn-by-turn with road names),
 * and automatically falls back to OSRM if keys are missing or offline.
 *
 * Returns coords in Leaflet-compatible [lat, lng][] format.
 */
export async function getRouteWithFallback(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  mode: 'DRIVING' | 'WALKING' | 'BICYCLING' = 'DRIVING'
): Promise<{
  routeCoords: [number, number][];
  steps: Array<{
    instruction: string;
    distanceMeters: number;
    icon: 'straight' | 'right' | 'left' | 'uturn' | 'destination';
    roadName?: string;
    location?: [number, number];
  }>;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  source: 'google' | 'mapbox' | 'osrm';
} | null> {
  // --- 1. Try Mapbox Directions API first (Free 100,000 req/mo, no Google billing needed, calibrated for PH roads) ---
  const { getMapboxRoute: _getMapboxRoute, hasMapboxToken: _hasMapbox } = await import('./mapbox');

  if (_hasMapbox()) {
    try {
      const mbResult = await _getMapboxRoute(startLat, startLng, endLat, endLng, mode);
      if (mbResult && mbResult.routeCoords.length > 0) {
        return { ...mbResult, source: 'mapbox' };
      }
    } catch (mbErr) {
      console.warn('[Route] Mapbox failed, checking Google Maps:', mbErr);
    }
  }

  // --- 2. Try Google Maps (if key configured and Directions API enabled) ---
  const { getGoogleMapsRoute: _getGoogleRoute, hasGoogleMapsKey: _hasKey } = await import('./googleMaps');

  if (_hasKey()) {
    try {
      const gResult = await _getGoogleRoute(startLat, startLng, endLat, endLng, mode);
      if (gResult) {
        return { ...gResult, source: 'google' };
      }
    } catch (gErr) {
      console.warn('[Route] Google Maps failed, falling back to OSRM:', gErr);
    }
  }

  // --- Fallback to OSRM ---
  try {
    const osrmData = await getOSRMRoute(startLat, startLng, endLat, endLng);
    if (!osrmData || !osrmData.routes[0]) return null;

    const route = osrmData.routes[0];
    const routeCoords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng]
    );

    const steps = route.legs[0]?.steps?.map((s, idx) => {
      const isLast = idx === route.legs[0].steps.length - 1;
      const mod = (s.maneuver.modifier || '').toLowerCase();
      const type = (s.maneuver.type || '').toLowerCase();
      let icon: 'straight' | 'right' | 'left' | 'uturn' | 'destination' = 'straight';
      if (isLast || type === 'arrive') icon = 'destination';
      else if (mod.includes('uturn')) icon = 'uturn';
      else if (mod.includes('right')) icon = 'right';
      else if (mod.includes('left')) icon = 'left';

      const rawName = s.name?.trim() || '';
      const hasName = rawName.length > 0;
      const roadName = hasName ? rawName : 'local road';

      // Format distance nicely
      const distM = Math.round(s.distance);
      const distLabel = distM >= 1000
        ? `${(distM / 1000).toFixed(1)} km`
        : `${distM} m`;

      // Cardinal direction from maneuver bearing (0=N, 90=E, 180=S, 270=W)
      const bearing = (s.maneuver as any)?.bearing_after ?? null;
      let cardinal = '';
      if (bearing !== null) {
        if (bearing >= 337.5 || bearing < 22.5) cardinal = 'north';
        else if (bearing < 67.5) cardinal = 'northeast';
        else if (bearing < 112.5) cardinal = 'east';
        else if (bearing < 157.5) cardinal = 'southeast';
        else if (bearing < 202.5) cardinal = 'south';
        else if (bearing < 247.5) cardinal = 'southwest';
        else if (bearing < 292.5) cardinal = 'west';
        else cardinal = 'northwest';
      }

      let instruction = '';
      if (icon === 'destination') {
        instruction = `You have arrived at your destination`;
      } else if (icon === 'uturn') {
        instruction = hasName
          ? `Make a U-turn onto ${roadName}`
          : `Make a U-turn and continue for ${distLabel}`;
      } else if (icon === 'right') {
        instruction = hasName
          ? `Turn right onto ${roadName}`
          : `Turn right and continue for ${distLabel}`;
      } else if (icon === 'left') {
        instruction = hasName
          ? `Turn left onto ${roadName}`
          : `Turn left and continue for ${distLabel}`;
      } else if (type === 'depart') {
        instruction = hasName
          ? `Head ${cardinal ? cardinal + ' on ' : 'on '}${roadName}`
          : `Head ${cardinal || 'forward'} for ${distLabel}`;
      } else {
        instruction = hasName
          ? `Continue on ${roadName}`
          : `Continue straight for ${distLabel}`;
      }

      return {
        instruction,
        distanceMeters: Math.round(s.distance),
        icon,
        roadName,
        location: s.maneuver.location
          ? [s.maneuver.location[1], s.maneuver.location[0]] as [number, number]
          : undefined,
      };
    }) ?? [];

    return {
      routeCoords,
      steps,
      totalDistanceMeters: route.distance,
      totalDurationSeconds: route.duration,
      source: 'osrm',
    };
  } catch (osrmErr) {
    console.error('[Route] OSRM fallback also failed:', osrmErr);
    return null;
  }
}
