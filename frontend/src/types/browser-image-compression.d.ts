declare module 'browser-image-compression' {
  export interface Options {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    fileType?: string;
    initialQuality?: number;
    alwaysKeepResolution?: boolean;
    exifOrientation?: number;
    preserveExif?: boolean;
    signal?: AbortSignal;
    libURL?: string;
    onProgress?: (progress: number) => void;
  }

  export interface CompressedFile extends File {
    // Compressed file object
  }

  export default function imageCompression(
    file: File,
    options?: Options
  ): Promise<Blob>;

  export function getImageDimension(file: File): Promise<{ width: number; height: number }>;
  export function drawFileToCanvas(
    file: File,
    canvas: HTMLCanvasElement
  ): Promise<void>;
  export function loadImage(file: File): Promise<HTMLImageElement>;
}
