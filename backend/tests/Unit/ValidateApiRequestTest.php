<?php

namespace Tests\Unit;

use App\Http\Middleware\ValidateApiRequest;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ValidateApiRequestTest extends TestCase
{
    public function test_it_accepts_a_combined_image_size_of_exactly_fifty_mib(): void
    {
        $request = Request::create('/api/events', 'POST');
        $request->files->set('images', [
            UploadedFile::fake()->image('first.jpg')->size(25 * 1024),
            UploadedFile::fake()->image('second.jpg')->size(25 * 1024),
        ]);

        $response = app(ValidateApiRequest::class)->handle($request, function () {
            return response()->json(['accepted' => true]);
        });

        $this->assertSame(200, $response->getStatusCode());
    }

    public function test_it_rejects_a_combined_image_size_over_fifty_mib(): void
    {
        $request = Request::create('/api/events', 'POST');
        $request->files->set('images', [
            UploadedFile::fake()->image('first.jpg')->size(25 * 1024),
            UploadedFile::fake()->image('second.jpg')->size((25 * 1024) + 1),
        ]);

        $response = app(ValidateApiRequest::class)->handle($request, function () {
            return response()->json(['accepted' => true]);
        });

        $this->assertSame(422, $response->getStatusCode());
        $this->assertStringContainsString('50 MiB', $response->getContent());
    }

    public function test_it_rejects_an_image_over_the_configured_per_image_limit(): void
    {
        config(['uploads.max_image_size_bytes' => 1]);
        $request = Request::create('/api/events', 'POST');
        $request->files->set('image', UploadedFile::fake()->image('oversized.jpg'));

        $response = app(ValidateApiRequest::class)->handle($request, function () {
            return response()->json(['accepted' => true]);
        });

        $this->assertSame(422, $response->getStatusCode());
        $this->assertStringContainsString('Image exceeds the configured', $response->getContent());
    }

    public function test_it_rejects_more_than_twenty_images_in_one_submission(): void
    {
        $images = [];
        for ($index = 0; $index < 21; $index++) {
            $images[] = UploadedFile::fake()->image("image-{$index}.jpg")->size(1);
        }

        $request = Request::create('/api/events', 'POST');
        $request->files->set('images', $images);

        $response = app(ValidateApiRequest::class)->handle($request, function () {
            return response()->json(['accepted' => true]);
        });

        $this->assertSame(422, $response->getStatusCode());
        $this->assertStringContainsString('no more than 20 images', $response->getContent());
    }

    public function test_it_rejects_an_image_whose_filename_extension_does_not_match_its_signature(): void
    {
        $request = Request::create('/api/events', 'POST');
        $request->files->set('image', UploadedFile::fake()->image('spoofed.png'));

        $response = app(ValidateApiRequest::class)->handle($request, function () {
            return response()->json(['accepted' => true]);
        });

        $this->assertSame(422, $response->getStatusCode());
        $this->assertStringContainsString('extension does not match', $response->getContent());
    }
}
