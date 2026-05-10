<?php

use App\Models\Accommodation;
use App\Models\User;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$email = 'allstarxw@gmail.com';

$user = User::where('email', $email)->where('role', 'resort')->first();
if (!$user) {
    fwrite(STDERR, "Resort user not found for email: {$email}\n");
    exit(1);
}

$items = [
    [
        'name' => 'Nel Travelers Inn',
        'price_per_night' => 2000,
        'description' => "Nel Travelers Inn offers simple and budget-friendly accommodations ideal for backpackers and budget travelers. The inn provides a comfortable place to stay for visitors exploring Mansalay and nearby attractions. It is perfect for travelers looking for affordable and convenient lodging.\n\nAddress: B. del Mundo, Mansalay, Oriental Mindoro\nEmail: neliafrondagajisan@gmail.com",
    ],
    [
        'name' => "Carishiela's Lodging House",
        'price_per_night' => 2500,
        'description' => "Carishiela's Lodging House provides affordable accommodations with basic amenities for travelers visiting Mansalay. It offers a simple, clean, and comfortable place to stay within the town proper. Ideal for budget travelers and short stays.\n\nAddress: Poblacion, Mansalay, Oriental Mindoro\nPhone: 0917-327-2809\nEmail: carishiellaslodginghouse@gmail.com",
    ],
    [
        'name' => 'Mansalay Food House and Lodging',
        'price_per_night' => 3000,
        'description' => "Mansalay Food House and Lodging offers both dining and accommodation services in one convenient location. Guests can enjoy affordable meals and comfortable rooms during their stay in Mansalay. It is ideal for travelers looking for a practical and budget-friendly place to eat and stay.\n\nAddress: Poblacion, Mansalay, Oriental Mindoro\nPhone: 0929-794-7108\nEmail: mangyancuboolculturalboothoflove@gmail.com",
    ],
];

foreach ($items as $item) {
    $exists = Accommodation::where('user_id', $user->id)
        ->whereRaw('LOWER(name) = ?', [mb_strtolower($item['name'])])
        ->exists();

    if ($exists) {
        echo "Skip (exists): {$item['name']}\n";
        continue;
    }

    Accommodation::create([
        'user_id' => $user->id,
        'is_registered' => true,
        'name' => $item['name'],
        'description' => $item['description'],
        'price_per_night' => $item['price_per_night'],
        'image' => '',
        'availability' => [],
    ]);

    echo "Added: {$item['name']}\n";
}
