<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Product;
use App\Models\Order;

class OrderStockReductionBugTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Bug Condition Exploration Test - Property 1: Stock Not Reduced on Order Creation
     * 
     * **Validates: Requirements 1.1, 1.3, 1.4, 2.1, 2.4, 2.5**
     * 
     * This test MUST FAIL on unfixed code - failure confirms the bug exists.
     * DO NOT attempt to fix the test or the code when it fails.
     * 
     * Test that when POST /api/orders is called with valid items array,
     * product stock is reduced by the ordered quantity.
     * 
     * @return void
     */
    public function test_stock_is_reduced_when_order_is_created()
    {
        // Arrange: Create a product with initial stock
        $product = Product::create([
            'name' => 'Handwoven Basket',
            'description' => 'Traditional handwoven basket',
            'price' => 250,
            'stock' => 10,
            'category' => 'Crafts',
        ]);

        $initialStock = $product->stock;
        $orderedQuantity = 3;
        $expectedFinalStock = $initialStock - $orderedQuantity;

        // Act: Create an order with the product
        $response = $this->postJson('/api/orders', [
            'items' => [
                [
                    'id' => (string)$product->id,
                    'name' => $product->name,
                    'quantity' => $orderedQuantity,
                    'price' => $product->price,
                ],
            ],
            'total' => $product->price * $orderedQuantity,
            'payment_method' => 'online',
            'user_role' => 'tourist',
        ]);

        // Assert: Order is created successfully
        $response->assertStatus(201);
        $response->assertJsonStructure([
            'id',
            'items',
            'total',
            'status',
            'payment_method',
        ]);

        // Assert: Order items match the request
        $responseData = $response->json();
        $this->assertCount(1, $responseData['items']);
        $this->assertEquals((string)$product->id, $responseData['items'][0]['id']);
        $this->assertEquals($orderedQuantity, $responseData['items'][0]['quantity']);

        // Assert: Product stock is reduced by the ordered quantity
        // THIS ASSERTION WILL FAIL ON UNFIXED CODE - confirming the bug exists
        $product->refresh();
        $this->assertEquals(
            $expectedFinalStock,
            $product->stock,
            "Expected product stock to be reduced from {$initialStock} to {$expectedFinalStock}, but got {$product->stock}"
        );
    }

    /**
     * Bug Condition Exploration Test - Multiple Items Order
     * 
     * Test that when POST /api/orders is called with multiple items,
     * all product stocks are reduced by their respective ordered quantities.
     * 
     * @return void
     */
    public function test_stock_is_reduced_for_multiple_items_order()
    {
        // Arrange: Create multiple products with initial stock
        $product1 = Product::create([
            'name' => 'Product A',
            'description' => 'Description A',
            'price' => 100,
            'stock' => 5,
            'category' => 'Category A',
        ]);

        $product2 = Product::create([
            'name' => 'Product B',
            'description' => 'Description B',
            'price' => 200,
            'stock' => 10,
            'category' => 'Category B',
        ]);

        $product3 = Product::create([
            'name' => 'Product C',
            'description' => 'Description C',
            'price' => 150,
            'stock' => 8,
            'category' => 'Category C',
        ]);

        $initialStock1 = $product1->stock;
        $initialStock2 = $product2->stock;
        $initialStock3 = $product3->stock;

        $orderedQuantity1 = 2;
        $orderedQuantity2 = 3;
        $orderedQuantity3 = 1;

        // Act: Create an order with multiple products
        $response = $this->postJson('/api/orders', [
            'items' => [
                [
                    'id' => (string)$product1->id,
                    'name' => $product1->name,
                    'quantity' => $orderedQuantity1,
                    'price' => $product1->price,
                ],
                [
                    'id' => (string)$product2->id,
                    'name' => $product2->name,
                    'quantity' => $orderedQuantity2,
                    'price' => $product2->price,
                ],
                [
                    'id' => (string)$product3->id,
                    'name' => $product3->name,
                    'quantity' => $orderedQuantity3,
                    'price' => $product3->price,
                ],
            ],
            'total' => ($product1->price * $orderedQuantity1) + 
                      ($product2->price * $orderedQuantity2) + 
                      ($product3->price * $orderedQuantity3),
            'payment_method' => 'cash',
            'user_role' => 'tourist',
        ]);

        // Assert: Order is created successfully
        $response->assertStatus(201);

        // Assert: All product stocks are reduced by their respective ordered quantities
        // THESE ASSERTIONS WILL FAIL ON UNFIXED CODE
        $product1->refresh();
        $product2->refresh();
        $product3->refresh();

        $this->assertEquals(
            $initialStock1 - $orderedQuantity1,
            $product1->stock,
            "Expected Product A stock to be reduced from {$initialStock1} to " . ($initialStock1 - $orderedQuantity1) . ", but got {$product1->stock}"
        );

        $this->assertEquals(
            $initialStock2 - $orderedQuantity2,
            $product2->stock,
            "Expected Product B stock to be reduced from {$initialStock2} to " . ($initialStock2 - $orderedQuantity2) . ", but got {$product2->stock}"
        );

        $this->assertEquals(
            $initialStock3 - $orderedQuantity3,
            $product3->stock,
            "Expected Product C stock to be reduced from {$initialStock3} to " . ($initialStock3 - $orderedQuantity3) . ", but got {$product3->stock}"
        );
    }

    /**
     * Bug Condition Exploration Test - Insufficient Stock Scenario
     * 
     * Test that when POST /api/orders is called with quantity exceeding available stock,
     * the order should be rejected with validation error.
     * 
     * @return void
     */
    public function test_order_is_rejected_when_insufficient_stock()
    {
        // Arrange: Create a product with limited stock
        $product = Product::create([
            'name' => 'Limited Stock Product',
            'description' => 'Product with limited availability',
            'price' => 300,
            'stock' => 10,
            'category' => 'Limited',
        ]);

        $initialStock = $product->stock;
        $orderedQuantity = 15; // More than available

        // Act: Attempt to create an order exceeding available stock
        $response = $this->postJson('/api/orders', [
            'items' => [
                [
                    'id' => (string)$product->id,
                    'name' => $product->name,
                    'quantity' => $orderedQuantity,
                    'price' => $product->price,
                ],
            ],
            'total' => $product->price * $orderedQuantity,
            'payment_method' => 'online',
            'user_role' => 'tourist',
        ]);

        // Assert: Order is rejected with 400 Bad Request
        // THIS ASSERTION WILL FAIL ON UNFIXED CODE - order will be created instead
        $response->assertStatus(400);

        // Assert: Error message identifies the product and available stock
        $response->assertJsonFragment([
            'error' => "Insufficient stock for product: {$product->name}. Available: {$initialStock}, Requested: {$orderedQuantity}"
        ]);

        // Assert: Product stock remains unchanged
        $product->refresh();
        $this->assertEquals(
            $initialStock,
            $product->stock,
            "Expected product stock to remain {$initialStock}, but got {$product->stock}"
        );

        // Assert: No order was created
        $this->assertEquals(0, Order::count(), "Expected no orders to be created, but found " . Order::count());
    }

    /**
     * Bug Condition Exploration Test - Zero Stock Scenario
     * 
     * Test that when POST /api/orders is called for a product with zero stock,
     * the order should be rejected.
     * 
     * @return void
     */
    public function test_order_is_rejected_when_zero_stock()
    {
        // Arrange: Create a product with zero stock
        $product = Product::create([
            'name' => 'Out of Stock Product',
            'description' => 'Product with no stock',
            'price' => 500,
            'stock' => 0,
            'category' => 'Out of Stock',
        ]);

        $orderedQuantity = 1;

        // Act: Attempt to create an order for out-of-stock product
        $response = $this->postJson('/api/orders', [
            'items' => [
                [
                    'id' => (string)$product->id,
                    'name' => $product->name,
                    'quantity' => $orderedQuantity,
                    'price' => $product->price,
                ],
            ],
            'total' => $product->price * $orderedQuantity,
            'payment_method' => 'online',
            'user_role' => 'tourist',
        ]);

        // Assert: Order is rejected with 400 Bad Request
        // THIS ASSERTION WILL FAIL ON UNFIXED CODE
        $response->assertStatus(400);

        // Assert: Product stock remains zero
        $product->refresh();
        $this->assertEquals(0, $product->stock);

        // Assert: No order was created
        $this->assertEquals(0, Order::count());
    }
}
