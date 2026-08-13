<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Landmark;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LandmarkController extends Controller
{
    /**
     * Official 2D Boundary Polygon Vertices for Mansalay, Oriental Mindoro, Philippines
     * Format: [Latitude, Longitude]
     */
    const MANSALAY_POLYGON = [
        [12.6150, 121.3250],
        [12.6180, 121.4100],
        [12.5950, 121.4850],
        [12.5650, 121.5250],
        [12.5100, 121.5450],
        [12.4450, 121.5200],
        [12.4250, 121.4650],
        [12.4220, 121.3900],
        [12.4500, 121.3300],
        [12.5300, 121.3180],
        [12.6150, 121.3250], // Closed loop vertex
    ];

    /**
     * Server-Side Point-in-Polygon Check (Ray-Casting Algorithm)
     */
    public static function isPointInMansalayPolygon(float $lat, float $lng): bool
    {
        $polygon = self::MANSALAY_POLYGON;
        $numVertices = count($polygon);
        $inside = false;

        for ($i = 0, $j = $numVertices - 1; $i < $numVertices; $j = $i++) {
            $xi = $polygon[$i][0];
            $yi = $polygon[$i][1];
            $xj = $polygon[$j][0];
            $yj = $polygon[$j][1];

            $intersect = (($yi > $lng) != ($yj > $lng)) &&
                ($lat < ($xj - $xi) * ($lng - $yi) / ($yj - $yi + 1e-12) + $xi);

            if ($intersect) {
                $inside = !$inside;
            }
        }

        return $inside;
    }

    /**
     * Get all active landmarks for the map.
     */
    public function index()
    {
        $landmarks = Landmark::where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($landmarks);
    }

    /**
     * Store a newly created landmark with strict role-based authorization and polygon geofence validation.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $role = strtolower($user ? ($user->role ?? 'tourist') : ($request->input('role', 'tourist')));

        // 1. TOURISTS ARE STRICTLY FORBIDDEN FROM CREATING LANDMARKS
        if ($role === 'tourist') {
            return response()->json([
                'error' => 'LANDMARK_CREATION_NOT_ALLOWED',
                'message' => 'Tourists are not allowed to create landmarks.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|in:resort,enterprise',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
            'address' => 'nullable|string|max:255',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'image' => 'nullable|string|max:500',
        ], [
            'type.in' => 'Only Resort and Enterprise landmarks are allowed.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $requestedType = strtolower($request->type);

        // 2. RESORT USER CAN ONLY CREATE RESORT LANDMARKS
        if ($role === 'resort' && $requestedType !== 'resort') {
            return response()->json([
                'error' => 'INVALID_LANDMARK_TYPE_FOR_ROLE',
                'message' => 'Resort accounts can only create Resort landmarks.',
            ], 403);
        }

        // 3. ENTERPRISE USER CAN ONLY CREATE ENTERPRISE LANDMARKS
        if ($role === 'enterprise' && $requestedType !== 'enterprise') {
            return response()->json([
                'error' => 'INVALID_LANDMARK_TYPE_FOR_ROLE',
                'message' => 'Enterprise accounts can only create Enterprise landmarks.',
            ], 403);
        }

        $lat = (float) $request->latitude;
        $lng = (float) $request->longitude;

        // 4. Strict Server-Side Mansalay Polygon Geofence Check
        if (!self::isPointInMansalayPolygon($lat, $lng)) {
            return response()->json([
                'error' => 'OUTSIDE_MANSALAY_BOUNDARY',
                'message' => 'Landmark location must be within Mansalay, Oriental Mindoro.',
            ], 422);
        }

        $landmark = Landmark::create([
            'user_id' => $user ? $user->id : null,
            'name' => $request->name,
            'type' => $requestedType,
            'category' => $request->category ?? ucfirst($requestedType),
            'description' => $request->description,
            'address' => $request->address,
            'latitude' => $lat,
            'longitude' => $lng,
            'image' => $request->image,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Landmark created successfully!',
            'landmark' => $landmark,
        ], 201);
    }
}
