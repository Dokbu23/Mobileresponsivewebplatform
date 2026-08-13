<?php
require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

$email = 'jaymarxz21@gmail.com';
$password = 'Password123';

$user = User::where('email', $email)->first();

if (!$user) {
    $user = User::create([
        'name' => 'Jay Marx',
        'email' => $email,
        'password' => Hash::make($password),
        'role' => 'tourist',
        'is_active' => true,
        'email_verified_at' => Carbon::now(),
    ]);
    echo "CREATED user {$email} as tourist.\n";
} else {
    $user->password = Hash::make($password);
    $user->role = 'tourist';
    $user->is_active = true;
    $user->email_verified_at = Carbon::now();
    $user->save();
    echo "VERIFIED & UPDATED user {$email}.\n";
}
