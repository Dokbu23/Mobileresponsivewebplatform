<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShippingAddress;
use Illuminate\Http\Request;

class ShippingAddressController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $addresses = ShippingAddress::where('user_id', $userId)
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get();

        return response()->json($addresses);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'address' => 'required|string|max:255',
            'barangay' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'province' => 'required|string|max:255',
            'zip' => 'required|string|max:20',
            'notes' => 'nullable|string',
            'is_default' => 'sometimes|boolean',
        ]);

        $userId = $request->user()->id;
        $makeDefault = (bool) ($data['is_default'] ?? false);

        if (!$makeDefault) {
            $hasDefault = ShippingAddress::where('user_id', $userId)
                ->where('is_default', true)
                ->exists();
            $makeDefault = !$hasDefault;
        }

        if ($makeDefault) {
            ShippingAddress::where('user_id', $userId)->update(['is_default' => false]);
        }

        $address = ShippingAddress::create([
            'user_id' => $userId,
            'full_name' => $data['full_name'],
            'phone' => $data['phone'],
            'address' => $data['address'],
            'barangay' => $data['barangay'],
            'city' => $data['city'],
            'province' => $data['province'],
            'zip' => $data['zip'],
            'notes' => $data['notes'] ?? null,
            'is_default' => $makeDefault,
        ]);

        return response()->json($address, 201);
    }

    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'address' => 'required|string|max:255',
            'barangay' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'province' => 'required|string|max:255',
            'zip' => 'required|string|max:20',
            'notes' => 'nullable|string',
            'is_default' => 'sometimes|boolean',
        ]);

        $userId = $request->user()->id;
        $address = ShippingAddress::where('user_id', $userId)->findOrFail($id);

        $makeDefault = (bool) ($data['is_default'] ?? false);
        if ($makeDefault) {
            ShippingAddress::where('user_id', $userId)->update(['is_default' => false]);
        }

        $address->update([
            'full_name' => $data['full_name'],
            'phone' => $data['phone'],
            'address' => $data['address'],
            'barangay' => $data['barangay'],
            'city' => $data['city'],
            'province' => $data['province'],
            'zip' => $data['zip'],
            'notes' => $data['notes'] ?? null,
            'is_default' => $makeDefault ? true : $address->is_default,
        ]);

        return response()->json($address);
    }

    public function destroy(Request $request, $id)
    {
        $userId = $request->user()->id;
        $address = ShippingAddress::where('user_id', $userId)->findOrFail($id);

        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $nextAddress = ShippingAddress::where('user_id', $userId)
                ->orderBy('created_at')
                ->first();
            if ($nextAddress) {
                $nextAddress->update(['is_default' => true]);
            }
        }

        return response()->json(['message' => 'Shipping address deleted']);
    }

    public function setDefault(Request $request, $id)
    {
        $userId = $request->user()->id;
        $address = ShippingAddress::where('user_id', $userId)->findOrFail($id);

        ShippingAddress::where('user_id', $userId)->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json($address);
    }
}
