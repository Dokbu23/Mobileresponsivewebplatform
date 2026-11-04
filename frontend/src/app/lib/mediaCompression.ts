import imageCompressionWorkerURL from 'browser-image-compression/dist/browser-image-compression.js?url';

export const COMBINED_IMAGE_LIMIT_BYTES = 50 * 1024 * 1024;
export const IMAGE_UPLOAD_HEADROOM_BYTES = 1 * 1024 * 1024;
export const CLIENT_IMAGE_UPLOAD_LIMIT_BYTES = COMBINED_IMAGE_LIMIT_BYTES - IMAGE_UPLOAD_HEADROOM_BYTES;
export const MAX_IMAGE_COUNT = 20;
export const MAX_IMAGE_INPUT_BYTES = 50 * 1024 * 1024;

// Browser video processing limit with resource-aware scaling
// Default: 2048 MB (2GB), can be adjusted via environment variable
// Max original video input size (before compression)
export const MAX_VIDEO_INPUT_BYTES = Math.max(
  1,
  Number(import.meta.env.VITE_VIDEO_PROCESS_MAX_INPUT_MB) || 2048
) * 1024 * 1024;

// Absolute safety limit - prevents browser OOM
// FFmpeg.wasm loads entire file into memory: plan for 2GB + overhead
export const ABSOLUTE_MAX_VIDEO_BYTES = 2147483648; // Exactly 2GB (2^31 bytes)

// Duration restriction (video must complete encoding before timeout)
// Default: 10 minutes. Set VITE_VIDEO_PROCESS_MAX_DURATION_SECONDS to override.
// Note: Very long videos may fail on low-spec devices; this is a safety limit, not a quality limit.
export const MAX_VIDEO_DURATION_SECONDS = Math.max(
  1,
  Number(import.meta.env.VITE_VIDEO_PROCESS_MAX_DURATION_SECONDS) || 600
);

// Video compression profiles with adaptive settings based on file size
// HIGH_QUALITY: Preserve original resolution/bitrate (< 50 MB bypass)
// BALANCED: Default for general use (50-500 MB)
// FAST: For large videos (500MB-2GB) - still maintains acceptable quality at 720p
export type VideoCompressionProfile = 'high_quality' | 'balanced' | 'fast';

export interface VideoCompressionSettings {
  bitrate: string;               // FFmpeg bitrate spec (e.g., '3500k')
  resolution: string;            // Target resolution (e.g., '1080p', '720p')
  description: string;           // User-facing description
  skipCompression?: boolean;     // If true, upload original without re-encoding
  preset?: 'superfast' | 'veryfast' | 'faster' | 'fast';  // FFmpeg preset
  crf?: number;                  // Quality (0-51, lower=better), alternative to bitrate
}

export const VIDEO_COMPRESSION_PROFILES: Readonly<Record<VideoCompressionProfile, VideoCompressionSettings>> = {
  high_quality: {
    bitrate: '8000k',
    resolution: '1080p',
    description: 'High quality (1080p, 8 Mbps) - for files < 50 MB',
    skipCompression: true  // Don't re-encode small files
  },
  balanced: {
    bitrate: '4500k',
    resolution: '1080p',
    description: 'Balanced (1080p, 4.5 Mbps) - recommended for most videos',
    preset: 'superfast',
    crf: 23  // Quality mode: visually lossless around CRF 23
  },
  fast: {
    bitrate: '2500k',
    resolution: '720p',
    description: 'Fast compression (720p, 2.5 Mbps) - for videos > 500 MB',
    preset: 'superfast'
  }
};

const IMAGE_MIME_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'image/avif': ['avif'],
  'image/heic': ['heic'],
  'image/heif': ['heif'],
  'image/bmp': ['bmp', 'dib'],
  'image/tiff': ['tif', 'tiff'],
  'image/x-icon': ['ico'],
  'image/vnd.microsoft.icon': ['ico'],
  'image/svg+xml': ['svg'],
  'image/jxl': ['jxl'],
};
const SERVER_SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]);

const VIDEO_MIME_EXTENSIONS: Record<string, string[]> = {
  'video/mp4': ['mp4'],
  'video/quicktime': ['mov'],
  'video/webm': ['webm'],
  'video/ogg': ['ogv', 'ogg'],
  'video/mpeg': ['mpeg', 'mpg'],
  'video/x-matroska': ['mkv'],
};

export async function mediaDataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error('The saved inline media could not be read. Please select the file again.');
  }

  const blob = await response.blob();
  const mimeType = blob.type.toLowerCase();
  const extensions = IMAGE_MIME_EXTENSIONS[mimeType] || VIDEO_MIME_EXTENSIONS[mimeType];
  if (!extensions?.length) {
    throw new Error('The saved inline media format is not supported. Please select the file again.');
  }

  return new File([blob], `${name}.${extensions[0]}`, { type: mimeType });
}

export async function stableMediaUploadId(file: File, scope: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Resumable uploads require a secure browser context (HTTPS).');
  }
  const sampleSize = 64 * 1024;
  const first = await file.slice(0, sampleSize).arrayBuffer();
  const last = await file.slice(Math.max(sampleSize, file.size - sampleSize)).arrayBuffer();
  const identity = new TextEncoder().encode(
    `${scope}:${file.name}:${file.size}:${file.lastModified}:${Array.from(new Uint8Array(first)).join(',')}:${Array.from(new Uint8Array(last)).join(',')}`
  );
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', identity));
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = Array.from(digest.slice(0, 16), byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export type MediaProcessingProgress = (
  file: File,
  phase: 'analyzing' | 'compressing' | 'encoding' | 'preparing',
  percent: number,
  metadata?: {
    originalSize?: number;
    estimatedOutputSize?: number;
    elapsedSeconds?: number;
    estimatedRemainingSeconds?: number;
    fps?: number;
    currentBitrate?: string;
  }
) => void;

export interface PreparedMediaFile {
  file: File;
  originalSize: number;
  compressedSize: number;
  kind: 'image' | 'video';
}

export interface ImageCompressionSettings {
  maxWidthOrHeight: number;
  maxSizeMB: number;
  quality: number;
  minQuality: number;
  targetMinKB: number;
  targetMaxKB: number;
  preserveTransparency: boolean;
}

export type ImageCompressionProfile = 'resort-gallery' | 'cover' | 'enterprise-logo' | 'thumbnail';

export const IMAGE_COMPRESSION_PROFILES: Readonly<Record<ImageCompressionProfile, ImageCompressionSettings>> = {
  'resort-gallery': {
    maxWidthOrHeight: 1600,
    maxSizeMB: 350 / 1024,
    quality: 0.82,
    minQuality: 0.70,
    targetMinKB: 150,
    targetMaxKB: 350,
    preserveTransparency: true,
  },
  cover: {
    maxWidthOrHeight: 1920,
    maxSizeMB: 500 / 1024,
    quality: 0.85,
    minQuality: 0.72,
    targetMinKB: 250,
    targetMaxKB: 500,
    preserveTransparency: true,
  },
  'enterprise-logo': {
    maxWidthOrHeight: 1000,
    maxSizeMB: 150 / 1024,
    quality: 0.82,
    minQuality: 0.72,
    targetMinKB: 30,
    targetMaxKB: 150,
    preserveTransparency: true,
  },
  thumbnail: {
    maxWidthOrHeight: 800,
    maxSizeMB: 100 / 1024,
    quality: 0.78,
    minQuality: 0.70,
    targetMinKB: 30,
    targetMaxKB: 100,
    preserveTransparency: true,
  },
};

const DIMENSION_STEPS = [1, 0.85, 0.7, 0.55];
const QUALITY_STEP = 0.04;

let ffmpegPromise: Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null = null;
let videoQueue: Promise<void> = Promise.resolve();
const coreURL = `${import.meta.env.BASE_URL}vendor/ffmpeg/ffmpeg-core.js`;
const wasmURL = `${import.meta.env.BASE_URL}vendor/ffmpeg/ffmpeg-core.wasm`;

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function matchingMime(file: File, allowed: Record<string, string[]>): string {
  const extension = extensionOf(file.name);
  const matchedMime = Object.entries(allowed).find(([, extensions]) => extensions.includes(extension))?.[0];
  if (!matchedMime || (file.type && file.type !== 'application/octet-stream' && file.type !== matchedMime)) {
    throw new Error(`${file.name} is not a supported media format or its file type does not match its extension.`);
  }
  return matchedMime;
}

export function isImageCandidate(file: File): boolean {
  return file.type.startsWith('image/')
    || Object.values(IMAGE_MIME_EXTENSIONS).some(extensions => extensions.includes(extensionOf(file.name)));
}

function isMediaFile(file: File): boolean {
  return isImageCandidate(file)
    || file.type.startsWith('video/')
    || Object.values(VIDEO_MIME_EXTENSIONS).some(extensions => extensions.includes(extensionOf(file.name)));
}

export async function isAnimatedGif(file: File): Promise<boolean> {
  if (file.type !== 'image/gif' && extensionOf(file.name) !== 'gif') {
    return false;
  }
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let frames = 0;
    // Scan for Graphic Control Extension: 0x21, 0xF9, 0x04
    for (let i = 0; i < bytes.length - 3; i++) {
      if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) {
        frames++;
        if (frames > 1) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Safely convert a Uint8Array to an ArrayBuffer, handling SharedArrayBuffer from workers
 * @param view - Uint8Array backed by either ArrayBuffer or SharedArrayBuffer
 * @returns A regular ArrayBuffer with the same data
 * 
 * Why: FFmpeg.wasm workers may return Uint8Array backed by SharedArrayBuffer,
 * which Blob constructor cannot accept. This safely converts to regular ArrayBuffer.
 */
function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const buffer = view.buffer;
  const byteOffset = view.byteOffset;
  const byteLength = view.byteLength;
  
  // If SharedArrayBuffer, copy data to new regular ArrayBuffer
  if (buffer instanceof SharedArrayBuffer) {
    const copy = new ArrayBuffer(byteLength);
    const source = new Uint8Array(buffer, byteOffset, byteLength);
    new Uint8Array(copy).set(source);
    return copy;
  }
  
  // If regular ArrayBuffer, create a copy of the specific range
  const regularBuffer = buffer as ArrayBuffer;
  return regularBuffer.slice(byteOffset, byteOffset + byteLength);
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Media processing cancelled.', 'AbortError');
  }
}

async function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressImage(
  file: File,
  mimeType: string,
  onProgress?: MediaProcessingProgress,
  signal?: AbortSignal,
  settings: ImageCompressionSettings = IMAGE_COMPRESSION_PROFILES['resort-gallery']
): Promise<File> {
  if (file.size > MAX_IMAGE_INPUT_BYTES) {
    throw new Error(`${file.name} exceeds the 50 MiB per-image processing limit.`);
  }

  const sourceExtension = extensionOf(file.name);
  if (mimeType === 'image/svg+xml' || sourceExtension === 'svg') {
    return file;
  }
  if ((mimeType === 'image/gif' || sourceExtension === 'gif') && await isAnimatedGif(file)) {
    return file;
  }

  const formatIsServerSupported = SERVER_SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)
    && (IMAGE_MIME_EXTENSIONS[mimeType]?.includes(sourceExtension) ?? false);
  onProgress?.(file, 'analyzing', 0, { originalSize: file.size });
  const dimensions = await imageDimensions(file).catch(() => {
    throw new Error(`${file.name} could not be decoded as a valid image.`);
  });
  onProgress?.(file, 'analyzing', 100, { originalSize: file.size });
  checkAbort(signal);

  const maximumDimension = Math.max(dimensions.width, dimensions.height);
  const targetMaximumBytes = settings.targetMaxKB * 1024;
  if (formatIsServerSupported
    && maximumDimension <= settings.maxWidthOrHeight
    && file.size <= targetMaximumBytes) {
    return file;
  }

  const outputMimeType = 'image/webp';
  const imageCompression = (await import('browser-image-compression')).default;
  onProgress?.(file, 'compressing', 0, { originalSize: file.size });
  let smallestOutput: File | null = null;
  let progressStep = 0;
  const outputExtension = 'webp';
  for (const dimensionScale of DIMENSION_STEPS) {
    const maxWidthOrHeight = Math.max(1, Math.round(settings.maxWidthOrHeight * dimensionScale));
    const qualities: number[] = [];
    for (let quality = settings.quality; quality > settings.minQuality; quality -= QUALITY_STEP) {
      qualities.push(Number(quality.toFixed(2)));
    }
    qualities.push(settings.minQuality);

    for (const quality of qualities) {
      checkAbort(signal);
      progressStep++;
      const percent = Math.min(95, Math.round((progressStep / (DIMENSION_STEPS.length * qualities.length)) * 100));
      const compressedBlob = await imageCompression(file, {
        maxSizeMB: settings.maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
        initialQuality: quality,
        fileType: outputMimeType,
        preserveExif: false,
        signal,
        libURL: imageCompressionWorkerURL,
        onProgress: value => onProgress?.(file, 'compressing', Math.round(percent * 0.1 + value * 0.9), { originalSize: file.size }),
      }).catch(error => {
        if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
          throw new DOMException('Media processing cancelled.', 'AbortError');
        }
        throw new Error(`${file.name} could not be compressed in this browser.`);
      });

      checkAbort(signal);
      if (compressedBlob.type !== outputMimeType) {
        throw new Error(`${file.name} could not be encoded as WebP in this browser. The original was not uploaded.`);
      }

      const outputName = `${file.name.replace(/\.[^.]+$/, '')}.${outputExtension}`;
      const candidate = new File([compressedBlob], outputName, {
        type: outputMimeType,
        lastModified: file.lastModified,
      });
      const candidateDimensions = await imageDimensions(candidate).catch(() => null);
      if (!candidateDimensions) {
        throw new Error(`${file.name} produced an unreadable compressed image. The original was not uploaded.`);
      }
      if (Math.max(candidateDimensions.width, candidateDimensions.height) > maxWidthOrHeight) {
        continue;
      }
      if (!smallestOutput || candidate.size < smallestOutput.size) smallestOutput = candidate;

      if (candidate.size <= targetMaximumBytes) {
        onProgress?.(file, 'compressing', 100, { 
          originalSize: file.size, 
          estimatedOutputSize: candidate.size 
        });
        if (formatIsServerSupported
          && maximumDimension <= settings.maxWidthOrHeight
          && file.size <= candidate.size) {
          return file;
        }
        return candidate;
      }
    }
  }

  if (!smallestOutput) {
    throw new Error(`${file.name} could not be compressed in this browser.`);
  }
  if (formatIsServerSupported
    && maximumDimension <= settings.maxWidthOrHeight
    && file.size <= smallestOutput.size) {
    return file;
  }
  onProgress?.(file, 'compressing', 100, { 
    originalSize: file.size, 
    estimatedOutputSize: smallestOutput.size 
  });
  return smallestOutput;
}

function videoDuration(file: File, signal?: AbortSignal): Promise<number> {
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Media processing cancelled.', 'AbortError'));
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error(`${file.name} has invalid or unreadable duration metadata.`));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error(`${file.name} has unsupported or corrupted video metadata.`));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }
    video.src = objectUrl;
  });
}

async function getFFmpeg(signal?: AbortSignal): Promise<import('@ffmpeg/ffmpeg').FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({ coreURL, wasmURL }, { signal });
      return ffmpeg;
    })().catch(error => {
      ffmpegPromise = null;
      throw new Error(`Video compression is unavailable in this browser: ${error instanceof Error ? error.message : 'FFmpeg failed to load.'}`);
    });
  }
  return ffmpegPromise;
}

async function compressVideo(
  file: File,
  onProgress?: MediaProcessingProgress,
  signal?: AbortSignal
): Promise<File> {
  // Check against absolute safety limit
  if (file.size > ABSOLUTE_MAX_VIDEO_BYTES) {
    const maxGb = (ABSOLUTE_MAX_VIDEO_BYTES / (1024 * 1024 * 1024)).toFixed(1);
    throw new Error(
      `${file.name} exceeds the ${maxGb} GB browser video-processing limit. ` +
      `Your device cannot safely process files larger than ${maxGb} GB. ` +
      `Try a smaller video or reduce the resolution/duration.`
    );
  }

  const startTimeMs = performance.now();
  onProgress?.(file, 'analyzing', 0, { originalSize: file.size });
  
  const duration = await videoDuration(file, signal);
  if (duration > MAX_VIDEO_DURATION_SECONDS) {
    const maxMinutes = Math.floor(MAX_VIDEO_DURATION_SECONDS / 60);
    throw new Error(
      `${file.name} is longer than the ${maxMinutes}-minute browser video-processing limit. ` +
      `Trim the video or increase VITE_VIDEO_PROCESS_MAX_DURATION_SECONDS.`
    );
  }

  onProgress?.(file, 'analyzing', 100, { originalSize: file.size });

  // Select compression profile based on file size
  const profile = selectCompressionProfile(file.size);

  // SKIP COMPRESSION for small files < 50MB (instant upload)
  if (profile.skipCompression) {
    onProgress?.(file, 'encoding', 100, { 
      originalSize: file.size,
      estimatedOutputSize: file.size,
      elapsedSeconds: (performance.now() - startTimeMs) / 1000
    });
    return file; // Return original file, no compression needed
  }

  const process = async (): Promise<File> => {
    checkAbort(signal);
    onProgress?.(file, 'encoding', 5, { 
      originalSize: file.size,
      elapsedSeconds: (performance.now() - startTimeMs) / 1000
    });
    
    const ffmpeg = await getFFmpeg(signal);
    const inputPath = `input-${crypto.randomUUID()}.${extensionOf(file.name)}`;
    const outputPath = `output-${crypto.randomUUID()}.mp4`;
    
    const encodingStartMs = performance.now();
    let lastProgressPercent = 5;
    
    const onFFmpegProgress = ({ progress }: { progress: number }) => {
      try {
        // FFmpeg progress is 0.0 to 1.0
        const elapsedMs = performance.now() - encodingStartMs;
        const estimatedTotalMs = Math.max(1, elapsedMs / Math.max(progress, 0.001));
        const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);
        
        // Map progress: 5% (started) → 90% (nearly done) → 95% (post-processing)
        const percentComplete = Math.min(90, Math.max(5, Math.round(5 + progress * 85)));
        
        // Only update UI if progress changed meaningfully
        if (percentComplete !== lastProgressPercent) {
          lastProgressPercent = percentComplete;
          const fps = elapsedMs > 0 ? (duration / (elapsedMs / 1000)) : 0;
          const totalElapsedSeconds = (performance.now() - startTimeMs) / 1000;
          
          onProgress?.(file, 'encoding', percentComplete, {
            originalSize: file.size,
            estimatedOutputSize: Math.round(file.size * progress * 0.3), // Rough estimate
            elapsedSeconds: totalElapsedSeconds,
            estimatedRemainingSeconds: remainingMs / 1000,
            fps: fps > 0 ? fps : undefined,
            currentBitrate: profile.bitrate
          });
          
          if (percentComplete % 20 === 0 || percentComplete > 85) {
            console.debug(
              `[Video Encoding] ${file.name}: ${percentComplete}% ` +
              `(${fps.toFixed(1)} FPS, ${(totalElapsedSeconds).toFixed(1)}s elapsed, ` +
              `${(remainingMs / 1000).toFixed(1)}s remaining)`
            );
          }
        }
      } catch (err) {
        console.warn('[Video Encoding] Progress update error:', err);
        // Continue encoding even if progress callback fails
      }
    };
    
    ffmpeg.on('progress', onFFmpegProgress);
    
    try {
      checkAbort(signal);
      
      // Load input file into FFmpeg virtual filesystem
      onProgress?.(file, 'preparing', 10, { 
        originalSize: file.size,
        elapsedSeconds: (performance.now() - startTimeMs) / 1000
      });
      const buffer = await file.arrayBuffer();
      await ffmpeg.writeFile(inputPath, new Uint8Array(buffer), { signal });
      
      // Build FFmpeg command with quality-preserving settings
      const scaleFilter = buildScaleFilter(profile.resolution);
      const preset = profile.preset || 'superfast';
      
      // FFmpeg encoding arguments
      const ffmpegArgs = [
        '-i', inputPath,
        '-map', '0:v:0',                    // Single video stream
        '-map', '0:a?',                     // Optional audio (? = optional)
        '-vf', scaleFilter,                 // Scale filter with aspect ratio preservation
        '-c:v', 'libx264',                  // H.264 video codec
        '-preset', preset,                  // Speed/quality tradeoff
        ...(profile.crf !== undefined 
          ? ['-crf', profile.crf.toString()]  // Quality mode (0-51, lower=better)
          : ['-b:v', profile.bitrate]         // Bitrate mode fallback
        ),
        '-maxrate', `${parseInt(profile.bitrate) * 1.5}k`,  // Max allowed bitrate
        '-bufsize', `${parseInt(profile.bitrate) * 2}k`,    // Buffer size
        '-pix_fmt', 'yuv420p',              // Pixel format (required for MP4)
        '-c:a', 'aac',                      // AAC audio codec
        '-b:a', '160k',                     // Audio bitrate (160 kbps, good quality)
        '-ac', '2',                         // Stereo
        '-ar', '48000',                     // 48 kHz sample rate (professional standard)
        '-movflags', '+faststart',          // Optimize for streaming (moov atom first)
        outputPath,
      ];

      checkAbort(signal);
      onProgress?.(file, 'encoding', 10, { 
        originalSize: file.size,
        elapsedSeconds: (performance.now() - startTimeMs) / 1000
      });
      
      // Execute FFmpeg transcoding
      const exitCode = await ffmpeg.exec(ffmpegArgs, 0, { signal });
      const encodingTimeMs = performance.now() - encodingStartMs;
      
      checkAbort(signal);
      
      if (exitCode !== 0) {
        throw new Error(`FFmpeg transcoding failed with exit code ${exitCode}.`);
      }
      
      // Read compressed output
      onProgress?.(file, 'preparing', 90, {
        originalSize: file.size,
        elapsedSeconds: (performance.now() - startTimeMs) / 1000
      });
      
      const output = await ffmpeg.readFile(outputPath);
      if (typeof output === 'string' || output.byteLength === 0) {
        throw new Error('Video compression produced an empty file.');
      }
      
      // Safely convert Uint8Array to ArrayBuffer, handling SharedArrayBuffer
      const outputBuffer = toArrayBuffer(output);
      const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' });
      
      // Log encoding performance metrics
      const outputSizeMb = output.byteLength / (1024 * 1024);
      const inputSizeMb = file.size / (1024 * 1024);
      const compressionRatio = (file.size / output.byteLength * 100).toFixed(1);
      const avgFps = duration > 0 ? (duration / (encodingTimeMs / 1000)) : 0;
      const totalElapsedSeconds = (performance.now() - startTimeMs) / 1000;
      
      console.info(
        `[Video Encoding Complete] ${file.name}: ` +
        `${inputSizeMb.toFixed(1)} MB → ${outputSizeMb.toFixed(1)} MB ` +
        `(${compressionRatio}% compression, ${avgFps.toFixed(1)} FPS avg, ${totalElapsedSeconds.toFixed(1)}s total)`
      );
      
      onProgress?.(file, 'encoding', 100, { 
        originalSize: file.size,
        estimatedOutputSize: output.byteLength,
        elapsedSeconds: totalElapsedSeconds,
        fps: avgFps
      });
      
      const outputName = `${file.name.replace(/\.[^.]+$/, '')}.mp4`;
      return new File([outputBlob], outputName, {
        type: 'video/mp4',
        lastModified: file.lastModified
      });
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        ffmpeg.terminate();
        ffmpegPromise = null;
        throw new DOMException('Media processing cancelled.', 'AbortError');
      }
      
      // Extract meaningful error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${file.name} could not be compressed. ` +
        `The original was not uploaded. ` +
        `Error: ${errorMessage}`
      );
    } finally {
      ffmpeg.off('progress', onFFmpegProgress);
      try {
        await ffmpeg.deleteFile(inputPath);
      } catch {
        // Ignore cleanup errors
      }
      try {
        await ffmpeg.deleteFile(outputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  };

  // Queue video processing to prevent simultaneous encoding
  const queued = videoQueue.then(process, process);
  videoQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

/**
 * Select compression profile based on file size
 * Larger files get faster encoding to reduce memory pressure and processing time
 */
function selectCompressionProfile(fileSizeBytes: number): VideoCompressionSettings {
  const fileSizeMb = fileSizeBytes / (1024 * 1024);
  
  if (fileSizeMb < 50) {
    // Very small files: skip compression entirely
    return VIDEO_COMPRESSION_PROFILES.high_quality;
  } else if (fileSizeMb < 500) {
    // Medium files: balanced quality and speed
    return VIDEO_COMPRESSION_PROFILES.balanced;
  } else {
    // Large files: prioritize speed, maintain acceptable quality
    return VIDEO_COMPRESSION_PROFILES.fast;
  }
}

/**
 * Build FFmpeg scale filter based on resolution string
 * Handles adaptive scaling while maintaining aspect ratio and even pixel dimensions
 * Even dimensions are required for yuv420p pixel format
 */
function buildScaleFilter(resolution: string): string {
  const heightMap: Record<string, number> = {
    '480p': 480,
    '720p': 720,
    '1080p': 1080,
    '4k': 2160,
    '2160p': 2160,
  };
  
  const height = heightMap[resolution] || 720;
  
  // Scale to height, maintaining aspect ratio, ensuring even dimensions (required for yuv420p)
  return `scale=w='min(iw,1920)':h='min(ih,${height})':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`;
}

export function validateCombinedImageSize(files: File[]): void {
  const images = files.filter(file => file.type.startsWith('image/') || Object.values(IMAGE_MIME_EXTENSIONS)
    .some(extensions => extensions.includes(extensionOf(file.name))));
  if (images.length > MAX_IMAGE_COUNT) {
    throw new Error(`Select no more than ${MAX_IMAGE_COUNT} images in one submission.`);
  }
  const totalBytes = images.reduce((total, file) => total + file.size, 0);
  if (totalBytes > COMBINED_IMAGE_LIMIT_BYTES) {
    throw new Error('The compressed images exceed the combined 50 MiB limit. Remove images or retry with smaller dimensions.');
  }
}

export async function prepareMediaFiles(
  files: File[],
  onProgress?: MediaProcessingProgress,
  signal?: AbortSignal,
  imageSettings: Partial<ImageCompressionSettings> = {},
  imageProfiles: ImageCompressionProfile[] = []
): Promise<PreparedMediaFile[]> {
  const prepared: PreparedMediaFile[] = [];
  const imageFiles = files.filter(isImageCandidate);
  const imageCount = imageFiles.length;
  if (imageCount > MAX_IMAGE_COUNT) {
    throw new Error(`Select no more than ${MAX_IMAGE_COUNT} images in one submission.`);
  }
  const settingsForImage = (fileIndex: number): ImageCompressionSettings => {
    const profile = imageProfiles[fileIndex] || 'resort-gallery';
    const settings = IMAGE_COMPRESSION_PROFILES[profile];
    const merged = {
      ...settings,
      ...imageSettings,
    };
    return {
      ...merged,
      maxSizeMB: imageSettings.maxSizeMB ?? Math.min(
        merged.targetMaxKB / 1024,
        CLIENT_IMAGE_UPLOAD_LIMIT_BYTES / Math.max(1, imageCount) / (1024 * 1024)
      ),
    };
  };
  for (const [fileIndex, file] of files.entries()) {
    checkAbort(signal);
    const extension = extensionOf(file.name);
    const imageCandidate = isImageCandidate(file);
    const videoCandidate = file.type.startsWith('video/') || Object.values(VIDEO_MIME_EXTENSIONS)
      .some(extensions => extensions.includes(extension));

    if (imageCandidate) {
      const imageMime = file.type.startsWith('image/')
        ? (file.type === 'image/jpg' ? 'image/jpeg' : file.type)
        : Object.entries(IMAGE_MIME_EXTENSIONS).find(([, extensions]) => extensions.includes(extension))?.[0] || '';
      if (!imageMime) {
        throw new Error(`${file.name} is not a supported image format.`);
      }
      const settings = settingsForImage(fileIndex);
      const compressed = await compressImage(file, imageMime, onProgress, signal, settings);
      prepared.push({
        file: compressed,
        originalSize: file.size,
        compressedSize: compressed.size,
        kind: 'image',
      });
      continue;
    }

    if (videoCandidate) {
      matchingMime(file, VIDEO_MIME_EXTENSIONS);
      const compressed = await compressVideo(file, onProgress, signal);
      prepared.push({
        file: compressed,
        originalSize: file.size,
        compressedSize: compressed.size,
        kind: 'video',
      });
      continue;
    }

    throw new Error(`${file.name} has an unsupported image or video extension (.${extension || 'unknown'}).`);
  }

  let compressedImageFiles = prepared.filter(media => media.kind === 'image');
  try {
    validateCombinedImageSize(compressedImageFiles.map(media => media.file));
    if (compressedImageFiles.reduce((total, media) => total + media.compressedSize, 0) > CLIENT_IMAGE_UPLOAD_LIMIT_BYTES) {
      throw new Error('The compressed image request needs more room for multipart overhead.');
    }
  } catch {
    const smallerFiles: File[] = [];
    for (const file of imageFiles) {
      checkAbort(signal);
      const imageMime = file.type.startsWith('image/')
        ? (file.type === 'image/jpg' ? 'image/jpeg' : file.type)
        : Object.entries(IMAGE_MIME_EXTENSIONS).find(([, extensions]) => extensions.includes(extensionOf(file.name)))?.[0] || '';
      const originalSettings = settingsForImage(files.indexOf(file));
      smallerFiles.push(await compressImage(file, imageMime, onProgress, signal, {
        ...originalSettings,
        maxWidthOrHeight: Math.round(originalSettings.maxWidthOrHeight * 0.85),
        maxSizeMB: originalSettings.maxSizeMB * 0.85,
        quality: Math.max(originalSettings.minQuality, originalSettings.quality - QUALITY_STEP),
      }));
    }
    let index = 0;
    for (let preparedIndex = 0; preparedIndex < prepared.length; preparedIndex++) {
      if (prepared[preparedIndex].kind !== 'image') continue;
      prepared[preparedIndex] = {
        ...prepared[preparedIndex],
        file: smallerFiles[index],
        compressedSize: smallerFiles[index].size,
      };
      index++;
    }
    compressedImageFiles = prepared.filter(media => media.kind === 'image');
    validateCombinedImageSize(compressedImageFiles.map(media => media.file));
    const retryBytes = compressedImageFiles.reduce((total, media) => total + media.compressedSize, 0);
    if (retryBytes > CLIENT_IMAGE_UPLOAD_LIMIT_BYTES) {
      throw new Error('The compressed images exceed the 49 MiB upload target. Remove images or retry with smaller dimensions.');
    }
  }
  return prepared;
}

export async function prepareMediaFormData(
  source: FormData,
  onProgress?: MediaProcessingProgress
): Promise<{ formData: FormData; media: PreparedMediaFile[] }> {
  const entries = Array.from(source.entries());
  const mediaFields = entries
    .map(([key, value]) => ({ key: key.toLowerCase(), file: value }))
    .filter((entry): entry is { key: string; file: File } =>
      entry.file instanceof File && isMediaFile(entry.file));
  const profileForField = (field: string): ImageCompressionProfile => {
    const name = field.replace(/\[\]$/, '');
    if (name.includes('logo')) return 'enterprise-logo';
    if (/(avatar|profile|thumbnail|receipt)/.test(name)) return 'thumbnail';
    if (/(banner|cover|background)/.test(name) || name === 'image') return 'cover';
    return 'resort-gallery';
  };
  const profilePriority: Record<ImageCompressionProfile, number> = {
    'resort-gallery': 0,
    thumbnail: 1,
    cover: 2,
    'enterprise-logo': 3,
  };
  const mediaFiles: File[] = [];
  const profilesByFile = new Map<File, ImageCompressionProfile>();
  for (const { key, file } of mediaFields) {
    if (!isImageCandidate(file)) {
      if (!profilesByFile.has(file)) {
        mediaFiles.push(file);
        profilesByFile.set(file, 'resort-gallery');
      }
      continue;
    }
    const profile = profileForField(key);
    const previous = profilesByFile.get(file);
    if (!previous) {
      mediaFiles.push(file);
      profilesByFile.set(file, profile);
    } else if (profilePriority[profile] > profilePriority[previous]) {
      profilesByFile.set(file, profile);
    }
  }
  const prepared = await prepareMediaFiles(
    mediaFiles,
    onProgress,
    undefined,
    {},
    mediaFiles.map(file => profilesByFile.get(file) || 'resort-gallery')
  );
  const replacements = new Map<File, File>();
  mediaFiles.forEach((file, index) => replacements.set(file, prepared[index].file));

  const formData = new FormData();
  for (const [key, value] of entries) {
    if (value instanceof File && replacements.has(value)) {
      formData.append(key, replacements.get(value)!, replacements.get(value)!.name);
    } else if (value instanceof File) {
      formData.append(key, value, value.name);
    } else {
      formData.append(key, value);
    }
  }

  return { formData, media: prepared };
}
