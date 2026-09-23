<?php
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$p = \App\Models\EnterprisePost::find(10);
print_r($p ? $p->toArray() : 'not found');
