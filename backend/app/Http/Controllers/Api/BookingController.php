<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // If admin, show all bookings
        if ($user && $user->role === 'admin') {
            return response()->json(\App\Models\Booking::with(['accommodation'])
                ->orderBy('created_at','desc')->get());
        }
        
        // If resort owner, show only their bookings
        if ($user && $user->role === 'resort') {
            return response()->json(\App\Models\Booking::with(['accommodation'])
                ->where(function ($query) use ($user) {
                    $query->whereHas('accommodation', function($subQuery) use ($user) {
                        $subQuery->where('user_id', $user->id);
                    })->orWhere('resort_user_id', $user->id);
                })
                ->orderBy('created_at','desc')->get());
        }
        
        // If tourist, show only their bookings
        if ($user && $user->role === 'tourist') {
            return response()->json(\App\Models\Booking::with(['accommodation'])
                ->where('customer_id', $user->id)
                ->orderBy('created_at','desc')->get());
        }
        
        // Default: return empty array for other roles
        return response()->json([]);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'accommodation_type' => 'nullable|string|in:static,resort_profile',
            'accommodation_id' => 'nullable|integer|exists:accommodations,id',
            'resort_user_id' => 'nullable|integer|exists:users,id',
            'accommodation_snapshot' => 'required|array',
            'check_in' => 'required|date',
            'check_out' => 'required|date',
            'payment_method' => 'nullable|string|in:online,otc,cod',
            'total' => 'required|numeric',
            'user_role' => 'required|string',
            'user_id' => 'nullable|integer',
        ]);

        // Only tourists can book accommodations
        // Enterprise and resort are business management accounts, not customers
        if ($data['user_role'] !== 'tourist') {
            return response()->json([
                'error' => 'Only tourists can book accommodations. Enterprise and resort accounts are for business management only.'
            ], 403);
        }

        $accommodationType = $data['accommodation_type'] ?? 'static';

        if ($accommodationType === 'resort_profile') {
            if (empty($data['resort_user_id'])) {
                return response()->json(['error' => 'Resort owner is required for resort profile booking.'], 422);
            }

            $resortOwner = \App\Models\User::where('id', $data['resort_user_id'])
                ->where('role', 'resort')
                ->where('resort_is_setup', true)
                ->where('listing_status', 'approved')
                ->first();

            if (!$resortOwner) {
                return response()->json(['error' => 'Resort profile is not available for booking.'], 422);
            }
        } else {
            if (empty($data['accommodation_id'])) {
                return response()->json(['error' => 'Accommodation is required for booking.'], 422);
            }
        }

        // Get customer information
        $customer = $request->user();
        $customerName = $customer ? $customer->name : 'Guest';
        $customerEmail = $customer ? $customer->email : null;
        $customerPhone = $customer ? $customer->phone : null;

        $booking = \App\Models\Booking::create([
            'accommodation_id' => $accommodationType === 'static' ? $data['accommodation_id'] : null,
            'resort_user_id' => $accommodationType === 'resort_profile' ? $data['resort_user_id'] : null,
            'accommodation_type' => $accommodationType,
            'accommodation_snapshot' => $data['accommodation_snapshot'],
            'check_in' => $data['check_in'],
            'check_out' => $data['check_out'],
            'payment_method' => $data['payment_method'] ?? null,
            'total' => (int)$data['total'],
            'status' => 'pending',
            'customer_id' => $customer ? $customer->id : null,
            'customer_name' => $customerName,
            'customer_email' => $customerEmail,
            'customer_phone' => $customerPhone,
        ]);

        return response()->json($booking, 201);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,checked-in,completed',
        ]);

        $booking = \App\Models\Booking::findOrFail($id);
        $booking->update([
            'status' => $data['status'],
        ]);

        return response()->json($booking);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
}
