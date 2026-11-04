/**
 * Compression metrics and utilities for tracking media compression progress
 * Provides detailed information about file sizes, compression ratios, and processing stages
 */

export interface CompressionMetrics {
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  percentageSaved: number;
  processingTimeMs: number;
}

export interface UploadMetrics extends CompressionMetrics {
  uploadedBytes: number;
  totalBytes: number;
  uploadProgress: number;
  estimatedTimeRemainingMs: number;
  averageSpeedBps: number;
}

export interface MediaProcessingState {
  filename: string;
  originalSize: number;
  compressedSize: number;
  progress: number;
  phase: 'preparing' | 'compressing' | 'uploading' | 'complete';
  status: string;
  error?: string;
}

/**
 * Calculate compression metrics from original and compressed file sizes
 */
export function calculateCompressionMetrics(
  originalBytes: number,
  compressedBytes: number,
  processingTimeMs: number
): CompressionMetrics {
  const compressionRatio = originalBytes > 0 ? compressedBytes / originalBytes : 1;
  const percentageSaved = Math.max(0, Math.round((1 - compressionRatio) * 100));
  
  return {
    originalSizeBytes: originalBytes,
    compressedSizeBytes: compressedBytes,
    compressionRatio,
    percentageSaved,
    processingTimeMs,
  };
}

/**
 * Calculate upload metrics based on bytes transferred and timing
 */
export function calculateUploadMetrics(
  totalBytes: number,
  uploadedBytes: number,
  elapsedMs: number,
  compressionMetrics: CompressionMetrics
): UploadMetrics {
  const uploadProgress = totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0;
  const averageSpeedBps = elapsedMs > 0 ? (uploadedBytes / elapsedMs) * 1000 : 0;
  const bytesRemaining = Math.max(0, totalBytes - uploadedBytes);
  const estimatedTimeRemainingMs = averageSpeedBps > 0 ? Math.ceil(bytesRemaining / averageSpeedBps) : 0;

  return {
    ...compressionMetrics,
    uploadedBytes,
    totalBytes,
    uploadProgress,
    estimatedTimeRemainingMs,
    averageSpeedBps,
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  
  return `${value.toFixed(decimals)} ${units[index]}`;
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  
  return `${minutes}m ${seconds}s`;
}

/**
 * Format bitrate from bytes per second
 */
export function formatBitrate(bytesPerSecond: number): string {
  const bitsPerSecond = bytesPerSecond * 8;
  const mbps = bitsPerSecond / (1000 * 1000);
  
  return `${mbps.toFixed(2)} Mbps`;
}

/**
 * Get compression profile description
 */
export function getCompressionProfileDescription(fileSizeBytes: number): string {
  const fileSizeMb = fileSizeBytes / (1024 * 1024);
  
  if (fileSizeMb < 50) {
    return '🎬 High quality (1080p, 8 Mbps) - Small video';
  } else if (fileSizeMb < 200) {
    return '🎬 Balanced quality (720p, 5 Mbps) - Medium video';
  } else if (fileSizeMb < 500) {
    return '🎬 Standard quality (720p, 3.5 Mbps) - Large video';
  } else {
    return '🎬 Streaming quality (720p, 2.5 Mbps) - Extra large video (WebCodecs streaming)';
  }
}

/**
 * Create detailed processing status message
 */
export function createProcessingStatus(state: MediaProcessingState): string {
  const parts: string[] = [];
  
  // Add phase emoji and text
  switch (state.phase) {
    case 'preparing':
      parts.push('📋 Preparing');
      break;
    case 'compressing':
      parts.push('🔧 Compressing');
      break;
    case 'uploading':
      parts.push('📤 Uploading');
      break;
    case 'complete':
      parts.push('✅ Complete');
      break;
  }
  
  // Add filename
  parts.push(`"${state.filename}"`);
  
  // Add progress percentage
  if (state.progress > 0 && state.progress < 100) {
    parts.push(`(${state.progress}%)`);
  }
  
  return parts.join(' ');
}

/**
 * Create compression summary for display
 */
export function createCompressionSummary(metrics: CompressionMetrics, filename: string): string {
  const originalSize = formatBytes(metrics.originalSizeBytes);
  const compressedSize = formatBytes(metrics.compressedSizeBytes);
  const saved = formatBytes(metrics.originalSizeBytes - metrics.compressedSizeBytes);
  
  return `${filename}: ${originalSize} → ${compressedSize} (saved ${saved}, ${metrics.percentageSaved}%)`;
}

/**
 * Determine if compression is recommended based on file size
 */
export function isCompressionRecommended(fileSizeBytes: number): boolean {
  // Recommend compression for files > 50 MB
  return fileSizeBytes > 50 * 1024 * 1024;
}

/**
 * Estimate compression time based on file size (in milliseconds)
 * Now using WebCodecs streaming for large files (500MB+), much faster than FFmpeg
 */
export function estimateCompressionTime(fileSizeBytes: number): number {
  const fileSizeMb = fileSizeBytes / (1024 * 1024);
  
  // WebCodecs streaming compression is significantly faster than FFmpeg
  // Estimates for real-time or near-real-time encoding with adaptive bitrate
  if (fileSizeMb < 50) return fileSizeMb * 50;       // 2.5-2500ms
  if (fileSizeMb < 200) return fileSizeMb * 80;      // 4-16000ms
  if (fileSizeMb < 500) return fileSizeMb * 120;     // 30000-60000ms
  // Large files (500MB+) with WebCodecs streaming: ~150ms per MB
  return fileSizeMb * 150;                           // 75000+ms for very large, but parallelizable
}

/**
 * Check if device has enough estimated memory for compression
 * Now supports up to 2GB with WebCodecs streaming compression
 */
export function canDeviceHandleCompression(fileSizeBytes: number): { canHandle: boolean; reason?: string } {
  // WebCodecs streaming allows processing large files with lower peak memory usage
  // Instead of loading entire file in RAM, we process in chunks
  const ABSOLUTE_MAX = 2048 * 1024 * 1024; // 2 GB
  
  if (fileSizeBytes > ABSOLUTE_MAX) {
    return {
      canHandle: false,
      reason: `File (${formatBytes(fileSizeBytes)}) exceeds 2 GB browser processing limit. Try a smaller video.`,
    };
  }
  
  // For WebCodecs streaming, peak memory is much lower (only 1-2 chunks in memory at a time)
  // Estimate: ~200MB peak memory for streaming compression regardless of file size
  // Check if we have navigator.deviceMemory (Chrome/Edge)
  if ('deviceMemory' in navigator) {
    const deviceMemoryGb = (navigator as any).deviceMemory || 4;
    // Streaming compression is efficient, only requires 512MB minimum device memory
    if (deviceMemoryGb < 0.5) {
      return {
        canHandle: false,
        reason: `Device memory (${deviceMemoryGb} GB) may be insufficient. This requires at least 512MB available memory.`,
      };
    }
  }
  
  return { canHandle: true };
}
