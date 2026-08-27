<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TourismDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $now = Carbon::now();

        // -------------------------------------------------------------
        // 1. Seed Attractions with images
        // -------------------------------------------------------------
        $attractions = [
            [
                'name' => 'Buktot Beach',
                'description' => 'A pristine white sand beach with crystal clear waters, perfect for swimming and snorkeling.',
                'full_description' => 'Buktot Beach is renowned for its powdery white sand and turquoise waters. It offers excellent swimming conditions and is a popular spot for snorkeling with visible coral formations near the shore.',
                'location' => 'Barangay Buktot, Mansalay',
                'category' => 'Beach',
                'image' => '/drive-download-20260416T051436Z-3-001/attraction/buktot_beach.jpg',
            ],
            [
                'name' => 'Oriental Mindoro Heritage and Cultural Center',
                'description' => 'Cultural museum and heritage center showcasing indigenous Mangyan artifacts and history.',
                'full_description' => 'A cultural hub dedicated to preserving the rich heritage, traditions, and artifacts of the Hanunoo Mangyan tribe and the historical development of Mansalay and Oriental Mindoro.',
                'location' => 'Poblacion, Mansalay',
                'category' => 'Historical Site',
                'image' => '/drive-download-20260416T051436Z-3-001/attraction/Oriental Mindoro Heritage and Cultural Center.png',
            ],
            [
                'name' => 'Mangyan Village & Cultural Sanctuary',
                'description' => 'Authentic indigenous village displaying traditional Hanunoo Mangyan culture and Surat Mangyan script.',
                'full_description' => 'Experience the rich living traditions of the Hanunoo Mangyan community. Learn their ancient Surat Mangyan syllabic script inscribed on bamboo, traditional weaving, and peaceful forest-dwelling lifestyle.',
                'location' => 'Panaytayan, Mansalay',
                'category' => 'Cultural',
                'image' => '/drive-download-20260416T051436Z-3-001/attraction/mangyan village.jpg',
            ],
            [
                'name' => 'Mangyan Ancient Burial Cave',
                'description' => 'Historical limestone cave containing ancient Mangyan burial jars and archaeological treasures.',
                'full_description' => 'A sacred cultural and archaeological site featuring ancient limestone burial caves, where prehistoric pottery and jar burials of early settlers were preserved.',
                'location' => 'Manaul, Mansalay',
                'category' => 'Historical Site',
                'image' => '/drive-download-20260416T051436Z-3-001/attraction/mangya burial cave.jpg',
            ],
            [
                'name' => 'Buyayao Island & Marine Reserve',
                'description' => 'Picturesque island surrounded by lush marine life, vibrant coral reefs, and tranquil waters.',
                'full_description' => 'Buyayao Island is an eco-tourism sanctuary offering breathtaking scuba diving, snorkeling, and boat touring experiences with rich biodiversity.',
                'location' => 'Buyayao Island, Mansalay',
                'category' => 'Marine Sanctuary',
                'image' => '/drive-download-20260416T051436Z-3-001/beach and resorts/pgd beach.jpg',
            ],
            [
                'name' => 'Mount Mansalay & Highland Trails',
                'description' => 'Scenic mountain range featuring panoramic views of the ocean and mountain ridges.',
                'full_description' => 'A favorite trekking spot for adventure seekers and eco-tourists offering sweeping 360-degree vistas of Mansalay Bay and southern Mindoro.',
                'location' => 'Mansalay Mountain Range',
                'category' => 'Mountain',
                'image' => '/drive-download-20260416T051436Z-3-001/MOUNTAIN AND FARM RESORTS/melzar mountain.jpg',
            ],
        ];

        foreach ($attractions as $item) {
            DB::table('attractions')->updateOrInsert(
                ['name' => $item['name']],
                array_merge($item, ['created_at' => $now, 'updated_at' => $now])
            );
        }

        // -------------------------------------------------------------
        // 2. Seed Accommodations & Resorts with images
        // -------------------------------------------------------------
        $accommodations = [
            [
                'name' => 'Lasersita Casitas & Beach Resort',
                'description' => 'Premier beachfront casitas offering modern comfort, swimming pool, and direct beach access. Amenities: WiFi, Swimming Pool, Air Conditioning, Hot Shower, Restaurant.',
                'price_per_night' => 3500,
                'image' => '/drive-download-20260416T051436Z-3-001/beach and resorts/lasersita casitas.jpg',
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
            ],
            [
                'name' => 'Mahalta Glamping & Beach Resort',
                'description' => 'Luxury glamping tents right on the shoreline with romantic sunset dining and bonfire setups.',
                'price_per_night' => 2800,
                'image' => '/drive-download-20260416T051436Z-3-001/beach and resorts/mahalta glamping.jpg',
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
            ],
            [
                'name' => 'Sky and Shore Beach Resort',
                'description' => 'Tranquil coastal resort perfect for family vacations and corporate retreats with oceanfront cottages.',
                'price_per_night' => 2400,
                'image' => '/drive-download-20260416T051436Z-3-001/beach and resorts/sky and shore.jpg',
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
            ],
            [
                'name' => 'Sidell Beach & Kiteboarding Resort',
                'description' => 'Water sports and kiteboarding destination on the breezy eastern shore of Mansalay.',
                'price_per_night' => 2000,
                'image' => '/drive-download-20260416T051436Z-3-001/beach and resorts/sidell beach.jpg',
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
            ],
            [
                'name' => 'RC Farm and Mountain Resort',
                'description' => 'Serene agro-tourism farm resort surrounded by fruit orchards, mountain breezes, and fresh springs.',
                'price_per_night' => 1800,
                'image' => '/drive-download-20260416T051436Z-3-001/MOUNTAIN AND FARM RESORTS/RC farm and resort.jpg',
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
            ],
            [
                'name' => 'Carishiela Lodging House',
                'description' => 'Budget-friendly lodging house in town center with clean, air-conditioned rooms and reliable service.',
                'price_per_night' => 1200,
                'image' => '/drive-download-20260416T051436Z-3-001/ACCOMMODATIONS/carishiela lodging house.jpg',
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
            ],
            [
                'name' => 'Nel Travellers Inn',
                'description' => 'Convenient travelers inn near the highway and transportation terminals with WiFi and dining.',
                'price_per_night' => 1000,
                'image' => '/drive-download-20260416T051436Z-3-001/ACCOMMODATIONS/nel travellers inn.jpg',
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
            ],
        ];

        foreach ($accommodations as $item) {
            DB::table('accommodations')->updateOrInsert(
                ['name' => $item['name']],
                array_merge($item, ['created_at' => $now, 'updated_at' => $now])
            );
        }

        // -------------------------------------------------------------
        // 3. Seed Products with images
        // -------------------------------------------------------------
        $products = [
            [
                'name' => 'Authentic Mangyan Woven Bag (Bayong)',
                'description' => 'Handcrafted bag woven from natural nito vines and bamboo by Hanunoo Mangyan women artisans.',
                'price' => 450,
                'category' => 'Handicraft',
                'stock' => 50,
                'image' => '/drive-download-20260416T051436Z-3-001/product_awati/Mangyan Woven Bag.jpg',
            ],
            [
                'name' => 'Handwoven Traditional Baskets',
                'description' => 'Durable and decorative multipurpose basket made of natural bamboo fibers and nito weave.',
                'price' => 380,
                'category' => 'Handicraft',
                'stock' => 40,
                'image' => '/drive-download-20260416T051436Z-3-001/product_awati/handwoven-baskets-linda-phelps.jpg',
            ],
            [
                'name' => 'Handcrafted Beaded Bracelet',
                'description' => 'Colorful traditional Hanunoo Mangyan beaded bracelet with intricate geometric patterns.',
                'price' => 150,
                'category' => 'Jewelry',
                'stock' => 100,
                'image' => '/drive-download-20260416T051436Z-3-001/product_awati/Beaded-Bracelet.webp',
            ],
            [
                'name' => 'Ammonite Fossil Souvenir Keychain',
                'description' => 'Unique collectible keychain featuring genuine ammonite fossil found in ancient Mansalay rock formations.',
                'price' => 200,
                'category' => 'Souvenir',
                'stock' => 75,
                'image' => '/drive-download-20260416T051436Z-3-001/product_awati/Ammonite Souvenir Keychain.webp',
            ],
            [
                'name' => 'Handwoven Banig Mat',
                'description' => 'Cool and smooth traditional sleeping and floor mat made from dried and dyed pandan reeds.',
                'price' => 600,
                'category' => 'Handicraft',
                'stock' => 30,
                'image' => '/drive-download-20260416T051436Z-3-001/product_awati/woven_mat.jpg',
            ],
            [
                'name' => 'Bamboo Crafts & Tableware',
                'description' => 'Eco-friendly bamboo cups, utensil holders, and table decor crafted by local woodworkers.',
                'price' => 280,
                'category' => 'Handicraft',
                'stock' => 60,
                'image' => '/drive-download-20260416T051436Z-3-001/product_awati/bamboo_crafts.jpg',
            ],
        ];

        foreach ($products as $item) {
            DB::table('products')->updateOrInsert(
                ['name' => $item['name']],
                array_merge($item, ['created_at' => $now, 'updated_at' => $now])
            );
        }

        // -------------------------------------------------------------
        // 4. Seed Events with images
        // -------------------------------------------------------------
        $events = [
            [
                'name' => 'Mansalay Town Fiesta & St. Joseph Feast',
                'description' => 'Annual grand town fiesta featuring street dancing competitions, cultural pageants, and food festival.',
                'full_description' => 'The premier cultural event of Mansalay celebrating the feast of St. Joseph. Highlighted by the spectacular street dancing competition, Hanunoo Mangyan cultural exhibition, and local food bazaars.',
                'location' => 'Mansalay Municipal Grounds, Poblacion',
                'category' => 'Festival',
                'image' => '/drive-download-20260416T051436Z-3-001/attraction/Oriental Mindoro Heritage and Cultural Center.png',
                'date' => Carbon::create(2026, 3, 19),
                'time' => '8:00 AM - 10:00 PM',
                'capacity' => 'Unlimited',
            ],
            [
                'name' => 'Summer Coastal Beach Party & Bonfire',
                'description' => 'Lively evening beach gathering with live acoustic music, local grilling, and bonfire games.',
                'full_description' => 'Kick off the sunny summer season with fellow tourists and locals at Buktot Beach. Enjoy acoustic reggae bands, volleyball tournaments, and fresh seafood barbecue.',
                'location' => 'Buktot Beach Shoreline',
                'category' => 'Entertainment',
                'image' => '/drive-download-20260416T051436Z-3-001/beach and resorts/footprints.jpg',
                'date' => Carbon::create(2026, 5, 1),
                'time' => '4:00 PM - 11:00 PM',
                'capacity' => 'Unlimited',
            ],
            [
                'name' => 'Mangyan Cultural Craft & Weaving Fair',
                'description' => 'Live demonstration of Surat Mangyan poetry writing on bamboo and traditional nito weaving.',
                'full_description' => 'An immersive interactive cultural workshop where visitors can meet Mangyan elders, learn the ancient script, and purchase direct handwoven art.',
                'location' => 'Poblacion Plaza, Mansalay',
                'category' => 'Cultural',
                'image' => '/drive-download-20260416T051436Z-3-001/attraction/mangyan village.jpg',
                'date' => Carbon::create(2026, 8, 15),
                'time' => '9:00 AM - 5:00 PM',
                'capacity' => '500',
            ],
            [
                'name' => 'Mansalay Marine Eco-Clean & Dive Expedition',
                'description' => 'Volunteer coastal clean-up and reef monitoring dive in Buyayao marine sanctuary.',
                'full_description' => 'Join marine biologists and eco-divers in reef preservation, crown-of-thorns removal, and coastal cleanup.',
                'location' => 'Buyayao Island Marine Sanctuary',
                'category' => 'Community Service',
                'image' => '/drive-download-20260416T051436Z-3-001/beach and resorts/pgd beach.jpg',
                'date' => Carbon::create(2026, 6, 8),
                'time' => '6:00 AM - 12:00 PM',
                'capacity' => '100',
            ],
        ];

        foreach ($events as $item) {
            DB::table('events')->updateOrInsert(
                ['name' => $item['name']],
                array_merge($item, ['created_at' => $now, 'updated_at' => $now])
            );
        }

        $this->command->info('✅ Complete Tourism data with images seeded successfully!');
    }
}
