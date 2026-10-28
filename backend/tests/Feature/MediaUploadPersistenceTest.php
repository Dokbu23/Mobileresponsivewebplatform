<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Services\LegacyResortMigrationService;
use App\Services\MediaUploadService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class MediaUploadPersistenceTest extends TestCase
{
    private $uploads;
    private $png;

    protected function setUp(): void
    {
        parent::setUp();

        if (!extension_loaded('pdo_sqlite')) {
            $this->markTestSkipped('Media persistence tests require the PDO SQLite extension.');
        }

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'uploads.user_quota_bytes' => 3 * 1024 * 1024 * 1024,
        ]);
        DB::purge('sqlite');
        Storage::fake('local');
        Storage::fake('public');
        Schema::connection('sqlite')->create('accommodations', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->boolean('is_registered')->default(false);
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->json('images')->nullable();
            $table->string('video')->nullable();
            $table->decimal('price_per_night', 10, 2)->default(0);
            $table->timestamps();
        });
        Schema::connection('sqlite')->create('legacy_resort_migrations', function ($table) {
            $table->id();
            $table->uuid('migration_key')->unique();
            $table->unsignedBigInteger('accommodation_id');
            $table->timestamps();
        });
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

        $this->uploads = new MediaUploadService();
        $this->png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII='
        );
    }

    public function test_image_upload_finishes_before_the_media_record_is_saved(): void
    {
        [$url] = $this->createPermanentUpload();

        $accommodation = Accommodation::create([
            'name' => 'Processed image resort',
            'image' => $url,
        ]);

        $this->assertSame($url, $accommodation->fresh()->image);
        $this->assertTrue(Storage::disk('public')->exists(substr($url, strlen('/storage/'))));
        $this->assertDatabaseHas('media_assets', [
            'storage_path' => substr($url, strlen('/storage/')),
            'mime_type' => 'image/png',
            'size_bytes' => strlen($this->png),
            'sha256' => hash('sha256', $this->png),
        ]);
    }

    public function test_database_failure_removes_a_new_unreferenced_permanent_file(): void
    {
        [$url, $operationKey] = $this->createPermanentUpload();
        $storagePath = substr($url, strlen('/storage/'));

        try {
            DB::transaction(function () {
                Accommodation::create(['name' => 'Failed resort publish']);
                throw new RuntimeException('Controlled persistence failure.');
            });
        } catch (RuntimeException $exception) {
            $this->uploads->cleanupOperationUploads(27, $operationKey);
        }

        $this->assertSame(0, Accommodation::count());
        $this->assertFalse(Storage::disk('public')->exists($storagePath));
        $this->assertDatabaseMissing('media_assets', ['storage_path' => $storagePath]);
    }

    public function test_cleanup_does_not_remove_existing_or_referenced_media(): void
    {
        $existing = 'accommodations/previously-published.jpg';
        Storage::disk('public')->put($existing, $this->png);
        [$url, $operationKey] = $this->createPermanentUpload();
        $storagePath = substr($url, strlen('/storage/'));

        Accommodation::create([
            'name' => 'Another resort',
            'image' => $url,
        ]);
        $this->uploads->cleanupOperationUploads(27, $operationKey);

        $this->assertTrue(Storage::disk('public')->exists($existing));
        $this->assertTrue(Storage::disk('public')->exists($storagePath));
        $this->assertDatabaseHas('media_assets', ['storage_path' => $storagePath]);
    }

    public function test_failed_update_preserves_previous_media_and_rolls_back_record_changes(): void
    {
        $previousPath = 'accommodations/previous-cover.jpg';
        Storage::disk('public')->put($previousPath, $this->png);
        $previousUrl = '/storage/' . $previousPath;
        $resort = Accommodation::create([
            'name' => 'Existing resort',
            'image' => $previousUrl,
        ]);
        [$newUrl, $operationKey] = $this->createPermanentUpload();

        try {
            DB::transaction(function () use ($resort, $newUrl) {
                $resort->update(['image' => $newUrl]);
                throw new RuntimeException('Controlled update failure.');
            });
        } catch (RuntimeException $exception) {
            $this->uploads->cleanupOperationUploads(27, $operationKey);
        }

        $this->assertSame($previousUrl, $resort->fresh()->image);
        $this->assertTrue(Storage::disk('public')->exists($previousPath));
        $this->assertFalse(Storage::disk('public')->exists(substr($newUrl, strlen('/storage/'))));
    }

    public function test_processing_failure_removes_the_assembled_temporary_file(): void
    {
        $uploadId = 'c49b71fb-b7d1-4aeb-8e90-2ea30580c12d';
        $this->uploads->initiate(27, 'invalid.png', 9, str_repeat('a', 128), $uploadId);
        $this->uploads->storeChunk(27, $uploadId, 0, 'not-image');

        try {
            $this->uploads->complete(27, $uploadId);
            $this->fail('Invalid image bytes unexpectedly completed.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('not supported', $exception->getMessage());
        }

        $this->assertFalse(Storage::disk('local')->exists("media-uploads/27/{$uploadId}/assembled.part"));
        $this->assertFalse(Storage::disk('local')->exists("media-uploads/27/{$uploadId}/chunk-0.part"));
    }

    public function test_cleanup_reference_check_failure_is_logged_and_retryable(): void
    {
        [$url, $operationKey] = $this->createPermanentUpload();
        $storagePath = substr($url, strlen('/storage/'));

        Log::shouldReceive('error')
            ->once()
            ->with('Media reference check failed; retaining media for safety', Mockery::type('array'));
        config(['database.connections.sqlite.database' => '/missing-parent/media-cleanup-test.sqlite']);
        DB::purge('sqlite');
        $this->uploads->cleanupOperationUploads(27, $operationKey);
        $this->assertTrue(Storage::disk('public')->exists($storagePath));

        config(['database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');
        Schema::connection('sqlite')->create('accommodations', function ($table) {
            $table->id();
            $table->string('name');
            $table->string('image')->nullable();
            $table->json('images')->nullable();
            $table->string('video')->nullable();
        });
        $this->uploads->cleanupOperationUploads(27, $operationKey);
        $this->assertFalse(Storage::disk('public')->exists($storagePath));
    }

    public function test_operation_manifests_survive_expiry_until_orphan_reconciliation(): void
    {
        $operationKey = '21a468e0-d20a-4daf-b239-ea2a82de1a2e';
        $uploadId = '9d3e4db6-093c-4e8b-b9f3-88ce9494a230';
        $this->uploads->initiate(27, 'retry.png', strlen($this->png), str_repeat('b', 128), $uploadId, $operationKey);
        $this->uploads->storeChunk(27, $uploadId, 0, $this->png);
        $this->uploads->complete(27, $uploadId);

        \Illuminate\Support\Carbon::setTestNow(now()->addHours(25));
        $this->uploads->removeExpiredUploads(27);

        $resumed = $this->uploads->initiate(
            27,
            'retry.png',
            strlen($this->png),
            str_repeat('b', 128),
            $uploadId,
            $operationKey
        );
        \Illuminate\Support\Carbon::setTestNow();

        $this->assertSame('complete', $resumed['status']);
        $this->assertNotNull($resumed['url']);
    }

    public function test_legacy_migration_retry_does_not_create_duplicate_accommodations(): void
    {
        $migrationKey = '12bcd1ab-d61c-4cff-9473-720634d1647a';
        $migrations = new LegacyResortMigrationService($this->uploads);
        $record = ['name' => 'Idempotent legacy resort', 'description' => 'Retained'];

        $first = $migrations->migrate(27, $migrationKey, $record);
        $retry = $migrations->migrate(27, $migrationKey, [
            'name' => 'Idempotent legacy resort',
            'description' => 'Updated safely on retry',
        ]);

        $this->assertSame($first->id, $retry->id);
        $this->assertSame(1, Accommodation::count());
        $this->assertSame('Updated safely on retry', $retry->description);
    }

    private function createPermanentUpload(): array
    {
        $uploadId = (string) \Illuminate\Support\Str::uuid();
        $operationKey = (string) \Illuminate\Support\Str::uuid();
        $this->uploads->initiate(
            27,
            'published.png',
            strlen($this->png),
            str_repeat('c', 128),
            $uploadId,
            $operationKey
        );
        $this->uploads->storeChunk(27, $uploadId, 0, $this->png);
        $result = $this->uploads->complete(27, $uploadId);

        return [$result['url'], $operationKey];
    }
}
