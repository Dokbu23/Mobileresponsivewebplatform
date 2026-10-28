<?php

namespace App\Console\Commands;

use App\Services\MediaUploadService;
use Illuminate\Console\Command;

class CleanupOrphanedMediaUploads extends Command
{
    protected $signature = 'media:cleanup-orphaned-uploads';

    protected $description = 'Retry cleanup of old, unreferenced media uploads created by failed database operations';

    public function handle(MediaUploadService $uploads): int
    {
        $graceSeconds = (int) config('uploads.orphan_cleanup_grace_hours', 168) * 3600;
        $removed = $uploads->cleanupOrphanedOperationUploads($graceSeconds);
        $this->info("Removed {$removed} old orphaned media upload(s).");

        return 0;
    }
}
