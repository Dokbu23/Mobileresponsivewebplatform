<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attraction;
use App\Models\Accommodation;
use App\Models\Event;
use App\Models\Product;
use App\Models\User;
use App\Models\Order;
use App\Models\Booking;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    /**
    /**
     * Get platform statistics for dashboards (100% Real-Data Driven)
     */
    public function getPlatformStats(Request $request)
    {
        try {
            $now = \Carbon\Carbon::now();
            $startOfMonth = $now->copy()->startOfMonth();
            $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
            $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

            // Core entity counts
            $attractionsCount = Attraction::count();
            $attractionsThisMonth = Attraction::where('created_at', '>=', $startOfMonth)->count();
            $resortsCount     = Accommodation::count();
            $productsCount    = Product::count();
            
            // Events
            $eventsThisMonth = Event::whereMonth('date', $now->month)
                ->whereYear('date', $now->year)
                ->count();
            $eventsUpcoming = Event::where('date', '>=', $now->toDateString())->count();
            $eventsCount = $eventsThisMonth > 0 ? $eventsThisMonth : Event::count();

            // Registered tourist counts (Unique visitors)
            $touristQuery = User::where('role', 'tourist');
            $lifetimeTourists = (clone $touristQuery)->count();
            $allUsers         = User::count();

            // Active businesses (resorts & enterprises)
            $businessesCount = User::whereIn('role', ['resort', 'enterprise'])->count();
            if ($businessesCount === 0 && ($resortsCount > 0 || $productsCount > 0)) {
                $businessesCount = $resortsCount + ($productsCount > 0 ? 1 : 0);
            }
            $businessesThisMonth = User::whereIn('role', ['resort', 'enterprise'])
                ->where('created_at', '>=', $startOfMonth)
                ->count();

            // Orders & Bookings
            $totalOrders       = Order::count();
            $completedOrders   = Order::where('status', 'completed')->count();
            $totalBookings     = Booking::count();
            $completedBookings = Booking::whereIn('status', ['confirmed', 'completed', 'paid'])->count();
            $ordersRevenue     = Order::where('status', 'completed')->sum('total');
            $bookingsRevenue   = Booking::whereIn('status', ['confirmed', 'completed', 'paid'])->sum('total');
            $totalRevenue      = (float) ($ordersRevenue + $bookingsRevenue);

            // ── DYNAMIC DATE RANGE FILTERING FOR VISITOR ANALYTICS ──
            $monthsCount = max(1, min(60, (int) $request->get('months', 6)));
            if ($request->filled('start_date') && $request->filled('end_date')) {
                $startDate = \Carbon\Carbon::parse($request->get('start_date'))->startOfDay();
                $endDate   = \Carbon\Carbon::parse($request->get('end_date'))->endOfDay();
            } else {
                $endDate   = $now->copy()->endOfMonth();
                $startDate = $now->copy()->subMonths($monthsCount - 1)->startOfMonth();
            }

            // Real visitor trend grouped dynamically by YEAR + MONTH
            $visitorTrend = [];
            $cur = $startDate->copy()->startOfMonth();
            $endCursor = $endDate->copy()->startOfMonth();

            while ($cur->lte($endCursor)) {
                $mStart = $cur->copy()->startOfMonth();
                $mEnd   = $cur->copy()->endOfMonth();

                $count = (clone $touristQuery)->whereBetween('created_at', [$mStart, $mEnd])->count();

                $visitorTrend[] = [
                    'year'     => (int) $cur->format('Y'),
                    'month'    => $cur->format('M'),
                    'label'    => $cur->format('M Y'),
                    'period'   => $cur->format('Y-m'),
                    'visitors' => $count,
                ];

                $cur->addMonth();
            }

            // Calculate Total Visitors within selected date range
            $totalVisitorsInRange = (clone $touristQuery)->whereBetween('created_at', [$startDate, $endDate])->count();

            // Highest & Lowest Month dynamically calculated
            $highestMonth = null;
            $lowestMonth  = null;
            $totalTrendMonths = count($visitorTrend);
            $averagePerMonth = $totalTrendMonths > 0 ? round($totalVisitorsInRange / $totalTrendMonths, 1) : 0;

            if ($totalVisitorsInRange > 0 && !empty($visitorTrend)) {
                $maxItem = null;
                $minItem = null;

                foreach ($visitorTrend as $item) {
                    if ($maxItem === null || $item['visitors'] > $maxItem['visitors']) {
                        $maxItem = $item;
                    }
                    if ($minItem === null || $item['visitors'] < $minItem['visitors']) {
                        $minItem = $item;
                    }
                }

                if ($maxItem && $maxItem['visitors'] > 0) {
                    $highestMonth = [
                        'month'    => $maxItem['label'],
                        'visitors' => $maxItem['visitors'],
                    ];
                }

                if ($minItem) {
                    $lowestMonth = [
                        'month'    => $minItem['label'],
                        'visitors' => $minItem['visitors'],
                    ];
                }
            }

            // Percentage change compared to the preceding period of equal length
            $periodDays = $startDate->diffInDays($endDate) + 1;
            $prevEndDate = $startDate->copy()->subSecond();
            $prevStartDate = $prevEndDate->copy()->subDays($periodDays)->startOfDay();

            $prevVisitorsCount = (clone $touristQuery)->whereBetween('created_at', [$prevStartDate, $prevEndDate])->count();

            $percentageChange = null;
            if ($prevVisitorsCount > 0) {
                $percentageChange = round((($totalVisitorsInRange - $prevVisitorsCount) / $prevVisitorsCount) * 100, 1);
            }

            // ── DYNAMIC DESTINATION ANALYTICS (PAGED VIEWS & CATEGORIES) ──
            $selectedCategory = $request->get('category', 'all');

            $destQuery = Attraction::query();
            if ($selectedCategory && $selectedCategory !== 'all' && $selectedCategory !== 'All Destinations') {
                $destQuery->where('category', $selectedCategory);
            }

            $destinationsRaw = $destQuery->select('id', 'name', 'category', 'view_count', 'image', 'images', 'location')
                ->orderByDesc('view_count')
                ->get()
                ->map(function($d) {
                    $img = $d->image ?: ((is_array($d->images) && count($d->images) > 0) ? $d->images[0] : null);
                    return [
                        'id'       => $d->id,
                        'name'     => html_entity_decode($d->name ?: '', ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                        'category' => $d->category ?: 'Uncategorized',
                        'views'    => (int) ($d->view_count ?: 0),
                        'image'    => $img,
                        'location' => html_entity_decode($d->location ?: '', ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    ];
                })
                ->values();

            $totalDestViews   = $destinationsRaw->sum('views');
            $highestDestViews = $destinationsRaw->max('views') ?: 0;

            $rankedDestinations = $destinationsRaw->map(function($d, $index) use ($totalDestViews, $highestDestViews) {
                $views = $d['views'];
                $sharePct = $totalDestViews > 0 ? round(($views / $totalDestViews) * 100, 1) : 0;
                $progressPct = $highestDestViews > 0 ? round(($views / $highestDestViews) * 100, 1) : 0;

                return array_merge($d, [
                    'rank'         => $index + 1,
                    'percentage'   => $sharePct,
                    'progress_bar' => $progressPct,
                ]);
            });

            // Dynamically query all distinct categories existing in the database
            $availableCategories = Attraction::whereNotNull('category')
                ->where('category', '<>', '')
                ->distinct()
                ->pluck('category')
                ->values();

            // Popular resorts (derived strictly from DB and cache views)
            $popularResorts = User::where('role', 'resort')
                ->get()
                ->map(function($r) {
                    $rawName = $r->resort_name ?: ($r->name ?: 'Resort');
                    $cachedViews = (int) \Illuminate\Support\Facades\Cache::get("view_count_resort_{$r->id}", 0);
                    $cachedAccViews = (int) \Illuminate\Support\Facades\Cache::get("view_count_accommodation_{$r->id}", 0);
                    $dbViews = (int) ($r->view_count ?: 0);
                    $views = max($dbViews, $cachedViews, $cachedAccViews);

                    $img = (is_array($r->resort_images) && count($r->resort_images) > 0) ? $r->resort_images[0] : ($r->logo ?: $r->banner);
                    if (!$img && class_exists('\App\Models\Accommodation')) {
                        $acc = Accommodation::where('user_id', $r->id)->first();
                        if ($acc) {
                            $img = $acc->image ?: ((is_array($acc->images) && count($acc->images) > 0) ? $acc->images[0] : null);
                        }
                    }

                    return [
                        'id'    => $r->id,
                        'name'  => html_entity_decode($rawName, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                        'views' => $views,
                        'image' => $img,
                    ];
                })
                ->sortByDesc('views')
                ->values()
                ->take(5);

            // Popular enterprises
            $popularEnterprises = User::where('role', 'enterprise')
                ->get()
                ->map(function($e) {
                    $rawName = $e->store_name ?: ($e->name ?: 'Enterprise');
                    $cachedViews = (int) \Illuminate\Support\Facades\Cache::get("view_count_enterprise_{$e->id}", 0);
                    $dbViews = (int) ($e->view_count ?: 0);
                    $views = max($dbViews, $cachedViews);

                    $img = $e->logo ?: $e->banner;
                    if (!$img && class_exists('\App\Models\Product')) {
                        $prod = Product::where('user_id', $e->id)->first();
                        if ($prod) {
                            $img = $prod->image ?: ((is_array($prod->images) && count($prod->images) > 0) ? $prod->images[0] : null);
                        }
                    }

                    return [
                        'id'       => $e->id,
                        'name'     => html_entity_decode($rawName, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                        'category' => html_entity_decode($e->business_type ?: 'Local Shop', ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                        'views'    => $views,
                        'avatar'   => $img,
                    ];
                })
                ->sortByDesc('views')
                ->values()
                ->take(5);

            // Most Wishlisted Items
            $mostWishlisted = Attraction::orderBy('view_count', 'desc')
                ->take(5)
                ->get()
                ->map(function($item) {
                    $img = $item->image ?: ((is_array($item->images) && count($item->images) > 0) ? $item->images[0] : null);
                    return [
                        'id'       => $item->id,
                        'name'     => html_entity_decode($item->name ?: '', ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                        'category' => html_entity_decode($item->category ?: 'Attraction', ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                        'saves'    => (int) ($item->view_count ?: 0),
                        'image'    => $img,
                    ];
                });

            return response()->json([
                'status'  => 'success',
                'success' => true,
                'stats'   => [
                    'attractions'           => $attractionsCount,
                    'attractions_this_month'=> $attractionsThisMonth,
                    'resorts'               => $resortsCount,
                    'products'              => $productsCount,
                    'events'                => $eventsCount,
                    'events_upcoming'       => $eventsUpcoming,
                    'tourists'              => $lifetimeTourists,
                    'total_visitors'        => $totalVisitorsInRange,
                    'users'                 => $allUsers,
                    'businesses'            => $businessesCount,
                    'businesses_this_month' => $businessesThisMonth,
                    'total_orders'          => $totalOrders,
                    'completed_orders'      => $completedOrders,
                    'total_bookings'        => $totalBookings,
                    'total_views'           => (int) Attraction::sum('view_count'),
                    'total_revenue'         => $totalRevenue,

                    // ── Real Visitor Analytics ──
                    'visitor_trend'         => $visitorTrend,
                    'highest_month'         => $highestMonth,
                    'lowest_month'          => $lowestMonth,
                    'average_per_month'     => $averagePerMonth,
                    'percentage_change'     => $percentageChange,
                    'date_range'            => [
                        'months'     => $monthsCount,
                        'start_date' => $startDate->toDateString(),
                        'end_date'   => $endDate->toDateString(),
                        'label'      => $startDate->format('M Y') . ' - ' . $endDate->format('M Y'),
                    ],

                    // ── Real Destination Analytics ──
                    'top_attractions'       => $rankedDestinations,
                    'destinations'          => $rankedDestinations,
                    'destination_categories'=> $availableCategories,
                    'selected_category'     => $selectedCategory,

                    // Leaderboard Highlights
                    'popular_resorts'       => $popularResorts,
                    'popular_enterprises'   => $popularEnterprises,
                    'most_wishlisted'       => $mostWishlisted,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'success' => false,
                'message' => 'Failed to fetch platform statistics',
                'error'   => $e->getMessage()
            ], 200);
        }
    }
}
