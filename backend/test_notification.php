<?php

require_once __DIR__ . '/vendor/autoload.php';

// Load environment variables
$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $env = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($env as $line) {
        if (strpos($line, '=') !== false && substr($line, 0, 1) !== '#') {
            putenv($line);
        }
    }
}

// Bootstrap Laravel application
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Notification;

// Test notification creation
echo "Testing notification system...\n";

try {
    // Find a tourist user
    $user = User::where('role', 'tourist')->first();
    
    if (!$user) {
        echo "No tourist user found. Creating one...\n";
        $user = User::create([
            'name' => 'Test Tourist',
            'email' => 'test.tourist@example.com',
            'password' => bcrypt('password'),
            'role' => 'tourist',
            'listing_status' => 'approved',
            'subscription_status' => 'paid',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }
    
    echo "Found/created user: {$user->name} (ID: {$user->id})\n";
    
    // Create test notifications of different types
    $notifications = [
        [
            'type' => 'account_status_change',
            'title' => 'Account Approved',
            'message' => 'Your tourist account has been approved! You can now start using all features.',
            'data' => ['old_status' => 'pending', 'new_status' => 'approved', 'role' => 'tourist'],
            'link' => '/profile'
        ],
        [
            'type' => 'wishlist_added',
            'title' => 'Item Added to Wishlist',
            'message' => 'You added "Malasimbo Beach" to your wishlist.',
            'data' => ['item_type' => 'attraction', 'item_id' => 1, 'item_name' => 'Malasimbo Beach'],
            'link' => '/wishlist'
        ],
        [
            'type' => 'content_published',
            'title' => 'New Attraction Available',
            'message' => 'A new attraction "Hidden Falls" has been published in Mansalay!',
            'data' => ['content_type' => 'attraction', 'content_id' => 5, 'publisher' => 'Admin'],
            'link' => '/attractions/5'
        ]
    ];
    
    echo "Creating test notifications...\n";
    
    foreach ($notifications as $notificationData) {
        $notification = Notification::notify(
            $user->id,
            $notificationData['type'],
            $notificationData['title'],
            $notificationData['message'],
            $notificationData['data'],
            $notificationData['link']
        );
        
        if ($notification) {
            echo "✓ Created: {$notificationData['title']}\n";
        } else {
            echo "✗ Failed to create: {$notificationData['title']}\n";
        }
    }
    
    // Check total notifications
    $totalNotifications = Notification::where('user_id', $user->id)->count();
    $unreadNotifications = Notification::where('user_id', $user->id)->where('is_read', false)->count();
    
    echo "\nNotification Summary:\n";
    echo "Total notifications for user: {$totalNotifications}\n";
    echo "Unread notifications: {$unreadNotifications}\n";
    
    echo "\nTest completed successfully! ✓\n";
    echo "You can now:\n";
    echo "1. Login as {$user->email} (password: password)\n";
    echo "2. Check the notification bell icon in the navbar\n";
    echo "3. Click the bell to see your notifications\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}