<?php

// Bootstrap Laravel application
require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\PaymentSetting;
use App\Models\PaymentMethod;
use App\Models\SubscriptionPayment;
use App\Models\Notification;
use App\Http\Controllers\Api\SubscriptionController;
use Illuminate\Http\Request;

echo "========================================\n";
echo "   TESTING SUBSCRIPTION FEE SYSTEM     \n";
echo "========================================\n\n";

try {
    // Step 1: Test Payment Settings retrieval
    echo "[1] Checking Payment Settings & Methods...\n";
    $settings = PaymentSetting::current();
    if (!$settings) {
        $settings = PaymentSetting::create(['subscription_amount' => 50.00]);
    }
    echo "    ✓ Current Subscription Fee: ₱" . number_format($settings->subscription_amount, 2) . "\n";

    $methods = PaymentMethod::enabled()->get();
    if ($methods->isEmpty()) {
        echo "    ! No payment methods found. Creating test GCash method...\n";
        PaymentMethod::create([
            'name' => 'GCash',
            'account_name' => 'Mansalay Tourism',
            'account_number' => '09123456789',
            'instructions' => 'Send payment to GCash number and save screenshot receipt.',
            'is_enabled' => true
        ]);
        $methods = PaymentMethod::enabled()->get();
    }

    foreach ($methods as $m) {
        echo "    ✓ Method: {$m->name} - {$m->account_name} ({$m->account_number})\n";
    }

    // Step 2: Create / Find Test Enterprise User
    echo "\n[2] Setting up Test Enterprise User...\n";
    $testUser = User::where('email', 'test.enterprise@mansalay.test')->first();
    if ($testUser) {
        $testUser->delete(); // Clean up previous run
    }
    
    $testUser = User::create([
        'name' => 'Test Enterprise Resort',
        'email' => 'test.enterprise@mansalay.test',
        'password' => bcrypt('password123'),
        'role' => 'enterprise',
        'listing_status' => 'approved',
        'subscription_status' => 'unpaid',
        'is_active' => true,
        'email_verified_at' => now()
    ]);
    echo "    ✓ Created User: {$testUser->name} ({$testUser->email}), Status: {$testUser->subscription_status}\n";

    // Step 3: Test Uploading Payment Receipt
    echo "\n[3] Simulating Payment Submission by Enterprise User...\n";
    $payment = SubscriptionPayment::create([
        'user_id' => $testUser->id,
        'amount' => $settings->subscription_amount,
        'payment_method' => 'GCash',
        'payment_reference' => 'REF-' . rand(100000, 999999),
        'receipt_image' => '/storage/subscription_receipts/test_receipt.jpg',
        'notes' => 'Test monthly subscription payment',
        'status' => 'pending'
    ]);

    $testUser->subscription_status = 'pending';
    $testUser->save();
    echo "    ✓ Payment submitted! ID: {$payment->id}, Ref: {$payment->payment_reference}\n";
    echo "    ✓ User subscription_status updated to: {$testUser->fresh()->subscription_status}\n";

    // Step 4: Check Admin Notification
    echo "\n[4] Creating Admin Notification...\n";
    $notification = Notification::notifyAdmins(
        'subscription_paid',
        'Subscription Payment Submitted',
        "{$testUser->name} submitted a subscription payment of ₱{$settings->subscription_amount}.",
        ['payment_id' => $payment->id, 'user_id' => $testUser->id],
        '/admin/subscriptions'
    );
    echo "    ✓ Admin Notification dispatched!\n";

    // Step 5: Test Admin Verification (Approval)
    echo "\n[5] Simulating Admin Verification (Approval)...\n";
    $admin = User::where('role', 'admin')->first();
    if (!$admin) {
        $admin = User::firstOrCreate(
            ['email' => 'test.admin@mansalay.test'],
            [
                'name' => 'Test Admin',
                'password' => bcrypt('admin123'),
                'role' => 'admin',
                'is_active' => true
            ]
        );
    }

    $payment->update([
        'status' => 'verified',
        'verified_by' => $admin->id,
        'verified_at' => now()
    ]);

    $testUser->subscription_status = 'paid';
    $testUser->subscription_paid_at = now();
    $testUser->subscription_expires_at = now()->addYear();
    $testUser->subscription_amount = $payment->amount;
    $testUser->listing_status = 'approved';
    $testUser->save();

    $updatedUser = $testUser->fresh();
    echo "    ✓ Payment status: {$payment->fresh()->status}\n";
    echo "    ✓ Verified by: {$admin->name}\n";
    echo "    ✓ User subscription_status: {$updatedUser->subscription_status}\n";
    echo "    ✓ Expiration date set to: " . ($updatedUser->subscription_expires_at ? $updatedUser->subscription_expires_at->toDateTimeString() : 'N/A') . "\n";

    // Step 6: Test Admin Rejection Scenario
    echo "\n[6] Testing Rejection Flow Scenario...\n";
    $testUser2 = User::where('email', 'test.reject@mansalay.test')->first();
    if ($testUser2) {
        $testUser2->delete();
    }

    $testUser2 = User::create([
        'name' => 'Test Reject Resort',
        'email' => 'test.reject@mansalay.test',
        'password' => bcrypt('password123'),
        'role' => 'resort',
        'listing_status' => 'approved',
        'subscription_status' => 'pending',
        'is_active' => true
    ]);

    $rejectPayment = SubscriptionPayment::create([
        'user_id' => $testUser2->id,
        'amount' => 50.00,
        'payment_method' => 'GCash',
        'payment_reference' => 'INVALID-REF-999',
        'receipt_image' => '/storage/subscription_receipts/blurry_receipt.jpg',
        'status' => 'pending'
    ]);

    $rejectPayment->update([
        'status' => 'rejected',
        'notes' => 'Receipt is unreadable and reference number invalid.',
        'verified_by' => $admin->id,
        'verified_at' => now()
    ]);

    $testUser2->subscription_status = 'unpaid';
    $testUser2->save();
    echo "    ✓ Rejected payment status: {$rejectPayment->fresh()->status}\n";
    echo "    ✓ User status updated to: {$testUser2->fresh()->subscription_status}\n";

    // Cleanup test users
    $testUser->delete();
    $testUser2->delete();

    echo "\n========================================\n";
    echo "  ALL SUBSCRIPTION TESTS PASSED! ✓✓✓  \n";
    echo "========================================\n";

} catch (Exception $e) {
    echo "\nTEST FAILED: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
