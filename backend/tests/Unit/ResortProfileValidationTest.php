<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Validator;

class ResortProfileValidationTest extends TestCase
{
    /**
     * Test that validation rules are properly defined for setup
     */
    public function test_resort_profile_validation_rules_for_setup()
    {
        $rules = User::resortProfileValidationRules(true);
        
        // Assert required fields are present
        $this->assertArrayHasKey('resort_name', $rules);
        $this->assertArrayHasKey('resort_description', $rules);
        $this->assertArrayHasKey('resort_price_per_night', $rules);
        $this->assertArrayHasKey('images', $rules);
        
        // Assert images are required for setup
        $this->assertStringContainsString('required', $rules['images']);
    }

    /**
     * Test that validation rules are properly defined for update
     */
    public function test_resort_profile_validation_rules_for_update()
    {
        $rules = User::resortProfileValidationRules(false);
        
        // Assert required fields are present
        $this->assertArrayHasKey('resort_name', $rules);
        $this->assertArrayHasKey('resort_description', $rules);
        $this->assertArrayHasKey('resort_price_per_night', $rules);
        $this->assertArrayHasKey('images', $rules);
        
        // Assert images are optional for update
        $this->assertStringContainsString('nullable', $rules['images']);
    }

    /**
     * Test validation passes with valid data for setup
     */
    public function test_validation_passes_with_valid_setup_data()
    {
        $data = [
            'resort_name' => 'Beautiful Beach Resort',
            'resort_description' => 'A wonderful resort by the beach',
            'resort_price_per_night' => 1500.00,
            'resort_amenities' => ['WiFi', 'Pool'],
            'resort_facilities' => 'Restaurant, Spa',
            'resort_policies' => 'Check-in: 2PM, Check-out: 12PM',
        ];

        $validator = Validator::make(
            $data,
            User::resortProfileValidationRules(true),
            User::resortProfileValidationMessages()
        );

        // Should fail because images are required for setup
        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('images', $validator->errors()->toArray());
    }

    /**
     * Test validation fails when resort_name is missing
     */
    public function test_validation_fails_when_resort_name_is_missing()
    {
        $data = [
            'resort_description' => 'A wonderful resort',
            'resort_price_per_night' => 1500.00,
        ];

        $validator = Validator::make(
            $data,
            User::resortProfileValidationRules(false),
            User::resortProfileValidationMessages()
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('resort_name', $validator->errors()->toArray());
    }

    /**
     * Test validation fails when resort_name exceeds 255 characters
     */
    public function test_validation_fails_when_resort_name_exceeds_max_length()
    {
        $data = [
            'resort_name' => str_repeat('a', 256),
            'resort_description' => 'A wonderful resort',
            'resort_price_per_night' => 1500.00,
        ];

        $validator = Validator::make(
            $data,
            User::resortProfileValidationRules(false),
            User::resortProfileValidationMessages()
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('resort_name', $validator->errors()->toArray());
    }

    /**
     * Test validation fails when resort_description is missing
     */
    public function test_validation_fails_when_resort_description_is_missing()
    {
        $data = [
            'resort_name' => 'Beautiful Beach Resort',
            'resort_price_per_night' => 1500.00,
        ];

        $validator = Validator::make(
            $data,
            User::resortProfileValidationRules(false),
            User::resortProfileValidationMessages()
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('resort_description', $validator->errors()->toArray());
    }

    /**
     * Test validation fails when resort_price_per_night is missing
     */
    public function test_validation_fails_when_price_is_missing()
    {
        $data = [
            'resort_name' => 'Beautiful Beach Resort',
            'resort_description' => 'A wonderful resort',
        ];

        $validator = Validator::make(
            $data,
            User::resortProfileValidationRules(false),
            User::resortProfileValidationMessages()
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('resort_price_per_night', $validator->errors()->toArray());
    }

    /**
     * Test validation fails when resort_price_per_night is less than 1
     */
    public function test_validation_fails_when_price_is_less_than_one()
    {
        $data = [
            'resort_name' => 'Beautiful Beach Resort',
            'resort_description' => 'A wonderful resort',
            'resort_price_per_night' => 0,
        ];

        $validator = Validator::make(
            $data,
            User::resortProfileValidationRules(false),
            User::resortProfileValidationMessages()
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('resort_price_per_night', $validator->errors()->toArray());
    }

    /**
     * Test validation passes with valid data for update (no images)
     */
    public function test_validation_passes_with_valid_update_data()
    {
        $data = [
            'resort_name' => 'Beautiful Beach Resort',
            'resort_description' => 'A wonderful resort by the beach',
            'resort_price_per_night' => 1500.00,
            'resort_amenities' => ['WiFi', 'Pool'],
            'resort_facilities' => 'Restaurant, Spa',
            'resort_policies' => 'Check-in: 2PM, Check-out: 12PM',
        ];

        $validator = Validator::make(
            $data,
            User::resortProfileValidationRules(false),
            User::resortProfileValidationMessages()
        );

        $this->assertFalse($validator->fails());
    }

    /**
     * Test validation messages are properly defined
     */
    public function test_validation_messages_are_defined()
    {
        $messages = User::resortProfileValidationMessages();
        
        // Assert key validation messages exist
        $this->assertArrayHasKey('resort_name.required', $messages);
        $this->assertArrayHasKey('resort_description.required', $messages);
        $this->assertArrayHasKey('resort_price_per_night.required', $messages);
        $this->assertArrayHasKey('images.required', $messages);
        
        // Assert messages match requirements
        $this->assertEquals(
            'Resort name is required and must not exceed 255 characters',
            $messages['resort_name.required']
        );
        $this->assertEquals(
            'Resort description is required',
            $messages['resort_description.required']
        );
        $this->assertEquals(
            'Price per night must be greater than zero',
            $messages['resort_price_per_night.required']
        );
        $this->assertEquals(
            'At least one resort image is required',
            $messages['images.required']
        );
    }

    /**
     * Test optional fields are nullable
     */
    public function test_optional_fields_are_nullable()
    {
        $rules = User::resortProfileValidationRules(false);
        
        // Assert optional fields are nullable
        $this->assertStringContainsString('nullable', $rules['resort_amenities']);
        $this->assertStringContainsString('nullable', $rules['resort_facilities']);
        $this->assertStringContainsString('nullable', $rules['resort_policies']);
    }
}
