<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\EnterprisePost;
use App\Models\Product;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Firebase\JWT\JWT;

class PostModerationTest extends TestCase
{
    use DatabaseTransactions;

    protected $adminUser;
    protected $enterpriseUser;
    protected $resortUser;
    protected $touristUser;

    private function generateJwtToken(User $user): string
    {
        $payload = [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24),
        ];

        $jwtSecret = (string) (config('jwt.secret') ?: env('JWT_SECRET') ?: env('APP_KEY') ?: 'discover-mansalay-jwt-master-secret-key-32chars-2026');
        return JWT::encode($payload, $jwtSecret, 'HS256');
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::firstOrCreate(
            ['email' => 'admin_test_moderation@mansalay.gov.ph'],
            ['name' => 'Admin Tester', 'password' => bcrypt('password')]
        );
        $this->adminUser->role = 'admin';
        $this->adminUser->is_active = true;
        $this->adminUser->save();

        $this->enterpriseUser = User::firstOrCreate(
            ['email' => 'enterprise_test_mod@mansalay.com'],
            ['name' => 'Enterprise Tester', 'password' => bcrypt('password')]
        );
        $this->enterpriseUser->role = 'enterprise';
        $this->enterpriseUser->store_name = 'Mangyan Crafts Hub';
        $this->enterpriseUser->is_active = true;
        $this->enterpriseUser->subscription_status = 'paid';
        $this->enterpriseUser->save();

        $this->resortUser = User::firstOrCreate(
            ['email' => 'resort_test_mod@mansalay.com'],
            ['name' => 'Resort Tester', 'password' => bcrypt('password')]
        );
        $this->resortUser->role = 'resort';
        $this->resortUser->resort_name = 'Paradise Cove Resort';
        $this->resortUser->is_active = true;
        $this->resortUser->subscription_status = 'paid';
        $this->resortUser->save();

        $this->touristUser = User::firstOrCreate(
            ['email' => 'tourist_test_mod@gmail.com'],
            ['name' => 'Tourist Tester', 'password' => bcrypt('password')]
        );
        $this->touristUser->role = 'tourist';
        $this->touristUser->is_active = true;
        $this->touristUser->save();
    }

    public function test_new_post_defaults_to_pending_status()
    {
        $token = $this->generateJwtToken($this->enterpriseUser);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/enterprise-posts', [
                'type' => 'product',
                'product_name' => 'Handmade Basket Test',
                'content' => 'Authentic handwoven basket from Mansalay.',
                'price' => '450',
                'stock' => '20',
                'category' => 'Handicraft',
            ]);

        $response->assertStatus(201);
        $data = $response->json();
        $this->assertEquals('pending', $data['status']);
        $this->assertNotEmpty($data['moderation_history']);

        // Verify it is NOT returned in public feed
        unset($_SERVER['HTTP_AUTHORIZATION'], $_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
        $publicFeed = $this->withHeaders([])->getJson('/api/enterprise-posts?public=1');
        $publicFeed->assertStatus(200);
        $ids = collect($publicFeed->json())->pluck('id')->all();
        $this->assertNotContains($data['id'], $ids);

        // Verify owner CAN see their own post in their dashboard
        $ownerFeed = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/enterprise-posts');
        $ownerFeed->assertStatus(200);
        $ownerIds = collect($ownerFeed->json())->pluck('id')->all();
        $this->assertContains($data['id'], $ownerIds);
    }

    public function test_admin_can_approve_post()
    {
        // Create a pending post
        $post = EnterprisePost::create([
            'user_id' => $this->enterpriseUser->id,
            'type' => 'product',
            'product_name' => 'Organic Honey Test',
            'content' => 'Wild honey from Mansalay mountains.',
            'price' => '350',
            'stock' => '15',
            'status' => 'pending',
        ]);

        $adminToken = $this->generateJwtToken($this->adminUser);

        $approveRes = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/admin/moderation/posts/{$post->id}/approve");

        $approveRes->assertStatus(200);
        $post->refresh();

        $this->assertEquals('approved', $post->status);
        $this->assertEquals($this->adminUser->id, $post->approved_by);
        $this->assertNotNull($post->approved_at);

        // Verify it is now visible in the public feed
        $publicFeed = $this->getJson('/api/enterprise-posts');
        $ids = collect($publicFeed->json())->pluck('id')->all();
        $this->assertContains($post->id, $ids);
    }

    public function test_admin_can_reject_post_with_required_remarks()
    {
        $post = EnterprisePost::create([
            'user_id' => $this->resortUser->id,
            'type' => 'rooms',
            'product_name' => 'Deluxe Suite Test',
            'content' => 'Beachfront room.',
            'status' => 'pending',
        ]);

        $adminToken = $this->generateJwtToken($this->adminUser);

        // Fail without remarks
        $emptyRes = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/admin/moderation/posts/{$post->id}/reject", [
                'remarks' => '',
            ]);
        $emptyRes->assertStatus(422);

        // Success with valid remarks
        $validRemarks = 'Please upload clearer room photos and specify the price per night.';
        $rejectRes = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/admin/moderation/posts/{$post->id}/reject", [
                'remarks' => $validRemarks,
            ]);

        $rejectRes->assertStatus(200);
        $post->refresh();

        $this->assertEquals('rejected', $post->status);
        $this->assertEquals($this->adminUser->id, $post->rejected_by);
        $this->assertEquals($validRemarks, $post->rejection_remarks);

        // Verify public feed excludes rejected post
        $publicFeed = $this->getJson('/api/enterprise-posts');
        $ids = collect($publicFeed->json())->pluck('id')->all();
        $this->assertNotContains($post->id, $ids);
    }

    public function test_owner_edit_resubmits_rejected_post_back_to_pending()
    {
        $post = EnterprisePost::create([
            'user_id' => $this->enterpriseUser->id,
            'type' => 'product',
            'product_name' => 'Woven Mat',
            'content' => 'Old description',
            'status' => 'rejected',
            'rejection_remarks' => 'Incomplete info',
            'rejected_by' => $this->adminUser->id,
        ]);

        $ownerToken = $this->generateJwtToken($this->enterpriseUser);

        $updateRes = $this->withHeader('Authorization', "Bearer {$ownerToken}")
            ->putJson("/api/enterprise-posts/{$post->id}", [
                'content' => 'Updated full description with proper details and size.',
                'price' => '500',
            ]);

        $updateRes->assertStatus(200);
        $post->refresh();

        // Status must be reset to pending and remarks cleared
        $this->assertEquals('pending', $post->status);
        $this->assertNull($post->rejection_remarks);
        $this->assertNull($post->rejected_by);

        // Moderation history should have resubmitted log
        $history = $post->moderation_history;
        $this->assertIsArray($history);
        $lastAction = end($history);
        $this->assertEquals('resubmitted', $lastAction['action']);
    }

    public function test_admin_moderation_index_and_counts()
    {
        $adminToken = $this->generateJwtToken($this->adminUser);

        $res = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/admin/moderation/posts?status=all');

        $res->assertStatus(200);
        $data = $res->json();

        $this->assertArrayHasKey('posts', $data);
        $this->assertArrayHasKey('counts', $data);
        $this->assertArrayHasKey('pending', $data['counts']);
        $this->assertArrayHasKey('approved', $data['counts']);
        $this->assertArrayHasKey('rejected', $data['counts']);
        $this->assertArrayHasKey('total', $data['counts']);
    }
}
