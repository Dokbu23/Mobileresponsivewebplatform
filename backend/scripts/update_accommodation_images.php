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

$basePath = '/drive-download-20260416T051436Z-3-001/ACCOMMODATIONS';

$map = [
    'Nel Travelers Inn' => $basePath . '/nel travellers inn.jpg',
    "Carishiela's Lodging House" => $basePath . '/carishiela lodging house.jpg',
    'Mansalay Food House and Lodging' => $basePath . '/mansalay food house and lodging.jpg',
];

foreach ($map as $name => $imagePath) {
    $updated = Accommodation::where('user_id', $user->id)
        ->where('name', $name)
        ->update(['image' => $imagePath]);

    echo "Updated {$name}: {$updated}\n";
}
