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
        // Get admin user ID (assuming admin exists)
        $adminId = DB::table('users')->where('role', 'admin')->first()->id ?? 1;

        // Seed Attractions
        $attractions = [
            [
                'name' => 'Puting Buhangin Beach',
                'description' => 'A pristine white sand beach with crystal clear waters, perfect for swimming and snorkeling.',
                'full_description' => 'Puting Buhangin Beach is known for its powdery white sand and turquoise waters. The beach offers excellent swimming conditions and is a popular spot for snorkeling with visible coral formations near the shore.',
                'location' => 'Barangay Puting Buhangin, Mansalay',
                'category' => 'Beach',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Buyayao Falls',
                'description' => 'A majestic multi-tiered waterfall surrounded by lush forest.',
                'full_description' => 'Buyayao Falls cascades down several levels creating natural pools perfect for swimming. The falls are surrounded by pristine forest and offer a refreshing escape from the heat.',
                'location' => 'Barangay Buyayao, Mansalay',
                'category' => 'Waterfall',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Mansalay River',
                'description' => 'A scenic river perfect for kayaking and river cruising.',
                'full_description' => 'The calm waters and beautiful scenery of Mansalay River make it ideal for nature lovers. Kayaking tours are available, and the river is home to various bird species.',
                'location' => 'Mansalay Town Proper',
                'category' => 'River',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Mount Mansalay',
                'description' => 'A challenging hiking destination offering panoramic views.',
                'full_description' => 'Mount Mansalay offers panoramic views of Mansalay and surrounding areas. Popular among adventure seekers and mountaineers, the trail takes 4-6 hours to complete.',
                'location' => 'Mansalay Mountain Range',
                'category' => 'Mountain',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Coral Garden Marine Sanctuary',
                'description' => 'An underwater paradise featuring vibrant coral reefs.',
                'full_description' => 'The Coral Garden Marine Sanctuary features vibrant coral reefs and diverse marine life. Perfect for snorkeling and diving enthusiasts, with visibility often exceeding 20 meters.',
                'location' => 'Offshore Mansalay',
                'category' => 'Marine Sanctuary',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Mansalay Church (St. Joseph Parish)',
                'description' => 'A historic Spanish-era church built in the 1800s.',
                'full_description' => 'St. Joseph Parish features beautiful Spanish colonial architecture and serves as a cultural landmark. The church hosts the annual town fiesta every March.',
                'location' => 'Poblacion, Mansalay',
                'category' => 'Historical Site',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Mangrove Forest Park',
                'description' => 'A protected mangrove ecosystem with boardwalk trails.',
                'full_description' => 'The Mangrove Forest Park features elevated boardwalk trails through the mangrove ecosystem. Great for eco-tourism, bird watching, and learning about coastal conservation.',
                'location' => 'Barangay Victoria, Mansalay',
                'category' => 'Eco Park',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Talipanan Beach',
                'description' => 'A secluded beach with golden sand and calm waters.',
                'full_description' => 'Talipanan Beach offers a more secluded experience with golden sand and calm waters. Perfect for family picnics and relaxation away from crowds.',
                'location' => 'Barangay Talipanan, Mansalay',
                'category' => 'Beach',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Biga Falls',
                'description' => 'A hidden gem waterfall with cool, refreshing waters.',
                'full_description' => 'Biga Falls is surrounded by tropical vegetation and accessible via a short 30-minute trek. The cool waters and natural pool make it perfect for swimming.',
                'location' => 'Barangay Biga, Mansalay',
                'category' => 'Waterfall',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Mansalay Public Market',
                'description' => 'A vibrant local market offering fresh produce and seafood.',
                'full_description' => 'Experience authentic local culture at Mansalay Public Market. Find fresh produce, seafood, local handicrafts, and traditional Filipino delicacies.',
                'location' => 'Poblacion, Mansalay',
                'category' => 'Market',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        DB::table('attractions')->insert($attractions);

        // Seed Accommodations
        $accommodations = [
            [
                'name' => 'Puting Buhangin Beach Resort',
                'description' => 'Beachfront resort with modern amenities, swimming pool, and restaurant. Offers stunning ocean views and direct beach access. Amenities: WiFi, Swimming Pool, Restaurant, Beach Access, Air Conditioning, Hot Shower.',
                'price_per_night' => 2500,
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Mansalay Bay Hotel',
                'description' => 'Comfortable hotel in town center with easy access to local attractions. Features spacious rooms and friendly service. Amenities: WiFi, Air Conditioning, Cable TV, Hot Shower, Parking, Restaurant.',
                'price_per_night' => 1800,
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Riverside Cottages',
                'description' => 'Cozy cottages along Mansalay River. Perfect for nature lovers seeking a peaceful retreat. Amenities: WiFi, River View, Fan, Shared Kitchen, Parking.',
                'price_per_night' => 1500,
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Mountain View Lodge',
                'description' => 'Hillside lodge offering panoramic mountain views. Ideal for hikers and adventure seekers. Amenities: Mountain View, Restaurant, Hiking Guides, Bonfire Area, Hot Shower.',
                'price_per_night' => 2000,
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Talipanan Beach Huts',
                'description' => 'Traditional nipa huts right on the beach. Affordable and authentic beach experience. Amenities: Beach Access, Fan, Shared Bathroom, Grilling Area.',
                'price_per_night' => 1200,
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Coral Bay Dive Resort',
                'description' => 'Dive resort with equipment rental and dive guides. Perfect for diving enthusiasts. Amenities: Dive Shop, Equipment Rental, Dive Guides, Restaurant, WiFi, Air Conditioning.',
                'price_per_night' => 3000,
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Mansalay Pension House',
                'description' => 'Budget-friendly pension house in town center. Clean rooms with basic amenities. Amenities: WiFi, Fan, Shared Bathroom, Cable TV.',
                'price_per_night' => 800,
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Eco Lodge Mansalay',
                'description' => 'Eco-friendly lodge promoting sustainable tourism. Solar-powered with organic garden. Amenities: Solar Power, Organic Garden, Nature Trails, Bird Watching, WiFi.',
                'price_per_night' => 2200,
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Sunset View Inn',
                'description' => 'Charming inn with spectacular sunset views. Rooftop terrace and cozy rooms. Amenities: Rooftop Terrace, WiFi, Air Conditioning, Hot Shower, Breakfast Included.',
                'price_per_night' => 1600,
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Family Beach Resort',
                'description' => 'Family-friendly resort with playground and kiddie pool. Spacious family rooms available. Amenities: Kiddie Pool, Playground, Family Rooms, Restaurant, WiFi, Beach Access.',
                'price_per_night' => 2800,
                'availability' => json_encode(['monday' => true, 'tuesday' => true, 'wednesday' => true, 'thursday' => true, 'friday' => true, 'saturday' => true, 'sunday' => true]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        DB::table('accommodations')->insert($accommodations);

        // Seed Products
        $products = [
            [
                'name' => 'Dried Mangoes',
                'description' => 'Sweet and chewy dried mangoes from local farms. Perfect pasalubong from Mansalay.',
                'price' => 150,
                'category' => 'Food',
                'stock' => 100,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Coconut Oil',
                'description' => 'Pure virgin coconut oil extracted from fresh coconuts. 500ml bottle.',
                'price' => 200,
                'category' => 'Food',
                'stock' => 50,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Handwoven Banig Mat',
                'description' => 'Traditional handwoven mat made by local artisans. Colorful and durable.',
                'price' => 500,
                'category' => 'Handicraft',
                'stock' => 30,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Dried Fish (Tuyo)',
                'description' => 'Salted dried fish, a Filipino breakfast staple. Freshly caught from Mansalay waters.',
                'price' => 120,
                'category' => 'Food',
                'stock' => 80,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Bamboo Handicrafts',
                'description' => 'Decorative bamboo crafts including baskets, lamps, and ornaments.',
                'price' => 350,
                'category' => 'Handicraft',
                'stock' => 40,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Local Honey',
                'description' => 'Pure organic honey from Mansalay forests. 250ml jar.',
                'price' => 250,
                'category' => 'Food',
                'stock' => 60,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Shell Jewelry',
                'description' => 'Beautiful jewelry made from local seashells. Necklaces, bracelets, and earrings.',
                'price' => 180,
                'category' => 'Jewelry',
                'stock' => 70,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Banana Chips',
                'description' => 'Crispy banana chips, lightly sweetened. Made from local bananas.',
                'price' => 100,
                'category' => 'Food',
                'stock' => 120,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Woven Bags',
                'description' => 'Eco-friendly woven bags made from natural fibers. Various sizes available.',
                'price' => 400,
                'category' => 'Handicraft',
                'stock' => 35,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Coffee Beans',
                'description' => 'Locally grown and roasted coffee beans. Rich and aromatic. 250g pack.',
                'price' => 280,
                'category' => 'Food',
                'stock' => 45,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Peanut Brittle',
                'description' => 'Sweet and crunchy peanut brittle. A favorite local delicacy.',
                'price' => 130,
                'category' => 'Food',
                'stock' => 90,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Wooden Carvings',
                'description' => 'Intricate wooden carvings of local wildlife and cultural symbols.',
                'price' => 600,
                'category' => 'Handicraft',
                'stock' => 20,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        DB::table('products')->insert($products);

        // Seed Events
        $events = [
            [
                'name' => 'Mansalay Town Fiesta',
                'description' => 'Annual town celebration featuring street dancing, cultural shows, and food festival.',
                'full_description' => 'The Mansalay Town Fiesta celebrates the feast of St. Joseph, patron saint of Mansalay. Features street dancing, cultural shows, food festival, and religious activities. A week-long celebration of local culture and traditions.',
                'location' => 'Poblacion, Mansalay',
                'category' => 'Festival',
                'date' => Carbon::create(2024, 3, 19),
                'time' => '8:00 AM - 10:00 PM',
                'capacity' => 'Unlimited',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Beach Clean-up Drive',
                'description' => 'Community-led environmental activity to keep Mansalay beaches clean.',
                'full_description' => 'Join us in keeping Mansalay beaches pristine! Community-led environmental activity. Volunteers welcome. Free snacks and refreshments provided. Bring your own gloves and bags.',
                'location' => 'Puting Buhangin Beach',
                'category' => 'Community Service',
                'date' => Carbon::create(2024, 6, 8),
                'time' => '6:00 AM - 10:00 AM',
                'capacity' => '100',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Mansalay Food Festival',
                'description' => 'Showcase of local cuisine and delicacies with cooking competitions.',
                'full_description' => 'Experience the flavors of Mansalay! Cooking competitions, food stalls featuring local delicacies, and cultural performances. Taste authentic Mansalay cuisine and vote for your favorite dish.',
                'location' => 'Mansalay Public Market Area',
                'category' => 'Food Festival',
                'date' => Carbon::create(2024, 5, 15),
                'time' => '10:00 AM - 8:00 PM',
                'capacity' => 'Unlimited',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Diving Festival',
                'description' => 'Underwater photography contest and dive competitions.',
                'full_description' => 'Celebrate Mansalay\'s marine biodiversity! Underwater photography contest, dive competitions, and marine conservation awareness activities. Open to certified divers only.',
                'location' => 'Coral Garden Marine Sanctuary',
                'category' => 'Sports',
                'date' => Carbon::create(2024, 4, 20),
                'time' => '7:00 AM - 5:00 PM',
                'capacity' => '50',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Mountain Hiking Challenge',
                'description' => 'Organized hiking event to Mount Mansalay with experienced guides.',
                'full_description' => 'Conquer Mount Mansalay! Registration required. Experienced guides provided. Difficulty: Moderate to Difficult. Estimated time: 4-6 hours. Bring your own water and snacks.',
                'location' => 'Mount Mansalay',
                'category' => 'Adventure',
                'date' => Carbon::create(2024, 7, 10),
                'time' => '5:00 AM - 2:00 PM',
                'capacity' => '30',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Handicraft Fair',
                'description' => 'Exhibition and sale of local handicrafts by Mansalay artisans.',
                'full_description' => 'Meet local artisans and learn traditional crafts! Exhibition and sale of handwoven mats, bamboo crafts, shell jewelry, and wooden carvings. Workshops available for visitors.',
                'location' => 'Mansalay Municipal Hall',
                'category' => 'Cultural',
                'date' => Carbon::create(2024, 8, 5),
                'time' => '9:00 AM - 6:00 PM',
                'capacity' => 'Unlimited',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Summer Beach Party',
                'description' => 'Beach party with live music, games, and bonfire.',
                'full_description' => 'Kick off summer at Talipanan Beach! Live music, beach games, volleyball tournament, and bonfire. Family-friendly event. Food and drinks available for purchase.',
                'location' => 'Talipanan Beach',
                'category' => 'Entertainment',
                'date' => Carbon::create(2024, 5, 1),
                'time' => '3:00 PM - 11:00 PM',
                'capacity' => 'Unlimited',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        DB::table('events')->insert($events);

        $this->command->info('Tourism data seeded successfully!');
        $this->command->info('- ' . count($attractions) . ' attractions');
        $this->command->info('- ' . count($accommodations) . ' accommodations');
        $this->command->info('- ' . count($products) . ' products');
        $this->command->info('- ' . count($events) . ' events');
    }
}
