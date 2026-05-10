<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSubscriptionToUsers extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('subscription_status', 20)->default('unpaid')->after('listing_status');
            $table->timestamp('subscription_paid_at')->nullable()->after('subscription_status');
            $table->timestamp('subscription_expires_at')->nullable()->after('subscription_paid_at');
            $table->decimal('subscription_amount', 10, 2)->nullable()->after('subscription_expires_at');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'subscription_status',
                'subscription_paid_at',
                'subscription_expires_at',
                'subscription_amount'
            ]);
        });
    }
}
