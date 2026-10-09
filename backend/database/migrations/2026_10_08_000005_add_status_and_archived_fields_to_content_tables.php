<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddStatusAndArchivedFieldsToContentTables extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds status, previous_status, and archived_at across all content tables:
     * - accommodations
     * - products
     * - attractions
     * - events
     * - culture_arts
     * - histories
     * - enterprise_posts
     *
     * @return void
     */
    public function up()
    {
        // 1. Accommodations
        if (Schema::hasTable('accommodations')) {
            Schema::table('accommodations', function (Blueprint $table) {
                if (!Schema::hasColumn('accommodations', 'status')) {
                    $table->string('status', 30)->default('approved')->index()->after('category');
                }
                if (!Schema::hasColumn('accommodations', 'previous_status')) {
                    $table->string('previous_status', 30)->nullable()->after('status');
                }
                if (!Schema::hasColumn('accommodations', 'archived_at')) {
                    $table->timestamp('archived_at')->nullable()->after('previous_status');
                }
            });
        }

        // 2. Products
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (!Schema::hasColumn('products', 'status')) {
                    $table->string('status', 30)->default('approved')->index()->after('category');
                }
                if (!Schema::hasColumn('products', 'previous_status')) {
                    $table->string('previous_status', 30)->nullable()->after('status');
                }
                if (!Schema::hasColumn('products', 'archived_at')) {
                    $table->timestamp('archived_at')->nullable()->after('previous_status');
                }
            });
        }

        // 3. Attractions
        if (Schema::hasTable('attractions')) {
            Schema::table('attractions', function (Blueprint $table) {
                if (!Schema::hasColumn('attractions', 'status')) {
                    $table->string('status', 30)->default('approved')->index()->after('category');
                }
                if (!Schema::hasColumn('attractions', 'previous_status')) {
                    $table->string('previous_status', 30)->nullable()->after('status');
                }
                if (!Schema::hasColumn('attractions', 'archived_at')) {
                    $table->timestamp('archived_at')->nullable()->after('previous_status');
                }
            });
        }

        // 4. Events
        if (Schema::hasTable('events')) {
            Schema::table('events', function (Blueprint $table) {
                if (!Schema::hasColumn('events', 'status')) {
                    $table->string('status', 30)->default('approved')->index()->after('category');
                }
                if (!Schema::hasColumn('events', 'previous_status')) {
                    $table->string('previous_status', 30)->nullable()->after('status');
                }
                if (!Schema::hasColumn('events', 'archived_at')) {
                    $table->timestamp('archived_at')->nullable()->after('previous_status');
                }
            });
        }

        // 5. Culture & Arts
        if (Schema::hasTable('culture_arts')) {
            Schema::table('culture_arts', function (Blueprint $table) {
                if (!Schema::hasColumn('culture_arts', 'previous_status')) {
                    $table->string('previous_status', 30)->nullable()->after('status');
                }
                if (!Schema::hasColumn('culture_arts', 'archived_at')) {
                    $table->timestamp('archived_at')->nullable()->after('previous_status');
                }
            });
        }

        // 6. Histories
        if (Schema::hasTable('histories')) {
            Schema::table('histories', function (Blueprint $table) {
                if (!Schema::hasColumn('histories', 'previous_status')) {
                    $table->string('previous_status', 30)->nullable()->after('status');
                }
                if (!Schema::hasColumn('histories', 'archived_at')) {
                    $table->timestamp('archived_at')->nullable()->after('previous_status');
                }
            });
        }

        // 7. Enterprise Posts
        if (Schema::hasTable('enterprise_posts')) {
            Schema::table('enterprise_posts', function (Blueprint $table) {
                if (!Schema::hasColumn('enterprise_posts', 'previous_status')) {
                    $table->string('previous_status', 30)->nullable()->after('status');
                }
                if (!Schema::hasColumn('enterprise_posts', 'archived_at')) {
                    $table->timestamp('archived_at')->nullable()->after('previous_status');
                }
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
        $tables = ['accommodations', 'products', 'attractions', 'events', 'culture_arts', 'histories', 'enterprise_posts'];
        foreach ($tables as $tbl) {
            if (Schema::hasTable($tbl)) {
                Schema::table($tbl, function (Blueprint $table) use ($tbl) {
                    if (in_array($tbl, ['accommodations', 'products', 'attractions', 'events']) && Schema::hasColumn($tbl, 'status')) {
                        $table->dropColumn('status');
                    }
                    if (Schema::hasColumn($tbl, 'previous_status')) {
                        $table->dropColumn('previous_status');
                    }
                    if (Schema::hasColumn($tbl, 'archived_at')) {
                        $table->dropColumn('archived_at');
                    }
                });
            }
        }
    }
}
