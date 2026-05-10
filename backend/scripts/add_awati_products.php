<?php

use App\Models\Product;
use App\Models\User;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = User::where('email', 'xsensei52@gmail.com')
    ->where('role', 'enterprise')
    ->first();

if (!$user) {
    fwrite(STDERR, "Enterprise user not found.\n");
    exit(1);
}

$basePath = '/drive-download-20260416T051436Z-3-001/product_awati';

$items = [
    [
        'name' => 'Ammonite Souvenir Keychain',
        'price' => 250,
        'image' => $basePath . '/Ammonite Souvenir Keychain.webp',
    ],
    [
        'name' => 'Bamboo Crafts',
        'price' => 350,
        'image' => $basePath . '/bamboo_crafts.jpg',
    ],
    [
        'name' => 'Beaded Bracelet',
        'price' => 200,
        'image' => $basePath . '/Beaded-Bracelet.webp',
    ],
    [
        'name' => 'Handwoven Baskets',
        'price' => 600,
        'image' => $basePath . '/handwoven-baskets-linda-phelps.jpg',
    ],
    [
        'name' => 'Mangyan Woven Bag',
        'price' => 750,
        'image' => $basePath . '/Mangyan Woven Bag.jpg',
    ],
    [
        'name' => 'Woven Mat',
        'price' => 500,
        'image' => $basePath . '/woven_mat.jpg',
    ],
];

foreach ($items as $item) {
    $exists = Product::where('user_id', $user->id)
        ->whereRaw('LOWER(name) = ?', [mb_strtolower($item['name'])])
        ->exists();

    if ($exists) {
        echo "Skip (exists): {$item['name']}\n";
        continue;
    }

    Product::create([
        'user_id' => $user->id,
        'is_registered' => true,
        'name' => $item['name'],
        'description' => 'Handcrafted local product from Mansalay.',
        'price' => $item['price'],
        'stock' => 20,
        'image' => $item['image'],
        'category' => 'Handicraft',
    ]);

    echo "Added: {$item['name']}\n";
}
