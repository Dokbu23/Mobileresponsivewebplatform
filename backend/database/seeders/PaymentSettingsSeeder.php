<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentSetting;
use App\Models\PaymentMethod;

class PaymentSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Create singleton payment settings record
        PaymentSetting::create([
            'subscription_amount' => 50.00,
        ]);

        // Create default GCash payment method
        PaymentMethod::create([
            'name' => 'GCash',
            'account_name' => 'DiscoverMansalay Admin',
            'account_number' => '09123456789',
            'instructions' => 'Send payment to the GCash number above and upload your receipt. Make sure to include your reference number.',
            'enabled' => true,
        ]);
    }
}
