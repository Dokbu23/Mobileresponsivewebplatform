<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $accounts = [
            [
                'name' => 'Tourism Admin',
                'email' => 'jaymarzx21@gmail.com',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'listing_status' => 'approved',
                'subscription_status' => 'paid',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Admin User',
                'email' => 'admin@mansalay.com',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'listing_status' => 'approved',
                'subscription_status' => 'paid',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Mansalay Beach Resort',
                'email' => 'resort@mansalay.com',
                'password' => Hash::make('resort123'),
                'role' => 'resort',
                'listing_status' => 'approved',
                'subscription_status' => 'paid',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Local Handicrafts Shop',
                'email' => 'enterprise@mansalay.com',
                'password' => Hash::make('enterprise123'),
                'role' => 'enterprise',
                'listing_status' => 'approved',
                'subscription_status' => 'paid',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Juan Dela Cruz',
                'email' => 'tourist@example.com',
                'password' => Hash::make('tourist123'),
                'role' => 'tourist',
                'listing_status' => 'approved',
                'subscription_status' => 'paid',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        ];

        foreach ($accounts as $acc) {
            User::updateOrCreate(
                ['email' => $acc['email']],
                $acc
            );
            $this->command->info("Account ready: {$acc['email']} (role: {$acc['role']})");
        }
    }
}
