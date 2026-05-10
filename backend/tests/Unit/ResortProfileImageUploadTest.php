<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\Api\ResortProfileController;
use Illuminate\Http\Request;

class ResortProfileImageUploadTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        
        // Fake the storage disk for testing
        Storage::fake('public');
    }

    /**
     * Test that handleImageUploads method exists and is callable
     */
    public function test_handle_image_uploads_method_exists()
    {
        $controller = new ResortProfileController();
        $this->assertTrue(method_exists($controller, 'handleImageUploads'));
    }

    /**
     * Test single image upload
     */
    public function test_single_image_upload()
    {
        // Create a fake image
        $image = UploadedFile::fake()->image('resort.jpg', 800, 600)->size(1024); // 1MB

        // Create a request with the image
        $request = Request::create('/test', 'POST', [], [], [
            'images' => [$image]
        ]);

        // Create controller instance
        $controller = new ResortProfileController();
        
        // Use reflection to call protected method
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('handleImageUploads');
        $method->setAccessible(true);

        // Call the method
        $imageUrls = $method->invoke($controller, $request);

        // Assert that we got one image URL back
        $this->assertIsArray($imageUrls);
        $this->assertCount(1, $imageUrls);
        $this->assertStringStartsWith('/storage/resort-profiles/', $imageUrls[0]);

        // Assert that the file was stored
        $path = str_replace('/storage/', '', $imageUrls[0]);
        Storage::disk('public')->assertExists($path);
    }

    /**
     * Test multiple image uploads (up to 10)
     */
    public function test_multiple_image_uploads()
    {
        // Create 5 fake images
        $images = [];
        for ($i = 0; $i < 5; $i++) {
            $images[] = UploadedFile::fake()->image("resort{$i}.jpg", 800, 600)->size(1024);
        }

        // Create a request with the images
        $request = Request::create('/test', 'POST', [], [], [
            'images' => $images
        ]);

        // Create controller instance
        $controller = new ResortProfileController();
        
        // Use reflection to call protected method
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('handleImageUploads');
        $method->setAccessible(true);

        // Call the method
        $imageUrls = $method->invoke($controller, $request);

        // Assert that we got 5 image URLs back
        $this->assertIsArray($imageUrls);
        $this->assertCount(5, $imageUrls);

        // Assert that all files were stored
        foreach ($imageUrls as $imageUrl) {
            $this->assertStringStartsWith('/storage/resort-profiles/', $imageUrl);
            $path = str_replace('/storage/', '', $imageUrl);
            Storage::disk('public')->assertExists($path);
        }
    }

    /**
     * Test that image filenames are unique with timestamps
     */
    public function test_image_filenames_are_unique()
    {
        // Create 2 fake images with the same name
        $image1 = UploadedFile::fake()->image('resort.jpg', 800, 600)->size(1024);
        $image2 = UploadedFile::fake()->image('resort.jpg', 800, 600)->size(1024);

        // Create a request with the images
        $request = Request::create('/test', 'POST', [], [], [
            'images' => [$image1, $image2]
        ]);

        // Create controller instance
        $controller = new ResortProfileController();
        
        // Use reflection to call protected method
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('handleImageUploads');
        $method->setAccessible(true);

        // Call the method
        $imageUrls = $method->invoke($controller, $request);

        // Assert that we got 2 different URLs
        $this->assertCount(2, $imageUrls);
        $this->assertNotEquals($imageUrls[0], $imageUrls[1]);
    }

    /**
     * Test that no images returns empty array
     */
    public function test_no_images_returns_empty_array()
    {
        // Create a request without images
        $request = Request::create('/test', 'POST');

        // Create controller instance
        $controller = new ResortProfileController();
        
        // Use reflection to call protected method
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('handleImageUploads');
        $method->setAccessible(true);

        // Call the method
        $imageUrls = $method->invoke($controller, $request);

        // Assert that we got an empty array
        $this->assertIsArray($imageUrls);
        $this->assertCount(0, $imageUrls);
    }

    /**
     * Test deleteOldImages method
     */
    public function test_delete_old_images()
    {
        // Create and store a fake image
        $image = UploadedFile::fake()->image('old-resort.jpg', 800, 600);
        $path = $image->store('resort-profiles', 'public');
        $imageUrl = '/storage/' . $path;

        // Verify the file exists
        Storage::disk('public')->assertExists($path);

        // Create controller instance
        $controller = new ResortProfileController();
        
        // Use reflection to call protected method
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('deleteOldImages');
        $method->setAccessible(true);

        // Call the method to delete the image
        $method->invoke($controller, [$imageUrl]);

        // Assert that the file was deleted
        Storage::disk('public')->assertMissing($path);
    }

    /**
     * Test deleteOldImages with multiple images
     */
    public function test_delete_multiple_old_images()
    {
        // Create and store multiple fake images
        $imageUrls = [];
        $paths = [];
        
        for ($i = 0; $i < 3; $i++) {
            $image = UploadedFile::fake()->image("old-resort{$i}.jpg", 800, 600);
            $path = $image->store('resort-profiles', 'public');
            $paths[] = $path;
            $imageUrls[] = '/storage/' . $path;
            
            // Verify the file exists
            Storage::disk('public')->assertExists($path);
        }

        // Create controller instance
        $controller = new ResortProfileController();
        
        // Use reflection to call protected method
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('deleteOldImages');
        $method->setAccessible(true);

        // Call the method to delete all images
        $method->invoke($controller, $imageUrls);

        // Assert that all files were deleted
        foreach ($paths as $path) {
            Storage::disk('public')->assertMissing($path);
        }
    }

    /**
     * Test deleteOldImages handles non-existent files gracefully
     */
    public function test_delete_old_images_handles_non_existent_files()
    {
        $imageUrls = [
            '/storage/resort-profiles/non-existent-1.jpg',
            '/storage/resort-profiles/non-existent-2.jpg'
        ];

        // Create controller instance
        $controller = new ResortProfileController();
        
        // Use reflection to call protected method
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('deleteOldImages');
        $method->setAccessible(true);

        // This should not throw an exception
        $method->invoke($controller, $imageUrls);

        // If we get here, the test passed
        $this->assertTrue(true);
    }
}
