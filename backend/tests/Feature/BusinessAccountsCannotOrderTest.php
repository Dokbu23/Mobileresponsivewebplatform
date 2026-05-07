<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BusinessAccountsCannotOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test products
        Product::create([
            'name' => 'Test Product',
            'description' => 'Test Description',
            'price' => 100,
            'stock' => 50,
            'category' => 'Test',
        ]);
    }

    /** @test */
    public function tourist_can_place_order()
    {
        $product = Product::first();
        
        $response = $this->postJson('/api/orders', [
            'items' => [
                [
                    'id' => $product->id,
                    'name' => $product->name,
                    'quantity' => 2,
                    'price' => $product->price,
                ]
            ],
            'total' => 200,
            'payment_method' => 'online',
            'user_role' => 'tourist',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('orders', [
            'total' => 200,
            'status' => 'pending',
        ]);
    }

    /** @test */
    public function enterprise_cannot_place_order()
    {
        $product = Product::first();
        
        $response = $this->postJson('/api/orders', [
            'items' => [
                [
                    'id' => $product->id,
                    'name' => $product->name,
                    'quantity' => 2,
                    'price' => $product->price,
                ]
            ],
            'total' => 200,
            'payment_method' => 'online',
            'user_role' => 'enterprise',
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'error' => 'Only tourists can place orders. Enterprise and resort accounts are for business management only.'
        ]);
        $this->assertDatabaseMissing('orders', [
            'total' => 200,
        ]);
    }

    /** @test */
    public function resort_cannot_place_order()
    {
        $product = Product::first();
        
        $response = $this->postJson('/api/orders', [
            'items' => [
                [
                    'id' => $product->id,
                    'name' => $product->name,
                    'quantity' => 2,
                    'price' => $product->price,
                ]
            ],
            'total' => 200,
            'payment_method' => 'online',
            'user_role' => 'resort',
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'error' => 'Only tourists can place orders. Enterprise and resort accounts are for business management only.'
        ]);
        $this->assertDatabaseMissing('orders', [
            'total' => 200,
        ]);
    }

    /** @test */
    public function admin_cannot_place_order()
    {
        $product = Product::first();
        
        $response = $this->postJson('/api/orders', [
            'items' => [
                [
                    'id' => $product->id,
                    'name' => $product->name,
                    'quantity' => 2,
                    'price' => $product->price,
                ]
            ],
            'total' => 200,
            'payment_method' => 'online',
            'user_role' => 'admin',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('orders', [
            'total' => 200,
        ]);
    }

    /** @test */
    public function order_requires_user_role()
    {
        $product = Product::first();
        
        $response = $this->postJson('/api/orders', [
            'items' => [
                [
                    'id' => $product->id,
                    'name' => $product->name,
                    'quantity' => 2,
                    'price' => $product->price,
                ]
            ],
            'total' => 200,
            'payment_method' => 'online',
            // Missing user_role
        ]);

        $response->assertStatus(422); // Validation error
        $response->assertJsonValidationErrors(['user_role']);
    }
}
