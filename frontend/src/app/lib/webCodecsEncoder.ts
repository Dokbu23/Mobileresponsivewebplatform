/**
 * WebCodecs Hardware-Accelerated H.264 Video Encoder
 * Provides GPU-accelerated video encoding with fallback support
 * 
 * Priority:
 * 1. WebCodecs VideoEncoder (hardware-accelerated H.264)
 * 2. Fallback to FFmpeg.wasm if WebCodecs unavailable
 */

export interface WebCodecsConfig {
  width: number;
  height: number;
  bitrate: number; // in bits per second
  framerate: number;
  hardwareAcceleration?: 'prefer-hardware' | 'prefer-software';
}

export interface EncodingProgress {
  framesProcessed: number;
  totalFrames: number;
  timestampSeconds: number;
  totalDurationSeconds: number;
  fpsActual: number;
}

/**
 * Detect browser WebCodecs API support
 */
export async function detectWebCodecsSupport(): Promise<{
  supported: boolean;
  canUseH264: boolean;
  canUseHardware: boolean;
}> {
  if (!('VideoEncoder' in window) || !('VideoDecoder' in window)) {
    return { supported: false, canUseH264: false, canUseHardware: false };
  }

  try {
    // Test H.264 Constrained Baseline Profile support (most compatible)
    const h264Config = {
      codec: 'avc1.42001e', // H.264 Constrained Baseline Profile, Level 3
      width: 1280,
      height: 720,
      bitrate: 2500000,
      framerate: 30,
    };

    const support = await (window as any).VideoEncoder.isConfigSupported(h264Config);
    
    if (!support.supported) {
      // Try H.264 Main Profile as fallback
      const mainProfileConfig = {
        codec: 'avc1.4d0028', // H.264 Main Profile, Level 4
        width: 1280,
        height: 720,
        bitrate: 2500000,
        framerate: 30,
      };
      const mainSupport = await (window as any).VideoEncoder.isConfigSupported(mainProfileConfig);
      
      return {
        supported: mainSupport.supported,
        canUseH264: mainSupport.supported,
        canUseHardware: mainSupport.supported && mainSupport.config?.hardwareAcceleration === 'gpu',
      };
    }

    return {
      supported: true,
      canUseH264: true,
      canUseHardware: support.config?.hardwareAcceleration === 'gpu',
    };
  } catch (error) {
    console.warn('WebCodecs H.264 support check failed:', error);
    return { supported: false, canUseH264: false, canUseHardware: false };
  }
}

/**
 * Extract video metadata (dimensions, duration, frame rate)
 */
export async function extractVideoMetadata(file: File): Promise<{
  width: number;
  height: number;
  duration: number;
  framerate: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    
    video.addEventListener('loadedmetadata', () => {
      const { videoWidth, videoHeight, duration } = video;
      
      // Estimate framerate from video stream (most videos are 24, 30, or 60 fps)
      let framerate = 30;
      if (video.getAttribute('data-fps')) {
        framerate = parseFloat(video.getAttribute('data-fps')!);
      }
      
      resolve({
        width: videoWidth || 1920,
        height: videoHeight || 1080,
        duration: duration || 0,
        framerate,
      });
      
      URL.revokeObjectURL(video.src);
    });
    
    video.addEventListener('error', () => {
      reject(new Error('Failed to load video metadata'));
      URL.revokeObjectURL(video.src);
    });
  });
}

/**
 * Estimate encoding time based on device capabilities and content
 */
export function estimateEncodingDuration(
  metadata: { width: number; height: number; duration: number; framerate: number },
  hardwareAccelerated: boolean
): number {
  // Estimate encoding speed in FPS
  const megapixels = (metadata.width * metadata.height) / 1_000_000;
  
  // Hardware acceleration: 60+ FPS possible for 1080p
  // Software: 10-30 FPS depending on device
  const estimatedFps = hardwareAccelerated 
    ? Math.max(60, 120 - megapixels * 20) 
    : Math.max(10, 40 - megapixels * 10);
  
  const estimatedEncodingSeconds = metadata.duration / estimatedFps;
  return Math.ceil(estimatedEncodingSeconds * 1000); // Return in milliseconds
}

/**
 * Check if browser supports required encoding features
 */
export async function checkEncodingCapabilities(): Promise<{
  canEncode: boolean;
  hardwareAvailable: boolean;
  recommendedResolution: string;
}> {
  const support = await detectWebCodecsSupport();
  
  if (!support.canUseH264) {
    return {
      canEncode: false,
      hardwareAvailable: false,
      recommendedResolution: '720p',
    };
  }

  // Check device memory to recommend resolution
  const deviceMemoryGb = (navigator as any).deviceMemory || 4;
  let recommendedResolution = '1080p';
  
  if (deviceMemoryGb < 2) {
    recommendedResolution = '720p';
  } else if (deviceMemoryGb > 8) {
    recommendedResolution = '1080p'; // Could support 4K, but keep conservative
  }

  return {
    canEncode: true,
    hardwareAvailable: support.canUseHardware,
    recommendedResolution,
  };
}

/**
 * Validate WebCodecs encoder configuration
 */
export async function validateEncoderConfig(config: WebCodecsConfig): Promise<boolean> {
  if (!('VideoEncoder' in window)) return false;

  try {
    const codecString = 'avc1.42001e'; // H.264 Constrained Baseline Profile
    const encoderConfig = {
      codec: codecString,
      width: config.width,
      height: config.height,
      bitrate: config.bitrate,
      framerate: config.framerate,
      hardwareAcceleration: config.hardwareAcceleration || 'prefer-hardware',
    };

    const support = await (window as any).VideoEncoder.isConfigSupported(encoderConfig);
    return support.supported;
  } catch (error) {
    console.warn('Encoder configuration validation failed:', error);
    return false;
  }
}

/**
 * Placeholder for actual WebCodecs encoder (will be implemented)
 * This requires complex frame extraction, VideoEncoder handling, and MP4 muxing
 * For now, provide the interface that FFmpeg fallback will use
 */
export class WebCodecsVideoEncoder {
  private config: WebCodecsConfig;
  private hardwareAccelerated: boolean;

  constructor(config: WebCodecsConfig, hardwareAccelerated: boolean) {
    this.config = config;
    this.hardwareAccelerated = hardwareAccelerated;
  }

  async encode(
    sourceFile: File,
    onProgress?: (progress: EncodingProgress) => void
  ): Promise<Blob> {
    throw new Error(
      'WebCodecs encoder implementation is complex and requires mp4-box-javascript or MediaBunny for muxing. ' +
      'Currently falling back to optimized FFmpeg.wasm instead. ' +
      'Placeholder for future hardware-accelerated implementation.'
    );
  }
}

export default { detectWebCodecsSupport, extractVideoMetadata, validateEncoderConfig };
