<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ResortBlockedDate;
use Illuminate\Http\Request;

class ResortAvailabilityController extends Controller
{
    /** Get blocked dates for the authenticated resort owner */
    public function index(Request $request)
    {
        $dates = ResortBlockedDate::where('user_id', $request->user()->id)
            ->orderBy('blocked_date')
            ->get(['id', 'blocked_date', 'reason']);

        return response()->json($dates->map(fn($d) => [
            'id'           => $d->id,
            'blocked_date' => $d->blocked_date->format('Y-m-d'),
            'reason'       => $d->reason,
        ]));
    }

    /** Get blocked dates for a specific resort (public — for tourists) */
    public function publicIndex(int $userId)
    {
        $dates = ResortBlockedDate::where('user_id', $userId)
            ->where('blocked_date', '>=', now()->toDateString())
            ->orderBy('blocked_date')
            ->pluck('blocked_date')
            ->map(fn($d) => $d->format('Y-m-d'));

        return response()->json($dates);
    }

    /** Block a date */
    public function store(Request $request)
    {
        $data = $request->validate([
            'blocked_date' => 'required|date|after_or_equal:today',
            'reason'       => 'nullable|string|max:100',
        ]);

        $existing = ResortBlockedDate::where('user_id', $request->user()->id)
            ->where('blocked_date', $data['blocked_date'])
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Date already blocked.'], 422);
        }

        $blocked = ResortBlockedDate::create([
            'user_id'      => $request->user()->id,
            'blocked_date' => $data['blocked_date'],
            'reason'       => $data['reason'] ?? 'Fully booked',
        ]);

        return response()->json([
            'id'           => $blocked->id,
            'blocked_date' => $blocked->blocked_date->format('Y-m-d'),
            'reason'       => $blocked->reason,
        ], 201);
    }

    /** Block multiple dates at once */
    public function storeBulk(Request $request)
    {
        $data = $request->validate([
            'dates'  => 'required|array|min:1',
            'dates.*'=> 'date|after_or_equal:today',
            'reason' => 'nullable|string|max:100',
        ]);

        $userId = $request->user()->id;
        $reason = $data['reason'] ?? 'Fully booked';
        $created = [];

        foreach ($data['dates'] as $date) {
            ResortBlockedDate::firstOrCreate(
                ['user_id' => $userId, 'blocked_date' => $date],
                ['reason' => $reason]
            );
            $created[] = $date;
        }

        return response()->json(['blocked' => $created, 'count' => count($created)]);
    }

    /** Unblock a date */
    public function destroy(Request $request, int $id)
    {
        $blocked = ResortBlockedDate::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $blocked->delete();
        return response()->json(['message' => 'Date unblocked']);
    }

    /** Unblock by date string */
    public function destroyByDate(Request $request)
    {
        $data = $request->validate(['date' => 'required|date']);

        ResortBlockedDate::where('user_id', $request->user()->id)
            ->where('blocked_date', $data['date'])
            ->delete();

        return response()->json(['message' => 'Date unblocked']);
    }}
