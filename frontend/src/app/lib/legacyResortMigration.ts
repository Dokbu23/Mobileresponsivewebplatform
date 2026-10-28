import { mediaDataUrlToFile, prepareMediaFiles, stableMediaUploadId } from './mediaCompression';

export interface LegacyResortMigrationCallbacks {
  upload: (
    file: File,
    operationKey: string,
    uploadId: string,
    onProgress: (uploadedBytes: number, totalBytes: number) => void
  ) => Promise<{ url: string }>;
  save: (migrationKey: string, record: Record<string, unknown>) => Promise<unknown>;
  cleanup?: (operationKey: string) => Promise<unknown>;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
}

function stableUuid(value: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then(hash => {
    const bytes = new Uint8Array(hash);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes.slice(0, 16), byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  });
}

export function legacyResortMigrationKey(legacy: Record<string, any>, index: number): Promise<string> {
  const identity = `legacy-resort-v1:${String(legacy.id ?? `row-${index}`)}:${String(legacy.created_at || '')}`;
  return stableUuid(identity);
}

function galleryFor(record: Record<string, any>): string[] {
  if (Array.isArray(record.images)) {
    return record.images.filter((image: unknown): image is string => typeof image === 'string');
  }
  if (typeof record.images === 'string' && record.images.trim()) {
    try {
      const parsed = JSON.parse(record.images);
      if (Array.isArray(parsed)) {
        return parsed.filter((image: unknown): image is string => typeof image === 'string');
      }
    } catch {
      return record.images.split(',').map((image: string) => image.trim()).filter(Boolean);
    }
  }
  return [];
}

function containsInlineMedia(value: any): boolean {
  if (typeof value === 'string') return /^data:(image|video)\//i.test(value);
  if (Array.isArray(value)) return value.some(containsInlineMedia);
  if (value && typeof value === 'object') return Object.values(value).some(containsInlineMedia);
  return false;
}

export async function migrateLegacyResortRecord(
  legacy: Record<string, any>,
  index: number,
  callbacks: LegacyResortMigrationCallbacks
): Promise<{ migrationKey: string; reusedOrSaved: true }> {
  if (!String(legacy.name || '').trim()) {
    throw new Error('Legacy resort record has no name and was left unchanged.');
  }
  const migrationKey = await legacyResortMigrationKey(legacy, index);
  try {
    const gallery = galleryFor(legacy);
    const cover = typeof legacy.image === 'string' ? legacy.image : '';
    const galleryValues = gallery.length > 0 ? gallery : (cover ? [cover] : []);
    const mediaSources = Array.from(new Set([
      ...(/^data:image\//i.test(cover) ? [cover] : []),
      ...galleryValues.filter(image => /^data:image\//i.test(image)),
      ...(typeof legacy.video === 'string' && /^data:video\//i.test(legacy.video) ? [legacy.video] : []),
    ]));
    const sourceFiles = await Promise.all(mediaSources.map(async (source, mediaIndex) => ({
      source,
      file: await mediaDataUrlToFile(source, `legacy-resort-${index + 1}-media-${mediaIndex + 1}`),
    })));
    const prepared = await prepareMediaFiles(sourceFiles.map(entry => entry.file), (file, phase, percent) => {
      callbacks.onProgress?.(`${phase === 'checking' ? 'Validating' : 'Compressing'} ${file.name} (${percent}%)`);
    }, callbacks.signal, {}, sourceFiles.map(entry =>
      entry.source === cover ? 'cover' : 'resort-gallery'
    ));
    const uploadedBySource = new Map<string, string>();
    for (let mediaIndex = 0; mediaIndex < prepared.length; mediaIndex++) {
      const media = prepared[mediaIndex];
      const uploadId = await stableMediaUploadId(media.file, `${migrationKey}:${mediaIndex}`);
      const uploaded = await callbacks.upload(media.file, migrationKey, uploadId, (done, total) => {
        const percent = total > 0 ? Math.floor((done / total) * 100) : 100;
        callbacks.onProgress?.(`Uploading legacy media ${mediaIndex + 1} of ${prepared.length} (${percent}%)`);
      });
      uploadedBySource.set(sourceFiles[mediaIndex].source, uploaded.url);
    }

    const resolvedImages = galleryValues.map(image => uploadedBySource.get(image) || image);
    const resolvedCover = uploadedBySource.get(cover) || cover || resolvedImages[0] || '';
    const resolvedVideo = typeof legacy.video === 'string'
      ? uploadedBySource.get(legacy.video) || legacy.video
      : '';
    const safeRecord: Record<string, unknown> = {
      ...legacy,
      name: String(legacy.name).trim(),
      image: resolvedCover,
      images: resolvedImages,
      video: resolvedVideo,
      price_per_night: legacy.price_per_night ?? legacy.price,
    };
    if (containsInlineMedia(safeRecord)) {
      throw new Error('This legacy record has inline media in an unsupported field. The source is unchanged; export the backup and replace that field before retrying.');
    }
    await callbacks.save(migrationKey, safeRecord);
    return { migrationKey, reusedOrSaved: true };
  } catch (error) {
    try {
      await callbacks.cleanup?.(migrationKey);
    } catch {
      callbacks.onProgress?.('Media cleanup failed; backend reconciliation will retry it.');
    }
    throw error;
  }
}
