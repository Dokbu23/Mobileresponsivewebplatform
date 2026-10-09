<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SiteSettingController extends Controller
{
    /**
     * Get the current Homepage Hero Background image.
     */
    public function getHomeBackground()
    {
        $bg = SiteSetting::get('home_hero_background');

        return response()->json([
            'background_image' => $bg ?: '/assets/mansalay_hero_bg.jpg',
            'is_custom'        => !empty($bg),
        ]);
    }

    /**
     * Upload or set a new Homepage Hero Background image (Admin only).
     */
    public function updateHomeBackground(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only admin can change homepage background.'], 403);
        }

        $path = null;

        if ($request->hasFile('image')) {
            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,webp,gif|max:15360',
            ], [
                'image.image' => 'The uploaded file must be a valid image.',
                'image.max'   => 'Image size cannot exceed 15MB.',
            ]);

            // Save in storage/app/public/site/hero
            $saved = $request->file('image')->store('site/hero', 'public');
            $path = '/storage/' . $saved;
        } elseif ($request->filled('image_url')) {
            $request->validate([
                'image_url' => 'required|string|max:1000',
            ]);
            $path = trim($request->input('image_url'));
        } else {
            return response()->json(['message' => 'Please provide an image file or URL.'], 422);
        }

        // Auto-save in database
        SiteSetting::set('home_hero_background', $path);

        return response()->json([
            'message'          => 'Homepage background image saved to database successfully!',
            'background_image' => $path,
            'is_custom'        => true,
        ]);
    }

    /**
     * Reset Homepage Hero Background image to system default (Admin only).
     */
    public function resetHomeBackground(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only admin can reset homepage background.'], 403);
        }

        SiteSetting::where('key', 'home_hero_background')->delete();

        return response()->json([
            'message'          => 'Homepage background reset to default.',
            'background_image' => '/assets/mansalay_hero_bg.jpg',
            'is_custom'        => false,
        ]);
    }

    /**
     * Get the public Tourism Contact & Social Media settings.
     */
    public function getContactSettings()
    {
        return response()->json([
            'email'     => SiteSetting::get('contact_email') ?: 'info@discovermansalay.com',
            'phone'     => SiteSetting::get('contact_phone') ?: '+63 123 456 7890',
            'address'   => SiteSetting::get('contact_address') ?: 'Mansalay Municipal Hall, Oriental Mindoro',
            'facebook'  => SiteSetting::get('contact_facebook') ?: 'https://facebook.com',
            'instagram' => SiteSetting::get('contact_instagram') ?: 'https://instagram.com',
            'twitter'   => SiteSetting::get('contact_twitter') ?: 'https://twitter.com',
        ]);
    }

    /**
     * Update the public Tourism Contact & Social Media settings (Admin only).
     */
    public function updateContactSettings(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Only admin can modify site settings.'], 403);
        }

        $validated = $request->validate([
            'email'     => 'nullable|email|max:255',
            'phone'     => 'nullable|string|max:50',
            'address'   => 'nullable|string|max:255',
            'facebook'  => 'nullable|string|max:255',
            'instagram' => 'nullable|string|max:255',
            'twitter'   => 'nullable|string|max:255',
        ]);

        if (array_key_exists('email', $validated))     SiteSetting::set('contact_email', $validated['email'] ?? '');
        if (array_key_exists('phone', $validated))     SiteSetting::set('contact_phone', $validated['phone'] ?? '');
        if (array_key_exists('address', $validated))   SiteSetting::set('contact_address', $validated['address'] ?? '');
        if (array_key_exists('facebook', $validated))  SiteSetting::set('contact_facebook', $validated['facebook'] ?? '');
        if (array_key_exists('instagram', $validated)) SiteSetting::set('contact_instagram', $validated['instagram'] ?? '');
        if (array_key_exists('twitter', $validated))   SiteSetting::set('contact_twitter', $validated['twitter'] ?? '');

        return response()->json([
            'message'  => 'Official contact details updated successfully!',
            'settings' => [
                'email'     => SiteSetting::get('contact_email') ?: 'info@discovermansalay.com',
                'phone'     => SiteSetting::get('contact_phone') ?: '+63 123 456 7890',
                'address'   => SiteSetting::get('contact_address') ?: 'Mansalay Municipal Hall, Oriental Mindoro',
                'facebook'  => SiteSetting::get('contact_facebook') ?: 'https://facebook.com',
                'instagram' => SiteSetting::get('contact_instagram') ?: 'https://instagram.com',
                'twitter'   => SiteSetting::get('contact_twitter') ?: 'https://twitter.com',
            ],
        ]);
    }
}
