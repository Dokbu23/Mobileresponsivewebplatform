<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddIndexToUserIdOnEventsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (!$this->hasIndex('events', 'events_user_id_index')) {
            Schema::table('events', function (Blueprint $table) {
                $table->index('user_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if ($this->hasIndex('events', 'events_user_id_index')) {
            Schema::table('events', function (Blueprint $table) {
                $table->dropIndex(['user_id']);
            });
        }
    }

    /**
     * Check if an index exists on a table.
     *
     * @param string $table
     * @param string $index
     * @return bool
     */
    protected function hasIndex(string $table, string $index): bool
    {
        $database = DB::getDatabaseName();
        $result = DB::select(
            'SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1',
            [$database, $table, $index]
        );

        return !empty($result);
    }
}
