<?php

/**
 * PostgreSQL Compatibility Checker
 * 
 * Run this script before deploying to check if your migrations
 * are compatible with PostgreSQL
 */

echo "🔍 Checking PostgreSQL Compatibility...\n\n";

$issues = [];
$warnings = [];

// Check if PDO PostgreSQL extension is available
if (!extension_loaded('pdo_pgsql')) {
    $issues[] = "❌ PDO PostgreSQL extension not installed";
    echo "❌ PDO PostgreSQL extension: NOT FOUND\n";
} else {
    echo "✅ PDO PostgreSQL extension: INSTALLED\n";
}

// Scan migration files for MySQL-specific syntax
echo "\n🔍 Scanning migration files...\n";

$migrationPath = __DIR__ . '/database/migrations';
$migrationFiles = glob($migrationPath . '/*.php');

foreach ($migrationFiles as $file) {
    $content = file_get_contents($file);
    $filename = basename($file);
    
    // Check for MySQL-specific features
    $mysqlFeatures = [
        'ENGINE=InnoDB' => 'MySQL storage engine syntax',
        'AUTO_INCREMENT' => 'Use $table->id() or $table->bigIncrements() instead',
        'UNSIGNED' => 'Use unsigned() method: $table->integer()->unsigned()',
        'MEDIUMTEXT' => 'Use $table->text() or $table->longText()',
        'TINYINT' => 'Use $table->boolean() or $table->tinyInteger()',
        'DATETIME' => 'Use $table->timestamp() or $table->dateTime()',
        'ENUM' => 'PostgreSQL supports ENUM but prefer $table->string() with validation',
    ];
    
    foreach ($mysqlFeatures as $pattern => $suggestion) {
        if (stripos($content, $pattern) !== false) {
            $warnings[] = "$filename: Contains '$pattern' - $suggestion";
        }
    }
    
    // Check for raw SQL that might be MySQL-specific
    if (preg_match('/DB::statement|DB::unprepared|DB::raw/', $content)) {
        $warnings[] = "$filename: Contains raw SQL - verify PostgreSQL compatibility";
    }
}

// Display results
if (count($warnings) > 0) {
    echo "\n⚠️  WARNINGS (" . count($warnings) . "):\n";
    foreach ($warnings as $warning) {
        echo "   - $warning\n";
    }
}

if (count($issues) > 0) {
    echo "\n❌ CRITICAL ISSUES (" . count($issues) . "):\n";
    foreach ($issues as $issue) {
        echo "   - $issue\n";
    }
    echo "\n🚫 Fix these issues before deploying!\n";
    exit(1);
}

echo "\n✅ PostgreSQL compatibility check passed!\n";
echo "\n📝 Notes:\n";
echo "   - Review warnings above\n";
echo "   - Test migrations locally with PostgreSQL before deploying\n";
echo "   - Backup your MySQL data before migrating\n";
echo "\n🚀 Ready to deploy to Render!\n";
