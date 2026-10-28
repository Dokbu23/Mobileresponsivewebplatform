import { describe, expect, it, vi } from 'vitest';
import { legacyResortMigrationKey, migrateLegacyResortRecord } from './legacyResortMigration';

vi.mock('./mediaCompression', async importOriginal => {
  const actual = await importOriginal<typeof import('./mediaCompression')>();
  return {
    ...actual,
    mediaDataUrlToFile: vi.fn(async (_url: string, name: string) => new File(['image'], `${name}.png`, { type: 'image/png' })),
    prepareMediaFiles: vi.fn(async (files: File[]) => files.map(file => ({
      file,
      originalSize: file.size,
      compressedSize: file.size,
      kind: 'image' as const,
    }))),
    stableMediaUploadId: vi.fn(async (_file: File, scope: string) => `upload-${scope}`),
  };
});

describe('legacy resort migration', () => {
  it('uploads inline gallery media before saving while preserving order and cover selection', async () => {
    const upload = vi.fn(async (_file: File, _operationKey: string, uploadId: string) => ({
      url: `/storage/originals/7/${uploadId}.png`,
    }));
    const save = vi.fn(async (_key: string, _record: Record<string, unknown>) => ({ id: 21 }));

    await migrateLegacyResortRecord({
      id: 15,
      name: 'Legacy stay',
      image: 'data:image/png;base64,cover',
      images: ['https://example.test/second.jpg', 'data:image/png;base64,cover'],
      description: 'Keep this description',
    }, 0, { upload, save });

    expect(upload).toHaveBeenCalledTimes(1);
    const [migrationKey, rawSavedRecord] = save.mock.calls[0];
    const savedRecord = rawSavedRecord as Record<string, any>;
    expect(savedRecord.image).toMatch(/^\/storage\/originals\/7\//);
    expect(savedRecord.images[0]).toBe('https://example.test/second.jpg');
    expect(savedRecord.images[1]).toBe(savedRecord.image);
    expect(savedRecord.description).toBe('Keep this description');
    expect(JSON.stringify(savedRecord)).not.toContain('data:image/');
    expect(upload.mock.invocationCallOrder[0]).toBeLessThan(save.mock.invocationCallOrder[0]);
    expect(migrationKey).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('does not save a record when media upload fails', async () => {
    const save = vi.fn();
    const upload = vi.fn(async () => {
      throw new Error('offline');
    });

    await expect(migrateLegacyResortRecord({
      id: 16,
      name: 'Offline stay',
      image: 'data:image/png;base64,cover',
    }, 0, { upload, save })).rejects.toThrow('offline');
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects records without a name before creating media or database records', async () => {
    const upload = vi.fn();
    const save = vi.fn();
    await expect(migrateLegacyResortRecord({ id: 17 }, 0, { upload, save }))
      .rejects.toThrow(/has no name/);
    expect(upload).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('does not send unsupported nested inline media to the database', async () => {
    const save = vi.fn();
    const cleanup = vi.fn(async () => undefined);
    await expect(migrateLegacyResortRecord({
      id: 18,
      name: 'Nested legacy media',
      metadata: { thumbnail: 'data:image/png;base64,private-content' },
    }, 0, {
      upload: vi.fn(),
      save,
      cleanup,
    })).rejects.toThrow(/unsupported field/);
    expect(save).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('keeps the migration key stable when a legacy resort is renamed', async () => {
    const first = await legacyResortMigrationKey({ id: 19, name: 'Old name' }, 0);
    const renamed = await legacyResortMigrationKey({ id: 19, name: 'New name' }, 7);
    expect(renamed).toBe(first);
  });
});
