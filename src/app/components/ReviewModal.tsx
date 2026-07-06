import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { submitReview } from '../lib/api';
import { showSuccessAlert, showErrorAlert } from '../lib/sweetAlert';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  productId: number;
  productName: string;
  existingReview?: {
    rating: number;
    comment: string;
  };
  onReviewSubmitted: () => void;
}

export default function ReviewModal({
  isOpen,
  onClose,
  orderId,
  productId,
  productName,
  existingReview,
  onReviewSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      showErrorAlert('Please select a rating');
      return;
    }

    setSubmitting(true);

    try {
      const response = await submitReview(orderId, productId, rating, comment);
      
      if (response.success) {
        showSuccessAlert(existingReview ? 'Review updated successfully!' : 'Review submitted successfully!');
        onReviewSubmitted();
        onClose();
      } else {
        showErrorAlert(response.message || 'Failed to submit review');
      }
    } catch (error: any) {
      console.error('Review submission error:', error);
      showErrorAlert(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select Rating';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {existingReview ? 'Update Review' : 'Write a Review'}
            </h2>
            <p className="text-sm text-white/80 mt-1">Share your experience</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            disabled={submitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Product Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product
            </label>
            <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
              <p className="font-medium text-gray-900">{productName}</p>
            </div>
          </div>

          {/* Star Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      } transition-colors`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {getRatingText(hoverRating || rating)}
                </p>
                {rating > 0 && (
                  <p className="text-sm text-gray-500">
                    {rating} out of 5 stars
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this product..."
              rows={5}
              maxLength={1000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={submitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/1000 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className={`flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium transition-all ${
                submitting || rating === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-lg hover:scale-105'
              }`}
            >
              {submitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
