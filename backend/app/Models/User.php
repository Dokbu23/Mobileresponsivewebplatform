<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name', 'email', 'password', 'role', 'listing_status', 'is_active', 'payment_details',
        'subscription_status', 'subscription_paid_at', 'subscription_expires_at', 'subscription_amount',
        'phone', 'address', 'barangay', 'description', 'registration_details', 'email_verified_at',
        'resort_name', 'resort_description', 'resort_price_per_night', 'resort_images', 
        'resort_amenities', 'resort_facilities', 'resort_policies', 'resort_is_setup',
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password', 'remember_token',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
        'payment_details' => 'array',
        'registration_details' => 'array',
        'resort_images' => 'array',
        'resort_amenities' => 'array',
        'resort_is_setup' => 'boolean',
    ];

    /**
     * Get the resort setup status.
     *
     * @return bool
     */
    public function getResortIsSetupAttribute(mixed $value): bool
    {
        return (bool) $value;
    }

    /**
     * Get validation rules for resort profile fields.
     *
     * @param bool $isSetup Whether this is for initial setup (requires images)
     * @return array
     */
    public static function resortProfileValidationRules($isSetup = false)
    {
        $rules = [
            'resort_name' => 'required|string|max:255',
            'resort_description' => 'required|string',
            'resort_price_per_night' => 'required|numeric|min:1',
            'resort_amenities' => 'nullable|array',
            'resort_facilities' => 'nullable|string',
            'resort_policies' => 'nullable|string',
        ];

        if ($isSetup) {
            // For initial setup, images are required
            $rules['images'] = 'required|array|min:1|max:10';
            $rules['images.*'] = 'required|file|mimes:jpg,jpeg,png,webp,avif|max:5120'; // 5MB max
        } else {
            // For updates, images are optional
            $rules['images'] = 'nullable|array|max:10';
            $rules['images.*'] = 'nullable|file|mimes:jpg,jpeg,png,webp,avif|max:5120';
        }

        return $rules;
    }

    /**
     * Get validation error messages for resort profile fields.
     *
     * @return array
     */
    public static function resortProfileValidationMessages()
    {
        return [
            'resort_name.required' => 'Resort name is required and must not exceed 255 characters',
            'resort_name.max' => 'Resort name is required and must not exceed 255 characters',
            'resort_description.required' => 'Resort description is required',
            'resort_price_per_night.required' => 'Price per night must be greater than zero',
            'resort_price_per_night.min' => 'Price per night must be greater than zero',
            'images.required' => 'At least one resort image is required',
            'images.min' => 'At least one resort image is required',
            'images.max' => 'You can upload a maximum of 10 images',
            'images.*.image' => 'Image must be JPG, JPEG, PNG, WebP, or AVIF',
            'images.*.mimes' => 'Image must be JPG, JPEG, PNG, WebP, or AVIF',
            'images.*.max' => 'Image size must not exceed 5MB',
        ];
    }
}
