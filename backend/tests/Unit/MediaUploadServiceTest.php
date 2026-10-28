<?php

namespace Tests\Unit;

use App\Services\MediaUploadService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class MediaUploadServiceTest extends TestCase
{
    private $service;
    private $png;

    protected function setUp(): void
    {
        parent::setUp();
        if (!extension_loaded('pdo_sqlite')) {
            $this->markTestSkipped('Media upload tests require the PDO SQLite extension.');
        }

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'uploads.user_quota_bytes' => 3 * 1024 * 1024 * 1024,
        ]);
        DB::purge('sqlite');
        Storage::fake('local');
        Storage::fake('public');
        Schema::connection('sqlite')->create('media_assets', function ($table) {
            $table->id();
            $table->uuid('upload_id')->unique();
            $table->unsignedBigInteger('user_id');
            $table->uuid('operation_key')->nullable();
            $table->string('storage_path')->unique();
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->char('sha256', 64);
            $table->timestamps();
        });
        $this->service = new MediaUploadService();
        $this->png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=');
    }

    public function test_it_preserves_original_bytes_and_returns_a_checksum(): void
    {
        $uploadId = '8c2a7df4-cb39-4ab2-a9ae-55dd3ea5ce3e';
        $this->service->initiate(27, 'camera-shot.png', strlen($this->png), str_repeat('a', 128), $uploadId);

        $this->service->storeChunk(27, $uploadId, 0, $this->png);
        $result = $this->service->complete(27, $uploadId);

        $this->assertSame('/storage/originals/27/' . $uploadId . '.png', $result['url']);
        $this->assertSame(hash('sha256', $this->png), $result['sha256']);
        $this->assertSame($this->png, Storage::disk('public')->get("originals/27/{$uploadId}.png"));
        $this->assertDatabaseHas('media_assets', [
            'upload_id' => $uploadId,
            'storage_path' => "originals/27/{$uploadId}.png",
            'mime_type' => 'image/png',
            'size_bytes' => strlen($this->png),
            'sha256' => hash('sha256', $this->png),
        ]);
        $this->service->complete(27, $uploadId);
        $this->assertDatabaseCount('media_assets', 1);
    }

    public function test_it_rejects_unknown_file_signatures(): void
    {
        $uploadId = '8c2a7df4-cb39-4ab2-a9ae-55dd3ea5ce3e';
        $contents = '<?php echo "not media";';
        $this->service->initiate(27, 'payload.jpg', strlen($contents), str_repeat('b', 128), $uploadId);
        $this->service->storeChunk(27, $uploadId, 0, $contents);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('This file type is not supported');
        $this->service->complete(27, $uploadId);
    }

    public function test_it_rejects_chunks_with_the_wrong_size(): void
    {
        $uploadId = '8c2a7df4-cb39-4ab2-a9ae-55dd3ea5ce3e';
        $this->service->initiate(27, 'camera-shot.png', strlen($this->png), str_repeat('c', 128), $uploadId);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('invalid size');
        $this->service->storeChunk(27, $uploadId, 0, substr($this->png, 1));
    }

    public function test_it_applies_separate_image_and_video_size_limits(): void
    {
        try {
            $this->service->initiate(
                27,
                'large-image.jpg',
                config('uploads.max_image_size_bytes') + 1,
                str_repeat('d', 128)
            );
            $this->fail('An image above the configured image limit was accepted.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('size limit', $exception->getMessage());
        }

        $result = $this->service->initiate(
            27,
            'camera-video.mp4',
            config('uploads.max_video_size_bytes'),
            str_repeat('e', 128)
        );
        $this->assertSame('uploading', $result['status']);

        try {
            $this->service->initiate(
                27,
                'large-video.mp4',
                config('uploads.max_video_size_bytes') + 1,
                str_repeat('f', 128)
            );
            $this->fail('A video above the configured video limit was accepted.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('size limit', $exception->getMessage());
        }
    }

    public function test_it_accepts_only_owned_staged_image_references(): void
    {
        Storage::disk('public')->put('originals/27/photo.png', $this->png);

        MediaUploadService::assertOwnedImageReferences(['/storage/originals/27/photo.png'], 27);

        try {
            MediaUploadService::assertOwnedImageReferences(['/storage/originals/28/photo.png'], 27);
            $this->fail('A staged image owned by another account was accepted.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }
    }

    public function test_it_enforces_combined_size_and_image_count_for_staged_images(): void
    {
        Storage::disk('public')->put('originals/27/first.png', $this->png);
        Storage::disk('public')->put('originals/27/second.png', $this->png);
        config(['uploads.max_combined_image_size_bytes' => strlen($this->png)]);

        try {
            MediaUploadService::assertOwnedImageReferences([
                '/storage/originals/27/first.png',
                '/storage/originals/27/second.png',
            ], 27);
            $this->fail('A staged image batch above the combined limit was accepted.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }

        config([
            'uploads.max_combined_image_size_bytes' => 50 * 1024 * 1024,
            'uploads.max_images_per_submission' => 1,
        ]);

        try {
            MediaUploadService::assertOwnedImageReferences([
                '/storage/originals/27/first.png',
                '/storage/originals/27/second.png',
            ], 27);
            $this->fail('A staged image batch above the image-count limit was accepted.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }
    }
}
