import { vi } from 'vitest';

// Mock browser-image-compression module to prevent TypeScript errors
vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}));

// Mock @ffmpeg/ffmpeg to prevent runtime errors
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
    exec = vi.fn(async () => 0);
    readFile = vi.fn(async () => new Uint8Array());
    deleteFile = vi.fn(async () => true);
  },
}));
