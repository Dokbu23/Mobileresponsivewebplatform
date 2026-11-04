# Advanced Media Compression System

## Overview

This system implements browser-based media compression before upload, allowing users to upload large videos (up to 1.5 GB) and have them automatically compressed based on file size and device capabilities.

### Key Features

1. **Intelligent Adaptive Compression**: Videos are compressed at different bitrates depending on original file size
   - Small videos (<50 MB): 1080p @ 4 Mbps
   - Medium videos (50-200 MB): 720p @ 2.5 Mbps
   - Large videos (200-500 MB): 720p @ 1.5 Mbps
   - Extra-large videos (500+ MB): 480p @ 1 Mbps

2. **Device-Aware Processing**: Detects device memory and adjusts compression strategy
   - Maximum 1.5 GB file size supported
   - Graceful degradation for low-memory devices
   - Clear error messages when device can't handle compression

3. **Image Compression**: Automatic WebP conversion with quality optimization
   - Per-image limit: 50 MB
   - Combined limit: 50 MB per submission
   - Max 20 images per submission
   - Automatic quality adjustment if needed

4. **Chunked Uploads**: 4 MB chunks for reliable large file uploads
   - Resumable uploads via fingerprinting
   - Automatic retry on network failure
   - Progress tracking

## Configuration

### Frontend (.env)

```env
# Video compression settings
# Browser processing limit: up to 1.5 GB (adaptive compression kicks in at 500 MB)
# Default: 500 MB - increase for more aggressive compression
VITE_VIDEO_PROCESS_MAX_INPUT_MB=500

# Maximum video duration for browser processing (seconds)
# Default: 600 seconds (10 minutes)
VITE_VIDEO_PROCESS_MAX_DURATION_SECONDS=600
```

### Backend (.env)

```env
# Image upload size limit (post-compression)
UPLOAD_MAX_IMAGE_SIZE_MB=50

# Video upload size limit (post-compression)
# Default: 4096 MB (4 GB) - server storage limit
UPLOAD_MAX_VIDEO_SIZE_MB=4096

# Per-user storage quota
UPLOAD_USER_QUOTA_GB=50

# How long to keep incomplete uploads before auto-cleanup
UPLOAD_INCOMPLETE_EXPIRY_HOURS=24

# Grace period for cleanup of orphaned uploads
UPLOAD_ORPHAN_CLEANUP_GRACE_HOURS=168

# Upload finalization timeout (seconds)
# Increased for very large files
UPLOAD_FINALIZE_TIMEOUT_SECONDS=3600
```

### Server (PHP Configuration)

The system updates Apache/PHP configuration via:

1. **`.htaccess`** in `public/` directory with PHP directives
2. **`.user.ini`** for runtime configuration overrides

Key settings:
- `post_max_size`: 4608 MB (4.5 GB)
- `upload_max_filesize`: 4096 MB (4 GB)
- `max_execution_time`: 3600 seconds
- `max_input_time`: 3600 seconds
- `memory_limit`: 512 MB per request

## How It Works

### Video Compression Flow

1. **File Selection**
   - User selects video file
   - System checks against 1.5 GB absolute limit
   - Device memory is assessed

2. **Compression Profile Selection**
   - Small file (<50 MB) → High quality (1080p, 4 Mbps)
   - Medium file (50-200 MB) → Balanced (720p, 2.5 Mbps)
   - Large file (200-500 MB) → Standard (720p, 1.5 Mbps)
   - Extra large (500+ MB) → Compressed (480p, 1 Mbps)

3. **FFmpeg Processing** (Browser-side, using WebAssembly)
   - Video is read into memory (4 MB chunks)
   - FFmpeg transcodes with H.264 + AAC audio
   - Output is MP4 format with faststart flag
   - Progress reported every frame

4. **Size Validation**
   - Compressed size checked against limits
   - If still too large, user is notified
   - User can try different compression settings

5. **Chunked Upload**
   - Compressed file split into 4 MB chunks
   - Each chunk uploaded separately
   - Chunks can resume on network failure
   - Server validates each chunk

6. **Assembly & Finalization**
   - Server assembles chunks
   - MIME type verified
   - File dimensions checked (images)
   - File stored in Laravel public storage

### Image Compression Flow

1. **File Selection**
   - Multiple images allowed (max 20)
   - Combined size must be < 50 MB

2. **Per-Image Processing**
   - Detect image format (JPEG, PNG, WebP, etc.)
   - If not already optimized → Convert to WebP
   - Apply quality adjustments if needed
   - Try multiple quality levels to hit target size

3. **Combined Size Check**
   - If all compressed images > 50 MB combined
   - Reduce dimensions and quality across the board
   - Repeat until within limits

4. **Upload**
   - All images sent as FormData fields
   - Same chunked upload mechanism as videos

## Error Handling

### Browser-Side Errors

1. **File Too Large**
   ```
   "Video.mp4 exceeds the 1.5 GB browser video-processing limit. 
   Your device cannot safely process files larger than 1.5 GB. 
   Try a smaller video or reduce the resolution/duration."
   ```

2. **Device Memory Insufficient**
   ```
   "Device memory (4 GB) may be insufficient for this video. 
   Close other apps and try again."
   ```

3. **Video Duration Too Long**
   ```
   "Video.mp4 is longer than the 10-minute browser video-processing limit. 
   Trim the video or increase VITE_VIDEO_PROCESS_MAX_DURATION_SECONDS."
   ```

4. **Compression Failed**
   ```
   "Video.mp4 could not be compressed. The original was not uploaded. 
   Error: FFmpeg could not transcode this video."
   ```

### Server-Side Errors

1. **File Size Exceeds Limit**
   ```
   "The file exceeds the configured size limit for this media type."
   ```

2. **Unsupported File Type**
   ```
   "This file type is not supported. Upload a supported image or video format."
   ```

3. **Corrupted File**
   ```
   "The uploaded image is corrupted or has unreadable dimensions."
   ```

4. **User Quota Exceeded**
   ```
   "This upload exceeds your available media storage quota."
   ```

## Performance Optimization

### Browser Compression

- **Veryfast FFmpeg Preset**: Balances speed and quality
- **CRF 27 Quality**: Reasonable quality-to-size ratio
- **H.264 Codec**: Universal browser support
- **Web Workers**: Image compression runs off main thread
- **Chunked Reading**: Video loaded in segments for memory efficiency

### Server Upload

- **4 MB Chunks**: Sweet spot between progress granularity and overhead
- **Streaming File Write**: Doesn't load full file into PHP memory
- **Atomic Renames**: Prevents partial file corruption
- **Fingerprint-Based Resumability**: Resume on network failure
- **Local Storage Tracking**: Upload ID persisted for retry

### Database Operations

- **Transactions**: Ensures data consistency
- **Locks**: Prevents quota race conditions
- **Lazy Loading**: Media references loaded only when needed

## Monitoring & Maintenance

### Database Migrations

Required tables:
- `media_assets`: Stores uploaded file metadata
- `legacy_resort_migrations`: Tracks migration operations

Run migrations:
```bash
php artisan migrate
```

### Cleanup Commands

Remove incomplete uploads older than 24 hours:
```bash
php artisan media:clean-incomplete-uploads
```

Remove orphaned files not linked to any media asset:
```bash
php artisan media:cleanup-orphaned-uploads
```

### Disk Space Management

Monitor storage usage:
```bash
php artisan media:check-quotas
```

Check storage directory:
```bash
du -sh storage/app/public/
```

## Troubleshooting

### Video Won't Compress

**Symptom**: Compression starts but never completes (shows "Killed" message)

**Cause**: EC2 instance out of memory (RAM + swap insufficient)

**Solution**:
1. Add more swap space:
   ```bash
   sudo dd if=/dev/zero of=/swapfile bs=1G count=4
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

2. Or upgrade EC2 instance to `t3.large` or larger

### Upload Speed Very Slow

**Symptom**: Upload takes hours for a large file

**Cause**: Network bandwidth or server processing

**Solution**:
1. Check network speed from browser dev tools (Network tab)
2. Verify EC2 network performance
3. Increase chunk size if needed (in config/uploads.php)

### MIME Type Validation Failures

**Symptom**: "This file type is not supported" on upload

**Cause**: File extension doesn't match detected MIME type

**Solution**: 
- Ensure file has correct extension (e.g., `.mp4` for H.264 video)
- Browser side enforces MIME type detection before upload

### Quota Exceeded Errors

**Symptom**: "Upload exceeds your available media storage quota"

**Cause**: User has too many files

**Solution**:
1. Delete old uploads
2. Increase user quota in config
3. Use cleanup commands to remove orphaned files

## API Endpoints

### Initiate Upload

```
POST /api/media/uploads
Content-Type: application/json
Authorization: Bearer {token}

{
  "filename": "video.mp4",
  "file_size": 104857600,
  "fingerprint": "sha256hash...",
  "upload_id": "uuid",
  "operation_key": "uuid"
}

Response: {
  "upload_id": "uuid",
  "chunk_size": 4194304,
  "received_chunks": [0, 1],
  "status": "uploading"
}
```

### Upload Chunk

```
POST /api/media/uploads/{uploadId}/chunk/{index}
Content-Type: application/octet-stream
Authorization: Bearer {token}

[Binary chunk data]

Response: {
  "received": true,
  "chunk": 0
}
```

### Complete Upload

```
POST /api/media/uploads/{uploadId}/complete
Authorization: Bearer {token}

Response: {
  "upload_id": "uuid",
  "status": "complete",
  "url": "/storage/originals/1/uuid.mp4",
  "mime_type": "video/mp4",
  "sha256": "hash..."
}
```

### Cancel Upload

```
DELETE /api/media/uploads/{uploadId}
Authorization: Bearer {token}

Response: {
  "success": true
}
```

## Security Considerations

1. **MIME Type Validation**: Server verifies actual file type, not just extension
2. **File Ownership**: Ensures users can only access their own uploads
3. **Path Traversal Protection**: Prevents `..` in file paths
4. **Quota Enforcement**: User storage limits prevent abuse
5. **Transactional Operations**: Atomic uploads prevent corruption
6. **Fingerprint-Based Deduplication**: Prevents redundant uploads

## Future Improvements

1. **Parallel Chunk Uploads**: Upload multiple chunks simultaneously
2. **Adaptive Bitrate Selection**: Based on network speed
3. **Hardware Acceleration**: Use GPU for video encoding if available
4. **Advanced Image Analysis**: Extract metadata and thumbnails
5. **Transcoding Pipeline**: Background re-encoding for legacy formats
