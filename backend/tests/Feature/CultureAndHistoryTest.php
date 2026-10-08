<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\CultureArt;
use App\Models\HistoryPost;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Firebase\JWT\JWT;

class CultureAndHistoryTest extends TestCase
{
    use DatabaseTransactions;

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

    /** @test */
    public function public_can_view_culture_arts_and_history_listings()
    {
        $responseCulture = $this->getJson('/api/public/culture-arts');
        $responseCulture->assertStatus(200);

        $responseHistory = $this->getJson('/api/public/histories');
        $responseHistory->assertStatus(200);
    }

    /** @test */
    public function unauthenticated_user_cannot_create_culture_or_history()
    {
        $responseCulture = $this->postJson('/api/admin/culture-arts', [
            'name' => 'Unauthorized Culture',
        ]);
        $this->assertTrue(in_array($responseCulture->getStatusCode(), [401, 403]));

        $responseHistory = $this->postJson('/api/admin/histories', [
            'name' => 'Unauthorized History',
        ]);
        $this->assertTrue(in_array($responseHistory->getStatusCode(), [401, 403]));
    }

    /** @test */
    public function tourist_user_cannot_create_culture_or_history()
    {
        $tourist = User::firstOrCreate(
            ['email' => 'tourist_test_ch@gmail.com'],
            ['name' => 'Tourist Test', 'password' => bcrypt('password')]
        );
        $tourist->role = 'tourist';
        $tourist->save();

        $token = $this->generateJwtToken($tourist);

        $responseCulture = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/admin/culture-arts', [
                'name' => 'Tourist Culture',
            ]);
        $this->assertTrue(in_array($responseCulture->getStatusCode(), [401, 403]));

        $responseHistory = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/admin/histories', [
                'name' => 'Tourist History',
            ]);
        $this->assertTrue(in_array($responseHistory->getStatusCode(), [401, 403]));
    }

    /** @test */
    public function admin_can_create_culture_and_history_posts()
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin_test_ch@mansalay.gov.ph'],
            ['name' => 'Admin Test', 'password' => bcrypt('password')]
        );
        $admin->role = 'admin';
        $admin->save();

        $token = $this->generateJwtToken($admin);

        $responseCulture = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/admin/culture-arts', [
                'name' => 'Official Ambahan Poetry Archive',
                'category' => 'Local Literature & Ambahan',
                'artist_name' => 'Ginaw Bilog',
                'description' => 'Mangyan traditional poetry inscribed on bamboo.',
                'location' => 'Panaytayan',
            ]);
        $responseCulture->assertStatus(201);
        $this->assertDatabaseHas('culture_arts', [
            'name' => 'Official Ambahan Poetry Archive',
        ]);

        $responseHistory = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/admin/histories', [
                'name' => 'Foundation of Mansalay Municipality',
                'category' => 'Origins & Municipal History',
                'period' => '1960s',
                'date' => '1960',
                'description' => 'Official municipal founding documents.',
                'location' => 'Brgy. Poblacion',
            ]);
        $responseHistory->assertStatus(201);
        $this->assertDatabaseHas('histories', [
            'name' => 'Foundation of Mansalay Municipality',
        ]);
    }
}
