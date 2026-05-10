<?php

// Test registration API
$data = [
    'name' => 'Test Resort ' . time(),
    'email' => 'testresort' . time() . '@test.com',
    'password' => 'password123',
    'role' => 'resort',
    'phone' => '09123456789',
    'address' => '123 Test Street',
    'barangay' => 'Barangay I (Pob.)',
    'description' => 'This is a test resort registration'
];

$ch = curl_init('http://localhost:8000/api/register');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";

if ($httpCode === 201) {
    $result = json_decode($response, true);
    echo "\n✅ Registration successful!\n";
    echo "User ID: " . $result['user']['id'] . "\n";
    echo "Name: " . $result['user']['name'] . "\n";
    echo "Email: " . $result['user']['email'] . "\n";
    echo "Role: " . $result['user']['role'] . "\n";
    echo "Listing Status: " . $result['user']['listing_status'] . "\n";
    echo "Subscription Status: " . $result['user']['subscription_status'] . "\n";
} else {
    echo "\n❌ Registration failed!\n";
}
