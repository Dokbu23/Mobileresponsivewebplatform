<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Attraction;
use App\Models\User;
use App\Models\Accommodation;

echo "--- ATTRACTIONS --- \n";
$attractions = Attraction::all();
foreach ($attractions as $att) {
    echo "ID: {$att->id} | Name: {$att->name} | Image: {$att->image} | UserID: {$att->user_id}\n";
    if (stripos($att->name, 'teresa') !== false || stripos($att->name, 'terese') !== false) {
        $att->image = '/assets/products/beach%20and%20resorts/teresa%20by%20the%20sea.png';
        $att->save();
        echo "--> UPDATED Attraction ID {$att->id} image to '/assets/products/beach%20and%20resorts/teresa%20by%20the%20sea.png'\n";
    }
}

echo "--- RESORT USERS --- \n";
$resortUsers = User::where('role', 'resort')->get();
foreach ($resortUsers as $u) {
    echo "ID: {$u->id} | Name: {$u->name} | ResortName: {$u->resort_name} | Images: " . json_encode($u->resort_images) . "\n";
    if (stripos($u->name, 'teresa') !== false || stripos($u->name, 'terese') !== false || stripos($u->resort_name ?? '', 'teresa') !== false || stripos($u->resort_name ?? '', 'terese') !== false) {
        $u->resort_images = ['/assets/products/beach%20and%20resorts/teresa%20by%20the%20sea.png'];
        $u->save();
        echo "--> UPDATED User ID {$u->id} resort_images to ['/assets/products/beach%20and%20resorts/teresa%20by%20the%20sea.png']\n";
    }
}
