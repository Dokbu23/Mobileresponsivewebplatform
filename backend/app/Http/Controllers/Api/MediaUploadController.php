<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MediaUploadService;
use Illuminate\Http\Request;
use RuntimeException;
use Illuminate\Support\Facades\Log;

class MediaUploadController extends Controller
{
    private $uploads;

    public function __construct(MediaUploadService $uploads)
    {
        $this->uploads = $uploads;
    }

    public function initiate(Request $request)
    {
        $data = $request->validate([
            'filename' => 'required|string|max:255',
            'file_size' => 'required|integer|min:1|max:' . config('uploads.max_file_size_bytes'),
            'fingerprint' => 'required|string|size:128|regex:/\\A[0-9a-f]{128}\\z/i',
            'upload_id' => 'nullable|uuid',
            'operation_key' => 'nullable|uuid',
        ]);

        $filename = trim(basename(str_replace('\\', '/', $data['filename'])));
        if ($filename === '' || $filename === '.' || $filename === '..') {
            return response()->json(['message' => 'A valid file name is required.'], 422);
        }

        try {
            return response()->json($this->uploads->initiate(
                (int) $request->user()->id,
                $filename,
                (int) $data['file_size'],
                strtolower($data['fingerprint']),
                $data['upload_id'] ?? null,
                $data['operation_key'] ?? null
            ));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function storeChunk(Request $request, string $uploadId, int $index)
    {
        $contentLength = (int) $request->server('CONTENT_LENGTH', 0);
        if ($contentLength < 1 || $contentLength > config('uploads.chunk_size_bytes')) {
            return response()->json(['message' => 'The upload chunk exceeds the allowed size.'], 413);
        }

        try {
            return response()->json($this->uploads->storeChunk(
                (int) $request->user()->id,
                $uploadId,
                $index,
                $request->getContent()
            ));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function complete(Request $request, string $uploadId)
    {
        try {
            set_time_limit(config('uploads.finalize_timeout_seconds'));
            return response()->json($this->uploads->complete((int) $request->user()->id, $uploadId));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        } catch (\Throwable $exception) {
            Log::error('Media upload finalization failed', [
                'user_id' => $request->user()->id,
                'upload_id' => $uploadId,
                'error' => $exception->getMessage(),
            ]);

            return response()->json(['message' => 'The uploaded media could not be finalized. Please retry.'], 500);
        }
    }

    public function cancel(Request $request, string $uploadId)
    {
        try {
            $this->uploads->cancel((int) $request->user()->id, $uploadId);
            return response()->json(['success' => true]);
        } catch (\Throwable $exception) {
            Log::error('Media upload cancellation failed', [
                'user_id' => $request->user()->id,
                'upload_id' => $uploadId,
                'error' => $exception->getMessage(),
            ]);

            return response()->json(['message' => 'The incomplete upload could not be removed.'], 500);
        }
    }

    public function cleanupOperation(Request $request)
    {
        $data = $request->validate([
            'operation_key' => 'required|uuid',
        ]);
        $this->uploads->cleanupOperationUploads(
            (int) $request->user()->id,
            $data['operation_key']
        );

        return response()->json(['success' => true]);
    }

}
