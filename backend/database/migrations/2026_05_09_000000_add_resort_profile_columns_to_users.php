<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddResortProfileColumnsToUsers extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('resort_name', 255)->nullable()->after('description');
            $table->text('resort_description')->nullable()->after('resort_name');
            $table->decimal('resort_price_per_night', 10, 2)->nullable()->after('resort_description');
            $table->json('resort_images')->nullable()->after('resort_price_per_night');
            $table->json('resort_amenities')->nullable()->after('resort_images');
            $table->text('resort_facilities')->nullable()->after('resort_amenities');
            $table->text('resort_policies')->nullable()->after('resort_facilities');
            $table->boolean('resort_is_setup')->default(false)->after('resort_policies');
            
            // Add index for performance
            $table->index(['role', 'resort_is_setup', 'listing_status'], 'idx_resort_profile_lookup');
        });
        
        // Note: CHECK constraint for resort_price_per_night > 0 is not enforced in MySQL 5.7
        // Validation must be done at the application level (Laravel validation rules)
        // For MySQL 8.0.16+, uncomment the following line:
        // DB::statement('ALTER TABLE users ADD CONSTRAINT chk_resort_price_positive CHECK (resort_price_per_night IS NULL OR resort_price_per_night > 0)');
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_resort_profile_lookup');
            $table->dropColumn([
                'resort_name',
                'resort_description',
                'resort_price_per_night',
                'resort_images',
                'resort_amenities',
                'resort_facilities',
                'resort_policies',
                'resort_is_setup'
            ]);
        });
    }
}
