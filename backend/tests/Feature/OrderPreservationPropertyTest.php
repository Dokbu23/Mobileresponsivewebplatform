<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Product;
use App\Models\Order;

/**
 * Preservation Property Tests - Property 2: Non-Order-Creation Operations Unchanged
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * These tests follow observation-first methodology:
 * - Observe behavior on UNFIXED code for non-buggy inputs
 * - Write property-based tests capturing observed behavior patterns
 * - Run tests on UNFIXED code
 * - EXPECTED OUTCOME: Tests PASS (confirms baseline behavior to preserve)
 * 
 * These tests verify that non-order-creation operations remain unchanged after the fix:
 * - GET /api/orders returns all orders with items array intact
 * - PATCH /api/orders/{id} updates status field only without affecting product stock
 * - GET /api/products returns all products with current attributes
 * - POST /api/products creates products with initial stock values
 * - PATCH /api/products/{id} updates product fields including manual stock adjustments
 * - DELETE /api/products/{id} deletes products
 */
class OrderPreservationPropertyTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Property: GET /api/orders returns all orders with items array intact
     * 
     * **Validates: Requirements 3.1, 3.2**
     * 
     * This test verifies that order retrieval functionality remains unchanged.
     * The response structure, content, and ordering must be preserved.
     * 
     * @return void
     */
    public function test_get_orders_returns_all_orders_with_items_array()
    {
        // Arrange: Create multiple orders with different items
        $order1 = Order::create([
            'items' => [
                ['id' => '1', 'name' => 'Product A', 'quantity' => 2, 'price' => 100],
                ['id' => '2', 'name' => 'Product B', 'quantity' => 1, 'price' => 200],
            ],
            'total' => 400,
            'payment_method' => 'online',
            'status' => 'pending',
        ]);

        // Small delay to ensure different timestamps
        sleep(1);

        $order2 = Order::create([
            'items' => [
                ['id' => '3', 'name' => 'Product C', 'quantity' => 5, 'price' => 50],
            ],
            'total' => 250,
            'payment_method' => 'cash',
            'status' => 'confirmed',
        ]);

        // Small delay to ensure different timestamps
        sleep(1);

        $order3 = Order::create([
            'items' => [
                ['id' => '4', 'name' => 'Product D', 'quantity' => 3, 'price' => 150],
                ['id' => '5', 'name' => 'Product E', 'quantity' => 2, 'price' => 75],
            ],
            'total' => 600,
            'payment_method' => 'online',
            'status' => 'shipped',
        ]);

        // Act: Retrieve all orders
        $response = $this->getJson('/api/orders');

        // Assert: Response is successful
        $response->assertStatus(200);

        // Assert: All orders are returned
        $responseData = $response->json();
        $this->assertCount(3, $responseData, "Expected 3 orders but got " . count($responseData));

        // Assert: Orders are returned in descending order by created_at (most recent first)
        $this->assertEquals($order3->id, $responseData[0]['id']);
        $this->assertEquals($order2->id, $responseData[1]['id']);
        $this->assertEquals($order1->id, $responseData[2]['id']);

        // Assert: Items arrays are intact and match original data
        $this->assertEquals($order3->items, $responseData[0]['items']);
        $this->assertEquals($order2->items, $responseData[1]['items']);
        $this->assertEquals($order1->items, $responseData[2]['items']);

        // Assert: All order fields are present
        foreach ($responseData as $orderData) {
            $this->assertArrayHasKey('id', $orderData);
            $this->assertArrayHasKey('items', $orderData);
            $this->assertArrayHasKey('total', $orderData);
            $this->assertArrayHasKey('status', $orderData);
            $this->assertArrayHasKey('payment_method', $orderData);
            $this->assertArrayHasKey('created_at', $orderData);
            $this->assertArrayHasKey('updated_at', $orderData);
        }
    }

    /**
     * Property: PATCH /api/orders/{id} updates status without affecting product stock
     * 
     * **Validates: Requirements 3.3**
     * 
     * This test verifies that order status updates do not trigger stock changes.
     * Product stock must remain unchanged when order status is updated.
     * 
     * @return void
     */
    public function test_patch_order_updates_status_without_affecting_product_stock()
    {
        // Arrange: Create products with known stock levels
        $product1 = Product::create([
            'name' => 'Product A',
            'description' => 'Description A',
            'price' => 100,
            'stock' => 50,
            'category' => 'Category A',
        ]);

        $product2 = Product::create([
            'name' => 'Product B',
            'description' => 'Description B',
            'price' => 200,
            'stock' => 30,
            'category' => 'Category B',
        ]);

        // Create an order referencing these products
        $order = Order::create([
            'items' => [
                ['id' => (string)$product1->id, 'name' => $product1->name, 'quantity' => 5, 'price' => $product1->price],
                ['id' => (string)$product2->id, 'name' => $product2->name, 'quantity' => 3, 'price' => $product2->price],
            ],
            'total' => 1100,
            'payment_method' => 'online',
            'status' => 'pending',
        ]);

        $initialStock1 = $product1->stock;
        $initialStock2 = $product2->stock;

        // Act: Update order status through multiple transitions
        $statuses = ['confirmed', 'shipped', 'delivered'];
        foreach ($statuses as $status) {
            $response = $this->patchJson("/api/orders/{$order->id}", [
                'status' => $status,
            ]);

            // Assert: Status update is successful
            $response->assertStatus(200);
            $response->assertJson([
                'id' => $order->id,
                'status' => $status,
            ]);

            // Assert: Product stocks remain unchanged
            $product1->refresh();
            $product2->refresh();
            $this->assertEquals(
                $initialStock1,
                $product1->stock,
                "Product 1 stock should remain {$initialStock1} after status update to {$status}, but got {$product1->stock}"
            );
            $this->assertEquals(
                $initialStock2,
                $product2->stock,
                "Product 2 stock should remain {$initialStock2} after status update to {$status}, but got {$product2->stock}"
            );

            // Assert: Order items remain unchanged
            $order->refresh();
            $this->assertCount(2, $order->items);
            $this->assertEquals((string)$product1->id, $order->items[0]['id']);
            $this->assertEquals((string)$product2->id, $order->items[1]['id']);
        }
    }

    /**
     * Property: GET /api/products returns all products with current attributes
     * 
     * **Validates: Requirements 3.4**
     * 
     * This test verifies that product retrieval functionality remains unchanged.
     * All product fields including stock must be returned correctly.
     * 
     * @return void
     */
    public function test_get_products_returns_all_products_with_attributes()
    {
        // Arrange: Create multiple products with various attributes
        $product1 = Product::create([
            'name' => 'Product A',
            'description' => 'Description A',
            'price' => 100,
            'stock' => 50,
            'category' => 'Category A',
            'image' => '/storage/products/image1.jpg',
        ]);

        $product2 = Product::create([
            'name' => 'Product B',
            'description' => 'Description B',
            'price' => 200,
            'stock' => 0,
            'category' => 'Category B',
            'image' => null,
        ]);

        $product3 = Product::create([
            'name' => 'Product C',
            'description' => null,
            'price' => 150,
            'stock' => 100,
            'category' => 'Category C',
            'image' => '/storage/products/image3.jpg',
        ]);

        // Act: Retrieve all products
        $response = $this->getJson('/api/products');

        // Assert: Response is successful
        $response->assertStatus(200);

        // Assert: All products are returned
        $responseData = $response->json();
        $this->assertCount(3, $responseData);

        // Assert: All product fields are present and match original data
        $productIds = [$product1->id, $product2->id, $product3->id];
        foreach ($responseData as $productData) {
            $this->assertArrayHasKey('id', $productData);
            $this->assertArrayHasKey('name', $productData);
            $this->assertArrayHasKey('description', $productData);
            $this->assertArrayHasKey('price', $productData);
            $this->assertArrayHasKey('stock', $productData);
            $this->assertArrayHasKey('category', $productData);
            $this->assertArrayHasKey('image', $productData);
            $this->assertArrayHasKey('created_at', $productData);
            $this->assertArrayHasKey('updated_at', $productData);

            $this->assertContains($productData['id'], $productIds);
        }

        // Assert: Specific product data matches
        $product1Data = collect($responseData)->firstWhere('id', $product1->id);
        $this->assertEquals($product1->name, $product1Data['name']);
        $this->assertEquals($product1->stock, $product1Data['stock']);
        $this->assertEquals($product1->price, $product1Data['price']);
    }

    /**
     * Property: POST /api/products creates products with initial stock values
     * 
     * **Validates: Requirements 3.5**
     * 
     * This test verifies that product creation functionality remains unchanged.
     * Products must be created with the specified initial stock value.
     * 
     * @return void
     */
    public function test_post_products_creates_products_with_initial_stock()
    {
        // Arrange: Prepare product data with various stock levels
        $productData1 = [
            'name' => 'New Product A',
            'description' => 'New Description A',
            'price' => 300,
            'stock' => 75,
            'category' => 'New Category A',
        ];

        $productData2 = [
            'name' => 'New Product B',
            'description' => 'New Description B',
            'price' => 500,
            'stock' => 0,
            'category' => 'New Category B',
        ];

        // Act: Create first product
        $response1 = $this->postJson('/api/products', $productData1);

        // Assert: Product is created successfully
        $response1->assertStatus(201);
        $response1->assertJson([
            'name' => $productData1['name'],
            'stock' => $productData1['stock'],
            'price' => $productData1['price'],
        ]);

        // Assert: Product exists in database with correct stock
        $createdProduct1 = Product::where('name', $productData1['name'])->first();
        $this->assertNotNull($createdProduct1);
        $this->assertEquals($productData1['stock'], $createdProduct1->stock);

        // Act: Create second product with zero stock
        $response2 = $this->postJson('/api/products', $productData2);

        // Assert: Product is created successfully with zero stock
        $response2->assertStatus(201);
        $response2->assertJson([
            'name' => $productData2['name'],
            'stock' => 0,
        ]);

        // Assert: Product exists in database with zero stock
        $createdProduct2 = Product::where('name', $productData2['name'])->first();
        $this->assertNotNull($createdProduct2);
        $this->assertEquals(0, $createdProduct2->stock);
    }

    /**
     * Property: PATCH /api/products/{id} updates product fields including manual stock adjustments
     * 
     * **Validates: Requirements 3.5**
     * 
     * This test verifies that product update functionality remains unchanged.
     * Manual stock adjustments via PATCH must work independently of order creation.
     * 
     * @return void
     */
    public function test_patch_products_updates_product_fields_including_stock()
    {
        // Arrange: Create a product
        $product = Product::create([
            'name' => 'Original Product',
            'description' => 'Original Description',
            'price' => 100,
            'stock' => 50,
            'category' => 'Original Category',
        ]);

        // Act: Update product name and price (partial update)
        $response1 = $this->patchJson("/api/products/{$product->id}", [
            'name' => 'Updated Product',
            'price' => 150,
        ]);

        // Assert: Update is successful
        $response1->assertStatus(200);
        $response1->assertJson([
            'name' => 'Updated Product',
            'price' => 150,
        ]);

        // Assert: Product is updated in database
        $product->refresh();
        $this->assertEquals('Updated Product', $product->name);
        $this->assertEquals(150, $product->price);
        $this->assertEquals(50, $product->stock); // Stock unchanged

        // Act: Update stock manually (inventory adjustment)
        $response2 = $this->patchJson("/api/products/{$product->id}", [
            'stock' => 75,
        ]);

        // Assert: Stock update is successful
        $response2->assertStatus(200);
        $response2->assertJson([
            'stock' => 75,
        ]);

        // Assert: Stock is updated in database
        $product->refresh();
        $this->assertEquals(75, $product->stock);

        // Act: Update multiple fields including stock
        $response3 = $this->patchJson("/api/products/{$product->id}", [
            'name' => 'Final Product',
            'description' => 'Final Description',
            'stock' => 100,
            'category' => 'Final Category',
        ]);

        // Assert: All updates are successful
        $response3->assertStatus(200);
        $product->refresh();
        $this->assertEquals('Final Product', $product->name);
        $this->assertEquals('Final Description', $product->description);
        $this->assertEquals(100, $product->stock);
        $this->assertEquals('Final Category', $product->category);
    }

    /**
     * Property: DELETE /api/products/{id} deletes products
     * 
     * **Validates: Requirements 3.5**
     * 
     * This test verifies that product deletion functionality remains unchanged.
     * Products must be deletable regardless of stock level.
     * 
     * @return void
     */
    public function test_delete_products_deletes_products()
    {
        // Arrange: Create products with various stock levels
        $product1 = Product::create([
            'name' => 'Product to Delete 1',
            'description' => 'Description 1',
            'price' => 100,
            'stock' => 50,
            'category' => 'Category 1',
        ]);

        $product2 = Product::create([
            'name' => 'Product to Delete 2',
            'description' => 'Description 2',
            'price' => 200,
            'stock' => 0,
            'category' => 'Category 2',
        ]);

        $initialCount = Product::count();
        $this->assertEquals(2, $initialCount);

        // Act: Delete first product
        $response1 = $this->deleteJson("/api/products/{$product1->id}");

        // Assert: Deletion is successful
        $response1->assertStatus(200);
        $response1->assertJson([
            'message' => 'Product deleted',
        ]);

        // Assert: Product is removed from database
        $this->assertNull(Product::find($product1->id));
        $this->assertEquals(1, Product::count());

        // Act: Delete second product (with zero stock)
        $response2 = $this->deleteJson("/api/products/{$product2->id}");

        // Assert: Deletion is successful
        $response2->assertStatus(200);

        // Assert: Product is removed from database
        $this->assertNull(Product::find($product2->id));
        $this->assertEquals(0, Product::count());
    }

    /**
     * Property: Order display preserves items array structure
     * 
     * **Validates: Requirements 3.1, 3.6**
     * 
     * This test verifies that order items array structure is preserved
     * throughout the order lifecycle (creation, retrieval, status updates).
     * 
     * @return void
     */
    public function test_order_items_array_structure_is_preserved()
    {
        // Arrange: Create an order with complex items array
        $items = [
            [
                'id' => '1',
                'name' => 'Product A',
                'quantity' => 2,
                'price' => 100,
            ],
            [
                'id' => '2',
                'name' => 'Product B',
                'quantity' => 5,
                'price' => 50,
            ],
            [
                'id' => '3',
                'name' => 'Product C',
                'quantity' => 1,
                'price' => 300,
            ],
        ];

        $order = Order::create([
            'items' => $items,
            'total' => 950,
            'payment_method' => 'online',
            'status' => 'pending',
        ]);

        // Act: Retrieve order via GET /api/orders
        $response = $this->getJson('/api/orders');

        // Assert: Items array structure is preserved
        $responseData = $response->json();
        $orderData = collect($responseData)->firstWhere('id', $order->id);
        $this->assertNotNull($orderData);
        $this->assertEquals($items, $orderData['items']);

        // Assert: Each item has all required fields
        foreach ($orderData['items'] as $item) {
            $this->assertArrayHasKey('id', $item);
            $this->assertArrayHasKey('name', $item);
            $this->assertArrayHasKey('quantity', $item);
            $this->assertArrayHasKey('price', $item);
        }

        // Act: Update order status
        $this->patchJson("/api/orders/{$order->id}", [
            'status' => 'confirmed',
        ]);

        // Assert: Items array remains unchanged after status update
        $order->refresh();
        $this->assertEquals($items, $order->items);
    }

    /**
     * Property: Product operations work independently of order operations
     * 
     * **Validates: Requirements 3.4, 3.5**
     * 
     * This test verifies that product CRUD operations work correctly
     * even when orders exist that reference those products.
     * 
     * @return void
     */
    public function test_product_operations_work_independently_of_orders()
    {
        // Arrange: Create a product
        $product = Product::create([
            'name' => 'Independent Product',
            'description' => 'Description',
            'price' => 100,
            'stock' => 50,
            'category' => 'Category',
        ]);

        // Create an order referencing this product
        $order = Order::create([
            'items' => [
                ['id' => (string)$product->id, 'name' => $product->name, 'quantity' => 5, 'price' => $product->price],
            ],
            'total' => 500,
            'payment_method' => 'online',
            'status' => 'pending',
        ]);

        // Act: Update product stock manually
        $response1 = $this->patchJson("/api/products/{$product->id}", [
            'stock' => 100,
        ]);

        // Assert: Product update is successful
        $response1->assertStatus(200);
        $product->refresh();
        $this->assertEquals(100, $product->stock);

        // Assert: Order items remain unchanged
        $order->refresh();
        $this->assertEquals((string)$product->id, $order->items[0]['id']);
        $this->assertEquals(5, $order->items[0]['quantity']);

        // Act: Update product price
        $response2 = $this->patchJson("/api/products/{$product->id}", [
            'price' => 150,
        ]);

        // Assert: Product price update is successful
        $response2->assertStatus(200);
        $product->refresh();
        $this->assertEquals(150, $product->price);

        // Assert: Order items still reference old price (snapshot at order time)
        $order->refresh();
        $this->assertEquals(100, $order->items[0]['price']);

        // Act: Retrieve product via GET /api/products
        $response3 = $this->getJson('/api/products');

        // Assert: Product is returned with current attributes
        $response3->assertStatus(200);
        $productData = collect($response3->json())->firstWhere('id', $product->id);
        $this->assertEquals(100, $productData['stock']);
        $this->assertEquals(150, $productData['price']);
    }
}
