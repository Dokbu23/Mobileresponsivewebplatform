<?php

use App\Models\Accommodation;
use App\Models\User;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = User::where('email', 'allstarxw@gmail.com')
    ->where('role', 'resort')
    ->first();

if (!$user) {
    fwrite(STDERR, "Resort user not found.\n");
    exit(1);
}

$query = Accommodation::where('user_id', $user->id)
    ->whereIn('name', ['Nel Travelers Inn', 'Nel-Travellers Inn'])
    ->where(function ($q) {
        $q->whereNull('image')
          ->orWhere('image', '');
    });

$count = $query->count();
$query->delete();

echo "Deleted: {$count}\n";
