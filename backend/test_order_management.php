<?php

// Test script for order management functionality
require_once 'vendor/autoload.php';

function testAPI($method, $url, $data = null, $token = null) {
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, "http://localhost:8000/api" . $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "=== $method $url ===\n";
    echo "HTTP Code: $httpCode\n";
    echo "Response: " . $response . "\n\n";
    
    return json_decode($response, true);
}

// Test 1: Login as enterprise user
echo "🔐 Testing Enterprise Login...\n";
$loginResponse = testAPI('POST', '/login', [
    'email' => 'enterprise@mansalay.com',
    'password' => 'enterprise123'
]);

if (!isset($loginResponse['access_token'])) {
    echo "❌ Login failed!\n";
    exit(1);
}

$token = $loginResponse['access_token'];
echo "✅ Login successful! Token: " . substr($token, 0, 20) . "...\n\n";

// Test 2: Get orders for enterprise user
echo "📦 Testing Get Orders...\n";
$ordersResponse = testAPI('GET', '/orders/my', null, $token);

if (!is_array($ordersResponse)) {
    echo "❌ Failed to get orders!\n";
    exit(1);
}

echo "✅ Orders retrieved: " . count($ordersResponse) . " orders\n";
foreach ($ordersResponse as $order) {
    echo "  - Order #{$order['id']}: {$order['status']} - ₱{$order['total']}\n";
}
echo "\n";

// Test 3: Update order status (if there are orders)
if (count($ordersResponse) > 0) {
    $orderId = $ordersResponse[0]['id'];
    $currentStatus = $ordersResponse[0]['status'];
    
    // Determine next status
    $nextStatus = 'confirmed';
    if ($currentStatus === 'pending') {
        $nextStatus = 'confirmed';
    } elseif ($currentStatus === 'confirmed') {
        $nextStatus = 'shipped';
    } elseif ($currentStatus === 'shipped') {
        $nextStatus = 'delivered';
    }
    
    echo "🔄 Testing Order Status Update...\n";
    echo "Updating Order #{$orderId} from '{$currentStatus}' to '{$nextStatus}'\n";
    
    $updateResponse = testAPI('PATCH', "/orders/{$orderId}", [
        'status' => $nextStatus
    ], $token);
    
    if (isset($updateResponse['status']) && $updateResponse['status'] === $nextStatus) {
        echo "✅ Order status updated successfully!\n";
    } else {
        echo "❌ Order status update failed!\n";
        print_r($updateResponse);
    }
} else {
    echo "⚠️  No orders to test status update\n";
}

echo "\n🎉 All tests completed!\n";