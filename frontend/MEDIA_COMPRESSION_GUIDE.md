# Media Compression System - Frontend Guide

## Overview

The media compression system provides intelligent, automatic compression of images and videos before upload. Users can now upload files up to 1.5 GB without encountering the old 200 MB browser limit.

## Architecture

### Key Modules

#### `lib/mediaCompression.ts`
Core compression logic with:
- `compressImage()`: WebP conversion with quality optimization
- `compressVideo()`: FFmpeg WASM-based H.264 encoding
- `prepareMediaFiles()`: Batch processing with error handling
- `validateCombinedImageSize()`: Size validation
- Compression profiles: resort-gallery, cover, enterprise-logo, thumbnail

#### `lib/api.ts`
Upload orchestration:
- `uploadMediaInChunks()`: Chunked upload with resumability
- `sendMediaFormData()`: FormData with progress tracking
- `mediaFingerprint()`: SHA256-based file identification
- Resumable upload via localStorage

#### `lib/compressionMetrics.ts` (NEW)
Metrics and progress tracking:
- `calculateCompressionMetrics()`: Compression ratio calculation
- `calculateUploadMetrics()`: Speed and ETA calculation
- `formatBytes()`, `formatDuration()`, `formatBitrate()`: Display formatting
- `canDeviceHandleCompression()`: Memory assessment

#### `components/MediaUploadProgress.tsx` (NEW)
UI component for upload progress:
- Real-time compression and upload progress
- Detailed metrics display
- Pause/Resume/Cancel controls
- Error and success states

### Compression Profiles

Videos are compressed based on file size:

```typescript
{
  small: {       // < 50 MB
    bitrate: '4000k',     // 4 Mbps
    resolution: '1080p',
    description: 'High quality (1080p, 4 Mbps)'
  },
  medium: {      // 50-200 MB
    bitrate: '2500k',     // 2.5 Mbps
    resolution: '720p',
    description: 'Balanced quality (720p, 2.5 Mbps)'
  },
  large: {       // 200-500 MB
    bitrate: '1500k',     // 1.5 Mbps
    resolution: '720p',
    description: 'Standard quality (720p, 1.5 Mbps)'
  },
  xlarge: {      // 500+ MB
    bitrate: '1000k',     // 1 Mbps
    resolution: '480p',
    description: 'Compressed quality (480p, 1 Mbps)'
  }
}
```

Image profiles:
- `resort-gallery`: Gallery images (max 500 KB)
- `cover`: Banner/cover images (max 800 KB)
- `thumbnail`: Avatars/thumbnails (max 200 KB)
- `enterprise-logo`: Business logos (max 300 KB)

## Usage

### Basic Video Upload

```typescript
import { uploadMediaInChunks, VIDEO_UPLOAD_LIMIT_BYTES } from '../lib/api';
import { prepareMediaFiles, MAX_VIDEO_INPUT_BYTES } from '../lib/mediaCompression';

// Select file (e.g., from input element)
const file = inputElement.files[0];

// Check file size (pre-compression limit)
if (file.size > MAX_VIDEO_INPUT_BYTES) {
  // Error: file too large for browser processing
}

// Upload with automatic compression and progress tracking
try {
  const result = await uploadMediaInChunks(
    file,
    (uploadedBytes, totalBytes) => {
      console.log(`Uploaded: ${uploadedBytes} / ${totalBytes} bytes`);
    },
    abortController.signal,
    {
      onProcessingProgress: (file, phase, percent) => {
        console.log(`${phase}: ${percent}%`);
      }
    }
  );
  
  console.log('Upload complete:', result.url);
} catch (error) {
  console.error('Upload failed:', error.message);
}
```

### Batch Image Upload

```typescript
import { prepareMediaFiles, MAX_IMAGE_INPUT_BYTES } from '../lib/mediaCompression';
import { uploadMediaInChunks } from '../lib/api';

// Select multiple images
const imageFiles = Array.from(inputElement.files);

// Prepare (compress) all images
const prepared = await prepareMediaFiles(
  imageFiles,
  (file, phase, percent) => {
    console.log(`${file.name} ${phase}: ${percent}%`);
  }
);

// Upload each image
for (const media of prepared) {
  const result = await uploadMediaInChunks(media.file);
  console.log(`${media.file.name} uploaded to ${result.url}`);
}
```

### With Progress UI

```typescript
import { MediaUploadProgress } from '../components/MediaUploadProgress';
import { MediaProcessingState } from '../lib/compressionMetrics';

const [uploadState, setUploadState] = useState<MediaProcessingState>({
  filename: 'video.mp4',
  originalSize: 588200000,
  compressedSize: 0,
  progress: 0,
  phase: 'compressing',
  status: 'Starting compression...',
});

const handleUpload = async (file: File) => {
  try {
    const result = await uploadMediaInChunks(
      file,
      (uploadedBytes, totalBytes) => {
        setUploadState(prev => ({
          ...prev,
          phase: 'uploading',
          compressedSize: totalBytes,
          progress: Math.round((uploadedBytes / totalBytes) * 100),
        }));
      },
      undefined,
      {
        onProcessingProgress: (f, phase, percent) => {
          setUploadState(prev => ({
            ...prev,
            phase: 'compressing',
            progress: percent,
          }));
        }
      }
    );
    
    setUploadState(prev => ({
      ...prev,
      phase: 'complete',
      progress: 100,
      status: `Uploaded to ${result.url}`
    }));
  } catch (error) {
    setUploadState(prev => ({
      ...prev,
      phase: 'complete',
      error: error.message,
    }));
  }
};

return (
  <div>
    <input
      type="file"
      accept="video/*"
      onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
    />
    <MediaUploadProgress
      state={uploadState}
      originalSize={uploadState.originalSize}
      compressedSize={uploadState.compressedSize}
      uploadedBytes={uploadState.compressedSize}
      totalUploadSize={uploadState.compressedSize}
      startTime={Date.now()}
      isCompressing={uploadState.phase === 'compressing'}
      isPaused={false}
    />
  </div>
);
```

## Handling Large Files

### 588 MB Video Example

1. **File Selection**
   - File size: 588 MB
   - Checks: < 1.5 GB ✓
   - Device memory: Sufficient ✓

2. **Compression**
   - Profile: xlarge (500+ MB)
   - Settings: 480p @ 1 Mbps
   - Estimated time: ~120 seconds
   - Estimated result: ~90-100 MB

3. **Chunked Upload**
   - 4 MB chunks: ~24-25 chunks
   - With progress updates every chunk
   - Resumable if connection drops

4. **Completion**
   - Server validates MP4 format
   - File stored to `/storage/originals/{userId}/{uploadId}.mp4`
   - URL returned: `/storage/originals/1/abc-123.mp4`

## Error Handling

### Common Errors

**Browser Processing Limit Exceeded**
```
"video.mp4 exceeds the 1.5 GB browser video-processing limit. 
Your device cannot safely process files larger than 1.5 GB. 
Try a smaller video or reduce the resolution/duration."
```
Solution: Trim video or upgrade device

**Device Memory Insufficient**
```
"Device memory (4 GB) may be insufficient for this video. 
Close other apps and try again."
```
Solution: Close other applications and retry

**Video Duration Too Long**
```
"video.mp4 is longer than the 10-minute browser video-processing limit. 
Trim the video or increase VITE_VIDEO_PROCESS_MAX_DURATION_SECONDS."
```
Solution: Trim video or extend duration limit in .env

**Compression Failed**
```
"video.mp4 could not be compressed. The original was not uploaded. 
Error: FFmpeg could not transcode this video."
```
Solution: Try a different video format or file

**Network Error During Upload**
```
Error: Network error while uploading media.
```
Solution: Upload will resume if same file is selected again

**Unsupported File Format**
```
"video.mp4 is not a supported image or video extension (.mkv)."
```
Solution: Convert file to MP4, MOV, WebM, or OGV

### Error Recovery

Uploads can be resumed from localStorage:
```typescript
// If upload is interrupted, selecting same file will resume from last chunk
const file = inputElement.files[0];
// System checks localStorage for matching fingerprint
// Resumes from last completed chunk
```

To clear stuck uploads:
```javascript
// Clear specific upload
localStorage.removeItem('discover-mansalay:media-upload:fingerprint:name:size:time');

// Clear all uploads
Object.keys(localStorage)
  .filter(k => k.startsWith('discover-mansalay:media-upload:'))
  .forEach(k => localStorage.removeItem(k));
```

## Performance Tips

### For Users

1. **Close Other Applications**: Free up RAM before uploading large videos
2. **Use WiFi**: More stable than mobile networks
3. **Avoid Browser Tabs**: Close other tabs using lots of memory
4. **Keep Files at Reasonable Duration**: 10 minutes max recommended
5. **Check Device Storage**: Ensure enough free disk space

### For Developers

1. **Test with Realistic Files**: Use 100 MB, 500 MB, 1 GB test videos
2. **Monitor Memory**: Check browser DevTools during upload
3. **Test on Low-End Devices**: iPad, old phones, budget laptops
4. **Simulate Network Issues**: Use Chrome throttling (Slow 3G, etc.)
5. **Track Metrics**: Log compression ratio and upload speed

## Configuration

### Environment Variables

```env
# Frontend (.env)

# Maximum video file size for browser processing
# Default: 500 MB - increase to accept larger files (up to 1.5 GB)
VITE_VIDEO_PROCESS_MAX_INPUT_MB=500

# Maximum video duration for browser processing (seconds)
# Default: 600 seconds (10 minutes)
VITE_VIDEO_PROCESS_MAX_DURATION_SECONDS=600
```

### Runtime Adjustments

To accept larger videos:
```env
VITE_VIDEO_PROCESS_MAX_INPUT_MB=1000  # 1 GB
```

To reduce max duration:
```env
VITE_VIDEO_PROCESS_MAX_DURATION_SECONDS=300  # 5 minutes
```

## Debugging

### Enable Compression Logging

Add to `mediaCompression.ts`:
```typescript
const DEBUG = true;

if (DEBUG) {
  console.log(`Selecting profile for ${fileSizeBytes / (1024*1024)}MB video`);
  console.log(`Profile: ${profile.description}`);
  console.log(`Estimated output: ~${Math.round(estimateCompressedSize(fileSizeBytes))}MB`);
}
```

### Monitor Upload Progress

```typescript
const handleProgress = (uploadedBytes: number, totalBytes: number) => {
  const percent = (uploadedBytes / totalBytes) * 100;
  const speed = uploadedBytes / (Date.now() - startTime) * 1000;
  console.log(
    `[${new Date().toLocaleTimeString()}] ${percent.toFixed(1)}% ` +
    `(${(uploadedBytes / 1024 / 1024).toFixed(1)}MB / ` +
    `${(totalBytes / 1024 / 1024).toFixed(1)}MB) ` +
    `@ ${(speed / 1024 / 1024).toFixed(2)} MB/s`
  );
};
```

### Check FFmpeg Status

In browser console:
```javascript
// Check FFmpeg availability
console.log('FFmpeg loaded:', typeof FFmpeg !== 'undefined');

// Monitor FFmpeg progress
// (Requires modification to mediaCompression.ts)
```

## Browser Support

- **Chrome 60+**: Full support (WebAssembly, Worker Threads)
- **Firefox 55+**: Full support
- **Safari 15+**: Full support (iOS 15+)
- **Edge 79+**: Full support

Older browsers will show error:
```
"Video compression is unavailable in this browser: WebAssembly not supported"
```

## Troubleshooting

### "Browser is out of memory"

FFmpeg ran out of memory during compression. Solutions:
1. Close other browser tabs
2. Close other applications
3. Restart browser
4. Use a video with shorter duration
5. Try on a device with more RAM

### Upload stuck at 99%

Likely issue: Server is validating/processing file. Solutions:
1. Wait longer (can take several minutes for large files)
2. Check browser console for errors
3. Check server logs: `tail storage/logs/laravel.log`
4. If still stuck after 10 minutes, refresh and resume

### "Compression produced an empty file"

FFmpeg failed to generate output. Try:
1. Different video file (corruption possible)
2. Different video format/codec
3. Check browser console for FFmpeg errors
4. Report issue with file details

### Images not being compressed

Check if already optimal:
1. Small PNG might already be well-compressed
2. System skips re-compression if file is already good
3. Check DevTools Network tab for file size

## Advanced Usage

### Custom Compression Profiles

Create per-use-case profiles:

```typescript
const customProfiles: ImageCompressionProfile[] = [
  {
    quality: 0.75,
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
  },
];

const prepared = await prepareMediaFiles(
  files,
  onProgress,
  signal,
  {},
  customProfiles
);
```

### Resuming Failed Uploads

```typescript
// Get upload ID from localStorage
const resumeKey = `discover-mansalay:media-upload:${fingerprint}:${name}:${size}:${lastModified}`;
const uploadId = localStorage.getItem(resumeKey);

if (uploadId) {
  // Resume with same uploadId
  const result = await uploadMediaInChunks(file, onProgress, signal, {
    uploadId,  // Resume from this ID
  });
}
```

### Batch Operations

```typescript
// Upload multiple files in series (one at a time)
for (const file of files) {
  try {
    await uploadMediaInChunks(file, onProgress);
  } catch (e) {
    console.error(`Failed: ${file.name}`);
  }
}

// Or in parallel (multiple at once, limited concurrency)
const concurrency = 3;
for (let i = 0; i < files.length; i += concurrency) {
  await Promise.all(
    files.slice(i, i + concurrency).map(f => uploadMediaInChunks(f))
  );
}
```

## Related Documentation

- Backend: `backend/MEDIA_COMPRESSION_GUIDE.md`
- Config: `backend/config/uploads.php`
- API: `backend/app/Http/Controllers/Api/MediaUploadController.php`
- Utilities: `frontend/src/app/lib/mediaCompression.ts`
