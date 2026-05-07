<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePaymentReceiptsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('payment_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // 'order' or 'booking'
            $table->unsignedBigInteger('reference_id'); // order_id or booking_id
            $table->unsignedBigInteger('tourist_id');
            $table->unsignedBigInteger('business_id'); // enterprise or resort user_id
            $table->string('receipt_image');
            $table->decimal('amount', 10, 2);
            $table->string('payment_method'); // gcash, paymaya, bank_account
            $table->string('payment_reference')->nullable();
            $table->enum('status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->foreign('tourist_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('business_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('payment_receipts');
    }
}
