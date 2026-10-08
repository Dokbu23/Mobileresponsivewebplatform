<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddModerationFieldsToEnterprisePostsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('enterprise_posts', function (Blueprint $table) {
            if (!Schema::hasColumn('enterprise_posts', 'status')) {
                // Default to 'approved' for legacy/existing records so existing posts remain visible
                $table->string('status', 30)->default('approved')->after('type');
            }
            if (!Schema::hasColumn('enterprise_posts', 'approved_by')) {
                $table->unsignedBigInteger('approved_by')->nullable()->after('status');
            }
            if (!Schema::hasColumn('enterprise_posts', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by');
            }
            if (!Schema::hasColumn('enterprise_posts', 'rejected_by')) {
                $table->unsignedBigInteger('rejected_by')->nullable()->after('approved_at');
            }
            if (!Schema::hasColumn('enterprise_posts', 'rejected_at')) {
                $table->timestamp('rejected_at')->nullable()->after('rejected_by');
            }
            if (!Schema::hasColumn('enterprise_posts', 'rejection_remarks')) {
                $table->text('rejection_remarks')->nullable()->after('rejected_at');
            }
            if (!Schema::hasColumn('enterprise_posts', 'moderation_history')) {
                $table->json('moderation_history')->nullable()->after('rejection_remarks');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('enterprise_posts', function (Blueprint $table) {
            $columnsToDrop = [
                'status',
                'approved_by',
                'approved_at',
                'rejected_by',
                'rejected_at',
                'rejection_remarks',
                'moderation_history',
            ];
            foreach ($columnsToDrop as $col) {
                if (Schema::hasColumn('enterprise_posts', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
}
