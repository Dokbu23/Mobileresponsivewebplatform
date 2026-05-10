# Event Management API Test Collection

This document provides test cases for the multi-role event management feature.

## Prerequisites

1. Start the Laravel backend server
2. Have test users with different roles:
   - Admin user
   - Enterprise user (with active subscription)
   - Resort user (with active subscription)
   - Tourist user

## Test Cases

### 1. Authentication Setup

First, login with each user type and save their JWT tokens.

#### Login as Admin
```
POST http://localhost:8000/api/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}
```

#### Login as Enterprise
```
POST http://localhost:8000/api/login
Content-Type: application/json

{
  "email": "enterprise@example.com",
  "password": "password"
}
```

#### Login as Resort
```
POST http://localhost:8000/api/login
Content-Type: application/json

{
  "email": "resort@example.com",
  "password": "password"
}
```

#### Login as Tourist
```
POST http://localhost:8000/api/login
Content-Type: application/json

{
  "email": "tourist@example.com",
  "password": "password"
}
```

### 2. Event Creation Tests

#### Test 2.1: Admin Creates Event (Should Succeed)
```
POST http://localhost:8000/api/events
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

name: Admin Test Event
location: Mansalay
category: Festival
date: 2026-06-15
time: 10:00 AM
capacity: 100
description: Test event created by admin
full_description: This is a detailed description of the admin test event
```

**Expected Result**: 201 Created, event created with user_id = admin's ID

#### Test 2.2: Enterprise Creates Event (Should Succeed)
```
POST http://localhost:8000/api/events
Authorization: Bearer {enterprise_token}
Content-Type: multipart/form-data

name: Enterprise Test Event
location: Mansalay Beach
category: Concert
date: 2026-07-20
time: 6:00 PM
capacity: 200
description: Test event created by enterprise
full_description: This is a detailed description of the enterprise test event
```

**Expected Result**: 201 Created, event created with user_id = enterprise user's ID

#### Test 2.3: Resort Creates Event (Should Succeed)
```
POST http://localhost:8000/api/events
Authorization: Bearer {resort_token}
Content-Type: multipart/form-data

name: Resort Test Event
location: Resort Grounds
category: Workshop
date: 2026-08-10
time: 2:00 PM
capacity: 50
description: Test event created by resort
full_description: This is a detailed description of the resort test event
```

**Expected Result**: 201 Created, event created with user_id = resort user's ID

#### Test 2.4: Tourist Creates Event (Should Fail)
```
POST http://localhost:8000/api/events
Authorization: Bearer {tourist_token}
Content-Type: multipart/form-data

name: Tourist Test Event
location: Somewhere
category: Sports
date: 2026-09-01
time: 3:00 PM
capacity: 30
description: Test event created by tourist
```

**Expected Result**: 403 Forbidden, tourist cannot create events

#### Test 2.5: Create Event with Image Upload
```
POST http://localhost:8000/api/events
Authorization: Bearer {enterprise_token}
Content-Type: multipart/form-data

name: Event with Image
location: Mansalay
category: Cultural
date: 2026-10-05
time: 5:00 PM
capacity: 150
description: Event with image upload
full_description: Testing image upload functionality
image: [Upload a valid image file < 5MB]
```

**Expected Result**: 201 Created, event created with image path stored

#### Test 2.6: Create Event with Invalid Image (Should Fail)
```
POST http://localhost:8000/api/events
Authorization: Bearer {enterprise_token}
Content-Type: multipart/form-data

name: Event with Invalid Image
location: Mansalay
category: Festival
date: 2026-11-15
time: 4:00 PM
capacity: 100
description: Event with invalid image
image: [Upload a file > 5MB or non-image file]
```

**Expected Result**: 422 Validation Error, image validation fails

### 3. Event Listing Tests

#### Test 3.1: Public Event List (No Auth)
```
GET http://localhost:8000/api/public/events
```

**Expected Result**: 200 OK, returns all events (no ownership filtering)

#### Test 3.2: Admin Views All Events
```
GET http://localhost:8000/api/public/events
Authorization: Bearer {admin_token}
```

**Expected Result**: 200 OK, returns all events with creator information

#### Test 3.3: Enterprise Views Own Events
```
GET http://localhost:8000/api/events/my
Authorization: Bearer {enterprise_token}
```

**Expected Result**: 200 OK, returns only events created by enterprise user

#### Test 3.4: Resort Views Own Events
```
GET http://localhost:8000/api/events/my
Authorization: Bearer {resort_token}
```

**Expected Result**: 200 OK, returns only events created by resort user

#### Test 3.5: Tourist Views Public Events
```
GET http://localhost:8000/api/public/events
Authorization: Bearer {tourist_token}
```

**Expected Result**: 200 OK, returns all events (public view)

### 4. Event Update Tests

#### Test 4.1: Enterprise Updates Own Event (Should Succeed)
```
PUT http://localhost:8000/api/events/{enterprise_event_id}
Authorization: Bearer {enterprise_token}
Content-Type: application/json

{
  "name": "Updated Enterprise Event",
  "description": "Updated description"
}
```

**Expected Result**: 200 OK, event updated successfully

#### Test 4.2: Enterprise Updates Another's Event (Should Fail)
```
PUT http://localhost:8000/api/events/{resort_event_id}
Authorization: Bearer {enterprise_token}
Content-Type: application/json

{
  "name": "Trying to Update Resort Event",
  "description": "This should fail"
}
```

**Expected Result**: 403 Forbidden, cannot update events owned by others

#### Test 4.3: Admin Updates Any Event (Should Succeed)
```
PUT http://localhost:8000/api/events/{enterprise_event_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Admin Updated Enterprise Event",
  "description": "Admin can update any event"
}
```

**Expected Result**: 200 OK, admin can update any event

#### Test 4.4: Update Event with Image (FormData)
```
POST http://localhost:8000/api/events/{enterprise_event_id}
Authorization: Bearer {enterprise_token}
Content-Type: multipart/form-data

name: Updated Event with New Image
image: [Upload a new image file]
```

**Expected Result**: 200 OK, event updated with new image

### 5. Event Deletion Tests

#### Test 5.1: Resort Deletes Own Event (Should Succeed)
```
DELETE http://localhost:8000/api/events/{resort_event_id}
Authorization: Bearer {resort_token}
```

**Expected Result**: 200 OK, event deleted successfully

#### Test 5.2: Resort Deletes Another's Event (Should Fail)
```
DELETE http://localhost:8000/api/events/{enterprise_event_id}
Authorization: Bearer {resort_token}
```

**Expected Result**: 403 Forbidden, cannot delete events owned by others

#### Test 5.3: Admin Deletes Any Event (Should Succeed)
```
DELETE http://localhost:8000/api/events/{any_event_id}
Authorization: Bearer {admin_token}
```

**Expected Result**: 200 OK, admin can delete any event

#### Test 5.4: Tourist Deletes Event (Should Fail)
```
DELETE http://localhost:8000/api/events/{any_event_id}
Authorization: Bearer {tourist_token}
```

**Expected Result**: 403 Forbidden, tourist cannot delete events

### 6. Event Search and Filter Tests

#### Test 6.1: Search Events by Name
```
GET http://localhost:8000/api/public/events?search=Festival
```

**Expected Result**: 200 OK, returns events matching "Festival" in name or description

#### Test 6.2: Filter Events by Location
```
GET http://localhost:8000/api/public/events?barangay=Mansalay
```

**Expected Result**: 200 OK, returns events in Mansalay location

#### Test 6.3: Filter Events by Month
```
GET http://localhost:8000/api/public/events?month=6
```

**Expected Result**: 200 OK, returns events in June

#### Test 6.4: Filter Events by Year
```
GET http://localhost:8000/api/public/events?year=2026
```

**Expected Result**: 200 OK, returns events in 2026

### 7. Backward Compatibility Tests

#### Test 7.1: View Event with Null user_id
```
GET http://localhost:8000/api/public/events/{old_event_id}
```

**Expected Result**: 200 OK, event displays correctly even with null user_id

#### Test 7.2: Admin Updates Event with Null user_id
```
PUT http://localhost:8000/api/events/{old_event_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Updated Old Event",
  "description": "Admin updating event with null user_id"
}
```

**Expected Result**: 200 OK, admin can update events with null user_id

### 8. Validation Tests

#### Test 8.1: Create Event without Required Fields
```
POST http://localhost:8000/api/events
Authorization: Bearer {enterprise_token}
Content-Type: application/json

{
  "location": "Somewhere"
}
```

**Expected Result**: 422 Validation Error, name is required

#### Test 8.2: Create Event with Invalid Date
```
POST http://localhost:8000/api/events
Authorization: Bearer {enterprise_token}
Content-Type: application/json

{
  "name": "Invalid Date Event",
  "date": "not-a-date"
}
```

**Expected Result**: 422 Validation Error, invalid date format

## Test Results Summary

| Test Case | Expected Result | Actual Result | Status |
|-----------|----------------|---------------|--------|
| 2.1 Admin Creates Event | 201 Created | | |
| 2.2 Enterprise Creates Event | 201 Created | | |
| 2.3 Resort Creates Event | 201 Created | | |
| 2.4 Tourist Creates Event | 403 Forbidden | | |
| 2.5 Create with Image | 201 Created | | |
| 2.6 Create with Invalid Image | 422 Error | | |
| 3.1 Public Event List | 200 OK | | |
| 3.2 Admin Views All | 200 OK | | |
| 3.3 Enterprise Views Own | 200 OK | | |
| 3.4 Resort Views Own | 200 OK | | |
| 3.5 Tourist Views Public | 200 OK | | |
| 4.1 Enterprise Updates Own | 200 OK | | |
| 4.2 Enterprise Updates Other | 403 Forbidden | | |
| 4.3 Admin Updates Any | 200 OK | | |
| 4.4 Update with Image | 200 OK | | |
| 5.1 Resort Deletes Own | 200 OK | | |
| 5.2 Resort Deletes Other | 403 Forbidden | | |
| 5.3 Admin Deletes Any | 200 OK | | |
| 5.4 Tourist Deletes | 403 Forbidden | | |
| 6.1 Search by Name | 200 OK | | |
| 6.2 Filter by Location | 200 OK | | |
| 6.3 Filter by Month | 200 OK | | |
| 6.4 Filter by Year | 200 OK | | |
| 7.1 View Old Event | 200 OK | | |
| 7.2 Admin Updates Old | 200 OK | | |
| 8.1 Missing Required | 422 Error | | |
| 8.2 Invalid Date | 422 Error | | |

## Notes

- Replace `{admin_token}`, `{enterprise_token}`, etc. with actual JWT tokens from login responses
- Replace `{enterprise_event_id}`, `{resort_event_id}`, etc. with actual event IDs from creation responses
- For image upload tests, use actual image files from your file system
- Ensure enterprise and resort users have active subscriptions before testing
