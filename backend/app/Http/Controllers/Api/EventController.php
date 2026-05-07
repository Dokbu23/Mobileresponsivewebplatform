<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class EventController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return response()->json(\App\Models\Event::orderBy('date','asc')->get());
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
            'name' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'image' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'time' => 'nullable|string|max:255',
            'capacity' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'full_description' => 'nullable|string',
        ]);

        $item = \App\Models\Event::create($data);

        return response()->json($item, 201);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $item = \App\Models\Event::findOrFail($id);
        return response()->json($item);
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
            'name' => 'sometimes|required|string|max:255',
            'location' => 'sometimes|nullable|string|max:255',
            'category' => 'sometimes|nullable|string|max:255',
            'image' => 'sometimes|nullable|string|max:255',
            'date' => 'sometimes|nullable|date',
            'time' => 'sometimes|nullable|string|max:255',
            'capacity' => 'sometimes|nullable|string|max:255',
            'description' => 'sometimes|nullable|string',
            'full_description' => 'sometimes|nullable|string',
        ]);

        $item = \App\Models\Event::findOrFail($id);
        $item->update($data);

        return response()->json($item);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        $item = \App\Models\Event::findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Event deleted']);
    }
}
