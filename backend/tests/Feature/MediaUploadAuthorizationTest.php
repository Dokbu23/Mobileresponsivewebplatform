<?php

namespace Tests\Feature;

use Tests\TestCase;

class MediaUploadAuthorizationTest extends TestCase
{
    public function test_chunked_media_uploads_require_authentication(): void
    {
        $this->postJson('/api/media/uploads', [
            'filename' => 'image.jpg',
            'file_size' => 1024,
            'fingerprint' => str_repeat('a', 128),
        ])->assertUnauthorized();
    }
}
