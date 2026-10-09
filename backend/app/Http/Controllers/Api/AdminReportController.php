<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\User;
use App\Models\Attraction;
use App\Models\Accommodation;
use App\Models\ResortRoom;
use App\Models\Product;
use App\Models\Event;
use App\Models\CultureArt;
use App\Models\HistoryPost;
use App\Models\Landmark;
use App\Models\EnterprisePost;
use App\Models\WishlistItem;
use App\Models\Message;
use Illuminate\Support\Facades\DB;

class AdminReportController extends Controller
{
    /**
     * Generate Monthly Tourism Report data strictly from real database records.
     * Route: GET /api/admin/monthly-report
     */
    public function getMonthlyReport(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user || $user->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only administrators can generate monthly tourism reports.'
                ], 403);
            }

            // Reporting month & year with validation
            $now = Carbon::now();
            $month = (int) $request->get('month', $now->month);
            $year  = (int) $request->get('year', $now->year);

            if ($month < 1 || $month > 12) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid month parameter (must be 1-12).'
                ], 422);
            }

            if ($year < 2020 || $year > 2099) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid year parameter.'
                ], 422);
            }

            // Start-inclusive and next-month-exclusive boundary
            $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
            $endDate   = $startDate->copy()->addMonth()->startOfMonth();
            $periodLabel = $startDate->format('F Y');

            // ─────────────────────────────────────────────────────────────────
            // 1. OFFICIAL REPORT HEADER METADATA
            // ─────────────────────────────────────────────────────────────────
            $reportMeta = [
                'platform_name'     => 'DiscoverMansalay',
                'report_title'      => 'Monthly Tourism Report',
                'lgu_title'         => 'Municipality of Mansalay, Oriental Mindoro',
                'reporting_period'  => $periodLabel,
                'month'             => $month,
                'year'              => $year,
                'start_date'        => $startDate->toDateTimeString(),
                'end_date'          => $endDate->toDateTimeString(),
                'date_generated'    => $now->format('F j, Y - g:i A'),
                'generated_by'      => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => 'Authenticated Administrator',
                ],
            ];

            // ─────────────────────────────────────────────────────────────────
            // 2. REGISTERED TOURISTS & USERS
            // ─────────────────────────────────────────────────────────────────
            $newTouristsCount = User::where('role', 'tourist')
                ->where('created_at', '>=', $startDate)
                ->where('created_at', '<', $endDate)
                ->count();

            $newResortsCount = User::where('role', 'resort')
                ->where('created_at', '>=', $startDate)
                ->where('created_at', '<', $endDate)
                ->count();

            $newEnterprisesCount = User::where('role', 'enterprise')
                ->where('created_at', '>=', $startDate)
                ->where('created_at', '<', $endDate)
                ->count();

            $totalTouristsCurrent = User::where('role', 'tourist')->count();
            $totalActiveResorts   = User::where('role', 'resort')->where('listing_status', 'approved')->count();
            $totalActiveEnterprises = User::where('role', 'enterprise')->where('listing_status', 'approved')->count();
            $totalRegisteredUsers = User::count();

            // ─────────────────────────────────────────────────────────────────
            // 3. TOURISM CONTENT ACTIVITY (All 9 types)
            // ─────────────────────────────────────────────────────────────────
            $contentActivity = [];

            // Helper to process entity collections
            $processEntities = function($collection, $type, $titleField, $categoryField, $userRelation = null) use (&$contentActivity, $startDate, $endDate) {
                foreach ($collection as $item) {
                    $createdInPeriod = $item->created_at >= $startDate && $item->created_at < $endDate;
                    $updatedInPeriod = $item->updated_at >= $startDate && $item->updated_at < $endDate && $item->updated_at > $item->created_at;

                    if (!$createdInPeriod && !$updatedInPeriod) {
                        continue;
                    }

                    $ownerName = 'Tourism Office / Admin';
                    if ($userRelation && $item->user) {
                        $ownerName = $item->user->store_name ?: ($item->user->resort_name ?: $item->user->name);
                    } elseif (!empty($item->user_id)) {
                        $u = User::find($item->user_id);
                        if ($u) {
                            $ownerName = $u->store_name ?: ($u->resort_name ?: $u->name);
                        }
                    }

                    $action = $createdInPeriod ? 'New Record Created' : 'Record Updated';
                    $actionDate = $createdInPeriod ? $item->created_at : $item->updated_at;

                    $contentActivity[] = [
                        'id'                  => $item->id,
                        'type'                => $type,
                        'title'               => html_entity_decode($item->$titleField ?: 'Untitled', ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                        'category'            => $item->$categoryField ?: 'General',
                        'owner_or_enterprise' => html_entity_decode($ownerName, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                        'action'              => $action,
                        'date'                => $actionDate ? $actionDate->format('M j, Y g:i A') : '',
                        'raw_date'            => $actionDate ? $actionDate->toDateTimeString() : '',
                        'status'              => $item->status ?? ($item->is_active ? 'active' : 'approved'),
                    ];
                }
            };

            // Query items that had activity in this period
            $attractions = Attraction::where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate])
                  ->orWhereBetween('updated_at', [$startDate, $endDate]);
            })->get();
            $processEntities($attractions, 'Attraction', 'name', 'category');

            $events = Event::where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate])
                  ->orWhereBetween('updated_at', [$startDate, $endDate]);
            })->get();
            $processEntities($events, 'Event / Program', 'name', 'category');

            $products = Product::where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate])
                  ->orWhereBetween('updated_at', [$startDate, $endDate]);
            })->get();
            $processEntities($products, 'Community Product', 'name', 'category');

            $rooms = ResortRoom::where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate])
                  ->orWhereBetween('updated_at', [$startDate, $endDate]);
            })->get();
            $processEntities($rooms, 'Resort Room / Stay', 'name', 'type');

            $posts = EnterprisePost::where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate])
                  ->orWhereBetween('updated_at', [$startDate, $endDate]);
            })->get();
            $processEntities($posts, 'Timeline Post', 'product_name', 'type');

            $cultureArts = CultureArt::where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate])
                  ->orWhereBetween('updated_at', [$startDate, $endDate]);
            })->get();
            $processEntities($cultureArts, 'Culture & Arts', 'name', 'category');

            $histories = HistoryPost::where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate])
                  ->orWhereBetween('updated_at', [$startDate, $endDate]);
            })->get();
            $processEntities($histories, 'History Article', 'name', 'category');

            $landmarks = Landmark::where(function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate])
                  ->orWhereBetween('updated_at', [$startDate, $endDate]);
            })->get();
            $processEntities($landmarks, 'Landmark / Spot', 'name', 'category');

            // Sort content activity by date descending
            usort($contentActivity, function($a, $b) {
                return strcmp($b['raw_date'], $a['raw_date']);
            });

            $totalNewContentItems = count(array_filter($contentActivity, fn($i) => $i['action'] === 'New Record Created'));
            $totalUpdatedContentItems = count(array_filter($contentActivity, fn($i) => $i['action'] === 'Record Updated'));

            // ─────────────────────────────────────────────────────────────────
            // 4. RESORT AND STAYS ACTIVITY
            // ─────────────────────────────────────────────────────────────────
            $resortUsers = User::where('role', 'resort')->get();
            $resortsSummary = [];

            foreach ($resortUsers as $ru) {
                $resortName = $ru->resort_name ?: $ru->name;
                $roomCount = ResortRoom::where('user_id', $ru->id)->count();
                $newRoomsInPeriod = ResortRoom::where('user_id', $ru->id)
                    ->where('created_at', '>=', $startDate)
                    ->where('created_at', '<', $endDate)
                    ->count();
                $updatedRoomsInPeriod = ResortRoom::where('user_id', $ru->id)
                    ->where('updated_at', '>=', $startDate)
                    ->where('updated_at', '<', $endDate)
                    ->whereColumn('updated_at', '>', 'created_at')
                    ->count();

                $timelinePostsInPeriod = EnterprisePost::where('user_id', $ru->id)
                    ->where('created_at', '>=', $startDate)
                    ->where('created_at', '<', $endDate)
                    ->count();

                // Virtual tours check
                $vtScenes = is_array($ru->virtual_tour_scenes) ? $ru->virtual_tour_scenes : json_decode($ru->virtual_tour_scenes ?: '[]', true);
                $hasVirtualTour = is_array($vtScenes) && count($vtScenes) > 0;
                $vtSceneCount   = $hasVirtualTour ? count($vtScenes) : 0;

                // Wishlist saves in period for this resort or its rooms
                $roomIds = ResortRoom::where('user_id', $ru->id)->pluck('id');
                $wishlistSavesInPeriod = WishlistItem::where(function($q) use ($ru, $roomIds) {
                    $q->where(function($sub) use ($ru) {
                        $sub->whereIn('item_type', ['accommodation', 'resort'])
                            ->where('item_id', (string) $ru->id);
                    });
                    if ($roomIds->isNotEmpty()) {
                        $q->orWhere(function($sub) use ($roomIds) {
                            $sub->whereIn('item_type', ['accommodation', 'room'])
                                ->whereIn('item_id', $roomIds->map(fn($id) => (string) $id))
                                ->orWhereIn('item_id', $roomIds->map(fn($id) => 'room-' . $id));
                        });
                    }
                })
                ->where('created_at', '>=', $startDate)
                ->where('created_at', '<', $endDate)
                ->count();

                // Direct Inquiries (messages sent to this resort)
                $inquiriesInPeriod = Message::where('receiver_id', $ru->id)
                    ->where('created_at', '>=', $startDate)
                    ->where('created_at', '<', $endDate)
                    ->count();

                $resortsSummary[] = [
                    'resort_id'            => $ru->id,
                    'resort_name'          => html_entity_decode($resortName, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'owner_name'           => html_entity_decode($ru->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'email'                => $ru->email,
                    'phone'                => $ru->phone ?: 'Not Provided',
                    'location'             => html_entity_decode($ru->address ?: ($ru->barangay ?: 'Mansalay'), ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'listing_status'       => $ru->listing_status ?: 'approved',
                    'is_active'            => (bool) $ru->is_active,
                    'total_rooms'          => $roomCount,
                    'new_rooms_month'      => $newRoomsInPeriod,
                    'updated_rooms_month'  => $updatedRoomsInPeriod,
                    'timeline_posts_month' => $timelinePostsInPeriod,
                    'has_virtual_tour'     => $hasVirtualTour,
                    'vt_scene_count'       => $vtSceneCount,
                    'wishlist_saves_month' => $wishlistSavesInPeriod,
                    'inquiries_month'      => $inquiriesInPeriod,
                ];
            }

            // ─────────────────────────────────────────────────────────────────
            // 5. COMMUNITY PRODUCTS ACTIVITY
            // ─────────────────────────────────────────────────────────────────
            $allProducts = Product::all();
            $productsSummary = [];

            foreach ($allProducts as $p) {
                $seller = $p->user_id ? User::find($p->user_id) : null;
                $enterpriseName = $seller ? ($seller->store_name ?: $seller->name) : 'Mansalay Tourism Center';

                $createdInPeriod = $p->created_at >= $startDate && $p->created_at < $endDate;
                $updatedInPeriod = $p->updated_at >= $startDate && $p->updated_at < $endDate && $p->updated_at > $p->created_at;

                $actionStatus = 'Existing Active';
                if ($createdInPeriod) $actionStatus = 'New (This Month)';
                elseif ($updatedInPeriod) $actionStatus = 'Updated (This Month)';

                // Related timeline posts
                $postsCount = EnterprisePost::where('user_id', $p->user_id)
                    ->where(function($q) use ($p) {
                        $q->where('product_name', $p->name)
                          ->orWhere('title', $p->name);
                    })->count();

                // Wishlist saves for this product in period
                $savesInPeriod = WishlistItem::where('item_type', 'product')
                    ->where('item_id', (string) $p->id)
                    ->where('created_at', '>=', $startDate)
                    ->where('created_at', '<', $endDate)
                    ->count();

                // Inquiries to the seller in period
                $inquiriesToSellerInPeriod = $seller ? Message::where('receiver_id', $seller->id)
                    ->where('created_at', '>=', $startDate)
                    ->where('created_at', '<', $endDate)
                    ->count() : 0;

                $productsSummary[] = [
                    'product_id'        => $p->id,
                    'product_name'      => html_entity_decode($p->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'enterprise_name'   => html_entity_decode($enterpriseName, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'category'          => $p->category ?: 'Local Product',
                    'price'             => (float) ($p->price ?: 0),
                    'stock'             => (int) ($p->stock ?: 0),
                    'status'            => $p->status ?: 'approved',
                    'action_in_month'   => $actionStatus,
                    'created_at'        => $p->created_at ? $p->created_at->format('M j, Y') : '',
                    'updated_at'        => $p->updated_at ? $p->updated_at->format('M j, Y') : '',
                    'promotional_posts' => $postsCount,
                    'wishlist_saves'    => $savesInPeriod,
                    'inquiries'         => $inquiriesToSellerInPeriod,
                    'direct_order_mode' => 'Direct Contact (Promotion Platform)',
                ];
            }

            // ─────────────────────────────────────────────────────────────────
            // 6. TOURIST ENGAGEMENT
            // ─────────────────────────────────────────────────────────────────
            // Real wishlist activity in this month
            $wishlistItemsInPeriod = WishlistItem::where('created_at', '>=', $startDate)
                ->where('created_at', '<', $endDate)
                ->get();

            $wishlistTotalInPeriod = $wishlistItemsInPeriod->count();
            $wishlistByType = [
                'attractions'    => $wishlistItemsInPeriod->where('item_type', 'attraction')->count(),
                'accommodations' => $wishlistItemsInPeriod->whereIn('item_type', ['accommodation', 'room', 'resort'])->count(),
                'products'       => $wishlistItemsInPeriod->where('item_type', 'product')->count(),
                'events'         => $wishlistItemsInPeriod->where('item_type', 'event')->count(),
            ];

            // Messages/Inquiries in this month
            $inquiriesTotalInPeriod = Message::where('created_at', '>=', $startDate)
                ->where('created_at', '<', $endDate)
                ->count();

            // Lifetime vs Monthly views tracking statement:
            // Since the system uses cumulative view counters without timestamped view logs,
            // we present top visited destinations with their cumulative totals, explicitly labeled.
            $topDestinationsCumulative = Attraction::orderByDesc('view_count')
                ->take(5)
                ->get()
                ->map(fn($a) => [
                    'name'     => html_entity_decode($a->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'category' => $a->category ?: 'Destination',
                    'views'    => (int) ($a->view_count ?: 0),
                    'type'     => 'Attraction',
                ]);

            $engagementMetrics = [
                'wishlist_saves_in_month'       => $wishlistTotalInPeriod,
                'wishlist_saves_by_type'        => $wishlistByType,
                'inquiries_in_month'            => $inquiriesTotalInPeriod,
                'monthly_views_tracking_status' => 'Not Tracked (Platform maintains lifetime view counters; per-month timestamped pageview logs are not recorded)',
                'search_queries_status'         => 'Not Tracked (Platform does not store search queries in the database)',
                'contact_clicks_status'         => 'Not Tracked (Outbound call/social link clicks are direct client redirects and not stored)',
                'top_destinations_lifetime'     => $topDestinationsCumulative,
            ];

            // ─────────────────────────────────────────────────────────────────
            // 7. ITINERARY ACTIVITY
            // ─────────────────────────────────────────────────────────────────
            // Check official itineraries stored in attractions table
            $officialItineraries = Attraction::where(function($q) {
                $q->where('category', 'Itinerary')
                  ->orWhere('name', 'like', '%(Itinerary)%');
            })->get()->map(fn($it) => [
                'id'       => $it->id,
                'title'    => html_entity_decode($it->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'category' => 'Official Curated Route',
                'location' => $it->location ?: 'Mansalay',
            ]);

            // Destinations frequently available for itinerary building
            $availableDestinations = Attraction::select('id', 'name', 'category', 'location')
                ->where('status', 'approved')
                ->get()
                ->map(fn($d) => [
                    'name'     => html_entity_decode($d->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    'category' => $d->category ?: 'Attraction',
                    'location' => html_entity_decode($d->location ?: 'Mansalay', ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                ]);

            $itineraryActivity = [
                'official_itineraries_count'    => $officialItineraries->count(),
                'official_itineraries_list'     => $officialItineraries,
                'user_custom_itineraries_status'=> 'Client-Side (User custom itineraries are created and stored in tourist browser localStorage, not stored in database)',
                'ai_itineraries_status'         => 'Client-Side (AI-generated trip plans are created on demand and kept on the user device)',
                'frequently_selected_destinations' => $availableDestinations->take(6),
            ];

            // ─────────────────────────────────────────────────────────────────
            // 8. INQUIRY SUMMARY
            // ─────────────────────────────────────────────────────────────────
            $inquiriesQuery = Message::where('created_at', '>=', $startDate)
                ->where('created_at', '<', $endDate)
                ->with(['sender:id,name,role', 'receiver:id,name,role'])
                ->orderBy('created_at', 'desc');

            $inquiriesList = $inquiriesQuery->get()->map(function($msg) {
                return [
                    'id'               => $msg->id,
                    'date'             => $msg->created_at->format('M j, Y g:i A'),
                    'sender_name'      => $msg->sender ? $msg->sender->name : 'Tourist',
                    'sender_role'      => $msg->sender ? $msg->sender->role : 'tourist',
                    'recipient_name'   => $msg->receiver ? ($msg->receiver->store_name ?: ($msg->receiver->resort_name ?: $msg->receiver->name)) : 'Business',
                    'recipient_role'   => $msg->receiver ? $msg->receiver->role : 'resort',
                    'message_snippet'  => mb_strimwidth($msg->message, 0, 75, '...'),
                    'is_read'          => (bool) $msg->is_read,
                ];
            });

            $inquiriesByRole = [
                'to_resorts'     => 0,
                'to_enterprises' => 0,
                'to_admin'       => 0,
            ];
            foreach ($inquiriesList as $inq) {
                if ($inq['recipient_role'] === 'resort') $inquiriesByRole['to_resorts']++;
                elseif ($inq['recipient_role'] === 'enterprise') $inquiriesByRole['to_enterprises']++;
                elseif ($inq['recipient_role'] === 'admin') $inquiriesByRole['to_admin']++;
            }

            $inquirySummary = [
                'total_inquiries'   => count($inquiriesList),
                'by_recipient_type' => $inquiriesByRole,
                'details'           => $inquiriesList,
            ];

            // ─────────────────────────────────────────────────────────────────
            // 9. MONTHLY ACTIVITY TRENDS (Weekly Breakdown)
            // ─────────────────────────────────────────────────────────────────
            $daysInMonth = $startDate->daysInMonth;
            $weeklyTrends = [];

            $weeks = [
                ['start' => 1,  'end' => min(7, $daysInMonth),  'label' => 'Week 1 (Days 1-7)'],
                ['start' => 8,  'end' => min(14, $daysInMonth), 'label' => 'Week 2 (Days 8-14)'],
                ['start' => 15, 'end' => min(21, $daysInMonth), 'label' => 'Week 3 (Days 15-21)'],
                ['start' => 22, 'end' => min(28, $daysInMonth), 'label' => 'Week 4 (Days 22-28)'],
            ];
            if ($daysInMonth > 28) {
                $weeks[] = ['start' => 29, 'end' => $daysInMonth, 'label' => 'Week 5 (Days 29-' . $daysInMonth . ')'];
            }

            foreach ($weeks as $w) {
                $wStart = $startDate->copy()->day($w['start'])->startOfDay();
                $wEnd   = $startDate->copy()->day($w['end'])->endOfDay();

                $wNewUsers = User::whereBetween('created_at', [$wStart, $wEnd])->count();
                $wNewPosts = EnterprisePost::whereBetween('created_at', [$wStart, $wEnd])->count();
                $wNewWishlists = WishlistItem::whereBetween('created_at', [$wStart, $wEnd])->count();
                $wInquiries = Message::whereBetween('created_at', [$wStart, $wEnd])->count();

                $weeklyTrends[] = [
                    'week'          => $w['label'],
                    'new_users'     => $wNewUsers,
                    'tourism_posts' => $wNewPosts,
                    'wishlists'     => $wNewWishlists,
                    'inquiries'     => $wInquiries,
                ];
            }

            // ─────────────────────────────────────────────────────────────────
            // 10. FINAL MONTHLY SUMMARY (Monthly Activity vs Current Totals)
            // ─────────────────────────────────────────────────────────────────
            $activeEventsInMonth = Event::whereMonth('date', $month)
                ->whereYear('date', $year)
                ->count();

            $virtualToursCount = User::whereNotNull('virtual_tour_scenes')->get()->filter(function($u) {
                $scenes = is_array($u->virtual_tour_scenes) ? $u->virtual_tour_scenes : json_decode($u->virtual_tour_scenes ?: '[]', true);
                return is_array($scenes) && count($scenes) > 0;
            })->count();

            $monthlySummary = [
                'activity_metrics' => [
                    'new_registered_tourists'    => $newTouristsCount,
                    'new_resorts_registered'     => $newResortsCount,
                    'new_enterprises_registered' => $newEnterprisesCount,
                    'new_content_records'        => $totalNewContentItems,
                    'updated_content_records'    => $totalUpdatedContentItems,
                    'new_timeline_posts'         => EnterprisePost::whereBetween('created_at', [$startDate, $endDate])->count(),
                    'events_scheduled_in_month'  => $activeEventsInMonth,
                    'wishlist_activity'          => $wishlistTotalInPeriod,
                    'inquiries_submitted'        => $inquiriesTotalInPeriod,
                ],
                'current_state_totals' => [
                    'total_registered_tourists'   => $totalTouristsCurrent,
                    'total_active_resorts'        => $totalActiveResorts,
                    'total_active_enterprises'    => $totalActiveEnterprises,
                    'total_attractions_listed'    => Attraction::count(),
                    'total_products_listed'       => Product::count(),
                    'total_resort_rooms_listed'   => ResortRoom::count(),
                    'total_events_listed'         => Event::count(),
                    'destinations_with_360_tours' => $virtualToursCount,
                    'all_time_users'              => $totalRegisteredUsers,
                ],
            ];

            return response()->json([
                'success' => true,
                'data'    => [
                    'report_meta'              => $reportMeta,
                    'monthly_summary'          => $monthlySummary,
                    'tourism_content_activity' => $contentActivity,
                    'resort_and_stays'         => $resortsSummary,
                    'community_products'       => $productsSummary,
                    'tourist_engagement'       => $engagementMetrics,
                    'itinerary_activity'       => $itineraryActivity,
                    'inquiry_summary'          => $inquirySummary,
                    'activity_trends'          => $weeklyTrends,
                ]
            ]);

        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate monthly tourism report',
                'error'   => $e->getMessage(),
                'line'    => $e->getLine(),
                'file'    => basename($e->getFile()),
            ], 500);
        }
    }
}
