<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Order;
use App\Models\Product;
use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Firebase\JWT\JWT;

/**
 * Integration tests for notification creation triggers.
 *
 * Covers:
 * - Sending a message creates a message_received notification for the receiver
 * - Placing an order creates one order_new notification per distinct business_owner_id
 * - Updating order status creates an order_status notification when status changes
 * - Updating order status does NOT create a notification when status is unchanged
 * - Notification creation failure does not block message delivery
 * - GET /api/notifications only returns notifications for the authenticated user
 * - DELETE /api/notifications/{id} returns 404 when notification belongs to another user
 */
class NotificationCreationIntegrationTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Generate a JWT token for the given user.
     */
    private function generateJwtToken(User $user): string
    {
        $payload = [
            'user_id' => $user->id,
            'email'   => $user->email,
            'role'    => $user->role,
            'iat'     => time(),
            'exp'     => time() + (60 * 60 * 24),
        ];

        return JWT::encode($payload, config('app.key'), 'HS256');
    }

    /**
     * Make an authenticated request with the given user's JWT.
     */
    private function actingAsUser(User $user): self
    {
        $token = $this->generateJwtToken($user);
        $this->withHeaders(['Authorization' => 'Bearer ' . $token]);
        return $this;
    }

    /**
     * Create a tourist user.
     */
    private function makeTourist(array $overrides = []): User
    {
        return User::factory()->create(array_merge(['role' => 'tourist'], $overrides));
    }

    /**
     * Create an enterprise (seller) user.
     */
    private function makeSeller(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'role'                => 'enterprise',
            'subscription_status' => 'active',
        ], $overrides));
    }

    /**
     * Create a product owned by the given seller.
     */
    private function makeProduct(User $seller, int $stock = 10): Product
    {
        return Product::create([
            'user_id'     => $seller->id,
            'name'        => 'Test Product ' . uniqid(),
            'description' => 'A test product',
            'price'       => 100,
            'stock'       => $stock,
            'category'    => 'Test',
        ]);
    }

    /**
     * Create an order with a single product item.
     */
    private function makeOrder(User $tourist, User $seller, Product $product, int $quantity, string $status): Order
    {
        return Order::create([
            'customer_id'       => $tourist->id,
            'business_owner_id' => $seller->id,
            'items'             => [
                [
                    'id'       => $product->id,
                    'name'     => $product->name,
                    'quantity' => $quantity,
                    'price'    => $product->price,
                ],
            ],
            'total'           => $product->price * $quantity,
            'status'          => $status,
            'payment_method'  => 'cod',
        ]);
    }

    // -------------------------------------------------------------------------
    // Test 1: Sending a message creates a message_received notification
    // -------------------------------------------------------------------------

    /** @test */
    public function sending_a_message_creates_message_received_notification_for_receiver(): void
    {
        $sender   = $this->makeTourist();
        $receiver = $this->makeSeller();

        $token = $this->generateJwtToken($sender);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->postJson('/api/messages/send', [
                'receiver_id' => $receiver->id,
                'message'     => 'Hello, I have a question about your product.',
            ]);

        $response->assertStatus(201)
                 ->assertJson(['success' => true]);

        // A message_received notification must exist for the receiver
        $this->assertDatabaseHas('notifications', [
            'user_id' => $receiver->id,
            'type'    => 'message_received',
        ]);

        $notification = Notification::where('user_id', $receiver->id)
                                    ->where('type', 'message_received')
                                    ->first();

        $this->assertNotNull($notification);
        // Data payload must contain sender_id
        $this->assertArrayHasKey('sender_id', $notification->data);
        $this->assertEquals($sender->id, $notification->data['sender_id']);
    }

    // -------------------------------------------------------------------------
    // Test 2: Placing an order creates one order_new notification per seller
    // -------------------------------------------------------------------------

    /** @test */
    public function placing_an_order_creates_one_order_new_notification_per_distinct_business_owner(): void
    {
        $tourist  = $this->makeTourist();
        $sellerA  = $this->makeSeller();
        $sellerB  = $this->makeSeller();
        $productA = $this->makeProduct($sellerA, 20);
        $productB = $this->makeProduct($sellerB, 20);

        $token = $this->generateJwtToken($tourist);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->postJson('/api/orders', [
                'items' => [
                    [
                        'id'       => $productA->id,
                        'name'     => $productA->name,
                        'quantity' => 2,
                        'price'    => $productA->price,
                    ],
                    [
                        'id'       => $productB->id,
                        'name'     => $productB->name,
                        'quantity' => 1,
                        'price'    => $productB->price,
                    ],
                ],
                'total'          => 300,
                'payment_method' => 'cod',
                'user_role'      => 'tourist',
            ]);

        $response->assertStatus(201);

        // Each seller must receive exactly one order_new notification
        $this->assertDatabaseHas('notifications', [
            'user_id' => $sellerA->id,
            'type'    => 'order_new',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $sellerB->id,
            'type'    => 'order_new',
        ]);

        // Exactly one notification per seller (not duplicated)
        $countA = Notification::where('user_id', $sellerA->id)->where('type', 'order_new')->count();
        $countB = Notification::where('user_id', $sellerB->id)->where('type', 'order_new')->count();

        $this->assertEquals(1, $countA, 'Seller A should receive exactly one order_new notification');
        $this->assertEquals(1, $countB, 'Seller B should receive exactly one order_new notification');
    }

    // -------------------------------------------------------------------------
    // Test 3: Updating order status creates an order_status notification
    // -------------------------------------------------------------------------

    /** @test */
    public function updating_order_status_creates_order_status_notification_when_status_changes(): void
    {
        $tourist = $this->makeTourist();
        $seller  = $this->makeSeller();
        $product = $this->makeProduct($seller, 10);

        $order = $this->makeOrder($tourist, $seller, $product, 2, 'pending');

        $token = $this->generateJwtToken($seller);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->patchJson("/api/orders/{$order->id}", [
                'status' => 'confirmed',
            ]);

        $response->assertStatus(200);

        // An order_status notification must exist for the tourist
        $this->assertDatabaseHas('notifications', [
            'user_id' => $tourist->id,
            'type'    => 'order_status',
        ]);

        $notification = Notification::where('user_id', $tourist->id)
                                    ->where('type', 'order_status')
                                    ->first();

        $this->assertNotNull($notification);
        // Message must contain the order ID
        $this->assertStringContainsString((string) $order->id, $notification->message);
    }

    // -------------------------------------------------------------------------
    // Test 4: Updating order status does NOT create a notification when unchanged
    // -------------------------------------------------------------------------

    /** @test */
    public function updating_order_status_does_not_create_notification_when_status_is_unchanged(): void
    {
        $tourist = $this->makeTourist();
        $seller  = $this->makeSeller();
        $product = $this->makeProduct($seller, 10);

        // Order already at 'confirmed'
        $order = $this->makeOrder($tourist, $seller, $product, 2, 'confirmed');

        $token = $this->generateJwtToken($seller);

        // PATCH with the same status
        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->patchJson("/api/orders/{$order->id}", [
                'status' => 'confirmed',
            ]);

        $response->assertStatus(200)
                 ->assertJson(['status_changed' => false]);

        // No order_status notification should have been created
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $tourist->id,
            'type'    => 'order_status',
        ]);
    }

    // -------------------------------------------------------------------------
    // Test 5: Notification failure does not block message delivery
    // -------------------------------------------------------------------------

    /** @test */
    public function notification_creation_failure_does_not_block_message_delivery(): void
    {
        $sender   = $this->makeTourist();
        $receiver = $this->makeSeller();

        // Simulate notification failure by dropping the notifications table temporarily
        // We use a partial mock on the Notification model instead to avoid schema changes
        $this->partialMock(Notification::class, function ($mock) {
            $mock->shouldReceive('create')
                 ->andThrow(new \RuntimeException('DB error'));
        });

        $token = $this->generateJwtToken($sender);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->postJson('/api/messages/send', [
                'receiver_id' => $receiver->id,
                'message'     => 'This message should still be delivered.',
            ]);

        // Message delivery must succeed even if notification creation fails
        $response->assertStatus(201)
                 ->assertJson(['success' => true]);

        // The message itself must be stored
        $this->assertDatabaseHas('messages', [
            'sender_id'   => $sender->id,
            'receiver_id' => $receiver->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // Test 6: GET /api/notifications only returns notifications for the auth user
    // -------------------------------------------------------------------------

    /** @test */
    public function get_notifications_only_returns_notifications_for_authenticated_user(): void
    {
        $userA = $this->makeTourist();
        $userB = $this->makeTourist();

        // Create notifications for both users
        Notification::create([
            'user_id' => $userA->id,
            'type'    => 'order_status',
            'title'   => 'For User A',
            'message' => 'Your order #1 is confirmed.',
            'data'    => [],
            'is_read' => false,
        ]);

        Notification::create([
            'user_id' => $userB->id,
            'type'    => 'order_status',
            'title'   => 'For User B',
            'message' => 'Your order #2 is confirmed.',
            'data'    => [],
            'is_read' => false,
        ]);

        $token = $this->generateJwtToken($userA);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->getJson('/api/notifications');

        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        $notifications = $response->json('notifications');

        // All returned notifications must belong to userA
        foreach ($notifications as $n) {
            $this->assertEquals($userA->id, $n['user_id'],
                'Notification user_id must match the authenticated user');
        }

        // userB's notification must not appear
        $titles = array_column($notifications, 'title');
        $this->assertNotContains('For User B', $titles);
    }

    // -------------------------------------------------------------------------
    // Test 7: DELETE /api/notifications/{id} returns 404 for another user's notification
    // -------------------------------------------------------------------------

    /** @test */
    public function delete_notification_returns_404_when_notification_belongs_to_another_user(): void
    {
        $userA = $this->makeTourist();
        $userB = $this->makeTourist();

        // Create a notification owned by userA
        $notification = Notification::create([
            'user_id' => $userA->id,
            'type'    => 'order_status',
            'title'   => 'User A Notification',
            'message' => 'Your order #1 is confirmed.',
            'data'    => [],
            'is_read' => false,
        ]);

        // userB tries to delete userA's notification
        $token = $this->generateJwtToken($userB);

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->deleteJson("/api/notifications/{$notification->id}");

        $response->assertStatus(404);

        // The notification must still exist in the database
        $this->assertDatabaseHas('notifications', ['id' => $notification->id]);
    }
}
