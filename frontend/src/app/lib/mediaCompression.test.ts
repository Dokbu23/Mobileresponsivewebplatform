import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMBINED_IMAGE_LIMIT_BYTES,
  CLIENT_IMAGE_UPLOAD_LIMIT_BYTES,
  MAX_IMAGE_INPUT_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_INPUT_BYTES,
  IMAGE_COMPRESSION_PROFILES,
  mediaDataUrlToFile,
  prepareMediaFiles,
  prepareMediaFormData,
  validateCombinedImageSize,
} from './mediaCompression';

const compressionState = vi.hoisted(() => ({
  compressedBytes: 9 * 1024 * 1024,
  failImageCompression: false,
  ffmpegExitCode: 0,
  videoDuration: 30,
  lastMaximumDimension: 0,
  compressionOptions: [] as Array<{ maxWidthOrHeight?: number; initialQuality?: number; fileType?: string }>,
}));

vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file: File, options: { maxWidthOrHeight?: number; initialQuality?: number; fileType?: string }) => {
    if (compressionState.failImageCompression) throw new Error('decode failed');
    compressionState.lastMaximumDimension = options.maxWidthOrHeight || 0;
    compressionState.compressionOptions.push(options);
    const compressed = new File(
      [new Uint8Array(1)],
      `${file.name.replace(/\.[^.]+$/, '')}.webp`,
      { type: options.fileType }
    );
    Object.defineProperty(compressed, 'size', { configurable: true, value: compressionState.compressedBytes });
    return compressed;
  }),
}));

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: class {
    loaded = false;
    on = vi.fn();
    off = vi.fn();
    load = vi.fn(async () => {
      this.loaded = true;
      return true;
    });
    writeFile = vi.fn(async () => true);
    exec = vi.fn(async () => compressionState.ffmpegExitCode);
    readFile = vi.fn(async () => new Uint8Array([0, 0, 0, 1]));
    deleteFile = vi.fn(async () => true);
    terminate = vi.fn();
  },
}));

function makeFile(name: string, type: string, size: number): File {
  const file = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(file, 'size', { configurable: true, value: size });
  if (!file.arrayBuffer) {
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(size) });
  }
  return file;
}

describe('client media compression', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    compressionState.compressedBytes = 9 * 1024 * 1024;
    compressionState.failImageCompression = false;
    compressionState.ffmpegExitCode = 0;
    compressionState.videoDuration = 30;
    compressionState.lastMaximumDimension = 0;
    compressionState.compressionOptions = [];
    vi.stubGlobal('createImageBitmap', vi.fn(async (file: Blob) => ({
      width: file.type === 'image/webp' && compressionState.lastMaximumDimension
        ? compressionState.lastMaximumDimension
        : 4000,
      height: Math.round((file.type === 'image/webp' && compressionState.lastMaximumDimension
        ? compressionState.lastMaximumDimension
        : 4000) * 0.75),
      close: vi.fn(),
    })));
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:media-test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = createElement(tagName, options);
      if (tagName === 'video') {
        Object.defineProperty(element, 'duration', { configurable: true, value: compressionState.videoDuration });
        let source = '';
        Object.defineProperty(element, 'src', {
          configurable: true,
          get: () => source,
          set: value => {
            source = value;
            queueMicrotask(() => element.dispatchEvent(new Event('loadedmetadata')));
          },
        });
        vi.spyOn(element, 'load').mockImplementation(() => undefined);
      }
      return element;
    }) as typeof document.createElement);
  });

  it('accepts exactly 50 MiB of compressed images', () => {
    expect(() => validateCombinedImageSize([
      makeFile('one.jpg', 'image/jpeg', 25 * 1024 * 1024),
      makeFile('two.webp', 'image/webp', 25 * 1024 * 1024),
    ])).not.toThrow();
  });

  it('rejects compressed images above the exact 50 MiB combined limit', () => {
    expect(() => validateCombinedImageSize([
      makeFile('one.jpg', 'image/jpeg', 25 * 1024 * 1024),
      makeFile('two.png', 'image/png', (25 * 1024 * 1024) + 1),
    ])).toThrow(/combined 50 MiB limit/);
    expect(COMBINED_IMAGE_LIMIT_BYTES).toBe(50 * 1024 * 1024);
  });

  it('keeps one MiB of multipart request headroom under the server image limit', () => {
    expect(CLIENT_IMAGE_UPLOAD_LIMIT_BYTES).toBe(49 * 1024 * 1024);
  });

  it('compresses multiple images before validating their combined output size', async () => {
    const prepared = await prepareMediaFiles([
      makeFile('one.jpg', 'image/jpeg', 12 * 1024 * 1024),
      makeFile('two.png', 'image/png', 12 * 1024 * 1024),
    ]);

    expect(prepared).toHaveLength(2);
    expect(prepared.every(media => media.compressedSize === 9 * 1024 * 1024)).toBe(true);
    expect(prepared.reduce((total, media) => total + media.compressedSize, 0)).toBeLessThan(COMBINED_IMAGE_LIMIT_BYTES);
  });

  it('uses the requested adaptive profile values and tries quality steps before smaller dimensions', async () => {
    compressionState.compressedBytes = 600 * 1024;
    const [prepared] = await prepareMediaFiles([
      makeFile('cover.jpg', 'image/jpeg', 3 * 1024 * 1024),
    ], undefined, undefined, {}, ['cover']);
    const options = compressionState.compressionOptions;

    expect(IMAGE_COMPRESSION_PROFILES['resort-gallery']).toMatchObject({
      targetMinKB: 150,
      targetMaxKB: 350,
      maxWidthOrHeight: 1600,
      quality: 0.82,
    });
    expect(IMAGE_COMPRESSION_PROFILES.cover).toMatchObject({
      targetMinKB: 250,
      targetMaxKB: 500,
      maxWidthOrHeight: 1920,
      quality: 0.85,
    });
    expect(IMAGE_COMPRESSION_PROFILES['enterprise-logo']).toMatchObject({
      targetMinKB: 30,
      targetMaxKB: 150,
      maxWidthOrHeight: 1000,
      preserveTransparency: true,
    });
    expect(IMAGE_COMPRESSION_PROFILES.thumbnail).toMatchObject({
      targetMinKB: 30,
      targetMaxKB: 100,
      maxWidthOrHeight: 800,
      quality: 0.78,
    });
    expect(options[0]).toMatchObject({ maxWidthOrHeight: 1920, initialQuality: 0.85, fileType: 'image/webp' });
    expect(options.slice(0, 5).map(option => option.initialQuality)).toEqual([0.85, 0.81, 0.77, 0.73, 0.72]);
    expect(options[5].maxWidthOrHeight).toBeLessThan(1920);
    expect(prepared.file.type).toBe('image/webp');
  });

  it('selects logo and thumbnail profiles from multipart field names', async () => {
    compressionState.compressedBytes = 100 * 1024;
    const formData = new FormData();
    formData.append('logo', makeFile('brand.png', 'image/png', 2 * 1024 * 1024));
    formData.append('avatar', makeFile('profile.jpg', 'image/jpeg', 2 * 1024 * 1024));

    await prepareMediaFormData(formData);

    expect(compressionState.compressionOptions[0]).toMatchObject({
      maxWidthOrHeight: 1000,
      initialQuality: 0.82,
      fileType: 'image/webp',
    });
    expect(compressionState.compressionOptions[1]).toMatchObject({
      maxWidthOrHeight: 800,
      initialQuality: 0.78,
      fileType: 'image/webp',
    });
  });

  it('compresses a single FormData image and preserves its form fields and filename', async () => {
    const formData = new FormData();
    formData.append('title', 'Gallery');
    formData.append('image', makeFile('photo.jpg', 'image/jpeg', 3 * 1024 * 1024));

    const prepared = await prepareMediaFormData(formData);

    expect(prepared.formData.get('title')).toBe('Gallery');
    expect((prepared.formData.get('image') as File).name).toBe('photo.webp');
    expect((prepared.formData.get('image') as File).type).toBe('image/webp');
    expect(prepared.media[0].compressedSize).toBe(9 * 1024 * 1024);
  });

  it('converts legacy inline media into a file for the chunked upload flow', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['image'], { type: 'image/png' }),
    })));

    const file = await mediaDataUrlToFile('data:image/png;base64,aW1hZ2U=', 'legacy-image');

    expect(file.name).toBe('legacy-image.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBe(5);
  });

  it('rejects legacy inline media with unsupported MIME types', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['data'], { type: 'application/octet-stream' }),
    })));

    await expect(mediaDataUrlToFile('data:application/octet-stream;base64,ZGF0YQ==', 'legacy'))
      .rejects.toThrow(/format is not supported/);
  });

  it('blocks FormData when the processed image batch is still above 50 MiB', async () => {
    compressionState.compressedBytes = 26 * 1024 * 1024;
    const formData = new FormData();
    formData.append('images[]', makeFile('first.png', 'image/png', 12 * 1024 * 1024));
    formData.append('images[]', makeFile('second.png', 'image/png', 12 * 1024 * 1024));

    await expect(prepareMediaFormData(formData)).rejects.toThrow(/combined 50 MiB limit/);
  });

  it('accepts AVIF and outputs browser-encoded WebP when compression is needed', async () => {
    const [prepared] = await prepareMediaFiles([
      makeFile('photo.avif', 'image/avif', 3 * 1024 * 1024),
    ]);

    expect(prepared.kind).toBe('image');
    expect(prepared.file.name).toBe('photo.webp');
    expect(prepared.file.type).toBe('image/webp');
  });

  it('normalizes other browser-decodable raster types before upload', async () => {
    const [prepared] = await prepareMediaFiles([
      makeFile('photo.bmp', 'image/bmp', 3 * 1024 * 1024),
    ]);

    expect(prepared.file.name).toBe('photo.webp');
    expect(prepared.file.type).toBe('image/webp');
  });

  it('rasterizes small SVGs before upload instead of sending them as active content', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 1600,
      height: 1200,
      close: vi.fn(),
    })));
    const [prepared] = await prepareMediaFiles([
      makeFile('drawing.svg', 'image/svg+xml', 1024 * 1024),
    ]);

    expect(prepared.file.name).toBe('drawing.webp');
    expect(prepared.file.type).toBe('image/webp');
  });

  it('rejects an individual image above the 50 MiB browser-processing limit', async () => {
    const file = makeFile('oversized.png', 'image/png', MAX_IMAGE_INPUT_BYTES + 1);

    await expect(prepareMediaFiles([file])).rejects.toThrow(/50 MiB per-image processing limit/);
  });

  it('retries oversized compressed image batches smaller, then reports an error if still over the cap', async () => {
    compressionState.compressedBytes = 26 * 1024 * 1024;
    await expect(prepareMediaFiles([
      makeFile('one.jpg', 'image/jpeg', 12 * 1024 * 1024),
      makeFile('two.jpg', 'image/jpeg', 12 * 1024 * 1024),
    ])).rejects.toThrow(/combined 50 MiB limit/);
  });

  it('does not recompress an image already within its profile limits', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 1600,
      height: 1200,
      close: vi.fn(),
    })));
    const imageCompression = await import('browser-image-compression');
    const original = makeFile('optimized.webp', 'image/webp', 300 * 1024);

    const [prepared] = await prepareMediaFiles([original]);

    expect(prepared.file).toBe(original);
    expect(imageCompression.default).not.toHaveBeenCalled();
  });

  it('keeps a smaller supported image when recompression would increase its size', async () => {
    compressionState.compressedBytes = 4 * 1024 * 1024;
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 1600,
      height: 1200,
      close: vi.fn(),
    })));
    const original = makeFile('large.jpg', 'image/jpeg', 3 * 1024 * 1024);

    const [prepared] = await prepareMediaFiles([original]);

    expect(prepared.file).toBe(original);
    expect(prepared.originalSize).toBe(3 * 1024 * 1024);
    expect(prepared.compressedSize).toBe(3 * 1024 * 1024);
  });

  it('rejects unsupported and corrupted files instead of uploading the original', async () => {
    await expect(prepareMediaFiles([makeFile('document.pdf', 'application/pdf', 1024)]))
      .rejects.toThrow(/unsupported image or video extension/);
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('corrupt')));
    await expect(prepareMediaFiles([makeFile('broken.jpg', 'image/jpeg', 3 * 1024 * 1024)]))
      .rejects.toThrow(/could not be decoded/);
  });

  it('transcodes a video to MP4 before returning it for upload', async () => {
    const [prepared] = await prepareMediaFiles([makeFile('clip.webm', 'video/webm', 5 * 1024 * 1024)]);

    expect(prepared.kind).toBe('video');
    expect(prepared.file.name).toBe('clip.mp4');
    expect(prepared.file.type).toBe('video/mp4');
    expect(prepared.file.size).toBe(4);
  });

  it('does not return the original video if browser transcoding fails', async () => {
    compressionState.ffmpegExitCode = 1;
    await expect(prepareMediaFiles([makeFile('clip.mp4', 'video/mp4', 5 * 1024 * 1024)]))
      .rejects.toThrow(/The original was not uploaded/);
  });

  it('rejects videos above the configurable input-size limit before reading them', async () => {
    const video = makeFile('large.mp4', 'video/mp4', 1);
    Object.defineProperty(video, 'size', { value: MAX_VIDEO_INPUT_BYTES + 1 });

    await expect(prepareMediaFiles([video])).rejects.toThrow(/browser video-processing limit/);
  });

  it('rejects videos longer than the configured duration limit', async () => {
    compressionState.videoDuration = MAX_VIDEO_DURATION_SECONDS + 1;

    await expect(prepareMediaFiles([makeFile('long.mp4', 'video/mp4', 5 * 1024 * 1024)]))
      .rejects.toThrow(/longer than/);
  });
});
