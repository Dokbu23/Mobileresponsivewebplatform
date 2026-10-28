<?php

$maxImageSizeMb = max(1, min(50, (int) env('UPLOAD_MAX_IMAGE_SIZE_MB', 50)));
$maxVideoSizeMb = max(1, min(4096, (int) env('UPLOAD_MAX_VIDEO_SIZE_MB', 2048)));
$userQuotaGb = max(1, min(1024, (int) env('UPLOAD_USER_QUOTA_GB', 10)));

return [
    'max_image_size_mb' => $maxImageSizeMb,
    'max_image_size_kb' => $maxImageSizeMb * 1024,
    'max_image_size_bytes' => $maxImageSizeMb * 1024 * 1024,
    'max_combined_image_size_bytes' => 50 * 1024 * 1024,
    'max_images_per_submission' => 20,
    'max_video_size_mb' => $maxVideoSizeMb,
    'max_video_size_kb' => $maxVideoSizeMb * 1024,
    'max_video_size_bytes' => $maxVideoSizeMb * 1024 * 1024,
    'max_file_size_bytes' => max($maxImageSizeMb, $maxVideoSizeMb) * 1024 * 1024,
    'user_quota_bytes' => $userQuotaGb * 1024 * 1024 * 1024,
    'chunk_size_bytes' => 4 * 1024 * 1024,
    'incomplete_expiry_hours' => max(1, (int) env('UPLOAD_INCOMPLETE_EXPIRY_HOURS', 24)),
    'orphan_cleanup_grace_hours' => max(24, (int) env('UPLOAD_ORPHAN_CLEANUP_GRACE_HOURS', 168)),
    'finalize_timeout_seconds' => max(300, min(7200, (int) env('UPLOAD_FINALIZE_TIMEOUT_SECONDS', 3600))),
];
