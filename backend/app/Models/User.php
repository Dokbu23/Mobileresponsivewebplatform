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
     * SECURITY: Mass Assignment Protection
     * 
     * WHY: Kung lahat ng fields ay fillable, puwedeng mag-inject ng data ang attacker
     * 
     * EXAMPLE ATTACK:
     * POST /api/register
     * {
     *   "email": "hacker@evil.com",
     *   "role": "admin",  // ⚠️ Attacker becomes admin!
     *   "subscription_status": "paid"  // ⚠️ Free subscription!
     * }
     * 
     * FIX: Only allow safe fields in $fillable
     *      Sensitive fields should be set explicitly in code
     */
    
    /**
     * The attributes that are mass assignable (SAFE fields only)
     *
     * @var array
     */
    protected $fillable = [
        // Basic user info (safe to fill)
        'name', 
        'email', 
        'email_verified_at',
        'password',
        'phone', 
        'address', 
        'barangay', 
        'description',
        'avatar',
        'latitude', 
        'longitude',
        
        // Registration details (read-only data for admin review)
        'registration_details',
        
        // Resort/Store profile data (owners manage their own)
        'resort_name', 
        'resort_description', 
        'resort_price_per_night', 
        'resort_images',
        'resort_amenities', 
        'resort_facilities', 
        'resort_policies', 
        'resort_is_setup',
        'resort_logo',
        'resort_banner',
        'video_url',
        'video',
        'store_name', 
        'store_description', 
        'store_logo', 
        'store_banner', 
        'store_is_setup',
        'facebook_link',
        'instagram_link',
    ];

    /**
     * SECURITY: Guarded fields - CANNOT be mass assigned
     * 
     * These fields should ONLY be set by admins or system logic
     * NOT by user input
     *
     * @var array
     */
    protected $guarded = [
        'id',
        'role',                      // ⚠️ Only admins can change roles
        'listing_status',            // ⚠️ Only admins can approve listings
        'is_active',                 // ⚠️ Only admins can activate/deactivate
        'subscription_status',       // ⚠️ Only system can verify subscription
        'subscription_paid_at',      // ⚠️ Set by payment verification
        'subscription_expires_at',   // ⚠️ Set by payment verification
        'subscription_amount',       // ⚠️ Set by payment verification
        'payment_details',           // ⚠️ Only owner can update via dedicated endpoint
        'email_verified_at',         // ⚠️ Set by email verification process
        'remember_token',            // ⚠️ Laravel internal
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
        'subscription_paid_at' => 'datetime',
        'subscription_expires_at' => 'datetime',
        'is_active' => 'boolean',
        'payment_details' => 'array',
        'registration_details' => 'array',
        'resort_images' => 'array',
        'resort_amenities' => 'array',
        'resort_is_setup' => 'boolean',
        'store_is_setup'  => 'boolean',
        'resort_price_per_night' => 'float',
    ];

    /**
     * Get the resort setup status.
     *
     * @param mixed $value
     * @return bool
     */
    public function getResortIsSetupAttribute($value): bool
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
