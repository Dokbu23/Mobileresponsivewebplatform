<?php
require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$admins = [
    [
        'name' => 'Tourism Admin',
        'email' => 'jaymarzx21@gmail.com',
        'password' => 'admin123'
    ],
    [
        'name' => 'Mansalay Admin',
        'email' => 'admin@mansalay.gov.ph',
        'password' => 'admin123'
    ]
];

foreach ($admins as $acc) {
    $user = User::where('email', $acc['email'])->first();
    if (!$user) {
        $user = new User();
        $user->email = $acc['email'];
    }
    $user->name = $acc['name'];
    $user->password = Hash::make($acc['password']);
    $user->role = 'admin';
    $user->is_active = true;
    $user->email_verified_at = now();
    $user->save();
    echo "✓ Admin Ready: {$user->email} (Password: {$acc['password']})\n";
}
