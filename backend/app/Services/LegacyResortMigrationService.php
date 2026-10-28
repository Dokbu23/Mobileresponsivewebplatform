<?php

namespace App\Services;

use App\Models\Accommodation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class LegacyResortMigrationService
{
    private $mediaUploads;

    public function __construct(MediaUploadService $mediaUploads)
    {
        $this->mediaUploads = $mediaUploads;
    }

    public function migrate(int $userId, string $migrationKey, array $record): Accommodation
    {
        if (!Schema::hasTable('legacy_resort_migrations')) {
            throw new RuntimeException('Run the backend database migrations before migrating legacy resort data.');
        }

        try {
            return DB::transaction(function () use ($userId, $migrationKey, $record) {
                $migration = DB::table('legacy_resort_migrations')
                    ->where('migration_key', $migrationKey)
                    ->lockForUpdate()
                    ->first();

                $imageReferences = array_merge(
                    isset($record['image']) ? [$record['image']] : [],
                    is_array($record['images'] ?? null) ? $record['images'] : []
                );
                MediaUploadService::assertOwnedImageReferences($imageReferences, $userId);
                MediaUploadService::assertOwnedVideoReferences(
                    isset($record['video']) ? [$record['video']] : [],
                    $userId
                );

                $accommodation = $migration
                    ? Accommodation::findOrFail($migration->accommodation_id)
                    : null;
                if (!$accommodation) {
                    $legacyId = filter_var($record['id'] ?? null, FILTER_VALIDATE_INT);
                    $accommodation = $legacyId
                        ? Accommodation::whereKey($legacyId)
                            ->whereNull('user_id')
                            ->where('name', $record['name'])
                            ->first()
                        : null;
                }
                $accommodation = $accommodation ?: new Accommodation();

                $attributes = array_intersect_key($record, array_flip([
                    'name', 'location', 'category', 'type', 'description',
                    'full_description', 'operating_hours', 'contact_number',
                    'facebook', 'instagram', 'website', 'video',
                    'price_per_night', 'image', 'images', 'availability',
                ]));
                $accommodation->fill($attributes);
                $accommodation->user_id = null;
                $accommodation->is_registered = false;
                $accommodation->save();

                if (!$migration) {
                    DB::table('legacy_resort_migrations')->insert([
                        'migration_key' => $migrationKey,
                        'accommodation_id' => $accommodation->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('legacy_resort_migrations')
                        ->where('migration_key', $migrationKey)
                        ->update(['updated_at' => now()]);
                }

                return $accommodation->fresh();
            });
        } catch (\Throwable $exception) {
            $this->mediaUploads->cleanupOperationUploads($userId, $migrationKey);

            try {
                $completedMigration = DB::table('legacy_resort_migrations')
                    ->where('migration_key', $migrationKey)
                    ->first();
                if ($completedMigration) {
                    return Accommodation::findOrFail($completedMigration->accommodation_id);
                }
            } catch (\Throwable $lookupException) {
                Log::warning('Legacy migration retry lookup failed; preserving the original failure', [
                    'user_id' => $userId,
                    'migration_key' => $migrationKey,
                    'error' => $lookupException->getMessage(),
                ]);
            }

            throw $exception;
        }
    }
}
