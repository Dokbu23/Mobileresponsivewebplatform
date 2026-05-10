<?php

// Test script to check tourist orders API
require_once 'vendor/autoload.php';

echo "=== Testing Tourist Orders API ===\n\n";

// Test 1: Check if tourist users exist
echo "1. Checking tourist users...\n";
$tourists = \App\Models\User::where('role', 'tourist')->get();
echo "Found {$tourists->count()} tourist users:\n";
foreach ($tourists as $tourist) {
    echo "  - ID: {$tourist->id}, Email: {$tourist->email}, Name: {$tourist->name}\n";
}
echo "\n";

// Test 2: Check orders with customer_id
echo "2. Checking orders with customer_id...\n";
$orders = \App\Models\Order::whereNotNull('customer_id')->with(['customer', 'businessOwner'])->get();
echo "Found {$orders->count()} orders with customer_id:\n";
foreach ($orders as $order) {
    echo "  - Order ID: {$order->id}, Customer ID: {$order->customer_id}, Status: {$order->status}\n";
    if ($order->customer) {
        echo "    Customer: {$order->customer->name} ({$order->customer->email})\n";
    }
    if ($order->businessOwner) {
        echo "    Business: {$order->businessOwner->name}\n";
    }
    echo "\n";
}

// Test 3: Test OrderController logic for a specific tourist
if ($tourists->count() > 0) {
    $testTourist = $tourists->first();
    echo "3. Testing OrderController logic for tourist: {$testTourist->email}\n";
    
    $touristOrders = \App\Models\Order::with(['businessOwner'])
        ->where('customer_id', $testTourist->id)
        ->orderBy('created_at','desc')
        ->get();
    
    echo "Orders for this tourist: {$touristOrders->count()}\n";
    foreach ($touristOrders as $order) {
        echo "  - Order #{$order->id}: {$order->status} - ₱{$order->total}\n";
        echo "    Items: " . json_encode($order->items) . "\n";
        if ($order->businessOwner) {
            echo "    Business: {$order->businessOwner->name}\n";
        }
        echo "\n";
    }
}

echo "=== Test Complete ===\n";