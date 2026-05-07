<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

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
        DB::table('attractions')->insert([
            [
                'name' => 'Oriental Mindoro Heritage and Cultural Center',
                'description' => 'Showcases the rich cultural heritage and artistic works of the Mangyans of Mindoro.',
                'full_description' => 'The Oriental Mindoro Heritage and Cultural Center showcases the rich cultural heritage and artistic works of the Mangyans of Mindoro. The center serves as a place for learning, appreciation, and preservation of Mangyan culture and traditions. Visitors can explore various cultural displays, artworks, and historical collections.',
                'image' => 'https://lh3.googleusercontent.com/u/0/d/12rcUSObPf7CIYKcS66tLH-boafeTl9I-=w1200-h900',
                'location' => 'Brgy. B. del Mundo, Mansalay',
                'category' => 'Cultural',
            ],
            [
                'name' => 'Buktot Beach',
                'description' => 'A hidden coastal paradise known for its powdery white sand and stunning rock formations.',
                'full_description' => 'Buktot Beach is a hidden coastal paradise known for its powdery white sand, clear waters, and stunning natural rock formations. Perfect for family outings and barkada trips, visitors can relax in beach cabanas while enjoying the cool sea breeze. Its peaceful and unspoiled beauty makes it one of Mansalay\'s must-visit summer destinations.',
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1rgkEVFeIK03zD7JuKx7aW-10Opd6BNBp=w1200-h900',
                'location' => 'Manaul, Mansalay',
                'category' => 'Beach',
            ],
            [
                'name' => 'Mangyan Burial Cave',
                'description' => 'A historic coastal site once serving as a burial ground of the ancient Mangyans.',
                'full_description' => 'Mangyan Burial Cave is a historic coastal site located near the Palaypay Cove Fish Sanctuary. This sacred place once served as a burial ground of the ancient Mangyans, making it an important cultural and heritage site in Mansalay. Visitors can experience both natural coastal scenery and a glimpse of the rich Mangyan history and tradition.',
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1uUFxVgzCwbnVDYUiznrE7CtAgcrSiLZw=w1200-h900',
                'location' => 'Sitio Palaypay, Brgy. B. del Mundo',
                'category' => 'Cultural',
            ],
            [
                'name' => 'Mangyan Village',
                'description' => 'A meaningful cultural experience with the Hanunuo Mangyans.',
                'full_description' => 'Mangyan Village offers visitors a meaningful cultural experience where they can witness the daily life, traditions, and craftsmanship of the Hanunuo Mangyans. Guests can learn about their culture, arts, and way of life while exploring the peaceful community. It is a perfect place for cultural immersion and educational tours.',
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1mihh5y3wS4v3oYqZcefjHe02D4ZZm2kQ=w1200-h900',
                'location' => 'Panaytayan, Mansalay',
                'category' => 'Cultural',
            ],
        ]);

        // Events
        DB::table('events')->insert([
            [
                'name' => 'Mansalay Festival',
                'description' => 'Annual cultural festival celebrating the heritage and traditions of Mansalay.',
                'full_description' => 'The Mansalay Festival is the town\'s biggest annual celebration, featuring a week of cultural performances, traditional music and dance, street parades, food fairs, and sporting events. The festival highlights local arts, crafts, and cuisine while bringing the community together in joyous celebration.',
                'date' => '2026-06-15',
                'time' => '9:00 AM - 9:00 PM',
                'location' => 'Town Plaza, Mansalay',
                'image' => 'https://lh3.googleusercontent.com/u/0/d/14rYcqz3i8v1oSvZSgzaaKCL4C7eY1uy6=w1200-h900',
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
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1CeCvfN3ll3qBFdigl3Hs1JJYpR4uw_O9=w1200-h900',
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
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1vZgpw02upzwT0WYLoaD86gCxWKnytiwZ=w1200-h900',
                'category' => 'Market',
                'capacity' => '100+ vendors',
            ],
        ]);

        // Products (Dining Establishments)
        DB::table('products')->insert([
            [
                'name' => 'Nature\'s Gift Garden Restaurant',
                'description' => 'Peaceful garden dining surrounded by nature with delicious meals.',
                'price' => 350,
                'stock' => 50,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/128Js9RqnTIQjsoV63t4gHq5JdJHKO5uF=w1200-h900',
                'category' => 'Dining',
            ],
            [
                'name' => 'Princess Ayline Bed & Breakfast',
                'description' => 'Delicious Filipino comfort food in a warm home-style setting.',
                'price' => 250,
                'stock' => 50,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1PNbcqv19g5FAr8QTVlnJFakwbfFqvqdK=w1200-h900',
                'category' => 'Dining',
            ],
        ]);

        // Accommodations (Resorts and Inns)
        DB::table('accommodations')->insert([
            [
                'name' => 'La Sersita Casitas & Water Spa Beach Resort',
                'description' => 'Relaxing beachfront escape with cozy casitas and water spa facilities.',
                'price_per_night' => 2500,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1OPXy2a8ytqkBNIP0husg76gVSSzolc3O=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'booked', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Sidell Kite and Beach Resort',
                'description' => 'Comfortable beachfront accommodations with calm atmosphere.',
                'price_per_night' => 1800,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1sk45lzCW4GH-P5dd9UcQRq8V8HB86Ejl=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'booked', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Terese by the Sea',
                'description' => 'Wide beachfront area with cottages perfect for gatherings.',
                'price_per_night' => 2000,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1o3YNxTwK-fT9VM5ElTXr4wkW0yqGKmBm=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'booked', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Footprints in the Sand Beach Resort',
                'description' => 'Beachfront accommodations with romantic and relaxing atmosphere.',
                'price_per_night' => 2800,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1KL-KedhxUJUIhGr5jEnAsklwYfNNp-Er=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'booked']),
            ],
            [
                'name' => 'Go Beach Resort',
                'description' => 'Simple yet relaxing beachfront destination ideal for day tours.',
                'price_per_night' => 1200,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1KsbQfELkfDZXRzTy1SCTb02Bc5H6D3fu=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'booked', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Mahalta Glamping Resort',
                'description' => 'Unique glamping experience combining nature and comfort.',
                'price_per_night' => 3200,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1hkORcEtdoJ9D2ShTVf0yURA-HIE1wofm=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'booked', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'MB Hiraya Beach Resort',
                'description' => 'Affordable overnight stays and exclusive rentals for occasions.',
                'price_per_night' => 1500,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1HniUmO5KRZtHOIYvQplIPmhwS-8dQ7U7=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'booked', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Mega Buena Beach Resort',
                'description' => 'Villa rooms with scenic sea views and peaceful environment.',
                'price_per_night' => 2200,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1mNiKONhwjMFRD8e_m0RrzaB5ZkTFu6Wu=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'booked']),
            ],
            [
                'name' => 'Sky & Shore Beach Resort',
                'description' => 'Beach accommodations with swimming and recreational areas.',
                'price_per_night' => 1900,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1AsyFdqKHqF8Q1oHNI7IDnHE2LxoJnFBT=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'booked', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'PGD Beach Resort',
                'description' => 'Beachfront accommodations with various facilities.',
                'price_per_night' => 1600,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1t5YFeEH4HAeaUHQpq8e6QYVlvytcawmr=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'booked', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'RC Farm and Resort',
                'description' => 'Farm and resort experience for nature lovers.',
                'price_per_night' => 1400,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1lPBdroJFa0eHDnAyBQUhWjdEZDJB0E_e=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'booked', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Melzar\'s Mountain Resort Corp.',
                'description' => 'Relaxing mountain getaway with breathtaking views.',
                'price_per_night' => 2600,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1ZLhfteijiTFlHu7CrzmAltmGspdBPFaV=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'booked', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Nel Travelers Inn',
                'description' => 'Budget-friendly accommodations for backpackers.',
                'price_per_night' => 600,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1mO_Cd-loHoIoYR5zuIN5zwZFyFqb5n1c=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'booked']),
            ],
            [
                'name' => 'Carishiela\'s Lodging House',
                'description' => 'Affordable accommodations with basic amenities.',
                'price_per_night' => 700,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1VeZGhciIsYM0II6kWR0xQ7BC0yNoEJBx=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'booked', '2026-05-12' => 'available', '2026-05-13' => 'available', '2026-05-14' => 'available']),
            ],
            [
                'name' => 'Mansalay Food House and Lodging',
                'description' => 'Dining and accommodation services in one location.',
                'price_per_night' => 800,
                'image' => 'https://lh3.googleusercontent.com/u/0/d/1N6ncOWNkyJwbWMZgKmTVtEHw1V21oQuU=w1200-h900',
                'availability' => json_encode(['2026-05-10' => 'available', '2026-05-11' => 'available', '2026-05-12' => 'available', '2026-05-13' => 'booked', '2026-05-14' => 'available']),
            ],
        ]);
    }
}
