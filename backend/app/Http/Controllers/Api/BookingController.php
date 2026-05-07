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
    public function index()
    {
        return response()->json(\App\Models\Booking::orderBy('created_at','desc')->get());
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
            'accommodation_id' => 'required|integer|exists:accommodations,id',
            'accommodation_snapshot' => 'required|array',
            'check_in' => 'required|date',
            'check_out' => 'required|date',
            'payment_method' => 'nullable|string',
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

        $booking = \App\Models\Booking::create([
            'accommodation_id' => $data['accommodation_id'],
            'accommodation_snapshot' => $data['accommodation_snapshot'],
            'check_in' => $data['check_in'],
            'check_out' => $data['check_out'],
            'payment_method' => $data['payment_method'] ?? null,
            'total' => (int)$data['total'],
            'status' => 'pending',
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
