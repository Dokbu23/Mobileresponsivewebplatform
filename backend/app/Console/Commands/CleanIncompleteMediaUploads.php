<?php

namespace App\Console\Commands;

use App\Services\MediaUploadService;
use Illuminate\Console\Command;

class CleanIncompleteMediaUploads extends Command
{
    protected $signature = 'media:clean-incomplete-uploads';

    protected $description = 'Remove expired incomplete media upload sessions';

    public function handle(MediaUploadService $uploads): int
    {
        $removed = $uploads->removeExpiredUploads();
        $this->info("Removed {$removed} expired upload session(s).");

        return 0;
    }
}
