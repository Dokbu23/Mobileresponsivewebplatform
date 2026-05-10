# Implementation Plan: Resort Profile as Accommodation

## Overview

This implementation transforms the resort owner model from managing individual accommodation listings to making the resort owner's profile itself the primary accommodation. The implementation includes database migrations, backend API endpoints, frontend components, and integration with existing booking and payment systems.

## Tasks

- [x] 1. Database Migration and Schema Updates
  - Create migration file to add resort profile columns to users table
  - Add columns: resort_name, resort_description, resort_price_per_night, resort_images, resort_amenities, resort_facilities, resort_policies, resort_is_setup
  - Add check constraint for resort_price_per_night > 0
  - Add index for (role, resort_is_setup, listing_status)
  - Add accommodation_type column to bookings table
  - Run migration and verify schema changes
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [x] 2. Backend: User Model Updates
  - [x] 2.1 Update User model with resort profile fields
    - Add resort profile columns to $fillable array
    - Add JSON casts for resort_images and resort_amenities
    - Add accessor for resort_is_setup boolean
    - Add validation rules for resort profile fields
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 2.2 Write unit tests for User model resort profile casts
    - Test resort_images JSON casting
    - Test resort_amenities JSON casting
    - Test resort_price_per_night decimal casting
    - Test resort_is_setup boolean default
    - _Requirements: 2.4, 2.5, 2.8_

- [ ] 3. Backend: ResortProfileController Implementation
  - [-] 3.1 Create ResortProfileController with CRUD endpoints
    - Implement GET /api/resort-profile (retrieve authenticated user's profile)
    - Implement PUT /api/resort-profile (update profile)
    - Implement POST /api/resort-profile/setup (initial setup)
    - Add JWT authentication middleware
    - Add role authorization (resort only)
    - _Requirements: 7.1, 7.2, 7.3, 7.8, 1.4, 1.5_

  - [-] 3.2 Implement profile validation rules
    - Validate resort_name: required, string, max:255
    - Validate resort_description: required, string
    - Validate resort_price_per_night: required, numeric, min:1
    - Validate images: required (setup), max:10, each max:5MB, mimes:jpeg,png,webp
    - Validate resort_amenities: optional, array
    - Validate resort_facilities: optional, string
    - Validate resort_policies: optional, string
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 9.2, 9.3_

  - [ ] 3.3 Implement image upload handling
    - Handle multiple image uploads (1-10 images)
    - Store images in public/storage/resort-profiles directory
    - Generate unique filenames with timestamps
    - Store image URLs in resort_images JSON array
    - Return image URLs in API responses
    - _Requirements: 9.1, 9.4, 9.5_

  - [~] 3.4 Implement profile setup completion logic
    - Check if resort_is_setup is already true
    - Return 400 error if profile already setup
    - Set resort_is_setup to true on successful setup
    - Return updated user object with profile data
    - _Requirements: 1.5, 7.7_

  - [ ]* 3.5 Write unit tests for ResortProfileController
    - Test profile creation with valid data
    - Test profile creation with missing required fields
    - Test profile creation with invalid price
    - Test image upload with valid format
    - Test image upload with invalid format
    - Test image upload exceeding size limit
    - Test profile update authorization
    - Test profile setup already completed error
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 9.2, 9.3_

- [ ] 4. Backend: Enhanced AccommodationController
  - [~] 4.1 Implement accommodation merge logic
    - Fetch static accommodations from accommodations table
    - Fetch resort profiles from users table (role='resort', resort_is_setup=true, listing_status='approved')
    - Transform resort profiles to accommodation format
    - Map resort_name → name, resort_description → description, resort_price_per_night → price_per_night
    - Map resort_images[0] → image, add type: 'resort_profile'
    - Merge and return combined array
    - _Requirements: 3.1, 3.2, 3.6, 7.4, 7.9, 8.3, 8.6_

  - [~] 4.2 Implement search functionality for resort profiles
    - Search resort_name and resort_description fields
    - Integrate with existing search parameter
    - Return merged results with search applied
    - _Requirements: 11.1, 11.2, 11.5_

  - [~] 4.3 Add resort owner details to accommodation responses
    - Include user_id for resort profiles
    - Include is_registered flag
    - Include type field ('static' or 'resort_profile')
    - Include resort-specific fields (amenities, facilities, policies)
    - _Requirements: 3.3, 7.9_

  - [ ]* 4.4 Write integration tests for accommodation merge
    - Test merge includes static listings
    - Test merge includes resort profiles
    - Test merge excludes incomplete profiles (resort_is_setup=false)
    - Test search functionality across both types
    - Test resort profile transformation
    - _Requirements: 3.1, 3.2, 3.6, 11.1, 11.2_

- [ ] 5. Backend: Enhanced BookingController
  - [~] 5.1 Update booking creation for resort profiles
    - Accept accommodation_id or resort_user_id
    - Store booking with reference to resort owner's user_id
    - Set accommodation_type to 'resort_profile' for resort bookings
    - Fetch resort owner's payment_details for payment processing
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [~] 5.2 Implement booking notifications for resort owners
    - Send email notification to resort owner on booking creation
    - Include booking details: tourist name, check-in, check-out, guests, total
    - Send notification on payment receipt upload
    - Send confirmation email on status change to 'confirmed'
    - Send cancellation notification
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 5.7_

  - [ ]* 5.3 Write integration tests for resort profile bookings
    - Test booking creation for resort profile
    - Test booking links to resort owner's user_id
    - Test payment receipt upload for resort booking
    - Test notification sent to resort owner
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1_

- [x] 6. Backend: API Routes Registration
  - Register ResortProfileController routes with JWT and role middleware
  - Add GET /api/resort-profile route
  - Add PUT /api/resort-profile route
  - Add POST /api/resort-profile/setup route
  - Update GET /api/accommodations route to use enhanced controller
  - Verify route protection and authorization
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.8_

- [~] 7. Checkpoint - Backend API Testing
  - Ensure all backend tests pass
  - Test API endpoints with Postman or similar tool
  - Verify database migrations applied correctly
  - Verify image uploads work correctly
  - Ask the user if questions arise

- [ ] 8. Frontend: ResortProfileSetup Component
  - [~] 8.1 Create ResortProfileSetup.tsx multi-step form
    - Create component structure with 4 steps
    - Implement state management for form data
    - Add navigation between steps (Next, Previous, Submit)
    - Add progress indicator showing current step
    - _Requirements: 1.1, 1.2, 1.3_

  - [~] 8.2 Implement Step 1: Basic Information
    - Add input for resort_name (required)
    - Add textarea for resort_description (required)
    - Add number input for resort_price_per_night (required)
    - Add real-time validation for required fields
    - Prevent navigation to Step 2 if validation fails
    - _Requirements: 1.2, 10.1, 10.2, 10.3_

  - [~] 8.3 Implement Step 2: Image Upload
    - Add file input for multiple images (1-10)
    - Display image previews with thumbnails
    - Add remove button for each image
    - Validate file format (JPEG, PNG, WebP)
    - Validate file size (max 5MB per image)
    - Display validation errors for invalid files
    - _Requirements: 1.2, 9.1, 9.2, 9.3, 10.4, 10.5_

  - [~] 8.4 Implement Step 3: Amenities and Facilities
    - Add checkboxes for common amenities (WiFi, Pool, Restaurant, etc.)
    - Add textarea for resort_facilities (optional)
    - Store selected amenities in array
    - _Requirements: 1.3_

  - [~] 8.5 Implement Step 4: Policies and Review
    - Add textarea for resort_policies (optional)
    - Display review summary of all entered data
    - Add Edit buttons to go back to specific steps
    - Implement form submission with FormData
    - Handle submission success and redirect to /resort/profile
    - Handle submission errors and display validation messages
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 10.6, 10.7_

  - [ ]* 8.6 Write unit tests for ResortProfileSetup
    - Test multi-step navigation
    - Test Step 1 required field validation
    - Test Step 2 image upload preview
    - Test Step 2 minimum image requirement
    - Test form submission with valid data
    - Test form submission with invalid data
    - _Requirements: 1.2, 1.3, 1.6, 10.1, 10.2, 10.3, 10.4_

- [ ] 9. Frontend: Enhanced ResortProfile Component
  - [~] 9.1 Add resort profile management section
    - Display current resort profile data (name, description, price, images)
    - Add Edit Profile button to toggle edit mode
    - Add View Public Page link to preview accommodation listing
    - Display resort amenities, facilities, and policies
    - _Requirements: 4.1, 3.3_

  - [~] 9.2 Implement profile edit functionality
    - Create inline edit form with all profile fields
    - Allow updating resort_name, resort_description, resort_price_per_night
    - Implement image management (add, remove, reorder)
    - Add Save and Cancel buttons
    - Validate all fields before saving
    - Display success message on save
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.7, 9.6, 9.7_

  - [~] 9.3 Add booking statistics for resort profile
    - Display total bookings for resort profile
    - Display pending bookings count
    - Display confirmed bookings count
    - Display total revenue from resort bookings
    - Filter bookings by accommodation_type='resort_profile'
    - _Requirements: 4.6, 5.6_

  - [ ]* 9.4 Write unit tests for ResortProfile enhancements
    - Test profile data display
    - Test edit mode toggle
    - Test image gallery display
    - Test profile update submission
    - Test validation error display
    - _Requirements: 4.1, 4.2, 4.3, 4.7_

- [ ] 10. Frontend: Enhanced Accommodations Component
  - [~] 10.1 Update accommodation fetching logic
    - Fetch from GET /api/public/accommodations
    - Handle merged results (static + resort profiles)
    - Map response data to Accommodation interface
    - Add type field to distinguish accommodation types
    - _Requirements: 3.1, 3.2, 7.4, 8.6_

  - [~] 10.2 Update accommodation card display
    - Display "Resort Profile" badge for resort profiles
    - Display "Static Listing" badge for static accommodations
    - Add "View Business Page" link for resort profiles
    - Show resort amenities in card details
    - _Requirements: 3.3, 3.4_

  - [~] 10.3 Implement booking modal for resort profiles
    - Detect accommodation type when opening booking modal
    - Fetch resort owner's payment_details for resort profiles
    - Display resort payment methods in booking form
    - Handle receipt upload for advance payment
    - Submit booking with resort owner's user_id
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 10.4 Write integration tests for Accommodations enhancements
    - Test accommodation list rendering with merged data
    - Test resort profile badge display
    - Test static listing badge display
    - Test booking modal for resort profile
    - Test payment method selection
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2_

- [ ] 11. Frontend: Enhanced SubscriptionPaymentModal
  - [~] 11.1 Update payment verification flow
    - Poll subscription status after payment submission
    - Check resort_is_setup flag on successful verification
    - Redirect to /resort/profile/setup if resort_is_setup is false
    - Redirect to /resort/dashboard if resort_is_setup is true
    - _Requirements: 1.1, 8.1, 8.4_

  - [ ]* 11.2 Write integration tests for payment flow
    - Test redirect to profile setup after payment verification
    - Test redirect to dashboard if profile already setup
    - _Requirements: 1.1, 8.1, 8.4_

- [~] 12. Frontend: Routing and Navigation Updates
  - Add route for /resort/profile/setup pointing to ResortProfileSetup
  - Update resort dashboard to check resort_is_setup flag
  - Redirect to profile setup if resort_is_setup is false
  - Add navigation guards for resort profile routes
  - _Requirements: 1.1, 8.1, 8.4_

- [~] 13. Checkpoint - Frontend Integration Testing
  - Ensure all frontend tests pass
  - Test complete profile setup flow manually
  - Test profile editing and image management
  - Test accommodation display with merged data
  - Test booking flow for resort profiles
  - Ask the user if questions arise

- [ ] 14. Optional Feature: Attraction Listing
  - [~] 14.1 Add "Add as Attraction" option in ResortProfile
    - Add checkbox or button to add resort as attraction
    - Create form to collect attraction-specific data
    - Allow different images and description for attraction
    - Submit to POST /api/attractions endpoint
    - _Requirements: 6.1, 6.2, 6.6_

  - [~] 14.2 Implement attraction removal
    - Add "Remove from Attractions" button
    - Call DELETE /api/attractions/{id} endpoint
    - Verify accommodation listing remains unaffected
    - _Requirements: 6.3, 6.5_

  - [ ]* 14.3 Write integration tests for attraction listing
    - Test adding resort as attraction
    - Test attraction appears in Attractions page
    - Test removing resort from attractions
    - Test accommodation listing unaffected by attraction changes
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ] 15. Migration Support for Existing Resort Owners
  - [~] 15.1 Implement login redirect for existing resort owners
    - Check resort_is_setup flag on login
    - Redirect to /resort/profile/setup if false and subscription_status is 'active'
    - Display prompt explaining new profile feature
    - _Requirements: 8.1, 8.4_

  - [~] 15.2 Update admin ManageListings page
    - Display both static accommodations and resort profiles
    - Add filter to distinguish between types
    - Allow admin to view and manage both types
    - _Requirements: 8.7_

  - [ ]* 15.3 Write integration tests for migration support
    - Test existing resort owner redirect to profile setup
    - Test admin can view both accommodation types
    - Test backward compatibility with existing accommodations
    - _Requirements: 8.1, 8.2, 8.3, 8.7_

- [ ] 16. Error Handling and Validation
  - [~] 16.1 Implement frontend error handling
    - Display validation errors from backend API
    - Show user-friendly error messages for common errors
    - Implement retry logic for network errors
    - Preserve form data on validation errors
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [~] 16.2 Implement backend error responses
    - Return 422 with detailed validation errors
    - Return 403 for unauthorized access
    - Return 400 for profile already setup
    - Return 500 with user-friendly message for server errors
    - _Requirements: 7.5, 7.6, 7.7_

  - [ ]* 16.3 Write error handling tests
    - Test validation error display
    - Test unauthorized access handling
    - Test network error recovery
    - Test form data preservation on error
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 17. Search and Filter Integration
  - [~] 17.1 Update search functionality
    - Ensure search works across static accommodations and resort profiles
    - Search resort_name and resort_description fields
    - Return merged and filtered results
    - _Requirements: 11.1, 11.2, 11.5_

  - [~] 17.2 Update filter functionality
    - Filter by price range including resort_price_per_night
    - Filter by amenities including resort_amenities
    - Display filtered results with both types
    - _Requirements: 11.3, 11.4_

  - [ ]* 17.3 Write integration tests for search and filter
    - Test search across both accommodation types
    - Test price range filter includes resort profiles
    - Test amenity filter includes resort profiles
    - Test no results scenario
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 18. Notification System Integration
  - [~] 18.1 Implement booking notification emails
    - Send email to resort owner on new booking
    - Include booking details in email template
    - Send email on payment receipt upload
    - Send confirmation email on status change
    - Send cancellation notification
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [~] 18.2 Add notification counter to resort dashboard
    - Display unread booking notification count
    - Update counter on new bookings
    - Mark notifications as read when viewed
    - _Requirements: 12.6_

  - [ ]* 18.3 Write integration tests for notifications
    - Test email sent on booking creation
    - Test email sent on receipt upload
    - Test email sent on status change
    - Test notification counter updates
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 19. Final Integration and End-to-End Testing
  - [~] 19.1 Run complete resort owner journey E2E test
    - Register new resort owner
    - Pay subscription fee
    - Admin verifies payment
    - Complete profile setup
    - Verify profile appears in accommodations
    - Tourist books accommodation
    - Resort owner receives booking notification
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 5.1, 12.1_

  - [~] 19.2 Run complete tourist journey E2E test
    - Browse accommodations page
    - Search for resort profiles
    - View resort profile details
    - Book resort accommodation
    - Upload payment receipt
    - Receive booking confirmation
    - _Requirements: 3.1, 3.2, 5.1, 5.2, 5.3, 11.1_

  - [~] 19.3 Run admin verification E2E test
    - Admin verifies subscription payment
    - Admin approves resort listing
    - Verify resort profile appears in accommodations
    - _Requirements: 8.1, 8.7_

- [~] 20. Final Checkpoint - Production Readiness
  - Ensure all tests pass (unit, integration, E2E)
  - Verify database migrations are reversible
  - Test rollback plan
  - Verify backward compatibility with existing data
  - Review security considerations (authentication, authorization, file uploads)
  - Verify error handling and validation
  - Test performance of accommodation merge endpoint
  - Ask the user if questions arise before deployment

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- The implementation follows a backend-first approach, then frontend integration
- Image uploads require proper storage configuration and symlink setup
- Email notifications require SMTP configuration
- The feature maintains backward compatibility with existing accommodations
- Resort profiles and static accommodations coexist in the system
- All API endpoints require JWT authentication and role-based authorization

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "6"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "3.5", "4.1", "4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4", "5.1", "5.2"] },
    { "id": 5, "tasks": ["5.3", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["8.5", "8.6", "9.1", "9.2"] },
    { "id": 7, "tasks": ["9.3", "9.4", "10.1", "10.2"] },
    { "id": 8, "tasks": ["10.3", "10.4", "11.1", "11.2", "12"] },
    { "id": 9, "tasks": ["14.1", "14.2", "14.3", "15.1", "15.2"] },
    { "id": 10, "tasks": ["15.3", "16.1", "16.2", "16.3"] },
    { "id": 11, "tasks": ["17.1", "17.2", "17.3", "18.1", "18.2"] },
    { "id": 12, "tasks": ["18.3", "19.1", "19.2", "19.3"] }
  ]
}
```
