<?php

use App\Models\Attraction;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$basePath = '/drive-download-20260416T051436Z-3-001/attraction';

$items = [
    [
        'name' => 'Oriental Mindoro Heritage and Cultural Center',
        'location' => 'Brgy. B. del Mundo, Mansalay, Oriental Mindoro',
        'category' => 'Cultural',
        'image' => $basePath . '/Oriental Mindoro Heritage and Cultural Center.png',
        'description' => 'Showcases the rich cultural heritage and artistic works of the Mangyans of Mindoro.',
        'full_description' => "The Oriental Mindoro Heritage and Cultural Center showcases the rich cultural heritage and artistic works of the Mangyans of Mindoro. The center serves as a place for learning, appreciation, and preservation of Mangyan culture and traditions. Visitors can explore various cultural displays, artworks, and historical collections.\n\nAddress: Brgy. B. del Mundo, Mansalay, Oriental Mindoro\nPhone: (043) 288 7556\nEmail: byahengormin@gmail.com",
    ],
    [
        'name' => 'Buktot Beach',
        'location' => 'Manaul, Mansalay, Oriental Mindoro',
        'category' => 'Beach',
        'image' => $basePath . '/buktot_beach.jpg',
        'description' => 'Hidden coastal paradise known for powdery white sand, clear waters, and natural rock formations.',
        'full_description' => "Buktot Beach is a hidden coastal paradise known for its powdery white sand, clear waters, and stunning natural rock formations. Perfect for family outings and barkada trips, visitors can relax in beach cabanas while enjoying the cool sea breeze. Its peaceful and unspoiled beauty makes it one of Mansalay’s must-visit summer destinations.\n\nAddress: Manaul, Mansalay, Oriental Mindoro\nPhone: 0926-287-7433\nEmail: lizaselorio23@gmail.com",
    ],
    [
        'name' => 'Mangyan Burial Cave',
        'location' => 'Sitio Palaypay, Brgy. B. del Mundo, Mansalay, Oriental Mindoro',
        'category' => 'Heritage',
        'image' => $basePath . '/mangya burial cave.jpg',
        'description' => 'Historic coastal site and former burial ground of the ancient Mangyans.',
        'full_description' => "Mangyan Burial Cave is a historic coastal site located near the Palaypay Cove Fish Sanctuary. This sacred place once served as a burial ground of the ancient Mangyans, making it an important cultural and heritage site in Mansalay. Visitors can experience both natural coastal scenery and a glimpse of the rich Mangyan history and tradition.\n\nAddress: Sitio Palaypay, Brgy. B. del Mundo, Mansalay, Oriental Mindoro\nPhone: 0916-577-8527\nEmail: mansalaytourism@gmail.com",
    ],
    [
        'name' => 'Mangyan Village',
        'location' => 'Panaytayan, Mansalay, Oriental Mindoro',
        'category' => 'Cultural',
        'image' => $basePath . '/mangyan village.jpg',
        'description' => 'Cultural experience showcasing Hanunuo Mangyan life, traditions, and craftsmanship.',
        'full_description' => "Mangyan Village offers visitors a meaningful cultural experience where they can witness the daily life, traditions, and craftsmanship of the Hanunuo Mangyans. Guests can learn about their culture, arts, and way of life while exploring the peaceful community. It is a perfect place for cultural immersion and educational tours.\n\nAddress: Panaytayan, Mansalay, Oriental Mindoro\nPhone: 09165778527\nEmail: mansalaytourism@gmail.com",
    ],
];

foreach ($items as $item) {
    $exists = Attraction::whereRaw('LOWER(name) = ?', [mb_strtolower($item['name'])])->exists();

    if ($exists) {
        echo "Skip (exists): {$item['name']}\n";
        continue;
    }

    Attraction::create($item + ['user_id' => null]);

    echo "Added: {$item['name']}\n";
}
