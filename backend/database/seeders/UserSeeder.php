<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $users = [
            [
                'name' => 'Admin User',
                'email' => 'admin@discovermansalay.test',
                'password' => Hash::make('password123'),
                'role' => 'admin',
            ],
            [
                'name' => 'Resort Owner',
                'email' => 'resort@discovermansalay.test',
                'password' => Hash::make('password123'),
                'role' => 'resort',
            ],
            [
                'name' => 'Enterprise User',
                'email' => 'enterprise@discovermansalay.test',
                'password' => Hash::make('password123'),
                'role' => 'enterprise',
            ],
            [
                'name' => 'Tourist User',
                'email' => 'tourist@discovermansalay.test',
                'password' => Hash::make('password123'),
                'role' => 'tourist',
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }
    }
}
