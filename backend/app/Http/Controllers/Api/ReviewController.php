<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Review;
use App\Models\Order;
use App\Models\Product;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    /**
     * Submit a review for a product in an order
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|exists:orders,id',
            'product_id' => 'required|exists:products,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();
            
            // Verify the order belongs to the user
            $order = Order::where('id', $request->order_id)
                ->where('user_id', $user->id)
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Order not found or does not belong to you'
                ], 404);
            }

            // Verify the order status is 'delivered' or 'completed'
            if (!in_array($order->status, ['delivered', 'completed'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only review delivered orders'
                ], 400);
            }

            // Check if review already exists
            $existingReview = Review::where('order_id', $request->order_id)
                ->where('product_id', $request->product_id)
                ->first();

            if ($existingReview) {
                // Update existing review
                $existingReview->update([
                    'rating' => $request->rating,
                    'comment' => $request->comment,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Review updated successfully',
                    'review' => $existingReview
                ]);
            }

            // Create new review
            $review = Review::create([
                'order_id' => $request->order_id,
                'user_id' => $user->id,
                'product_id' => $request->product_id,
                'rating' => $request->rating,
                'comment' => $request->comment,
            ]);

            // Notify product owner (business)
            try {
                $product = Product::find($request->product_id);
                if ($product && $product->user_id) {
                    $touristName = $user->name ?? 'A tourist';
                    $productName = $product->name ?? 'your product';
                    Notification::notify(
                        $product->user_id,
                        'review_received',
                        'New Product Review',
                        "{$touristName} left a {$request->rating}-star review on {$productName}.",
                        [
                            'review_id' => $review->id,
                            'product_id' => $product->id,
                            'rating' => (int) $request->rating,
                        ],
                        '/enterprise/profile'
                    );
                }
            } catch (\Throwable $e) {
                \Log::warning('Review notification failed', ['error' => $e->getMessage()]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Review submitted successfully',
                'review' => $review
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit review',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get reviews for a specific product
     */
    public function getProductReviews($productId)
    {
        try {
            $reviews = Review::where('product_id', $productId)
                ->with('user:id,name')
                ->orderBy('created_at', 'desc')
                ->get();

            $averageRating = $reviews->avg('rating');
            $totalReviews = $reviews->count();

            return response()->json([
                'success' => true,
                'reviews' => $reviews,
                'average_rating' => round($averageRating, 1),
                'total_reviews' => $totalReviews
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reviews',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get review status for an order (check which products have been reviewed)
     */
    public function getOrderReviewStatus($orderId)
    {
        try {
            $user = Auth::user();
            
            // Verify the order belongs to the user
            $order = Order::where('id', $orderId)
                ->where('user_id', $user->id)
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Order not found'
                ], 404);
            }

            // Get all reviews for this order
            $reviews = Review::where('order_id', $orderId)
                ->get()
                ->keyBy('product_id');

            return response()->json([
                'success' => true,
                'reviews' => $reviews
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch review status',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
