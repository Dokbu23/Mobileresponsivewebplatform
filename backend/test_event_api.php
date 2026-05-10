<?php

/**
 * Simple API Test Script for Event Management
 * 
 * This script tests the event management API endpoints
 * Run with: php test_event_api.php
 */

$baseUrl = 'http://localhost:8000/api';

// ANSI color codes for output
$colors = [
    'green' => "\033[32m",
    'red' => "\033[31m",
    'yellow' => "\033[33m",
    'blue' => "\033[34m",
    'reset' => "\033[0m"
];

function makeRequest($method, $url, $data = null, $token = null, $isFormData = false) {
    $ch = curl_init();
    
    $headers = ['Accept: application/json'];
    if ($token) {
        $headers[] = "Authorization: Bearer $token";
    }
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            if ($isFormData) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            } else {
                $headers[] = 'Content-Type: application/json';
                curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        }
    } elseif ($method === 'PUT') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        if ($data) {
            $headers[] = 'Content-Type: application/json';
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    } elseif ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'body' => json_decode($response, true)
    ];
}

function printTest($testName, $expected, $actual, $passed) {
    global $colors;
    $status = $passed ? "{$colors['green']}✓ PASS{$colors['reset']}" : "{$colors['red']}✗ FAIL{$colors['reset']}";
    echo "$status - $testName\n";
    if (!$passed) {
        echo "  Expected: $expected\n";
        echo "  Actual: $actual\n";
    }
}

echo "{$colors['blue']}=== Event Management API Tests ==={$colors['reset']}\n\n";

// Test 1: Public Event List (No Auth)
echo "{$colors['yellow']}Test 1: Public Event List{$colors['reset']}\n";
$response = makeRequest('GET', "$baseUrl/public/events");
$passed = $response['code'] === 200;
printTest('Public event list should return 200', '200', $response['code'], $passed);
echo "\n";

// Test 2: Login as different users
echo "{$colors['yellow']}Test 2: Authentication{$colors['reset']}\n";

// Try to login as admin (you may need to adjust credentials)
$adminLogin = makeRequest('POST', "$baseUrl/login", [
    'email' => 'admin@mansalay.com',
    'password' => 'admin123',
    'role' => 'admin'
]);
$adminToken = $adminLogin['body']['token'] ?? null;
printTest('Admin login', 'token received', $adminToken ? 'token received' : 'no token', $adminToken !== null);

// Try to login as enterprise
$enterpriseLogin = makeRequest('POST', "$baseUrl/login", [
    'email' => 'enterprise@mansalay.com',
    'password' => 'enterprise123',
    'role' => 'enterprise'
]);
$enterpriseToken = $enterpriseLogin['body']['token'] ?? null;
printTest('Enterprise login', 'token received', $enterpriseToken ? 'token received' : 'no token', $enterpriseToken !== null);

// Try to login as resort
$resortLogin = makeRequest('POST', "$baseUrl/login", [
    'email' => 'resort@mansalay.com',
    'password' => 'resort123',
    'role' => 'resort'
]);
$resortToken = $resortLogin['body']['token'] ?? null;
printTest('Resort login', 'token received', $resortToken ? 'token received' : 'no token', $resortToken !== null);

// Try to login as tourist
$touristLogin = makeRequest('POST', "$baseUrl/login", [
    'email' => 'tourist@example.com',
    'password' => 'tourist123',
    'role' => 'tourist'
]);
$touristToken = $touristLogin['body']['token'] ?? null;
printTest('Tourist login', 'token received', $touristToken ? 'token received' : 'no token', $touristToken !== null);
echo "\n";

// Test 3: Event Creation
if ($adminToken) {
    echo "{$colors['yellow']}Test 3: Admin Event Creation{$colors['reset']}\n";
    $eventData = [
        'name' => 'Test Admin Event ' . time(),
        'location' => 'Mansalay',
        'category' => 'Festival',
        'date' => '2026-06-15',
        'time' => '10:00 AM',
        'capacity' => '100',
        'description' => 'Test event created by admin',
        'full_description' => 'This is a detailed description'
    ];
    $response = makeRequest('POST', "$baseUrl/events", $eventData, $adminToken);
    $passed = $response['code'] === 201;
    printTest('Admin creates event', '201', $response['code'], $passed);
    $adminEventId = $response['body']['id'] ?? null;
    if ($adminEventId) {
        echo "  Created event ID: $adminEventId\n";
    }
    echo "\n";
}

if ($enterpriseToken) {
    echo "{$colors['yellow']}Test 4: Enterprise Event Creation{$colors['reset']}\n";
    $eventData = [
        'name' => 'Test Enterprise Event ' . time(),
        'location' => 'Mansalay Beach',
        'category' => 'Concert',
        'date' => '2026-07-20',
        'time' => '6:00 PM',
        'capacity' => '200',
        'description' => 'Test event created by enterprise',
        'full_description' => 'This is a detailed description'
    ];
    $response = makeRequest('POST', "$baseUrl/events", $eventData, $enterpriseToken);
    $passed = $response['code'] === 201;
    printTest('Enterprise creates event', '201', $response['code'], $passed);
    $enterpriseEventId = $response['body']['id'] ?? null;
    if ($enterpriseEventId) {
        echo "  Created event ID: $enterpriseEventId\n";
    }
    echo "\n";
}

if ($resortToken) {
    echo "{$colors['yellow']}Test 5: Resort Event Creation{$colors['reset']}\n";
    $eventData = [
        'name' => 'Test Resort Event ' . time(),
        'location' => 'Resort Grounds',
        'category' => 'Workshop',
        'date' => '2026-08-10',
        'time' => '2:00 PM',
        'capacity' => '50',
        'description' => 'Test event created by resort',
        'full_description' => 'This is a detailed description'
    ];
    $response = makeRequest('POST', "$baseUrl/events", $eventData, $resortToken);
    $passed = $response['code'] === 201;
    printTest('Resort creates event', '201', $response['code'], $passed);
    $resortEventId = $response['body']['id'] ?? null;
    if ($resortEventId) {
        echo "  Created event ID: $resortEventId\n";
    }
    echo "\n";
}

if ($touristToken) {
    echo "{$colors['yellow']}Test 6: Tourist Event Creation (Should Fail){$colors['reset']}\n";
    $eventData = [
        'name' => 'Test Tourist Event',
        'location' => 'Somewhere',
        'category' => 'Sports',
        'date' => '2026-09-01',
        'time' => '3:00 PM',
        'capacity' => '30',
        'description' => 'Test event created by tourist'
    ];
    $response = makeRequest('POST', "$baseUrl/events", $eventData, $touristToken);
    $passed = $response['code'] === 403;
    printTest('Tourist creates event (should fail)', '403', $response['code'], $passed);
    echo "\n";
}

// Test 7: Ownership Filtering
if ($enterpriseToken && isset($enterpriseEventId)) {
    echo "{$colors['yellow']}Test 7: Enterprise Views Own Events{$colors['reset']}\n";
    $response = makeRequest('GET', "$baseUrl/events/my", null, $enterpriseToken);
    $passed = $response['code'] === 200;
    printTest('Enterprise views own events', '200', $response['code'], $passed);
    if ($passed && is_array($response['body'])) {
        $count = count($response['body']);
        echo "  Found $count event(s)\n";
    }
    echo "\n";
}

// Test 8: Ownership Verification (Update)
if ($enterpriseToken && $resortToken && isset($enterpriseEventId) && isset($resortEventId)) {
    echo "{$colors['yellow']}Test 8: Ownership Verification{$colors['reset']}\n";
    
    // Enterprise updates own event (should succeed)
    $updateData = ['name' => 'Updated Enterprise Event'];
    $response = makeRequest('PUT', "$baseUrl/events/$enterpriseEventId", $updateData, $enterpriseToken);
    $passed = $response['code'] === 200;
    printTest('Enterprise updates own event', '200', $response['code'], $passed);
    
    // Enterprise tries to update resort event (should fail)
    $response = makeRequest('PUT', "$baseUrl/events/$resortEventId", $updateData, $enterpriseToken);
    $passed = $response['code'] === 403;
    printTest('Enterprise updates other event (should fail)', '403', $response['code'], $passed);
    echo "\n";
}

// Test 9: Admin Can Update Any Event
if ($adminToken && isset($enterpriseEventId)) {
    echo "{$colors['yellow']}Test 9: Admin Updates Any Event{$colors['reset']}\n";
    $updateData = ['name' => 'Admin Updated Event'];
    $response = makeRequest('PUT', "$baseUrl/events/$enterpriseEventId", $updateData, $adminToken);
    $passed = $response['code'] === 200;
    printTest('Admin updates any event', '200', $response['code'], $passed);
    echo "\n";
}

// Test 10: Event Deletion
if ($resortToken && isset($resortEventId)) {
    echo "{$colors['yellow']}Test 10: Event Deletion{$colors['reset']}\n";
    $response = makeRequest('DELETE', "$baseUrl/events/$resortEventId", null, $resortToken);
    $passed = $response['code'] === 200;
    printTest('Resort deletes own event', '200', $response['code'], $passed);
    echo "\n";
}

echo "{$colors['blue']}=== Tests Complete ==={$colors['reset']}\n";
echo "\n{$colors['yellow']}Note: Some tests may fail if test users don't exist in the database.{$colors['reset']}\n";
echo "{$colors['yellow']}Please ensure you have test users with the following credentials:{$colors['reset']}\n";
echo "  - admin@mansalay.com / admin123 (role: admin)\n";
echo "  - enterprise@mansalay.com / enterprise123 (role: enterprise, active subscription)\n";
echo "  - resort@mansalay.com / resort123 (role: resort, active subscription)\n";
echo "  - tourist@example.com / tourist123 (role: tourist)\n";
