<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotificationsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // recipient
            // type: order_new, order_status, booking_new, booking_status,
            //       payment_submitted, payment_verified, subscription_paid,
            //       review_received, message_received, user_registered
            $table->string('type');
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable(); // reference ids (order_id, booking_id, etc)
            $table->string('link')->nullable(); // frontend URL to navigate to
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_read']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('notifications');
    }
}
