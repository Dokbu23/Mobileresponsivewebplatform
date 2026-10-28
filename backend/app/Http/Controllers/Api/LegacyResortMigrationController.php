<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LegacyResortMigrationService;
use App\Services\MediaUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class LegacyResortMigrationController extends Controller
{
    public function migrate(
        Request $request,
        LegacyResortMigrationService $migrations,
        MediaUploadService $media
    ) {
        $data = $request->validate([
            'migration_key' => 'required|uuid',
            'record' => 'required|array',
            'record.name' => 'required|string|max:255',
            'record.images' => 'nullable|array|max:20',
            'record.image' => 'nullable|string|max:2048',
            'record.video' => 'nullable|string|max:2048',
        ]);

        if ($this->containsInlineMedia($data['record'])) {
            return response()->json([
                'message' => 'Inline media was not accepted. Upload media first and send its server path.',
            ], 422);
        }

        try {
            $accommodation = $migrations->migrate(
                (int) $request->user()->id,
                $data['migration_key'],
                $data['record']
            );
            return response()->json($accommodation, 200);
        } catch (\Throwable $exception) {
            $media->cleanupOperationUploads(
                (int) $request->user()->id,
                $data['migration_key']
            );
            Log::error('Legacy resort migration failed', [
                'user_id' => $request->user()->id,
                'migration_key' => $data['migration_key'],
                'error' => $exception->getMessage(),
            ]);
            if ($exception instanceof RuntimeException) {
                return response()->json(['message' => $exception->getMessage()], 422);
            }
            throw $exception;
        }
    }

    private function containsInlineMedia(array $value): bool
    {
        foreach ($value as $item) {
            if (is_string($item) && preg_match('/\Adata:(image|video)\//i', $item)) {
                return true;
            }
            if (is_array($item) && $this->containsInlineMedia($item)) {
                return true;
            }
        }

        return false;
    }
}
