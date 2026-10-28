<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'shop_name')) {
            Schema::table('products', function (Blueprint $table) {
                $table->string('shop_name')->nullable()->after('category');
            });
        }

        DB::table('products')
            ->where(function ($query) {
                $query->whereNull('shop_name')->orWhere('shop_name', '');
            })
            ->orderBy('id')
            ->chunkById(100, function ($products): void {
                foreach ($products as $product) {
                    $shopName = DB::table('users')
                        ->where('id', $product->user_id)
                        ->value('store_name');

                    if (!$shopName) {
                        $shopName = DB::table('users')
                            ->where('id', $product->user_id)
                            ->value('resort_name');
                    }

                    if (!$shopName && $product->post_id) {
                        $shopName = DB::table('enterprise_posts')
                            ->where('id', $product->post_id)
                            ->value('seller_name');
                    }

                    if ($shopName) {
                        DB::table('products')
                            ->where('id', $product->id)
                            ->update(['shop_name' => $shopName]);
                    }
                }
            });
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'shop_name')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('shop_name');
            });
        }
    }
};
