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
        $email = 'jaymarzx21@gmail.com';
        $name = 'Tourism';
        $password = 'admin123';

        if (User::where('email', $email)->exists()) {
            $this->command->info("Admin user already exists: {$email}");
            return;
        }

        User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'admin',
        ]);

        $this->command->info("Admin user created: {$email} (password: {$password})");
    }
}
