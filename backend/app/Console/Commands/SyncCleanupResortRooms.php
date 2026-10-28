<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ResortRoom;
use App\Models\EnterprisePost;
use App\Models\Product;
use Illuminate\Support\Facades\Schema;

class SyncCleanupResortRooms extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rooms:sync-cleanup {--force : Force delete orphaned rooms without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up orphaned or unsynchronized resort rooms and products';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Starting Resort Rooms and Products synchronization cleanup...');

        if (!Schema::hasTable('resort_rooms')) {
            $this->warn('Table resort_rooms does not exist.');
            return 0;
        }

        $allRooms = ResortRoom::all();
        $deletedCount = 0;
        $disabledCount = 0;
        $activeCount = 0;

        foreach ($allRooms as $room) {
            $isPostRoom = (!empty($room->image) && str_contains($room->image, '/storage/resort/posts/')) ||
                          (!empty($room->images) && is_array($room->images) && collect($room->images)->contains(fn($img) => str_contains((string)$img, '/storage/resort/posts/')));

            if ($isPostRoom && Schema::hasTable('enterprise_posts')) {
                $matchingPost = EnterprisePost::where('user_id', $room->user_id)
                    ->where(function($q) use ($room) {
                        $q->where('product_name', $room->name);
                        if (!empty($room->image)) {
                            $q->orWhere('image', $room->image);
                        }
                    })
                    ->first();

                if (!$matchingPost) {
                    $this->line("Deleting orphaned room #{$room->id} ('{$room->name}') - underlying post was deleted.");
                    $room->delete();
                    $deletedCount++;
                } elseif ($matchingPost->status !== 'approved' || !empty($matchingPost->archived_at)) {
                    $this->line("Disabling room #{$room->id} ('{$room->name}') - underlying post is {$matchingPost->status}.");
                    $room->update(['is_available' => false]);
                    $disabledCount++;
                } else {
                    $room->update(['is_available' => true]);
                    $activeCount++;
                }
            } else {
                $activeCount++;
            }
        }

        // Clean up orphaned products
        $orphanedProducts = 0;
        if (Schema::hasTable('products') && Schema::hasTable('enterprise_posts')) {
            $productsWithPost = Product::whereNotNull('post_id')->get();
            foreach ($productsWithPost as $prod) {
                $post = EnterprisePost::find($prod->post_id);
                if (!$post) {
                    $this->line("Deleting orphaned product #{$prod->id} ('{$prod->name}') - post #{$prod->post_id} was deleted.");
                    $prod->delete();
                    $orphanedProducts++;
                } elseif ($post->status !== 'approved') {
                    $prod->update(['status' => $post->status]);
                }
            }
        }

        $this->info("Synchronization complete!");
        $this->info("Orphaned rooms deleted: {$deletedCount}");
        $this->info("Rooms disabled: {$disabledCount}");
        $this->info("Orphaned products deleted: {$orphanedProducts}");

        return 0;
    }
}
