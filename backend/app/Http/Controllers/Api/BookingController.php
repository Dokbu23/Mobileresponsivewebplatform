<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Notification;

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

        // Notifications (fire-and-forget, never break the flow)
        try {
            // Resolve resort owner id
            $resortOwnerId = $booking->resort_user_id;
            if (!$resortOwnerId && $booking->accommodation_id) {
                $accommodation = \App\Models\Accommodation::find($booking->accommodation_id);
                if ($accommodation) {
                    $resortOwnerId = $accommodation->user_id;
                }
            }

            $checkIn = $booking->check_in instanceof \Carbon\Carbon
                ? $booking->check_in->format('M d, Y')
                : (string) $booking->check_in;

            if ($resortOwnerId) {
                Notification::notify(
                    $resortOwnerId,
                    'booking_new',
                    'May Nag-book!',
                    "{$customerName} booked a stay starting {$checkIn}.",
                    ['booking_id' => $booking->id, 'customer_id' => $booking->customer_id],
                    '/resort/dashboard'
                );
            }

            Notification::notifyAdmins(
                'booking_new',
                'New Booking Created',
                "{$customerName} created a new booking (check-in {$checkIn}).",
                ['booking_id' => $booking->id],
                '/admin/dashboard'
            );
        } catch (\Throwable $e) {
            \Log::warning('Booking notifications failed', ['error' => $e->getMessage()]);
        }

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
        $oldStatus = $booking->status;
        $booking->update([
            'status' => $data['status'],
        ]);

        // Notify tourist about status change
        if ($oldStatus !== $data['status'] && $booking->customer_id) {
            try {
                Notification::notify(
                    $booking->customer_id,
                    'booking_status',
                    'Booking Status Updated',
                    "Your booking #{$booking->id} is now {$data['status']}.",
                    ['booking_id' => $booking->id, 'status' => $data['status']],
                    '/status'
                );
            } catch (\Throwable $e) {
                \Log::warning('Booking status notification failed', ['error' => $e->getMessage()]);
            }
        }

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

    /**
     * Cancel a booking (tourist only).
     * Only bookings with status 'pending' or 'confirmed' can be cancelled.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function cancel(Request $request, $id)
    {
        $user = $request->user();
        $booking = \App\Models\Booking::find($id);

        if (!$booking) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        if ((int) $booking->customer_id !== (int) $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $nonCancellable = ['checked-in', 'completed', 'cancelled'];
        if (in_array($booking->status, $nonCancellable)) {
            return response()->json([
                'message' => 'Booking cannot be cancelled after check-in.',
            ], 422);
        }

        $booking->update(['status' => 'cancelled']);

        // Notifications (fire-and-forget)
        try {
            $touristName = $user->name ?? 'A customer';

            // Notify tourist
            Notification::notify(
                $booking->customer_id,
                'booking_status',
                'Booking Cancelled',
                "Your booking #{$booking->id} has been cancelled by you.",
                ['booking_id' => $booking->id, 'new_status' => 'cancelled'],
                '/status'
            );

            // Notify resort owner
            $resortOwnerId = $booking->resort_user_id;
            if (!$resortOwnerId && $booking->accommodation_id) {
                $accommodation = \App\Models\Accommodation::find($booking->accommodation_id);
                if ($accommodation) {
                    $resortOwnerId = $accommodation->user_id;
                }
            }

            if ($resortOwnerId) {
                Notification::notify(
                    $resortOwnerId,
                    'booking_cancelled',
                    'Booking Cancelled by Customer',
                    "{$touristName} cancelled booking #{$booking->id}.",
                    ['booking_id' => $booking->id, 'customer_id' => $booking->customer_id],
                    '/resort/dashboard'
                );
            }
        } catch (\Throwable $e) {
            \Log::warning('Cancel booking notifications failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Booking cancelled successfully.',
            'booking' => $booking->fresh(),
        ]);
    }
}
