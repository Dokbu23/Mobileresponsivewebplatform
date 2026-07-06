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
        // ---------------------------------------------------------------
        // Seed all test users (idempotent — uses firstOrCreate)
        // ---------------------------------------------------------------
        $users = [
            // Admin
            [
                'name'             => 'Admin User',
                'email'            => 'admin@mansalay.com',
                'password'         => bcrypt('admin123'),
                'role'             => 'admin',
                'listing_status'   => 'approved',
                'subscription_status' => 'paid',
                'is_active'        => true,
                'email_verified_at' => now(),
            ],
            // Tourists
            [
                'name'             => 'Juan Dela Cruz',
                'email'            => 'tourist@example.com',
                'password'         => bcrypt('tourist123'),
                'role'             => 'tourist',
                'listing_status'   => 'approved',
                'subscription_status' => 'paid',
                'is_active'        => true,
                'email_verified_at' => now(),
            ],
            [
                'name'             => 'Maria Santos',
                'email'            => 'tourist2@example.com',
                'password'         => bcrypt('tourist123'),
                'role'             => 'tourist',
                'listing_status'   => 'approved',
                'subscription_status' => 'paid',
                'is_active'        => true,
                'email_verified_at' => now(),
            ],
            // Resorts
            [
                'name'             => 'Mansalay Beach Resort',
                'email'            => 'resort@mansalay.com',
                'password'         => bcrypt('resort123'),
                'role'             => 'resort',
                'listing_status'   => 'approved',
                'subscription_status' => 'active',
                'is_active'        => true,
                'email_verified_at' => now(),
            ],
            [
                'name'             => 'Mountain View Lodge',
                'email'            => 'lodge@mansalay.com',
                'password'         => bcrypt('resort123'),
                'role'             => 'resort',
                'listing_status'   => 'approved',
                'subscription_status' => 'active',
                'is_active'        => true,
                'email_verified_at' => now(),
            ],
            // Enterprises
            [
                'name'             => 'Local Handicrafts Shop',
                'email'            => 'enterprise@mansalay.com',
                'password'         => bcrypt('enterprise123'),
                'role'             => 'enterprise',
                'listing_status'   => 'approved',
                'subscription_status' => 'active',
                'is_active'        => true,
                'email_verified_at' => now(),
            ],
            [
                'name'             => 'Mansalay Food Products',
                'email'            => 'foodshop@mansalay.com',
                'password'         => bcrypt('enterprise123'),
                'role'             => 'enterprise',
                'listing_status'   => 'approved',
                'subscription_status' => 'active',
                'is_active'        => true,
                'email_verified_at' => now(),
            ],
        ];

        foreach ($users as $userData) {
            \App\Models\User::firstOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }

        // Seed Payment Settings
        $this->call(PaymentSettingsSeeder::class);

        // Seed Tourism Data
        $this->call(TourismDataSeeder::class);

        $this->command->info('Database seeded successfully!');
        $this->command->info('Test accounts:');
        $this->command->info('  admin@mansalay.com / admin123');
        $this->command->info('  tourist@example.com / tourist123');
        $this->command->info('  tourist2@example.com / tourist123');
        $this->command->info('  resort@mansalay.com / resort123');
        $this->command->info('  lodge@mansalay.com / resort123');
        $this->command->info('  enterprise@mansalay.com / enterprise123');
        $this->command->info('  foodshop@mansalay.com / enterprise123');
        $this->command->info('Users: ' . \App\Models\User::count());
        $this->command->info('Products: ' . Product::count());
        $this->command->info('Attractions: ' . Attraction::count());
        $this->command->info('Events: ' . Event::count());
        $this->command->info('Accommodations: ' . Accommodation::count());
    }
}
