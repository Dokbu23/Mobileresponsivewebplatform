# Requirements Document

## Introduction

This feature transforms the resort owner registration and profile model from managing individual accommodation listings to making the resort owner's profile itself the accommodation. After a resort owner registers and pays the ₱50 annual subscription fee, they will set up their resort profile with details like name, description, images, pricing, and amenities. This resort profile will automatically appear in the Accommodations page where tourists can browse and book directly. Optionally, resort owners can also add their resort as an attraction.

## Glossary

- **Resort_Owner**: A user with role "resort" who has registered and paid the subscription fee
- **Resort_Profile**: The resort owner's profile data that serves as the accommodation listing
- **Tourist**: A user with role "tourist" who can browse and book accommodations
- **Subscription_System**: The payment verification and subscription management system
- **Accommodation_Page**: The page where tourists browse available accommodations
- **Profile_Setup_Form**: The multi-step form for collecting resort information after subscription payment
- **Booking_System**: The system that handles accommodation reservations and payments
- **Admin**: A user with role "admin" who manages listings and users
- **Attraction**: A tourist destination that can be browsed separately from accommodations

## Requirements

### Requirement 1: Resort Profile Setup After Subscription Payment

**User Story:** As a resort owner, I want to set up my resort profile immediately after paying the subscription fee, so that my resort can start accepting bookings.

#### Acceptance Criteria

1. WHEN a Resort_Owner completes subscription payment verification, THE Subscription_System SHALL redirect the Resort_Owner to the Profile_Setup_Form
2. THE Profile_Setup_Form SHALL collect resort_name, resort_description, resort_price_per_night, and at least one resort_image as required fields
3. THE Profile_Setup_Form SHALL collect resort_amenities, resort_facilities, resort_policies, and additional resort_images as optional fields
4. WHEN the Resort_Owner submits the Profile_Setup_Form with all required fields, THE System SHALL store the data in the users table
5. WHEN the Resort_Owner submits the Profile_Setup_Form successfully, THE System SHALL set resort_is_setup to true for that user
6. WHEN the Resort_Owner submits the Profile_Setup_Form with missing required fields, THE System SHALL display validation errors and prevent submission

### Requirement 2: Resort Profile Data Storage

**User Story:** As a system administrator, I want resort profile data stored in the users table, so that each resort owner's profile is directly linked to their account.

#### Acceptance Criteria

1. THE users table SHALL include a resort_name column of type VARCHAR(255) nullable
2. THE users table SHALL include a resort_description column of type TEXT nullable
3. THE users table SHALL include a resort_price_per_night column of type DECIMAL(10,2) nullable
4. THE users table SHALL include a resort_images column of type JSON nullable for storing an array of image URLs
5. THE users table SHALL include a resort_amenities column of type JSON nullable for storing an array of amenity strings
6. THE users table SHALL include a resort_facilities column of type TEXT nullable
7. THE users table SHALL include a resort_policies column of type TEXT nullable
8. THE users table SHALL include a resort_is_setup column of type BOOLEAN with default value false
9. WHEN resort profile data is stored, THE System SHALL validate that resort_price_per_night is greater than zero
10. WHEN resort_images are stored, THE System SHALL validate that the JSON array contains valid image URL strings

### Requirement 3: Display Resort Profiles in Accommodations Page

**User Story:** As a tourist, I want to see resort profiles alongside other accommodations, so that I can browse and compare all available lodging options in one place.

#### Acceptance Criteria

1. WHEN a Tourist views the Accommodation_Page, THE System SHALL retrieve all users where role equals "resort" AND resort_is_setup equals true
2. WHEN displaying resort profiles, THE System SHALL show resort_name, resort_description, resort_price_per_night, and the first resort_image
3. WHEN displaying resort profiles, THE System SHALL include a "View Business Page" link that navigates to the full resort profile
4. THE Accommodation_Page SHALL display resort profiles using the same card layout as static accommodation listings
5. WHEN a resort profile has multiple resort_images, THE System SHALL display the first image in the array as the primary image
6. WHEN a Resort_Owner has resort_is_setup equals false, THE System SHALL NOT display that resort profile in the Accommodation_Page

### Requirement 4: Resort Profile Management

**User Story:** As a resort owner, I want to edit my resort profile information, so that I can keep my listing up-to-date and accurate.

#### Acceptance Criteria

1. WHEN a Resort_Owner accesses ResortProfile.tsx, THE System SHALL display the current resort profile data
2. THE System SHALL allow the Resort_Owner to update resort_name, resort_description, resort_price_per_night, resort_images, resort_amenities, resort_facilities, and resort_policies
3. WHEN a Resort_Owner updates resort profile data, THE System SHALL validate all required fields before saving
4. WHEN a Resort_Owner updates resort_price_per_night, THE System SHALL validate that the value is greater than zero
5. WHEN a Resort_Owner adds or removes resort_images, THE System SHALL update the JSON array in the database
6. THE System SHALL display booking statistics for the resort including total bookings, pending bookings, and confirmed bookings
7. WHEN a Resort_Owner saves profile updates, THE System SHALL display a success confirmation message

### Requirement 5: Booking Integration for Resort Profiles

**User Story:** As a tourist, I want to book a resort profile just like any other accommodation, so that I can reserve my stay and make payments.

#### Acceptance Criteria

1. WHEN a Tourist selects a resort profile from the Accommodation_Page, THE Booking_System SHALL display booking options with resort_price_per_night
2. WHEN a Tourist submits a booking for a resort profile, THE Booking_System SHALL use the Resort_Owner's payment_details for payment processing
3. WHEN a Tourist makes an advance payment booking, THE Booking_System SHALL require receipt upload
4. THE Booking_System SHALL store bookings for resort profiles in the same bookings table as other accommodations
5. WHEN a booking is created for a resort profile, THE System SHALL link the booking to the Resort_Owner's user ID
6. WHEN a Resort_Owner views their dashboard, THE System SHALL display all bookings for their resort profile
7. WHEN a booking status changes, THE System SHALL notify the Resort_Owner via their registered email

### Requirement 6: Optional Attraction Listing

**User Story:** As a resort owner, I want to optionally add my resort as an attraction, so that tourists can discover my resort through the attractions page as well.

#### Acceptance Criteria

1. THE System SHALL provide an option for Resort_Owners to add their resort as an attraction
2. WHEN a Resort_Owner adds their resort as an attraction, THE System SHALL create a separate attraction entry
3. THE attraction listing SHALL be independent from the accommodation listing
4. WHEN a resort is added as an attraction, THE System SHALL display it in the Attractions page
5. WHEN a Resort_Owner removes their resort from attractions, THE System SHALL NOT affect the accommodation listing
6. THE System SHALL allow the Resort_Owner to use different images and descriptions for the attraction listing versus the accommodation listing

### Requirement 7: Backend API for Resort Profiles

**User Story:** As a frontend developer, I want RESTful API endpoints for resort profile operations, so that I can integrate resort profile functionality into the user interface.

#### Acceptance Criteria

1. THE System SHALL provide a GET /api/resort-profile endpoint that returns the authenticated Resort_Owner's resort profile data
2. THE System SHALL provide a PUT /api/resort-profile endpoint that updates the authenticated Resort_Owner's resort profile data
3. THE System SHALL provide a POST /api/resort-profile/setup endpoint for initial resort profile setup after subscription
4. THE System SHALL provide a GET /api/accommodations endpoint that returns both static accommodations and resort profiles where resort_is_setup equals true
5. WHEN GET /api/resort-profile is called by a non-resort user, THE System SHALL return a 403 Forbidden error
6. WHEN PUT /api/resort-profile is called with invalid data, THE System SHALL return a 422 Unprocessable Entity error with validation messages
7. WHEN POST /api/resort-profile/setup is called by a Resort_Owner who already has resort_is_setup equals true, THE System SHALL return a 400 Bad Request error
8. THE System SHALL require JWT authentication for all resort profile API endpoints
9. WHEN GET /api/accommodations is called, THE System SHALL return resort profiles with fields: id, resort_name, resort_description, resort_price_per_night, resort_images, resort_amenities, and a type field set to "resort_profile"

### Requirement 8: Migration and Backward Compatibility

**User Story:** As a system administrator, I want existing resort owners to be prompted for profile setup, so that all resort accounts transition to the new profile-based model.

#### Acceptance Criteria

1. WHEN an existing Resort_Owner with subscription_status equals "active" logs in AND resort_is_setup equals false, THE System SHALL redirect them to the Profile_Setup_Form
2. THE System SHALL preserve all existing accommodation listings in the accommodations table
3. WHEN the migration is complete, THE System SHALL allow both old accommodation listings and new resort profiles to coexist
4. WHEN a new Resort_Owner registers, THE System SHALL require profile setup completion before allowing access to the dashboard
5. THE System SHALL add the new resort profile columns to the users table without affecting existing user data
6. WHEN displaying accommodations, THE System SHALL merge results from both the accommodations table and resort profiles from the users table
7. THE Admin SHALL be able to view and manage both old-style accommodation listings and new resort profiles from the ManageListings page

### Requirement 9: Resort Profile Image Management

**User Story:** As a resort owner, I want to upload and manage multiple images for my resort profile, so that tourists can see various aspects of my property.

#### Acceptance Criteria

1. THE Profile_Setup_Form SHALL allow the Resort_Owner to upload at least one image and up to ten images
2. WHEN a Resort_Owner uploads an image, THE System SHALL validate that the file is in JPEG, PNG, or WebP format
3. WHEN a Resort_Owner uploads an image, THE System SHALL validate that the file size does not exceed 5MB
4. THE System SHALL store uploaded images in the public storage directory with a unique filename
5. WHEN images are uploaded successfully, THE System SHALL store the image URLs in the resort_images JSON array
6. THE System SHALL allow the Resort_Owner to reorder images by updating the JSON array order
7. WHEN a Resort_Owner deletes an image, THE System SHALL remove the image file from storage and update the resort_images JSON array
8. WHEN a resort profile has no images, THE System SHALL display a default placeholder image in the Accommodation_Page

### Requirement 10: Resort Profile Validation and Error Handling

**User Story:** As a resort owner, I want clear validation messages when setting up my profile, so that I can correct any errors and complete the setup successfully.

#### Acceptance Criteria

1. WHEN resort_name is empty or exceeds 255 characters, THE System SHALL display an error message "Resort name is required and must not exceed 255 characters"
2. WHEN resort_description is empty, THE System SHALL display an error message "Resort description is required"
3. WHEN resort_price_per_night is empty, zero, or negative, THE System SHALL display an error message "Price per night must be greater than zero"
4. WHEN no images are uploaded during initial setup, THE System SHALL display an error message "At least one resort image is required"
5. WHEN an image upload fails, THE System SHALL display an error message with the specific failure reason
6. WHEN the Resort_Owner attempts to save profile updates while offline, THE System SHALL display an error message "Unable to save changes. Please check your internet connection"
7. WHEN API validation fails, THE System SHALL display all validation errors in a user-friendly format

### Requirement 11: Resort Profile Search and Filter Integration

**User Story:** As a tourist, I want to search and filter resort profiles along with other accommodations, so that I can find lodging that meets my specific needs.

#### Acceptance Criteria

1. WHEN a Tourist uses the search feature on the Accommodation_Page, THE System SHALL search both static accommodations and resort profiles
2. THE System SHALL search resort_name and resort_description fields when filtering resort profiles
3. WHEN a Tourist filters by price range, THE System SHALL include resort profiles where resort_price_per_night falls within the specified range
4. WHEN a Tourist filters by amenities, THE System SHALL include resort profiles where resort_amenities contains the selected amenity
5. THE System SHALL display search results with resort profiles and static accommodations intermixed based on relevance
6. WHEN no resort profiles match the search criteria, THE System SHALL display only matching static accommodations

### Requirement 12: Resort Profile Booking Notifications

**User Story:** As a resort owner, I want to receive notifications when tourists book my resort, so that I can prepare for their arrival and manage reservations.

#### Acceptance Criteria

1. WHEN a Tourist creates a booking for a resort profile, THE System SHALL send an email notification to the Resort_Owner's registered email address
2. THE notification email SHALL include booking details: tourist name, check-in date, check-out date, number of guests, and total price
3. WHEN a Tourist uploads a payment receipt for a resort booking, THE System SHALL send an email notification to the Resort_Owner
4. WHEN a booking status changes to "confirmed", THE System SHALL send a confirmation email to both the Tourist and the Resort_Owner
5. WHEN a booking is cancelled, THE System SHALL send a cancellation notification to the Resort_Owner
6. THE System SHALL display a booking notification counter in the Resort_Owner's dashboard showing unread booking notifications

