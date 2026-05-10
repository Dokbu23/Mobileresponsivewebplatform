<?php

use App\Models\Accommodation;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$basePath = '/drive-download-20260416T051436Z-3-001';

$items = [
    [
        'name' => 'La Sersita Casitas & Water Spa Beach Resort',
        'price_per_night' => 4500,
        'image' => $basePath . '/beach and resorts/lasersita casitas.jpg',
        'description' => "La Sersita Casitas & Water Spa Beach Resort offers a relaxing beachfront escape with cozy casitas and refreshing water spa facilities. Guests can enjoy a peaceful seaside atmosphere while experiencing comfort and leisure in one destination. It is an ideal place for rest, relaxation, and small group getaways.\n\nAddress: Don Pedro, Mansalay, Oriental Mindoro\nPhone: 0995 920 5543\nEmail: lasersitacasitas@gmail.com",
    ],
    [
        'name' => 'Sidell Kite and Beach Resort',
        'price_per_night' => 4200,
        'image' => $basePath . '/beach and resorts/sidell kite.jpg',
        'description' => "Sidell Kite and Beach Resort features comfortable beachfront accommodations surrounded by natural scenery and a calm atmosphere. The resort is perfect for those who want to unwind, enjoy the sea breeze, and experience a quiet beach vacation. Its relaxing environment makes it ideal for family and weekend getaways.\n\nAddress: Cabalwa, Mansalay, Oriental Mindoro\nPhone: 0977 059 0960\nEmail: belensidell@gmail.com",
    ],
    [
        'name' => 'Terese by the Sea',
        'price_per_night' => 4000,
        'image' => $basePath . '/beach and resorts/teresa by the sea.png',
        'description' => "Terese by the Sea offers a wide beachfront area with cottages and a function hall perfect for gatherings and special events. Guests can enjoy swimming, beach activities, and relaxing by the shore. The resort is ideal for family outings, team buildings, and celebrations by the sea.",
    ],
    [
        'name' => 'Footprints in the Sand Beach Resort',
        'price_per_night' => 3800,
        'image' => $basePath . '/beach and resorts/footprints.jpg',
        'description' => "Footprints in the Sand Beach Resort provides beachfront accommodations with a romantic and relaxing atmosphere. The soothing sound of the waves and scenic ocean views make it perfect for couples and peaceful retreats. It is a great place to unwind and enjoy the natural beauty of Mansalay’s coastline.\n\nAddress: B. del Mundo, Mansalay, Oriental Mindoro\nEmail: footprintsinthesand085@gmail.com",
    ],
    [
        'name' => 'Go Beach Resort',
        'price_per_night' => 3500,
        'image' => $basePath . '/beach and resorts/go beach resort.jpg',
        'description' => "Go Beach Resort is a simple yet relaxing beachfront destination ideal for day tours and overnight stays. Visitors can enjoy swimming, cottage rentals, and bonding moments by the sea. It is perfect for families and friends looking for an affordable beach getaway.\n\nAddress: Cabalwa, Mansalay, Oriental Mindoro\nPhone: 0935 638 9059\nEmail: buenaventuramaribeth@gmail.com",
    ],
    [
        'name' => 'Mahalta Glamping Resort',
        'price_per_night' => 5200,
        'image' => $basePath . '/beach and resorts/mahalta glamping.jpg',
        'description' => "Mahalta Glamping Resort offers a unique beachfront glamping experience that combines nature and comfort. Guests can enjoy stylish tent accommodations, resort amenities, and scenic coastal views. It is perfect for travelers looking for a relaxing yet unique beach getaway.\n\nAddress: Wasig, Mansalay, Oriental Mindoro\nPhone: 0928 716 9887\nEmail: reservations@mahaltaglamping.com",
    ],
    [
        'name' => 'MB Hiraya Beach Resort',
        'price_per_night' => 4000,
        'image' => $basePath . '/beach and resorts/MB hiraya beach resort.jpg',
        'description' => "MB Hiraya Beach Resort offers affordable overnight stays, day tours, and exclusive rentals for special occasions. Guests can create memorable experiences while enjoying the beach, cottages, and event spaces. It is a great venue for celebrations, reunions, and family vacations.\n\nAddress: Sitio Bingig, Cabalwa, Mansalay, Oriental Mindoro\nPhone: 0936 802 4848\nEmail: mghirayaresort@gmail.com",
    ],
    [
        'name' => 'Mega Buena Beach Resort',
        'price_per_night' => 4800,
        'image' => $basePath . '/beach and resorts/mega buena.jpg',
        'description' => "Mega Buena Beach Resort features overlooking villa rooms, air-conditioned accommodations, and open cottages with scenic sea views. The resort provides a peaceful place to relax while enjoying the beauty of the coastline. It is perfect for those looking for a quiet and comfortable beach stay.\n\nAddress: Sitio Bingig, Cabalwa, Mansalay, Oriental Mindoro\nPhone: 0935-884-3049\nEmail: megabuena.beachresort@gmail.com",
    ],
    [
        'name' => 'Sky & Shore Beach Resort',
        'price_per_night' => 4200,
        'image' => $basePath . '/beach and resorts/sky and shore.jpg',
        'description' => "Sky & Shore Beach Resort provides beach accommodations with swimming and recreational areas for guests of all ages. The resort offers a relaxing environment where visitors can enjoy the sea, cottages, and outdoor activities. It is a perfect destination for family bonding and summer outings.\n\nAddress: Cabalwa, Mansalay, Oriental Mindoro\nPhone: 0927 117 7156\nEmail: maritesfamilara@gmail.com",
    ],
    [
        'name' => 'PGD Beach Resort',
        'price_per_night' => 3600,
        'image' => $basePath . '/beach and resorts/pgd beach.jpg',
        'description' => "PGD Beach Resort offers beachfront accommodations with various facilities for relaxation and recreation. Guests can enjoy the sea, open cottages, and the calm coastal environment. It is ideal for weekend vacations, family outings, and group gatherings.\n\nAddress: Cabalwa, Mansalay, Oriental Mindoro\nEmail: fgriego@gmail.com",
    ],
    [
        'name' => 'RC Farm and Resort',
        'price_per_night' => 3000,
        'image' => $basePath . '/MOUNTAIN AND FARM RESORTS/RC farm and resort.jpg',
        'description' => "RC Farm and Resort offers a refreshing farm and resort experience where visitors can relax and enjoy nature away from the busy town. Guests can experience farm tourism activities while also enjoying resort amenities perfect for family outings and group gatherings. It is an ideal destination for those who want both nature and relaxation in one place.\n\nAddress: Manaul, Mansalay, Oriental Mindoro\nPhone: 0977-701-9979\nEmail: mangyancuboolculturalboothoflove@gmail.com",
    ],
    [
        'name' => "Melzar's Mountain Resort Corp.",
        'price_per_night' => 4200,
        'image' => $basePath . '/MOUNTAIN AND FARM RESORTS/melzar mountain.jpg',
        'description' => "Melzar's Mountain Resort offers a relaxing mountain getaway with breathtaking overlooking views and a peaceful natural environment. Guests can enjoy the infinity pool, restaurant, and various outdoor activities while surrounded by nature. It is a perfect destination for relaxation, adventure, and scenic retreats.\n\nAddress: B. del Mundo, Mansalay\nPhone: 0917 862 8899\nEmail: sucgangmeliza2@gmail.com",
    ],
];

foreach ($items as $item) {
    $exists = Accommodation::whereRaw('LOWER(name) = ?', [mb_strtolower($item['name'])])->exists();

    if ($exists) {
        echo "Skip (exists): {$item['name']}\n";
        continue;
    }

    Accommodation::create([
        'user_id' => null,
        'is_registered' => false,
        'name' => $item['name'],
        'description' => $item['description'],
        'price_per_night' => $item['price_per_night'],
        'image' => $item['image'],
        'availability' => [],
    ]);

    echo "Added: {$item['name']}\n";
}
