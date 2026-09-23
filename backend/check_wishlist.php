<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$items = \App\Models\WishlistItem::all();
echo "TOTAL WISHLIST ITEMS IN DB: " . count($items) . "\n";
foreach ($items as $item) {
    echo "User: {$item->user_id} | item_id: [{$item->item_id}] | item_type: [{$item->item_type}]\n";
}

echo "\nACCOMMODATIONS / ROOMS:\n";
foreach (\App\Models\ResortRoom::all() as $r) {
    echo "Room ID: {$r->id} | Name: {$r->name} | Likes: {$r->likes} | User: {$r->user_id}\n";
}
foreach (\App\Models\Accommodation::all() as $a) {
    echo "Acc ID: {$a->id} | Name: {$a->name} | Likes: {$a->likes} | User: {$a->user_id}\n";
}
