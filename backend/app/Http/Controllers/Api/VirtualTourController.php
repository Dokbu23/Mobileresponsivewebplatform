<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Models\Accommodation;

class VirtualTourController extends Controller
{
    /**
     * Upload an individual 360 panorama image file.
     * Accessible by resort, enterprise, and admin accounts.
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function upload360Image(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp,avif|max:20480', // Allow up to 20MB for high-res panoramas
            'slot_id' => 'nullable|string|max:100',
        ]);

        if (!$request->hasFile('image')) {
            return response()->json([
                'success' => false,
                'message' => 'No image file was received for upload.',
            ], 400);
        }

        try {
            $image = $request->file('image');
            $timestamp = time();
            $originalName = pathinfo($image->getClientOriginalName(), PATHINFO_FILENAME);
            $cleanName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $originalName);
            $extension = $image->getClientOriginalExtension() ?: 'jpg';
            $filename = 'tour360_' . $user->id . '_' . $timestamp . '_' . uniqid() . '.' . $extension;

            // Store in storage/app/public/360-tours
            $path = $image->storeAs('360-tours', $filename, 'public');
            $publicUrl = '/storage/' . $path;

            return response()->json([
                'success' => true,
                'message' => '360 image uploaded successfully!',
                'url' => $publicUrl,
                'path' => $path,
                'slot_id' => $request->input('slot_id'),
            ]);
        } catch (\Throwable $e) {
            Log::error('360 Image Upload Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload 360 image: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Save/update virtual tour scenes for the authenticated user and their business/resort.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveUserScenes(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $request->validate([
            'virtual_tour_scenes'           => 'required|array',
            'virtual_tour_scenes.*.id'      => 'required',
            'virtual_tour_scenes.*.title'   => 'nullable|string',
            'virtual_tour_scenes.*.subtitle'=> 'nullable|string',
            'virtual_tour_scenes.*.imageUrl'=> 'nullable|string',
        ]);

        $scenes = $request->input('virtual_tour_scenes');

        try {
            // 1. Always update the User record (source of truth)
            $user->virtual_tour_scenes = $scenes;
            $user->save();

            // 2. If the user is a resort owner, sync to their primary Accommodation record only.
            //    Use firstOrNull + individual save() to avoid updating unrelated rooms or records.
            if ($user->role === 'resort') {
                $accommodation = Accommodation::where('user_id', $user->id)->first();
                if ($accommodation) {
                    $accommodation->virtual_tour_scenes = $scenes;
                    $accommodation->save();
                }
            }

            return response()->json([
                'success'              => true,
                'message'              => '360 virtual tour scenes saved successfully.',
                'virtual_tour_scenes'  => $scenes,
                'user'                 => $user->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Save 360 scenes error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to save 360 virtual tour scenes: ' . $e->getMessage(),
            ], 500);
        }
    }
}
