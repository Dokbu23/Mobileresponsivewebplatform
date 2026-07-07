<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTokenBlacklistTable extends Migration
{
    /**
     * SECURITY: Token Blacklist for JWT Logout
     * 
     * WHY: JWT tokens are stateless, so we need to track revoked tokens
     *      When user logs out, add token to blacklist
     *      When validating token, check if it's blacklisted
     * 
     * FEATURES:
     * - Store revoked tokens
     * - Auto-cleanup expired tokens
     * - Fast lookup with indexed token hash
     */
    public function up()
    {
        Schema::create('token_blacklist', function (Blueprint $table) {
            $table->id();
            $table->string('token_hash', 64)->unique(); // SHA-256 hash of token (security: don't store raw tokens)
            $table->unsignedBigInteger('user_id')->nullable(); // User who owned the token
            $table->timestamp('expires_at'); // When the token expires (for cleanup)
            $table->timestamp('blacklisted_at'); // When it was blacklisted
            $table->string('reason', 100)->nullable(); // Why: logout, forced_logout, security_breach
            
            // Indexes for fast lookup
            $table->index('token_hash');
            $table->index('expires_at'); // For cleanup queries
            $table->index('user_id'); // For user-specific queries
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('token_blacklist');
    }
}
