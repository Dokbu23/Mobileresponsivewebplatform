<?php

// Simple test for login API
$url = 'http://localhost:8000/api/login';
$data = [
    'email' => 'enterprise@mansalay.com',
    'password' => 'enterprise123'
];

$options = [
    'http' => [
        'header' => "Content-type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);

if ($result === FALSE) {
    echo "Login failed\n";
} else {
    echo "Login response:\n";
    echo $result . "\n";
    
    $response = json_decode($result, true);
    if (isset($response['access_token'])) {
        echo "\n✅ Login successful!\n";
        echo "Token: " . substr($response['access_token'], 0, 20) . "...\n";
        
        // Test getting orders
        $token = $response['access_token'];
        $ordersUrl = 'http://localhost:8000/api/orders/my';
        
        $ordersOptions = [
            'http' => [
                'header' => "Authorization: Bearer $token\r\nContent-type: application/json\r\n",
                'method' => 'GET'
            ]
        ];
        
        $ordersContext = stream_context_create($ordersOptions);
        $ordersResult = file_get_contents($ordersUrl, false, $ordersContext);
        
        echo "\nOrders response:\n";
        echo $ordersResult . "\n";
        
    } else {
        echo "\n❌ Login failed - no token received\n";
    }
}