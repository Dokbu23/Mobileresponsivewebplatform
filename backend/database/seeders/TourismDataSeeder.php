<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class TourismDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Attractions from official Mansalay Tourism data
        \DB::table('attractions')->insert([
            [
                'name' => 'Oriental Mindoro Heritage and Cultural Center',
                'description' => 'Showcases the rich cultural heritage and artistic works of the Mangyans of Mindoro.',
                'full_description' => 'The Oriental Mindoro Heritage and Cultural Center showcases the rich cultural heritage and artistic works of the Mangyans of Mindoro. The center serves as a place for learning, appreciation, and preservation of Mangyan culture and traditions. Visitors can explore various cultural displays, artworks, and historical collections.',
                'image' => 'https://images.unsplash.com/photo-1633356122544-f134324ef6e2?w=400',
                'location' => 'Brgy. B. del Mundo, Mansalay',
                'category' => 'Cultural',
            ],
            [
                'name' => 'Buktot Beach',
                'description' => 'A hidden coastal paradise known for its powdery white sand and stunning rock formations.',
                'full_description' => 'Buktot Beach is a hidden coastal paradise known for its powdery white sand, clear waters, and stunning natural rock formations. Perfect for family outings and barkada trips, visitors can relax in beach cabanas while enjoying the cool sea breeze. Its peaceful and unspoiled beauty makes it one of Mansalay\'s must-visit summer destinations.',
                'image' => 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',
                'location' => 'Manaul, Mansalay',
                'category' => 'Beach',
            ],
            [
                'name' => 'Mangyan Burial Cave',
                'description' => 'A historic coastal site once serving as a burial ground of the ancient Mangyans.',
                'full_description' => 'Mangyan Burial Cave is a historic coastal site located near the Palaypay Cove Fish Sanctuary. This sacred place once served as a burial ground of the ancient Mangyans, making it an important cultural and heritage site in Mansalay. Visitors can experience both natural coastal scenery and a glimpse of the rich Mangyan history and tradition.',
                'image' => 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400',
                'location' => 'Sitio Palaypay, Brgy. B. del Mundo',
                'category' => 'Cultural',
            ],
            [
                'name' => 'Mangyan Village',
                'description' => 'A meaningful cultural experience with the Hanunuo Mangyans.',
                'full_description' => 'Mangyan Village offers visitors a meaningful cultural experience where they can witness the daily life, traditions, and craftsmanship of the Hanunuo Mangyans. Guests can learn about their culture, arts, and way of life while exploring the peaceful community. It is a perfect place for cultural immersion and educational tours.',
                'image' => 'https://images.unsplash.com/photo-1529282597531-fcd901cdc4c9?w=400',
                'location' => 'Panaytayan, Mansalay',
                'category' => 'Cultural',
            ],
        ]);

        // Events
        \DB::table('events')->insert([
            [
                'name' => 'Mansalay Festival',
                'description' => 'Annual cultural festival celebrating the heritage and traditions of Mansalay.',
                'full_description' => 'The Mansalay Festival is the town\'s biggest annual celebration, featuring a week of cultural performances, traditional music and dance, street parades, food fairs, and sporting events. The festival highlights local arts, crafts, and cuisine while bringing the community together in joyous celebration.',
                'date' => '2026-06-15',
                'time' => '9:00 AM - 9:00 PM',
                'location' => 'Town Plaza, Mansalay',
                'image' => 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
                'category' => 'Cultural',
                'capacity' => '5000 attendees',
            ],
            [
                'name' => 'Beach Cleanup Day',
                'description' => 'Community-driven environmental initiative to keep our beaches pristine.',
                'full_description' => 'Join fellow volunteers in this monthly beach cleanup event. We provide all necessary equipment including gloves, bags, and refreshments. It\'s a great opportunity to meet like-minded people while making a positive impact on our coastal environment. All collected waste is properly sorted and recycled.',
                'date' => '2026-05-10',
                'time' => '6:00 AM - 10:00 AM',
                'location' => 'Puting Buhangin Beach',
                'image' => 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=400',
                'category' => 'Environment',
                'capacity' => '200 volunteers',
            ],
            [
                'name' => 'Local Artisan Market',
                'description' => 'Weekly market showcasing handmade crafts and local produce.',
                'full_description' => 'Every Saturday, local artisans and farmers gather to sell their handmade products and fresh produce. Discover unique handicrafts, organic vegetables, homemade delicacies, and traditional items. Live music and food stalls create a vibrant atmosphere perfect for family outings.',
                'date' => '2026-05-03',
                'time' => '7:00 AM - 2:00 PM',
                'location' => 'Municipal Market Square',
                'image' => 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=400',
                'category' => 'Market',
                'capacity' => '100+ vendors',
            ],
        ]);

        // Products (Dining Establishments)
        \DB::table('products')->insert([
            [
                'name' => 'Nature\'s Gift Garden Restaurant',
                'description' => 'Peaceful garden dining surrounded by nature with delicious meals.',
                'price' => 350,
                'stock' => 50,
                'image' => 'https://images.unsplash.com/photo-1564758889541-c441c5d2e4d0?w=400',
                'category' => 'Dining',
            ],
            [
                'name' => 'Princess Ayline Bed & Breakfast',
                'description' => 'Delicious Filipino comfort food in a warm home-style setting.',
                'price' => 250,
                'stock' => 50,
                'image' => 'https://images.unsplash.com/photo-1504674900152-b8b0ff6e4b4e?w=400',
                'category' => 'Dining',
            ],
        ]);

        // Accommodations (Resorts and Inns)
        \DB::table('accommodations')->insert([
            [
                'name' => 'La Sersita Casitas & Water Spa Beach Resort',
                'description' => 'Relaxing beachfront escape with cozy casitas and water spa facilities.',
                'price_per_night' => 2500,
                'image' => 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'booked', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Sidell Kite and Beach Resort',
                'description' => 'Comfortable beachfront accommodations with calm atmosphere.',
                'price_per_night' => 1800,
                'image' => 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'booked', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Terese by the Sea',
                'description' => 'Wide beachfront area with cottages perfect for gatherings.',
                'price_per_night' => 2000,
                'image' => 'https://images.unsplash.com/photo-1571896349842-b0b6facccad7?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'booked', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Footprints in the Sand Beach Resort',
                'description' => 'Beachfront accommodations with romantic and relaxing atmosphere.',
                'price_per_night' => 2800,
                'image' => 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'booked']),
            ],
            [
                'name' => 'Go Beach Resort',
                'description' => 'Simple yet relaxing beachfront destination ideal for day tours.',
                'price_per_night' => 1200,
                'image' => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'booked', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Mahalta Glamping Resort',
                'description' => 'Unique glamping experience combining nature and comfort.',
                'price_per_night' => 3200,
                'image' => 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'booked', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'MB Hiraya Beach Resort',
                'description' => 'Affordable overnight stays and exclusive rentals for occasions.',
                'price_per_night' => 1500,
                'image' => 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'booked', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Mega Buena Beach Resort',
                'description' => 'Villa rooms with scenic sea views and peaceful environment.',
                'price_per_night' => 2200,
                'image' => 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'booked']),
            ],
            [
                'name' => 'Sky & Shore Beach Resort',
                'description' => 'Beach accommodations with swimming and recreational areas.',
                'price_per_night' => 1900,
                'image' => 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'booked', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'PGD Beach Resort',
                'description' => 'Beachfront accommodations with various facilities.',
                'price_per_night' => 1600,
                'image' => 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
                'availability' => json_encode(['2026-05-10' => 'booked', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'RC Farm and Resort',
                'description' => 'Farm and resort experience for nature lovers.',
                'price_per_night' => 1400,
                'image' => 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'booked', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Melzar\'s Mountain Resort Corp.',
                'description' => 'Relaxing mountain getaway with breathtaking views.',
                'price_per_night' => 2600,
                'image' => 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'booked', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Nel Travelers Inn',
                'description' => 'Budget-friendly accommodations for backpackers.',
                'price_per_night' => 600,
                'image' => 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'booked']),
            ],
            [
                'name' => 'Carishiela\'s Lodging House',
                'description' => 'Affordable accommodations with basic amenities.',
                'price_per_night' => 700,
                'image' => 'https://images.unsplash.com/photo-1631049307038-da0ec89d71cb?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'booked', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Mansalay Food House and Lodging',
                'description' => 'Dining and accommodation services in one location.',
                'price_per_night' => 800,
                'image' => 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'booked', '2026-05-14' => 'available']),
            ],
        ]);
    }
}
