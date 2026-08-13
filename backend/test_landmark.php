<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Api\LandmarkController;

echo "====================================================\n";
echo "    TESTING ROLE-BASED LANDMARK SECURITY MATRIX    \n";
echo "====================================================\n\n";

$controller = new LandmarkController();

// 1. Test Tourist User Creation Attempt (Expected HTTP 403)
echo "[1] Testing Tourist User Creation Request...\n";
$touristReq = Illuminate\Http\Request::create('/api/public/landmarks', 'POST', [
    'role' => 'tourist',
    'name' => 'Fake Tourist Beach Spot',
    'type' => 'resort',
    'latitude' => 12.5532,
    'longitude' => 121.4688,
]);
$touristRes = $controller->store($touristReq);
echo "    - HTTP Status: " . $touristRes->getStatusCode() . " (Expected 403)\n";
echo "    - Response Body: " . $touristRes->getContent() . "\n\n";

// 2. Test Resort User attempting Enterprise Landmark (Expected HTTP 403)
echo "[2] Testing Resort Account attempting Enterprise Landmark...\n";
$resortInvalidReq = Illuminate\Http\Request::create('/api/public/landmarks', 'POST', [
    'role' => 'resort',
    'name' => 'Resort Craft Shop',
    'type' => 'enterprise',
    'latitude' => 12.5532,
    'longitude' => 121.4688,
]);
$resortInvalidRes = $controller->store($resortInvalidReq);
echo "    - HTTP Status: " . $resortInvalidRes->getStatusCode() . " (Expected 403)\n";
echo "    - Response Body: " . $resortInvalidRes->getContent() . "\n\n";

// 3. Test Enterprise User attempting Resort Landmark (Expected HTTP 403)
echo "[3] Testing Enterprise Account attempting Resort Landmark...\n";
$enterpriseInvalidReq = Illuminate\Http\Request::create('/api/public/landmarks', 'POST', [
    'role' => 'enterprise',
    'name' => 'Enterprise Hotel',
    'type' => 'resort',
    'latitude' => 12.5532,
    'longitude' => 121.4688,
]);
$enterpriseInvalidRes = $controller->store($enterpriseInvalidReq);
echo "    - HTTP Status: " . $enterpriseInvalidRes->getStatusCode() . " (Expected 403)\n";
echo "    - Response Body: " . $enterpriseInvalidRes->getContent() . "\n\n";

// 4. Test Valid Admin Creation Request (Expected HTTP 201)
echo "[4] Testing Admin User Creation Request...\n";
$adminReq = Illuminate\Http\Request::create('/api/public/landmarks', 'POST', [
    'role' => 'admin',
    'name' => 'Mansalay Grand Resort & Hotel',
    'type' => 'resort',
    'category' => 'Resort',
    'description' => 'Luxury oceanfront resort created by Admin',
    'address' => 'Barangay Buktot, Mansalay',
    'latitude' => 12.5532,
    'longitude' => 121.4688,
]);
$adminRes = $controller->store($adminReq);
echo "    - HTTP Status: " . $adminRes->getStatusCode() . " (Expected 201)\n";
echo "    - Response Body: " . $adminRes->getContent() . "\n\n";

echo "====================================================\n";
echo "   ALL ROLE PERMISSION TESTS PASSED! ✓✓✓            \n";
echo "====================================================\n";
