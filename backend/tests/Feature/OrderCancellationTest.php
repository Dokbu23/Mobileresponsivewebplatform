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
 * Feature tests for OrderController::cancel
 *
 * Covers:
 * - 404 for non-existent order
 * - 403 when authenticated user is not the customer
 * - 422 for non-cancellable statuses (shipped, delivered, cancelled)
 * - 200 + status update + stock restoration for pending/confirmed orders
 * - Notification creation for tourist (order_status) and seller (order_cancelled)
 */
class OrderCancellationTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Generate a JWT token for the given user (mirrors ResortProfileRoutesTest pattern).
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
     * Make an authenticated POST request to the cancel endpoint.
     */
    private function cancelOrder(User $user, int $orderId): \Illuminate\Testing\TestResponse
    {
        $token = $this->generateJwtToken($user);

        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson("/api/orders/{$orderId}/cancel");
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
        return User::factory()->create(array_merge(['role' => 'enterprise'], $overrides));
    }

    /**
     * Create a product owned by the given seller.
     * Uses direct create() since there is no ProductFactory in this project.
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
            'customer_id'      => $tourist->id,
            'business_owner_id' => $seller->id,
            'items'            => [
                [
                    'id'       => $product->id,
                    'name'     => $product->name,
                    'quantity' => $quantity,
                    'price'    => $product->price,
                ],
            ],
            'total'            => $product->price * $quantity,
            'status'           => $status,
            'payment_method'   => 'cod',
        ]);
    }

    // -------------------------------------------------------------------------
    // 404 — order does not exist
    // -------------------------------------------------------------------------

    /** @test */
    public function cancel_returns_404_when_order_does_not_exist(): void
    {
        $tourist = $this->makeTourist();

        $response = $this->cancelOrder($tourist, 99999);

        $response->assertStatus(404)
                 ->assertJson(['message' => 'Order not found.']);
    }

    // -------------------------------------------------------------------------
    // 403 — authenticated user is not the customer
    // -------------------------------------------------------------------------

    /** @test */
    public function cancel_returns_403_when_user_is_not_the_customer(): void
    {
        $owner  = $this->makeTourist();
        $other  = $this->makeTourist();
        $seller = $this->makeSeller();
        $product = $this->makeProduct($seller);

        $order = $this->makeOrder($owner, $seller, $product, 2, 'pending');

        $response = $this->cancelOrder($other, $order->id);

        $response->assertStatus(403)
                 ->assertJson(['message' => 'Forbidden.']);

        // Order status must be unchanged
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pending']);
    }

    // -------------------------------------------------------------------------
    // 422 — non-cancellable statuses
    // -------------------------------------------------------------------------

    /** @test */
    public function cancel_returns_422_for_shipped_order(): void
    {
        $tourist = $this->makeTourist();
        $seller  = $this->makeSeller();
        $product = $this->makeProduct($seller, 10);

        $order = $this->makeOrder($tourist, $seller, $product, 2, 'shipped');

        $response = $this->cancelOrder($tourist, $order->id);

        $response->assertStatus(422)
                 ->assertJson(['message' => 'Order cannot be cancelled after it has been shipped.']);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'shipped']);
    }

    /** @test */
    public function cancel_returns_422_for_delivered_order(): void
    {
        $tourist = $this->makeTourist();
        $seller  = $this->makeSeller();
        $product = $this->makeProduct($seller, 10);

        $order = $this->makeOrder($tourist, $seller, $product, 2, 'delivered');

        $response = $this->cancelOrder($tourist, $order->id);

        $response->assertStatus(422)
                 ->assertJson(['message' => 'Order cannot be cancelled after it has been shipped.']);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'delivered']);
    }

    /** @test */
    public function cancel_returns_422_for_already_cancelled_order(): void
    {
        $tourist = $this->makeTourist();
        $seller  = $this->makeSeller();
        $product = $this->makeProduct($seller, 10);

        $order = $this->makeOrder($tourist, $seller, $product, 2, 'cancelled');

        $response = $this->cancelOrder($tourist, $order->id);

        $response->assertStatus(422)
                 ->assertJson(['message' => 'Order cannot be cancelled after it has been shipped.']);
    }

    // -------------------------------------------------------------------------
    // 200 — successful cancellation of a pending order
    // -------------------------------------------------------------------------

    /** @test */
    public function cancel_returns_200_and_restores_stock_for_pending_order(): void
    {
        $tourist  = $this->makeTourist();
        $seller   = $this->makeSeller();
        $product  = $this->makeProduct($seller, 10);
        $quantity = 3;

        $order = $this->makeOrder($tourist, $seller, $product, $quantity, 'pending');

        $response = $this->cancelOrder($tourist, $order->id);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Order cancelled successfully.',
                 ]);

        // Order status must be cancelled
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelled']);

        // Stock must be restored
        $product->refresh();
        $this->assertEquals(10 + $quantity, $product->stock);
    }

    // -------------------------------------------------------------------------
    // 200 — successful cancellation of a confirmed order
    // -------------------------------------------------------------------------

    /** @test */
    public function cancel_returns_200_and_restores_stock_for_confirmed_order(): void
    {
        $tourist  = $this->makeTourist();
        $seller   = $this->makeSeller();
        $product  = $this->makeProduct($seller, 20);
        $quantity = 5;

        $order = $this->makeOrder($tourist, $seller, $product, $quantity, 'confirmed');

        $response = $this->cancelOrder($tourist, $order->id);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Order cancelled successfully.',
                 ]);

        // Order status must be cancelled
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelled']);

        // Stock must be restored
        $product->refresh();
        $this->assertEquals(20 + $quantity, $product->stock);
    }

    // -------------------------------------------------------------------------
    // Notifications — order_status for tourist
    // -------------------------------------------------------------------------

    /** @test */
    public function cancel_creates_order_status_notification_for_tourist(): void
    {
        $tourist = $this->makeTourist();
        $seller  = $this->makeSeller();
        $product = $this->makeProduct($seller, 10);

        $order = $this->makeOrder($tourist, $seller, $product, 2, 'pending');

        $this->cancelOrder($tourist, $order->id)->assertStatus(200);

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
        // Data payload must have order_id and new_status
        $this->assertArrayHasKey('order_id', $notification->data);
        $this->assertArrayHasKey('new_status', $notification->data);
        $this->assertEquals($order->id, $notification->data['order_id']);
        $this->assertEquals('cancelled', $notification->data['new_status']);
    }

    // -------------------------------------------------------------------------
    // Notifications — order_cancelled for seller
    // -------------------------------------------------------------------------

    /** @test */
    public function cancel_creates_order_cancelled_notification_for_seller(): void
    {
        $tourist = $this->makeTourist();
        $seller  = $this->makeSeller();
        $product = $this->makeProduct($seller, 10);

        $order = $this->makeOrder($tourist, $seller, $product, 2, 'pending');

        $this->cancelOrder($tourist, $order->id)->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $seller->id,
            'type'    => 'order_cancelled',
        ]);

        $notification = Notification::where('user_id', $seller->id)
                                    ->where('type', 'order_cancelled')
                                    ->first();

        $this->assertNotNull($notification);
        // Message must contain the order ID
        $this->assertStringContainsString((string) $order->id, $notification->message);
        // Data payload must have order_id and customer_id
        $this->assertArrayHasKey('order_id', $notification->data);
        $this->assertArrayHasKey('customer_id', $notification->data);
        $this->assertEquals($order->id, $notification->data['order_id']);
        $this->assertEquals($tourist->id, $notification->data['customer_id']);
    }
}
