<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class MediaUploadService
{
    private const MIME_EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'image/avif' => 'avif',
        'image/heic' => 'heic',
        'image/heif' => 'heif',
        'video/mp4' => 'mp4',
        'video/quicktime' => 'mov',
        'video/webm' => 'webm',
        'video/ogg' => 'ogv',
        'video/mpeg' => 'mpeg',
        'video/x-matroska' => 'mkv',
    ];

    public static function supportsMimeType(?string $mimeType): bool
    {
        return is_string($mimeType) && isset(self::MIME_EXTENSIONS[$mimeType]);
    }

    public static function supportsExtension(string $mimeType, string $extension): bool
    {
        if (!isset(self::MIME_EXTENSIONS[$mimeType])) {
            return false;
        }

        $extension = strtolower(ltrim($extension, '.'));
        return $mimeType === 'image/jpeg'
            ? in_array($extension, ['jpg', 'jpeg'], true)
            : self::MIME_EXTENSIONS[$mimeType] === $extension;
    }

    public static function maxFileSizeBytesForMimeType(string $mimeType): int
    {
        if (!self::supportsMimeType($mimeType)) {
            throw new RuntimeException('This file type is not supported. Upload a supported image or video format.');
        }

        return strpos($mimeType, 'video/') === 0
            ? config('uploads.max_video_size_bytes')
            : config('uploads.max_image_size_bytes');
    }

    public static function assertOwnedImageReferences(
        array $references,
        ?int $userId,
        array $allowedExistingReferences = []
    ): void
    {
        $disk = Storage::disk('public');
        $seen = [];
        $totalBytes = 0;
        $maxImages = (int) config('uploads.max_images_per_submission');
        $maxCombinedBytes = (int) config('uploads.max_combined_image_size_bytes');
        $allowedExistingPaths = [];
        foreach ($allowedExistingReferences as $reference) {
            if (!is_string($reference)) {
                continue;
            }
            $path = parse_url(trim($reference), PHP_URL_PATH);
            if (is_string($path) && str_starts_with($path, '/storage/originals/')) {
                $allowedExistingPaths[substr($path, strlen('/storage/'))] = true;
            }
        }

        foreach ($references as $reference) {
            if (!is_string($reference) || trim($reference) === '') {
                continue;
            }

            $path = parse_url(trim($reference), PHP_URL_PATH);
            if (!is_string($path) || !str_starts_with($path, '/storage/originals/')) {
                continue;
            }

            $storagePath = substr($path, strlen('/storage/'));
            if (isset($allowedExistingPaths[$storagePath])) {
                continue;
            }
            $ownerPrefix = 'originals/' . (int) $userId . '/';
            if ($userId === null
                || !str_starts_with($storagePath, $ownerPrefix)
                || str_contains($storagePath, '..')
                || !$disk->exists($storagePath)) {
                abort(422, 'The uploaded image reference is invalid or does not belong to this account.');
            }

            if (isset($seen[$storagePath])) {
                continue;
            }
            $seen[$storagePath] = true;

            $mimeType = $disk->mimeType($storagePath);
            if (!is_string($mimeType) || !str_starts_with($mimeType, 'image/')) {
                abort(422, 'Uploaded image references must point to valid image files.');
            }

            $totalBytes += $disk->size($storagePath);
            if (count($seen) > $maxImages) {
                abort(422, "No more than {$maxImages} images may be submitted at once.");
            }
            if ($totalBytes > $maxCombinedBytes) {
                abort(422, 'The combined uploaded image size exceeds the 50 MiB limit.');
            }
        }
    }

    public static function assertOwnedVideoReferences(
        array $references,
        ?int $userId,
        array $allowedExistingReferences = []
    ): void {
        $disk = Storage::disk('public');
        $allowedExistingPaths = [];
        foreach ($allowedExistingReferences as $reference) {
            if (!is_string($reference)) {
                continue;
            }
            $path = parse_url(trim($reference), PHP_URL_PATH);
            if (is_string($path) && str_starts_with($path, '/storage/originals/')) {
                $allowedExistingPaths[substr($path, strlen('/storage/'))] = true;
            }
        }

        foreach ($references as $reference) {
            if (!is_string($reference) || trim($reference) === '') {
                continue;
            }

            $path = parse_url(trim($reference), PHP_URL_PATH);
            if (!is_string($path) || !str_starts_with($path, '/storage/originals/')) {
                continue;
            }

            $storagePath = substr($path, strlen('/storage/'));
            if (isset($allowedExistingPaths[$storagePath])) {
                continue;
            }
            $ownerPrefix = 'originals/' . (int) $userId . '/';
            if ($userId === null
                || !str_starts_with($storagePath, $ownerPrefix)
                || str_contains($storagePath, '..')
                || !$disk->exists($storagePath)) {
                abort(422, 'The uploaded video reference is invalid or does not belong to this account.');
            }

            $mimeType = $disk->mimeType($storagePath);
            if (!is_string($mimeType) || !str_starts_with($mimeType, 'video/')) {
                abort(422, 'Uploaded video references must point to valid video files.');
            }
            if ($disk->size($storagePath) > (int) config('uploads.max_video_size_bytes')) {
                abort(422, 'The uploaded video exceeds the configured size limit.');
            }
        }
    }

    private static function maxFileSizeBytesForFilename(string $filename): int
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $videoExtensions = ['mp4', 'mov', 'webm', 'ogv', 'ogg', 'mpeg', 'mpg', 'mkv'];
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif'];

        if (in_array($extension, $videoExtensions, true)) {
            return config('uploads.max_video_size_bytes');
        }
        if (in_array($extension, $imageExtensions, true)) {
            return config('uploads.max_image_size_bytes');
        }

        throw new RuntimeException('This file type is not supported. Upload a supported image or video format.');
    }

    public function initiate(
        int $userId,
        string $filename,
        int $fileSize,
        string $fingerprint,
        ?string $uploadId = null,
        ?string $operationKey = null
    ): array
    {
        if ($fileSize < 1 || $fileSize > self::maxFileSizeBytesForFilename($filename)) {
            throw new RuntimeException('The file exceeds the configured size limit for this media type.');
        }
        if ($operationKey !== null && !Str::isUuid($operationKey)) {
            throw new RuntimeException('Invalid upload operation identifier.');
        }

        $this->removeExpiredUploads($userId);

        $uploadId = $uploadId ?: (string) Str::uuid();
        if (!Str::isUuid($uploadId)) {
            throw new RuntimeException('Invalid upload identifier.');
        }

        $directory = $this->directory($userId, $uploadId);
        $manifestPath = "{$directory}/manifest.json";
        $disk = Storage::disk('local');
        $userDirectory = $disk->path("media-uploads/{$userId}");
        File::ensureDirectoryExists($userDirectory);
        $quotaLock = fopen("{$userDirectory}/.quota.lock", 'c');
        if ($quotaLock === false || !flock($quotaLock, LOCK_EX)) {
            if (is_resource($quotaLock)) {
                fclose($quotaLock);
            }
            throw new RuntimeException('Could not reserve media storage for this upload.');
        }

        try {
            if ($disk->exists($manifestPath)) {
                $manifest = json_decode($disk->get($manifestPath), true);
                if (!is_array($manifest) || ($manifest['file_size'] ?? null) !== $fileSize
                    || ($manifest['filename'] ?? null) !== $filename
                    || ($manifest['fingerprint'] ?? null) !== $fingerprint
                    || ($manifest['operation_key'] ?? null) !== $operationKey) {
                    throw new RuntimeException('This upload identifier is already in use for a different file.');
                }

                if (in_array(($manifest['status'] ?? null), ['complete', 'cleanup_pending'], true)) {
                    $storagePath = $manifest['storage_path'] ?? '';
                    if (!$this->isOwnedGeneratedMediaPath($storagePath, $userId)
                        || !Storage::disk('public')->exists($storagePath)) {
                        throw new RuntimeException('Completed media is no longer available. Restart the upload with a new upload ID.');
                    }
                    $this->persistMediaAsset(
                        $userId,
                        $uploadId,
                        $operationKey,
                        $storagePath,
                        $manifest['mime_type'] ?? '',
                        (int) ($manifest['file_size'] ?? 0),
                        $manifest['sha256'] ?? ''
                    );
                    if (($manifest['status'] ?? null) !== 'complete') {
                        $manifest['status'] = 'complete';
                        $this->writeManifest($manifestPath, $manifest);
                    }
                    return $this->manifestResponse($manifest, $uploadId, []);
                }

                if (($manifest['status'] ?? null) === 'complete') {
                    return $this->manifestResponse($manifest, $uploadId, []);
                }
            } else {
                if ($this->userStorageBytes($userId) + $fileSize > config('uploads.user_quota_bytes')) {
                    throw new RuntimeException('This upload exceeds your available media storage quota.');
                }

                $manifest = [
                    'filename' => $filename,
                    'file_size' => $fileSize,
                    'fingerprint' => $fingerprint,
                    'operation_key' => $operationKey,
                    'chunk_size' => config('uploads.chunk_size_bytes'),
                    'created_at' => now()->timestamp,
                    'status' => 'uploading',
                ];
                $disk->makeDirectory($directory);
                $this->writeManifest($manifestPath, $manifest);
            }

            $received = [];
            $chunkCount = (int) ceil($fileSize / $manifest['chunk_size']);
            for ($index = 0; $index < $chunkCount; $index++) {
                if ($disk->exists($this->chunkPath($directory, $index))) {
                    $received[] = $index;
                }
            }

            return $this->manifestResponse($manifest, $uploadId, $received);
        } finally {
            flock($quotaLock, LOCK_UN);
            fclose($quotaLock);
        }
    }

    public function storeChunk(int $userId, string $uploadId, int $index, string $contents): array
    {
        $directory = $this->directory($userId, $uploadId);
        $manifest = $this->manifest($directory);
        if (($manifest['status'] ?? null) !== 'uploading') {
            throw new RuntimeException('This upload is no longer accepting chunks.');
        }

        $chunkSize = (int) $manifest['chunk_size'];
        $chunkCount = (int) ceil($manifest['file_size'] / $chunkSize);
        if ($index < 0 || $index >= $chunkCount) {
            throw new RuntimeException('Invalid chunk number.');
        }

        $expectedSize = min($chunkSize, $manifest['file_size'] - ($index * $chunkSize));
        if (strlen($contents) !== $expectedSize) {
            throw new RuntimeException('The received chunk has an invalid size. Retry this chunk.');
        }

        $path = $this->chunkPath($directory, $index);
        $temporaryPath = "{$path}.part";
        if (file_put_contents(Storage::disk('local')->path($temporaryPath), $contents, LOCK_EX) !== $expectedSize) {
            throw new RuntimeException('Could not persist the upload chunk.');
        }

        if (!rename(Storage::disk('local')->path($temporaryPath), Storage::disk('local')->path($path))) {
            throw new RuntimeException('Could not finalize the upload chunk.');
        }

        return ['received' => true, 'chunk' => $index];
    }

    public function complete(int $userId, string $uploadId): array
    {
        $directory = $this->directory($userId, $uploadId);
        $lockDirectory = Storage::disk('local')->path("media-uploads/{$userId}/.locks");
        File::ensureDirectoryExists($lockDirectory);
        $lock = fopen("{$lockDirectory}/{$uploadId}.lock", 'c');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            if (is_resource($lock)) {
                fclose($lock);
            }
            throw new RuntimeException('Could not lock this media upload for finalization.');
        }

        try {
            return $this->completeLocked($userId, $uploadId);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function completeLocked(int $userId, string $uploadId): array
    {
        $directory = $this->directory($userId, $uploadId);
        $manifestPath = "{$directory}/manifest.json";
        $manifest = $this->manifest($directory);
        $disk = Storage::disk('local');

        if (in_array(($manifest['status'] ?? null), ['complete', 'cleanup_pending'], true)) {
            $storagePath = $manifest['storage_path'] ?? '';
            if ($this->isOwnedGeneratedMediaPath($storagePath, $userId)
                && Storage::disk('public')->exists($storagePath)) {
                $this->persistMediaAsset(
                    $userId,
                    $uploadId,
                    $manifest['operation_key'] ?? null,
                    $storagePath,
                    $manifest['mime_type'] ?? '',
                    (int) ($manifest['file_size'] ?? 0),
                    $manifest['sha256'] ?? ''
                );
                $manifest['status'] = 'complete';
                $this->writeManifest($manifestPath, $manifest);
                foreach ($disk->files($directory) as $path) {
                    if ($path !== $manifestPath) {
                        $disk->delete($path);
                    }
                }
                return $this->manifestResponse($manifest, $uploadId, []);
            }
            if (($manifest['status'] ?? null) === 'complete') {
                throw new RuntimeException('Completed media is no longer available. Restart the upload.');
            }
            $disk->deleteDirectory($directory);
            throw new RuntimeException('The previous upload was cleaned up. Restart the upload.');
        }

        $chunkSize = (int) $manifest['chunk_size'];
        $chunkCount = (int) ceil($manifest['file_size'] / $chunkSize);
        $assembledPath = $disk->path("{$directory}/assembled.part");
        $output = fopen($assembledPath, 'wb');
        if ($output === false) {
            throw new RuntimeException('Could not create the temporary upload file.');
        }

        $hash = hash_init('sha256');
        $written = 0;
        try {
            for ($index = 0; $index < $chunkCount; $index++) {
                $chunkPath = $this->chunkPath($directory, $index);
                if (!$disk->exists($chunkPath)) {
                    throw new RuntimeException("Upload is incomplete. Chunk {$index} is missing.");
                }

                $input = fopen($disk->path($chunkPath), 'rb');
                if ($input === false) {
                    throw new RuntimeException('Could not read an upload chunk.');
                }

                try {
                    while (!feof($input)) {
                        $buffer = fread($input, 1024 * 1024);
                        if ($buffer === false) {
                            throw new RuntimeException('Could not read an upload chunk.');
                        }
                        if ($buffer === '') {
                            continue;
                        }
                        $length = strlen($buffer);
                        if (fwrite($output, $buffer) !== $length) {
                            throw new RuntimeException('Could not assemble the uploaded file.');
                        }
                        hash_update($hash, $buffer);
                        $written += $length;
                    }
                } finally {
                    fclose($input);
                }
            }
        } catch (\Throwable $exception) {
            fclose($output);
            @unlink($assembledPath);
            throw $exception;
        }
        fclose($output);

        if ($written !== (int) $manifest['file_size']) {
            $this->discardFailedUpload($directory, $userId, $uploadId);
            throw new RuntimeException('The completed file size does not match the original upload.');
        }

        $mimeType = (new \finfo(FILEINFO_MIME_TYPE))->file($assembledPath);
        if (!is_string($mimeType) || !isset(self::MIME_EXTENSIONS[$mimeType])) {
            $this->discardFailedUpload($directory, $userId, $uploadId);
            throw new RuntimeException('This file type is not supported. Upload a supported image or video format.');
        }
        if ($written > self::maxFileSizeBytesForMimeType($mimeType)) {
            $this->discardFailedUpload($directory, $userId, $uploadId);
            throw new RuntimeException('The file exceeds the configured size limit for this media type.');
        }

        $extension = self::MIME_EXTENSIONS[$mimeType];
        $storagePath = "originals/{$userId}/{$uploadId}.{$extension}";
        if (Storage::disk('public')->exists($storagePath)) {
            $this->discardFailedUpload($directory, $userId, $uploadId);
            throw new RuntimeException('This upload identifier already has a stored media file.');
        }
        if (strpos($mimeType, 'image/') === 0 && !in_array($mimeType, ['image/heic', 'image/heif'], true)) {
            $imageInfo = @getimagesize($assembledPath);
            if ($imageInfo === false || empty($imageInfo[0]) || empty($imageInfo[1])) {
                $this->discardFailedUpload($directory, $userId, $uploadId);
                throw new RuntimeException('The uploaded image is corrupted or has unreadable dimensions.');
            }
        }
        $stream = fopen($assembledPath, 'rb');
        if ($stream === false) {
            $this->discardFailedUpload($directory, $userId, $uploadId);
            throw new RuntimeException('Could not read the completed upload.');
        }

        try {
            if (!Storage::disk('public')->put($storagePath, $stream)) {
                throw new RuntimeException('Could not store the completed upload.');
            }
        } catch (\Throwable $exception) {
            $this->cleanupNewlyCreatedFiles([$storagePath]);
            $disk->deleteDirectory($directory);
            throw $exception;
        } finally {
            fclose($stream);
            @unlink($assembledPath);
        }

        $manifest = array_merge($manifest, [
            'status' => 'complete',
            'mime_type' => $mimeType,
            'storage_path' => $storagePath,
            'url' => '/storage/' . $storagePath,
            'sha256' => hash_final($hash),
        ]);
        try {
            $this->writeManifest($manifestPath, $manifest);
        } catch (\Throwable $exception) {
            if (!Storage::disk('public')->delete($storagePath)) {
                $manifest['status'] = 'cleanup_pending';
                try {
                    $this->writeManifest($manifestPath, $manifest);
                } catch (\Throwable $manifestException) {
                    Log::error('Failed to persist media cleanup marker', [
                        'user_id' => $userId,
                        'upload_id' => $uploadId,
                        'error' => $manifestException->getMessage(),
                    ]);
                }
                $this->cleanupNewlyCreatedFiles([$storagePath]);
                if (!Storage::disk('public')->exists($storagePath)) {
                    $disk->deleteDirectory($directory);
                } else {
                    foreach ($disk->files($directory) as $path) {
                        if ($path !== $manifestPath) {
                            $disk->delete($path);
                        }
                    }
                }
            } else {
                $disk->deleteDirectory($directory);
            }
            throw $exception;
        }

        try {
            $this->persistMediaAsset(
                $userId,
                $uploadId,
                $manifest['operation_key'] ?? null,
                $storagePath,
                $mimeType,
                $written,
                $manifest['sha256']
            );
        } catch (\Throwable $exception) {
            $manifest['status'] = 'cleanup_pending';
            try {
                $this->writeManifest($manifestPath, $manifest);
            } catch (\Throwable $manifestException) {
                Log::error('Failed to persist media asset cleanup marker', [
                    'user_id' => $userId,
                    'upload_id' => $uploadId,
                    'error' => $manifestException->getMessage(),
                ]);
            }
            if (!empty($manifest['operation_key'])) {
                $this->cleanupOperationUploads($userId, $manifest['operation_key']);
            } else {
                $this->cleanupNewlyCreatedFiles([$storagePath]);
            }
            foreach ($disk->files($directory) as $path) {
                if ($path !== $manifestPath) {
                    $disk->delete($path);
                }
            }
            throw $exception;
        }

        foreach ($disk->files($directory) as $path) {
            if ($path !== $manifestPath) {
                $disk->delete($path);
            }
        }

        return $this->manifestResponse($manifest, $uploadId, []);
    }

    private function discardFailedUpload(string $directory, int $userId, string $uploadId): void
    {
        if (!Storage::disk('local')->deleteDirectory($directory)) {
            Log::error('Invalid media upload staging files could not be removed', [
                'user_id' => $userId,
                'upload_id' => $uploadId,
                'retry_command' => 'php artisan media:clean-incomplete-uploads',
            ]);
        }
    }

    private function persistMediaAsset(
        int $userId,
        string $uploadId,
        ?string $operationKey,
        string $storagePath,
        string $mimeType,
        int $sizeBytes,
        string $sha256
    ): void {
        if (!Schema::hasTable('media_assets')) {
            throw new RuntimeException('Run the backend database migrations before completing media uploads.');
        }

        DB::transaction(function () use (
            $userId,
            $uploadId,
            $operationKey,
            $storagePath,
            $mimeType,
            $sizeBytes,
            $sha256
        ) {
            $existing = DB::table('media_assets')
                ->where('upload_id', $uploadId)
                ->lockForUpdate()
                ->first();
            if ($existing) {
                if ((int) $existing->user_id !== $userId
                    || $existing->storage_path !== $storagePath
                    || $existing->mime_type !== $mimeType
                    || (int) $existing->size_bytes !== $sizeBytes
                    || $existing->sha256 !== $sha256) {
                    throw new RuntimeException('This upload identifier conflicts with existing media metadata.');
                }
                return;
            }

            DB::table('media_assets')->insert([
                'upload_id' => $uploadId,
                'user_id' => $userId,
                'operation_key' => $operationKey,
                'storage_path' => $storagePath,
                'mime_type' => $mimeType,
                'size_bytes' => $sizeBytes,
                'sha256' => $sha256,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function cancel(int $userId, string $uploadId): void
    {
        Storage::disk('local')->deleteDirectory($this->directory($userId, $uploadId));
    }

    public function cleanupOperationUploads(int $userId, string $operationKey): void
    {
        if (!Str::isUuid($operationKey)) {
            return;
        }

        $localDisk = Storage::disk('local');
        $publicDisk = Storage::disk('public');
        foreach ($localDisk->allFiles("media-uploads/{$userId}") as $manifestPath) {
            if (!str_ends_with($manifestPath, '/manifest.json')) {
                continue;
            }

            try {
                $manifest = json_decode($localDisk->get($manifestPath), true);
                if (!is_array($manifest)
                    || !in_array(($manifest['status'] ?? null), ['complete', 'cleanup_pending'], true)
                    || ($manifest['operation_key'] ?? null) !== $operationKey) {
                    continue;
                }

                $storagePath = $manifest['storage_path'] ?? '';
                if (!$this->isOwnedGeneratedMediaPath($storagePath, $userId)) {
                    continue;
                }
                if ($this->pathIsReferenced($storagePath)) {
                    continue;
                }

                $this->deleteMediaAssetRecord($storagePath, $userId);
                if ($publicDisk->exists($storagePath) && !$publicDisk->delete($storagePath)) {
                    throw new RuntimeException('The unreferenced media file could not be removed.');
                }

                $directory = dirname($manifestPath);
                if (!$localDisk->deleteDirectory($directory)) {
                    throw new RuntimeException('The completed upload manifest could not be removed.');
                }
            } catch (\Throwable $exception) {
                Log::error('Media operation cleanup will be retried', [
                    'user_id' => $userId,
                    'operation_key' => $operationKey,
                    'upload_id' => basename(dirname($manifestPath)),
                    'retry_command' => 'php artisan media:cleanup-orphaned-uploads',
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }

    public function cleanupNewlyCreatedFiles(array $storagePaths): void
    {
        $disk = Storage::disk('public');
        foreach (array_unique($storagePaths) as $storagePath) {
            if (!is_string($storagePath) || !$this->isApplicationMediaPath($storagePath)) {
                continue;
            }

            try {
                if ($this->isMediaPathReferenced($storagePath)) {
                    continue;
                }
                $this->deleteMediaAssetRecord($storagePath);
                if ($disk->exists($storagePath) && !$disk->delete($storagePath)) {
                    throw new RuntimeException('The newly created media file could not be removed.');
                }
            } catch (\Throwable $exception) {
                $this->scheduleFileCleanup($storagePath);
                Log::error('New media cleanup will be retried', [
                    'storage_path' => $storagePath,
                    'retry_command' => 'php artisan media:cleanup-orphaned-uploads',
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }

    private function deleteMediaAssetRecord(string $storagePath, ?int $userId = null): void
    {
        if (!Schema::hasTable('media_assets')) {
            return;
        }

        $query = DB::table('media_assets')->where('storage_path', $storagePath);
        if ($userId !== null) {
            $query->where('user_id', $userId);
        }
        $query->delete();
    }

    public function cleanupOrphanedOperationUploads(int $minimumAgeSeconds): int
    {
        $localDisk = Storage::disk('local');
        $removed = 0;
        foreach ($localDisk->allFiles('media-uploads') as $manifestPath) {
            if (!str_ends_with($manifestPath, '/manifest.json')) {
                continue;
            }
            if (!$localDisk->exists($manifestPath)) {
                continue;
            }

            try {
                $manifest = json_decode($localDisk->get($manifestPath), true);
                if (!is_array($manifest)
                    || !in_array(($manifest['status'] ?? null), ['complete', 'cleanup_pending'], true)
                    || (int) ($manifest['created_at'] ?? 0) > now()->timestamp - $minimumAgeSeconds) {
                    continue;
                }

                $pathParts = explode('/', $manifestPath);
                $userId = isset($pathParts[1]) ? (int) $pathParts[1] : 0;
                if ($userId < 1) {
                    continue;
                }
                $before = count($localDisk->allFiles(dirname($manifestPath)));
                if (!empty($manifest['operation_key'])) {
                    $this->cleanupOperationUploads($userId, $manifest['operation_key']);
                } elseif (($manifest['status'] ?? null) === 'cleanup_pending') {
                    $storagePath = $manifest['storage_path'] ?? '';
                    if ($this->isOwnedGeneratedMediaPath($storagePath, $userId)
                        && !$this->pathIsReferenced($storagePath)) {
                        $this->deleteMediaAssetRecord($storagePath, $userId);
                        $publicDisk = Storage::disk('public');
                        if ($publicDisk->exists($storagePath) && !$publicDisk->delete($storagePath)) {
                            throw new RuntimeException('The unreferenced media file could not be removed.');
                        }
                        $localDisk->deleteDirectory(dirname($manifestPath));
                    }
                } else {
                    continue;
                }
                $after = count($localDisk->allFiles(dirname($manifestPath)));
                if ($before > 0 && $after === 0) {
                    $removed++;
                }
            } catch (\Throwable $exception) {
                Log::error('Orphaned media reconciliation will be retried', [
                    'upload_id' => basename(dirname($manifestPath)),
                    'retry_command' => 'php artisan media:cleanup-orphaned-uploads',
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return $removed + $this->retryPendingFileCleanup($minimumAgeSeconds);
    }

    private function retryPendingFileCleanup(int $minimumAgeSeconds): int
    {
        $localDisk = Storage::disk('local');
        $publicDisk = Storage::disk('public');
        $removed = 0;
        foreach ($localDisk->allFiles('media-cleanup') as $markerPath) {
            try {
                $marker = json_decode($localDisk->get($markerPath), true);
                $storagePath = is_array($marker) ? ($marker['storage_path'] ?? null) : null;
                if (!is_string($storagePath)
                    || !$this->isApplicationMediaPath($storagePath)
                    || (int) ($marker['created_at'] ?? 0) > now()->timestamp - $minimumAgeSeconds) {
                    continue;
                }

                if ($this->isMediaPathReferenced($storagePath)) {
                    $localDisk->delete($markerPath);
                    continue;
                }
                $this->deleteMediaAssetRecord($storagePath);
                if ($publicDisk->exists($storagePath) && !$publicDisk->delete($storagePath)) {
                    throw new RuntimeException('The unreferenced media file could not be removed.');
                }
                $localDisk->delete($markerPath);
                $removed++;
            } catch (\Throwable $exception) {
                Log::error('Pending media cleanup will be retried', [
                    'cleanup_id' => basename($markerPath, '.json'),
                    'retry_command' => 'php artisan media:cleanup-orphaned-uploads',
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return $removed;
    }

    private function scheduleFileCleanup(string $storagePath): void
    {
        try {
            $localDisk = Storage::disk('local');
            $cleanupId = (string) Str::uuid();
            $localDisk->put("media-cleanup/{$cleanupId}.json", json_encode([
                'storage_path' => $storagePath,
                'created_at' => now()->timestamp,
            ], JSON_UNESCAPED_SLASHES));
        } catch (\Throwable $exception) {
            Log::error('Could not persist a media cleanup retry marker', [
                'retry_command' => 'php artisan media:cleanup-orphaned-uploads',
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function isApplicationMediaPath(string $storagePath): bool
    {
        return preg_match(
            '#\A(?:originals/[0-9]+/[0-9a-f-]{36}|accommodations/(?:videos/)?[A-Za-z0-9_-]{20,64})\.(jpg|jpeg|png|gif|webp|avif|heic|heif|mp4|mov|webm|ogv|mpeg|mkv)\z#i',
            $storagePath
        ) === 1;
    }

    private function isOwnedGeneratedMediaPath(string $path, int $userId): bool
    {
        return preg_match(
            '#\Aoriginals/' . preg_quote((string) $userId, '#') . '/[0-9a-f-]{36}\.(jpg|png|gif|webp|avif|heic|heif|mp4|mov|webm|ogv|mpeg|mkv)\z#i',
            $path
        ) === 1;
    }

    private function isMediaPathReferenced(string $storagePath): bool
    {
        $url = '/storage/' . $storagePath;
        $references = [$url, ltrim($url, '/')];
        $pathSuffix = basename($storagePath);
        $tableColumns = [
            'accommodations' => ['image', 'images', 'video'],
            'attractions' => ['image', 'images', 'video'],
            'events' => ['image', 'images', 'video'],
            'products' => ['image', 'images', 'video'],
            'culture_arts' => ['image', 'images', 'video'],
            'histories' => ['image', 'images', 'video'],
            'enterprise_posts' => ['image', 'images', 'video'],
            'users' => ['resort_images', 'video'],
            'resort_rooms' => ['image', 'images'],
        ];

        foreach ($tableColumns as $table => $columns) {
            if (!Schema::hasTable($table)) {
                continue;
            }
            foreach ($columns as $column) {
                if (!Schema::hasColumn($table, $column)) {
                    continue;
                }

                $query = DB::table($table);
                if (in_array($column, ['images', 'resort_images'], true)) {
                    foreach ($references as $reference) {
                        if ($query->whereJsonContains($column, $reference)->exists()) {
                            return true;
                        }
                    }
                    foreach (DB::table($table)->pluck($column) as $encoded) {
                        if (is_string($encoded) && strpos($encoded, $pathSuffix) !== false) {
                            return true;
                        }
                    }
                } elseif ($query->where(function ($builder) use ($column, $references, $pathSuffix) {
                    foreach ($references as $reference) {
                        $builder->orWhere($column, $reference);
                    }
                    $builder->orWhere($column, 'like', '%' . $pathSuffix);
                })->exists()) {
                    return true;
                }
            }
        }

        return false;
    }

    public function belongsToOperation(int $userId, string $uploadId, string $operationKey): bool
    {
        try {
            $manifest = $this->manifest($this->directory($userId, $uploadId));
        } catch (\Throwable $exception) {
            return false;
        }

        return ($manifest['status'] ?? null) === 'complete'
            && ($manifest['operation_key'] ?? null) === $operationKey
            && $this->isOwnedGeneratedMediaPath($manifest['storage_path'] ?? '', $userId);
    }

    private function pathIsReferenced(string $storagePath): bool
    {
        try {
            return $this->isMediaPathReferenced($storagePath);
        } catch (\Throwable $exception) {
            Log::error('Media reference check failed; retaining media for safety', [
                'retry_command' => 'php artisan media:cleanup-orphaned-uploads',
                'error' => $exception->getMessage(),
            ]);
            return true;
        }
    }

    public function removeExpiredUploads(?int $userId = null): int
    {
        $disk = Storage::disk('local');
        $root = 'media-uploads';
        $userDirectories = $userId === null
            ? $disk->directories($root)
            : [$root . '/' . $userId];
        $expiredBefore = now()->subHours(config('uploads.incomplete_expiry_hours'))->timestamp;
        $removed = 0;

        foreach ($userDirectories as $userDirectory) {
            foreach ($disk->directories($userDirectory) as $directory) {
                $manifestPath = "{$directory}/manifest.json";
                if (!$disk->exists($manifestPath)) {
                    continue;
                }

                $manifest = json_decode($disk->get($manifestPath), true);
                if (is_array($manifest)
                    && ($manifest['status'] ?? null) !== 'complete'
                    && !(($manifest['status'] ?? null) === 'cleanup_pending' && !empty($manifest['operation_key']))
                    && (int) ($manifest['created_at'] ?? 0) < $expiredBefore) {
                    $disk->deleteDirectory($directory);
                    $removed++;
                } elseif (is_array($manifest) && ($manifest['status'] ?? null) === 'complete'
                    && empty($manifest['operation_key'])
                    && (int) ($manifest['created_at'] ?? 0) < $expiredBefore) {
                    $disk->deleteDirectory($directory);
                    $removed++;
                }
            }
        }

        return $removed;
    }

    private function manifest(string $directory): array
    {
        $path = "{$directory}/manifest.json";
        if (!Storage::disk('local')->exists($path)) {
            throw new RuntimeException('Upload session not found or expired.');
        }

        $manifest = json_decode(Storage::disk('local')->get($path), true);
        if (!is_array($manifest)) {
            throw new RuntimeException('Upload session metadata is invalid.');
        }

        return $manifest;
    }

    private function writeManifest(string $path, array $manifest): void
    {
        if (!Storage::disk('local')->put($path, json_encode($manifest, JSON_UNESCAPED_SLASHES))) {
            throw new RuntimeException('Could not save upload session metadata.');
        }
    }

    private function userStorageBytes(int $userId): int
    {
        $bytes = 0;
        foreach (Storage::disk('public')->allFiles("originals/{$userId}") as $path) {
            $bytes += Storage::disk('public')->size($path);
        }

        $localDisk = Storage::disk('local');
        foreach ($localDisk->directories("media-uploads/{$userId}") as $directory) {
            $manifestPath = "{$directory}/manifest.json";
            if ($localDisk->exists($manifestPath)) {
                $manifest = json_decode($localDisk->get($manifestPath), true);
                if (is_array($manifest) && ($manifest['status'] ?? null) === 'uploading') {
                    $bytes += max(0, (int) ($manifest['file_size'] ?? 0));
                    continue;
                }
            }

            foreach ($localDisk->allFiles($directory) as $path) {
                $bytes += $localDisk->size($path);
            }
        }

        return $bytes;
    }

    private function directory(int $userId, string $uploadId): string
    {
        if (!Str::isUuid($uploadId)) {
            throw new RuntimeException('Invalid upload identifier.');
        }

        return "media-uploads/{$userId}/{$uploadId}";
    }

    private function chunkPath(string $directory, int $index): string
    {
        return "{$directory}/chunk-{$index}.part";
    }

    private function manifestResponse(array $manifest, string $uploadId, array $received): array
    {
        return [
            'upload_id' => $uploadId,
            'chunk_size' => (int) $manifest['chunk_size'],
            'received_chunks' => $received,
            'status' => $manifest['status'],
            'url' => $manifest['url'] ?? null,
            'mime_type' => $manifest['mime_type'] ?? null,
            'sha256' => $manifest['sha256'] ?? null,
        ];
    }
}
