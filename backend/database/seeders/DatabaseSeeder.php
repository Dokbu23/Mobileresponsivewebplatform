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
        // Seed Admin User only (if doesn't exist)
        $adminUser = [
            'name' => 'Admin User',
            'email' => 'admin@mansalay.com',
            'password' => bcrypt('admin123'),
            'role' => 'admin',
            'email_verified_at' => now(),
        ];

        \App\Models\User::firstOrCreate(
            ['email' => $adminUser['email']],
            $adminUser
        );

        // Seed Payment Settings
        $this->call(PaymentSettingsSeeder::class);

        $this->command->info('Database seeded successfully!');
        $this->command->info('Admin user created: admin@mansalay.com / admin123');
        $this->command->info('Users: ' . \App\Models\User::count());
        $this->command->info('Products: ' . Product::count());
        $this->command->info('Attractions: ' . Attraction::count());
        $this->command->info('Events: ' . Event::count());
        $this->command->info('Accommodations: ' . Accommodation::count());
    }
}
