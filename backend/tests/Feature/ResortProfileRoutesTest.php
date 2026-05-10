<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Firebase\JWT\JWT;

/**
 * Resort Profile Routes Test
 * 
 * Tests route registration and authorization for resort profile endpoints.
 * These tests verify that routes are properly protected by JWT and role middleware.
 * 
 * Task: 6. Backend: API Routes Registration
 * Spec: resort-profile-as-accommodation
 */
class ResortProfileRoutesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that GET /api/resort-profile requires authentication
     */
    public function test_get_resort_profile_requires_authentication()
    {
        $response = $this->getJson('/api/resort-profile');
        
        $response->assertStatus(401)
                 ->assertJson([
                     'error' => 'Authentication token required'
                 ]);
    }

    /**
     * Test that GET /api/resort-profile requires resort role
     */
    public function test_get_resort_profile_requires_resort_role()
    {
        // Create a tourist user
        $tourist = User::factory()->create([
            'role' => 'tourist',
            'email' => 'tourist@test.com'
        ]);

        $token = $this->generateJwtToken($tourist);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/resort-profile');

        $response->assertStatus(403)
                 ->assertJson([
                     'error' => 'Insufficient permissions'
                 ]);
    }

    /**
     * Test that PUT /api/resort-profile requires authentication
     */
    public function test_put_resort_profile_requires_authentication()
    {
        $response = $this->putJson('/api/resort-profile', [
            'resort_name' => 'Test Resort'
        ]);
        
        $response->assertStatus(401)
                 ->assertJson([
                     'error' => 'Authentication token required'
                 ]);
    }

    /**
     * Test that PUT /api/resort-profile requires resort role
     */
    public function test_put_resort_profile_requires_resort_role()
    {
        // Create an enterprise user
        $enterprise = User::factory()->create([
            'role' => 'enterprise',
            'email' => 'enterprise@test.com'
        ]);

        $token = $this->generateJwtToken($enterprise);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson('/api/resort-profile', [
            'resort_name' => 'Test Resort'
        ]);

        $response->assertStatus(403)
                 ->assertJson([
                     'error' => 'Insufficient permissions'
                 ]);
    }

    /**
     * Test that POST /api/resort-profile/setup requires authentication
     */
    public function test_post_resort_profile_setup_requires_authentication()
    {
        $response = $this->postJson('/api/resort-profile/setup', [
            'resort_name' => 'Test Resort'
        ]);
        
        $response->assertStatus(401)
                 ->assertJson([
                     'error' => 'Authentication token required'
                 ]);
    }

    /**
     * Test that POST /api/resort-profile/setup requires resort role
     */
    public function test_post_resort_profile_setup_requires_resort_role()
    {
        // Create an admin user
        $admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@test.com'
        ]);

        $token = $this->generateJwtToken($admin);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/resort-profile/setup', [
            'resort_name' => 'Test Resort'
        ]);

        $response->assertStatus(403)
                 ->assertJson([
                     'error' => 'Insufficient permissions'
                 ]);
    }

    /**
     * Test that resort owner can access GET /api/resort-profile
     */
    public function test_resort_owner_can_access_get_resort_profile()
    {
        // Create a resort owner
        $resort = User::factory()->create([
            'role' => 'resort',
            'email' => 'resort@test.com',
            'subscription_status' => 'active'
        ]);

        $token = $this->generateJwtToken($resort);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/resort-profile');

        // Should return 200 OK with resort profile data
        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'id',
                     'name',
                     'email',
                     'resort_name',
                     'resort_description',
                     'resort_price_per_night',
                     'resort_images',
                     'resort_amenities',
                     'resort_facilities',
                     'resort_policies',
                     'resort_is_setup',
                     'subscription_status',
                     'listing_status'
                 ]);
    }

    /**
     * Test that resort owner can access PUT /api/resort-profile
     */
    public function test_resort_owner_can_access_put_resort_profile()
    {
        // Create a resort owner
        $resort = User::factory()->create([
            'role' => 'resort',
            'email' => 'resort@test.com',
            'subscription_status' => 'active',
            'resort_name' => 'Old Resort Name',
            'resort_description' => 'Old description',
            'resort_price_per_night' => 1000.00
        ]);

        $token = $this->generateJwtToken($resort);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson('/api/resort-profile', [
            'resort_name' => 'Updated Resort Name',
            'resort_description' => 'Updated description',
            'resort_price_per_night' => 1500.00
        ]);

        // Should return 200 OK with success message
        $response->assertStatus(200)
                 ->assertJson([
                     'message' => 'Resort profile updated successfully'
                 ])
                 ->assertJsonPath('user.resort_name', 'Updated Resort Name')
                 ->assertJsonPath('user.resort_price_per_night', 1500.00);
    }

    /**
     * Test that resort owner can access POST /api/resort-profile/setup
     */
    public function test_resort_owner_can_access_post_resort_profile_setup()
    {
        // Create a resort owner without setup
        $resort = User::factory()->create([
            'role' => 'resort',
            'email' => 'resort@test.com',
            'subscription_status' => 'active',
            'resort_is_setup' => false
        ]);

        $token = $this->generateJwtToken($resort);

        // Note: This test will fail validation because we're not uploading actual files
        // But it confirms the route is accessible and middleware passed
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/resort-profile/setup', [
            'resort_name' => 'Test Resort',
            'resort_description' => 'A beautiful test resort',
            'resort_price_per_night' => 2000.00
        ]);

        // Should return 422 validation error (missing images)
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['images']);
    }

    /**
     * Test that GET /api/public/accommodations is publicly accessible
     */
    public function test_public_accommodations_is_accessible_without_auth()
    {
        $response = $this->getJson('/api/public/accommodations');

        // Should return 200 OK since it's a public route
        $response->assertStatus(200);
    }

    /**
     * Helper method to generate JWT token for testing
     */
    private function generateJwtToken(User $user): string
    {
        $payload = [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24) // 24 hours
        ];

        return JWT::encode($payload, config('app.key'), 'HS256');
    }
}
