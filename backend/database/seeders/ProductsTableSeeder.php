<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ProductsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $now = Carbon::now();

        $products = [
            [
                'name' => 'Bibingka (Fresh Baked)',
                'description' => 'Traditional bibingka made with rice flour and coconut milk, freshly baked and best served warm.',
                'price' => 90,
                'stock' => 40,
                'image' => '/assets/products/bibingka.svg',
                'category' => 'Food',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Kakanin Assortment (Suman & Kutsinta)',
                'description' => 'Handmade local rice cakes: suman, kutsinta, and other traditional kakanin.',
                'price' => 120,
                'stock' => 30,
                'image' => '/assets/products/kakanin.svg',
                'category' => 'Food',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Handwoven Rattan Bag',
                'description' => 'Durable handwoven rattan bag made by local artisans — perfect as a souvenir.',
                'price' => 450,
                'stock' => 18,
                'image' => '/assets/products/rattan-bag.svg',
                'category' => 'Souvenir',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Beaded Mangyan Necklace',
                'description' => 'Authentic beaded necklaces crafted by the Mangyan community.',
                'price' => 350,
                'stock' => 22,
                'image' => '/assets/products/beaded-necklace.svg',
                'category' => 'Souvenir',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Cold-Pressed Coconut Oil (500ml)',
                'description' => 'Pure cold-pressed coconut oil sourced from local farms in Oriental Mindoro.',
                'price' => 185,
                'stock' => 50,
                'image' => '/assets/products/coconut-oil.svg',
                'category' => 'Food',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Banana Chips (200g)',
                'description' => 'Crunchy banana chips made from locally grown bananas — a popular snack and pasalubong.',
                'price' => 95,
                'stock' => 60,
                'image' => '/assets/products/banana-chips.svg',
                'category' => 'Food',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        DB::table('products')->insert($products);
    }
}
