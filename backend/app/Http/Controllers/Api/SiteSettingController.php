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
}
