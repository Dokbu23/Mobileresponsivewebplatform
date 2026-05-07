<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Accommodation;

class BusinessAccountsCannotBookTest extends TestCase
{
    use RefreshDatabase;

    public function test_enterprise_accounts_cannot_book_accommodations()
    {
        // Create an accommodation
        $accommodation = Accommodation::create([
            'name' => 'Test Resort',
            'description' => 'A test resort',
            'price_per_night' => 1000,
            'image' => '/test.jpg',
        ]);

        // Attempt to book as enterprise
        $response = $this->postJson('/api/bookings', [
            'accommodation_id' => $accommodation->id,
            'accommodation_snapshot' => $accommodation->toArray(),
            'check_in' => '2026-06-01',
            'check_out' => '2026-06-03',
            'payment_method' => 'online',
            'total' => 2000,
            'user_role' => 'enterprise',
            'user_id' => null,
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'error' => 'Only tourists can book accommodations. Enterprise and resort accounts are for business management only.'
        ]);
    }

    public function test_resort_accounts_cannot_book_accommodations()
    {
        // Create an accommodation
        $accommodation = Accommodation::create([
            'name' => 'Test Resort',
            'description' => 'A test resort',
            'price_per_night' => 1000,
            'image' => '/test.jpg',
        ]);

        // Attempt to book as resort
        $response = $this->postJson('/api/bookings', [
            'accommodation_id' => $accommodation->id,
            'accommodation_snapshot' => $accommodation->toArray(),
            'check_in' => '2026-06-01',
            'check_out' => '2026-06-03',
            'payment_method' => 'online',
            'total' => 2000,
            'user_role' => 'resort',
            'user_id' => null,
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'error' => 'Only tourists can book accommodations. Enterprise and resort accounts are for business management only.'
        ]);
    }

    public function test_tourist_accounts_can_book_accommodations()
    {
        // Create an accommodation
        $accommodation = Accommodation::create([
            'name' => 'Test Resort',
            'description' => 'A test resort',
            'price_per_night' => 1000,
            'image' => '/test.jpg',
        ]);

        // Book as tourist (should succeed)
        $response = $this->postJson('/api/bookings', [
            'accommodation_id' => $accommodation->id,
            'accommodation_snapshot' => $accommodation->toArray(),
            'check_in' => '2026-06-01',
            'check_out' => '2026-06-03',
            'payment_method' => 'online',
            'total' => 2000,
            'user_role' => 'tourist',
            'user_id' => null,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('bookings', [
            'accommodation_id' => $accommodation->id,
            'total' => 2000,
            'status' => 'pending',
        ]);
    }

    public function test_admin_accounts_cannot_book_accommodations()
    {
        // Create an accommodation
        $accommodation = Accommodation::create([
            'name' => 'Test Resort',
            'description' => 'A test resort',
            'price_per_night' => 1000,
            'image' => '/test.jpg',
        ]);

        // Attempt to book as admin
        $response = $this->postJson('/api/bookings', [
            'accommodation_id' => $accommodation->id,
            'accommodation_snapshot' => $accommodation->toArray(),
            'check_in' => '2026-06-01',
            'check_out' => '2026-06-03',
            'payment_method' => 'online',
            'total' => 2000,
            'user_role' => 'admin',
            'user_id' => null,
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'error' => 'Only tourists can book accommodations. Enterprise and resort accounts are for business management only.'
        ]);
    }
}