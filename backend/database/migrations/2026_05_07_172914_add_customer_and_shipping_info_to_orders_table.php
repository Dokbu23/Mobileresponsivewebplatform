<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCustomerAndShippingInfoToOrdersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('customer_id')->nullable()->after('id');
            $table->string('customer_name')->nullable()->after('customer_id');
            $table->string('customer_email')->nullable()->after('customer_name');
            $table->string('customer_phone')->nullable()->after('customer_email');
            
            // Shipping information
            $table->json('shipping_address')->nullable()->after('customer_phone');
            
            // Business owner info (derived from products)
            $table->unsignedBigInteger('business_owner_id')->nullable()->after('shipping_address');
            
            $table->foreign('customer_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('business_owner_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropForeign(['business_owner_id']);
            $table->dropColumn([
                'customer_id',
                'customer_name', 
                'customer_email',
                'customer_phone',
                'shipping_address',
                'business_owner_id'
            ]);
        });
    }
}
