<?php

namespace App\Http\Middleware;

use App\Services\MediaUploadService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

class ValidateApiRequest
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $files = $request->allFiles();
        $imageBytes = 0;
        $imageCount = 0;
        array_walk_recursive($files, function ($file) use (&$invalidUpload, &$imageBytes, &$imageCount) {
            if (!$file instanceof UploadedFile) {
                return;
            }

            if (!$file->isValid()) {
                $invalidUpload = 'One of the selected media files did not upload successfully.';
                return;
            }

            $mimeType = $file->getMimeType();
            if (!MediaUploadService::supportsMimeType($mimeType)) {
                $invalidUpload = 'The uploaded file signature is not a supported image or video format.';
                return;
            }

            if (!MediaUploadService::supportsExtension($mimeType, $file->getClientOriginalExtension())) {
                $invalidUpload = 'The uploaded file extension does not match its content.';
                return;
            }

            if ($file->getSize() > MediaUploadService::maxFileSizeBytesForMimeType($mimeType)) {
                $limitMb = strpos($mimeType, 'video/') === 0
                    ? config('uploads.max_video_size_mb')
                    : config('uploads.max_image_size_mb');
                $invalidUpload = strpos($mimeType, 'video/') === 0
                    ? "Video exceeds the configured {$limitMb} MB upload limit."
                    : "Image exceeds the configured {$limitMb} MB upload limit.";
            }

            if (strpos($mimeType, 'image/') === 0) {
                $imageBytes += (int) $file->getSize();
                $imageCount++;
            }
        });

        if (isset($invalidUpload)) {
            return response()->json(['message' => $invalidUpload], 422);
        }

        if ($imageCount > config('uploads.max_images_per_submission')) {
            return response()->json([
                'message' => 'A submission may contain no more than 20 images.',
            ], 422);
        }

        if ($imageBytes > config('uploads.max_combined_image_size_bytes')) {
            return response()->json([
                'message' => 'The combined image size exceeds the 50 MiB limit.',
            ], 422);
        }

        if ($this->containsInlineMedia($request->all())) {
            return response()->json([
                'message' => 'Inline Base64 image and video data is not accepted. Upload media separately and send its server path.',
            ], 422);
        }

        // Validate Content-Type for POST/PUT/PATCH requests
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            $contentType = (string) ($request->header('Content-Type') ?? '');
            
            $isMediaChunk = $request->is('api/media/uploads/*/chunks/*')
                && str_contains($contentType, 'application/octet-stream');

            // Raw binary bodies are accepted only by the authenticated media chunk endpoint.
            if ($contentType !== '' &&
                !str_contains($contentType, 'application/json') && 
                !str_contains($contentType, 'multipart/form-data') &&
                !str_contains($contentType, 'application/x-www-form-urlencoded') &&
                !$isMediaChunk) {
                
                return response()->json([
                    'error' => 'Invalid Content-Type',
                    'message' => 'Content-Type must be application/json, multipart/form-data, or application/x-www-form-urlencoded'
                ], 400);
            }
        }

        $maxSize = config('uploads.max_file_size_bytes') + 10 * 1024 * 1024;
        if ($request->server('CONTENT_LENGTH') > $maxSize) {
            $limitMb = max(config('uploads.max_image_size_mb'), config('uploads.max_video_size_mb'));
            return response()->json([
                'error' => 'Request too large',
                'message' => "Request size exceeds the configured {$limitMb} MB media request limit."
            ], 413);
        }

        // Sanitize input data
        $this->sanitizeInput($request);

        return $next($request);
    }

    /**
     * Sanitize input data to prevent XSS and injection attacks.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return void
     */
    protected function sanitizeInput(Request $request)
    {
        $input = $request->all();
        
        array_walk_recursive($input, function (&$value) {
            if (is_string($value)) {
                // Remove potentially dangerous HTML tags while keeping natural characters like &, ', "
                $value = strip_tags($value);
            }
        });

        $request->merge($input);
    }

    private function containsInlineMedia(array $input): bool
    {
        foreach ($input as $value) {
            if (is_string($value) && preg_match('/\Adata:(image|video)\//i', $value)) {
                return true;
            }
            if (is_array($value) && $this->containsInlineMedia($value)) {
                return true;
            }
        }

        return false;
    }
}