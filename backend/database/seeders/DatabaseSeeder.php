<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\Attraction;
use App\Models\Event;
use App\Models\Accommodation;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        // Seed Users (only if they don't exist)
        $users = [
            [
                'name' => 'Admin User',
                'email' => 'admin@mansalay.com',
                'password' => bcrypt('admin123'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Juan Dela Cruz',
                'email' => 'tourist@example.com',
                'password' => bcrypt('tourist123'),
                'role' => 'tourist',
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Maria Santos',
                'email' => 'tourist2@example.com',
                'password' => bcrypt('tourist123'),
                'role' => 'tourist',
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Mansalay Beach Resort',
                'email' => 'resort@mansalay.com',
                'password' => bcrypt('resort123'),
                'role' => 'resort',
                'listing_status' => 'approved',
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Mountain View Lodge',
                'email' => 'lodge@mansalay.com',
                'password' => bcrypt('resort123'),
                'role' => 'resort',
                'listing_status' => 'approved',
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Local Handicrafts Shop',
                'email' => 'enterprise@mansalay.com',
                'password' => bcrypt('enterprise123'),
                'role' => 'enterprise',
                'listing_status' => 'approved',
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Mansalay Food Products',
                'email' => 'foodshop@mansalay.com',
                'password' => bcrypt('enterprise123'),
                'role' => 'enterprise',
                'listing_status' => 'approved',
                'email_verified_at' => now(),
            ],
        ];

        foreach ($users as $userData) {
            \App\Models\User::firstOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }

        $handicraftUserId = \App\Models\User::where('email', 'enterprise@mansalay.com')->value('id');
        $foodUserId = \App\Models\User::where('email', 'foodshop@mansalay.com')->value('id');

        // Seed Products (only if they don't exist)
        $products = [
            [
                'name' => 'Handwoven Basket',
                'description' => 'Traditional handwoven basket made by local artisans',
                'price' => 250,
                'stock' => 15,
                'category' => 'Handicrafts',
                'image' => '/assets/products/basket.jpg',
                'user_id' => $handicraftUserId,
            ],
            [
                'name' => 'Organic Honey',
                'description' => 'Pure organic honey from local beekeepers',
                'price' => 350,
                'stock' => 20,
                'category' => 'Food',
                'image' => '/assets/products/honey.jpg',
                'user_id' => $foodUserId,
            ],
            [
                'name' => 'Woven Mat',
                'description' => 'Handmade sleeping mat from natural materials',
                'price' => 500,
                'stock' => 10,
                'category' => 'Handicrafts',
                'image' => '/assets/products/mat.jpg',
                'user_id' => $handicraftUserId,
            ],
            [
                'name' => 'Dried Mangoes',
                'description' => 'Sweet and delicious dried mangoes',
                'price' => 150,
                'stock' => 30,
                'category' => 'Food',
                'image' => '/assets/products/mangoes.jpg',
                'user_id' => $foodUserId,
            ],
            [
                'name' => 'Coconut Oil',
                'description' => 'Pure virgin coconut oil',
                'price' => 200,
                'stock' => 25,
                'category' => 'Food',
                'image' => '/assets/products/coconut-oil.jpg',
                'user_id' => $foodUserId,
            ],
            [
                'name' => 'Bamboo Crafts',
                'description' => 'Beautiful bamboo decorative items',
                'price' => 300,
                'stock' => 12,
                'category' => 'Handicrafts',
                'image' => '/assets/products/bamboo.jpg',
                'user_id' => $handicraftUserId,
            ],
        ];

        foreach ($products as $productData) {
            Product::updateOrCreate(
                ['name' => $productData['name']],
                $productData
            );
        }

        // Replace Attractions, Events, and Accommodations with tourism office data
        Attraction::query()->delete();
        Event::query()->delete();
        Accommodation::query()->delete();

        $attractions = [
            [
                'name' => 'Oriental Mindoro Heritage and Cultural Center',
                'description' => 'Showcases the rich cultural heritage and artistic works of the Mangyans of Mindoro.',
                'full_description' => 'The Oriental Mindoro Heritage and Cultural Center showcases the rich cultural heritage and artistic works of the Mangyans of Mindoro. The center serves as a place for learning, appreciation, and preservation of Mangyan culture and traditions. Visitors can explore various cultural displays, artworks, and historical collections. Address: Brgy. B. del Mundo, Mansalay, Oriental Mindoro. Phone: (043) 288 7556. Email: byahengormin@gmail.com.',
                'location' => 'Brgy. B. del Mundo, Mansalay, Oriental Mindoro',
                'category' => 'Cultural',
                'image' => '/assets/products/attraction/Oriental%20Mindoro%20Heritage%20and%20Cultural%20Center.png',
            ],
            [
                'name' => 'Buktot Beach',
                'description' => 'Hidden coastal paradise with powdery white sand, clear waters, and natural rock formations.',
                'full_description' => 'Buktot Beach is a hidden coastal paradise known for its powdery white sand, clear waters, and stunning natural rock formations. Perfect for family outings and barkada trips, visitors can relax in beach cabanas while enjoying the cool sea breeze. Its peaceful and unspoiled beauty makes it one of Mansalay\'s must-visit summer destinations. Address: Manaul, Mansalay, Oriental Mindoro. Phone: 0926-287-7433. Email: lizaselorio23@gmail.com.',
                'location' => 'Manaul, Mansalay, Oriental Mindoro',
                'category' => 'Beach',
                'image' => '/assets/products/attraction/buktot_beach.jpg',
            ],
            [
                'name' => 'Mangyan Burial Cave',
                'description' => 'Historic coastal site and former burial ground of the ancient Mangyans.',
                'full_description' => 'Mangyan Burial Cave is a historic coastal site located near the Palaypay Cove Fish Sanctuary. This sacred place once served as a burial ground of the ancient Mangyans, making it an important cultural and heritage site in Mansalay. Visitors can experience both natural coastal scenery and a glimpse of the rich Mangyan history and tradition. Address: Sitio Palaypay, Brgy. B. del Mundo, Mansalay, Oriental Mindoro. Phone: 0916-577-8527. Email: mansalaytourism@gmail.com.',
                'location' => 'Sitio Palaypay, Brgy. B. del Mundo, Mansalay, Oriental Mindoro',
                'category' => 'Heritage',
                'image' => '/assets/products/attraction/mangya%20burial%20cave.jpg',
            ],
            [
                'name' => 'Mangyan Village',
                'description' => 'Cultural experience with the Hanunuo Mangyans and their way of life.',
                'full_description' => 'Mangyan Village offers visitors a meaningful cultural experience where they can witness the daily life, traditions, and craftsmanship of the Hanunuo Mangyans. Guests can learn about their culture, arts, and way of life while exploring the peaceful community. It is a perfect place for cultural immersion and educational tours. Address: Panaytayan, Mansalay, Oriental Mindoro. Phone: 09165778527. Email: mansalaytourism@gmail.com.',
                'location' => 'Panaytayan, Mansalay, Oriental Mindoro',
                'category' => 'Cultural',
                'image' => '/assets/products/attraction/mangyan%20village.jpg',
            ],
        ];

        foreach ($attractions as $attractionData) {
            Attraction::create($attractionData);
        }

        $defaultAvailability = [
            '2026-05-10' => 'available',
            '2026-05-11' => 'available',
            '2026-05-12' => 'available',
            '2026-05-13' => 'available',
            '2026-05-14' => 'available',
        ];

        $accommodations = [
            [
                'name' => 'La Sersita Casitas & Water Spa Beach Resort',
                'description' => 'La Sersita Casitas & Water Spa Beach Resort offers a relaxing beachfront escape with cozy casitas and refreshing water spa facilities. Guests can enjoy a peaceful seaside atmosphere while experiencing comfort and leisure in one destination. It is an ideal place for rest, relaxation, and small group getaways. Address: Don Pedro, Mansalay, Oriental Mindoro. Phone: 0995 920 5543. Email: lasersitacasitas@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/beach%20and%20resorts/lasersita%20casitas.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Sidell Kite and Beach Resort',
                'description' => 'Sidell Kite and Beach Resort features comfortable beachfront accommodations surrounded by natural scenery and a calm atmosphere. The resort is perfect for those who want to unwind, enjoy the sea breeze, and experience a quiet beach vacation. Its relaxing environment makes it ideal for family and weekend getaways. Address: Cabalwa, Mansalay, Oriental Mindoro. Phone: 0977 059 0960. Email: belensidell@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/beach%20and%20resorts/sidell%20kite.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Terese by the Sea',
                'description' => 'Terese by the Sea offers a wide beachfront area with cottages and a function hall perfect for gatherings and special events. Guests can enjoy swimming, beach activities, and relaxing by the shore. The resort is ideal for family outings, team buildings, and celebrations by the sea.',
                'price_per_night' => 0,
                'image' => '/assets/products/beach%20and%20resorts/teresa%20by%20the%20sea.png',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Footprints in the Sand Beach Resort',
                'description' => 'Footprints in the Sand Beach Resort provides beachfront accommodations with a romantic and relaxing atmosphere. The soothing sound of the waves and scenic ocean views make it perfect for couples and peaceful retreats. It is a great place to unwind and enjoy the natural beauty of Mansalay\'s coastline. Address: B. del Mundo, Mansalay, Oriental Mindoro. Email: footprintsinthesand085@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/beach%20and%20resorts/footprints.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Go Beach Resort',
                'description' => 'Go Beach Resort is a simple yet relaxing beachfront destination ideal for day tours and overnight stays. Visitors can enjoy swimming, cottage rentals, and bonding moments by the sea. It is perfect for families and friends looking for an affordable beach getaway. Address: Cabalwa, Mansalay, Oriental Mindoro. Phone: 0935 638 9059. Email: buenaventuramaribeth@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/beach%20and%20resorts/go%20beach%20resort.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Mahalta Glamping Resort',
                'description' => 'Mahalta Glamping Resort offers a unique beachfront glamping experience that combines nature and comfort. Guests can enjoy stylish tent accommodations, resort amenities, and scenic coastal views. It is perfect for travelers looking for a relaxing yet unique beach getaway. Address: Wasig, Mansalay, Oriental Mindoro. Phone: 0928 716 9887. Email: reservations@mahaltaglamping.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/beach%20and%20resorts/mahalta%20glamping.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'MB Hiraya Beach Resort',
                'description' => 'MB Hiraya Beach Resort offers affordable overnight stays, day tours, and exclusive rentals for special occasions. Guests can create memorable experiences while enjoying the beach, cottages, and event spaces. It is a great venue for celebrations, reunions, and family vacations. Address: Sitio Bingig, Cabalwa, Mansalay, Oriental Mindoro. Phone: 0936 802 4848. Email: mghirayaresort@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/beach%20and%20resorts/MB%20hiraya%20beach%20resort.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Mega Buena Beach Resort',
                'description' => 'Mega Buena Beach Resort features overlooking villa rooms, air-conditioned accommodations, and open cottages with scenic sea views. The resort provides a peaceful place to relax while enjoying the beauty of the coastline. It is perfect for those looking for a quiet and comfortable beach stay. Address: Sitio Bingig, Cabalwa, Mansalay, Oriental Mindoro. Phone: 0935-884-3049. Email: megabuena.beachresort@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/beach%20and%20resorts/mega%20buena.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Sky & Shore Beach Resort',
                'description' => 'Sky & Shore Beach Resort provides beach accommodations with swimming and recreational areas for guests of all ages. The resort offers a relaxing environment where visitors can enjoy the sea, cottages, and outdoor activities. It is a perfect destination for family bonding and summer outings. Address: Cabalwa, Mansalay, Oriental Mindoro. Phone: 0927 117 7156. Email: maritesfamilara@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/beach%20and%20resorts/sky%20and%20shore.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'PGD Beach Resort',
                'description' => 'PGD Beach Resort offers beachfront accommodations with various facilities for relaxation and recreation. Guests can enjoy the sea, open cottages, and the calm coastal environment. It is ideal for weekend vacations, family outings, and group gatherings. Address: Cabalwa, Mansalay, Oriental Mindoro. Email: fgriego@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/beach%20and%20resorts/pgd%20beach.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'RC Farm and Resort',
                'description' => 'RC Farm and Resort offers a refreshing farm and resort experience where visitors can relax and enjoy nature away from the busy town. Guests can experience farm tourism activities while also enjoying resort amenities perfect for family outings and group gatherings. It is an ideal destination for those who want both nature and relaxation in one place. Address: Manaul, Mansalay, Oriental Mindoro. Phone: 0977-701-9979. Email: mangyancuboolculturalboothoflove@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/MOUNTAIN%20AND%20FARM%20RESORTS/RC%20farm%20and%20resort.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Melzar\'s Mountain Resort Corp.',
                'description' => 'Melzar\'s Mountain Resort offers a relaxing mountain getaway with breathtaking overlooking views and a peaceful natural environment. Guests can enjoy the infinity pool, restaurant, and various outdoor activities while surrounded by nature. It is a perfect destination for relaxation, adventure, and scenic retreats. Address: B. del Mundo, Mansalay. Phone: 09178628899. Email: sucgangmeliza2@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/MOUNTAIN%20AND%20FARM%20RESORTS/melzar%20mountain.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Nel Travelers Inn',
                'description' => 'Nel Travelers Inn offers simple and budget-friendly accommodations ideal for backpackers and budget travelers. The inn provides a comfortable place to stay for visitors exploring Mansalay and nearby attractions. It is perfect for travelers looking for affordable and convenient lodging. Address: B. del Mundo, Mansalay, Oriental Mindoro. Email: neliafrondagajisan@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/ACCOMMODATIONS/nel%20travellers%20inn.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Carishiela\'s Lodging House',
                'description' => 'Carishiela\'s Lodging House provides affordable accommodations with basic amenities for travelers visiting Mansalay. It offers a simple, clean, and comfortable place to stay within the town proper. Ideal for budget travelers and short stays. Address: Poblacion, Mansalay, Oriental Mindoro. Phone: 0917-327-2809. Email: carishiellaslodginghouse@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/ACCOMMODATIONS/carishiela%20lodging%20house.jpg',
                'availability' => $defaultAvailability,
            ],
            [
                'name' => 'Mansalay Food House and Lodging',
                'description' => 'Mansalay Food House and Lodging offers both dining and accommodation services in one convenient location. Guests can enjoy affordable meals and comfortable rooms during their stay in Mansalay. It is ideal for travelers looking for a practical and budget-friendly place to eat and stay. Address: Poblacion, Mansalay, Oriental Mindoro. Phone: 0929-794-7108. Email: mangyancuboolculturalboothoflove@gmail.com.',
                'price_per_night' => 0,
                'image' => '/assets/products/ACCOMMODATIONS/mansalay%20food%20house%20and%20lodging.jpg',
                'availability' => $defaultAvailability,
            ],
        ];

        foreach ($accommodations as $accommodationData) {
            Accommodation::create($accommodationData);
        }

        $this->command->info('Database seeded successfully!');
        $this->command->info('Users: ' . \App\Models\User::count());
        $this->command->info('Products: ' . Product::count());
        $this->command->info('Attractions: ' . Attraction::count());
        $this->command->info('Events: ' . Event::count());
        $this->command->info('Accommodations: ' . Accommodation::count());
    }
}
