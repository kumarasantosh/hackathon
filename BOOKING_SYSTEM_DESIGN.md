# Booking System Design - Date-Based Product Availability

## Overview

This document describes the backend structure for handling date-based booking requests and preventing double bookings.

## Database Schema

### `booking_dates` Table

Stores selected dates for each booking request.

```sql
CREATE TABLE booking_dates (
  id UUID PRIMARY KEY,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  is_blocked BOOLEAN DEFAULT false, -- true when request is approved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, booking_date, is_blocked) WHERE is_blocked = true
);
```

**Key Features:**
- Links to both `requests` and `items` tables
- `is_blocked` flag indicates if the date is actually reserved (approved request)
- Unique constraint prevents double-booking on the same date for the same item
- Cascading deletes ensure data integrity

### Indexes

- `idx_booking_dates_request_id` - Fast lookup by request
- `idx_booking_dates_item_id` - Fast lookup by item
- `idx_booking_dates_date` - Fast lookup by date
- `idx_booking_dates_item_date_blocked` - Optimized for availability checks

## Database Functions

### `check_dates_available(item_id, dates[])`

Checks if requested dates are available for an item.

**Returns:**
- `is_available`: boolean
- `conflicting_dates`: array of conflicting dates

### `block_booking_dates(request_id)`

Blocks all dates for an approved request by setting `is_blocked = true`.

### `unblock_booking_dates(request_id)`

Unblocks dates when a request is cancelled or rejected (deletes blocked dates).

## API Flow

### 1. Creating a Booking Request

**Endpoint:** `POST /api/items/request`

**Request Body:**
```json
{
  "itemId": "uuid",
  "bookingDates": ["2024-12-25", "2024-12-26", "2024-12-27"],
  "message": "Optional message"
}
```

**Process:**
1. Validate that `bookingDates` is provided and is a non-empty array
2. Validate all dates are in the future
3. Check for existing pending request from same user
4. Check if any requested dates are already blocked (double-booking prevention)
5. Create request record
6. Create booking_dates records with `is_blocked = false` (not yet approved)

**Error Responses:**
- `400`: Missing/invalid dates, dates in past, or conflicting dates already booked

### 2. Approving a Booking Request

**Endpoint:** `PATCH /api/requests/[id]`

**Request Body:**
```json
{
  "status": "approved"
}
```

**Process:**
1. Verify user is item owner
2. Fetch request with booking dates
3. **Check for conflicts** - Verify none of the requested dates are already blocked by other approved requests
4. Update request status to "approved"
5. **Block the dates** - Update all booking_dates for this request to `is_blocked = true`
6. Handle payment/rental logic based on item type

**Error Responses:**
- `409 Conflict`: If some dates are no longer available (conflict detected between approval and another booking)

**Key Safety Feature:** Even if dates were available when request was created, we re-check at approval time to prevent race conditions.

### 3. Rejecting/Cancelling a Request

**Endpoint:** `PATCH /api/requests/[id]`

**Process:**
1. Update request status
2. **Unblock dates** - Delete blocked booking_dates to free them up (or set `is_blocked = false` if keeping history)

### 4. Checking Date Availability

**Endpoint:** `GET /api/items/[id]/availability?startDate=2024-12-01&endDate=2024-12-31`

**Returns:**
```json
{
  "itemId": "uuid",
  "startDate": "2024-12-01",
  "endDate": "2024-12-31",
  "dates": [
    { "date": "2024-12-01", "available": true },
    { "date": "2024-12-02", "available": false },
    ...
  ],
  "blockedDates": ["2024-12-02", "2024-12-05"]
}
```

## Conflict Prevention Logic

### Double-Booking Prevention

1. **At Request Creation:**
   - Query `booking_dates` where `item_id = X` AND `booking_date IN [...]` AND `is_blocked = true`
   - If any dates are found, reject the request with conflicting dates

2. **At Request Approval:**
   - Re-check availability even if dates were available at creation time
   - This prevents race conditions where multiple requests are created simultaneously
   - If conflicts found, return `409 Conflict` with conflicting dates

3. **Database-Level:**
   - Unique constraint: `UNIQUE(item_id, booking_date, is_blocked) WHERE is_blocked = true`
   - Prevents database-level double-booking even if application logic fails

### Race Condition Handling

**Scenario:** Two users request the same date simultaneously

**Solution:**
1. Both requests can be created with `is_blocked = false` (pending state)
2. First approval will block dates successfully
3. Second approval will detect conflict and return error
4. Unique constraint provides final safety net

## Data Flow Diagram

```
User creates request with dates [Dec 25, Dec 26]
  ↓
booking_dates created: [{date: Dec 25, is_blocked: false}, {date: Dec 26, is_blocked: false}]
  ↓
Owner approves request
  ↓
Check: Are Dec 25, Dec 26 already blocked? (No)
  ↓
Update: booking_dates set is_blocked = true for this request
  ↓
Now: Other users cannot book Dec 25, Dec 26 (conflict check will fail)
```

## Implementation Files

- **Schema:** `supabase/schema.sql` (main schema)
- **Migration:** `supabase/migrations_booking_dates.sql` (for existing databases)
- **Create Request:** `app/api/items/request/route.ts`
- **Approve/Reject Request:** `app/api/requests/[id]/route.ts`
- **Check Availability:** `app/api/items/[id]/availability/route.ts`

## Frontend Integration Notes

When implementing the frontend:

1. **Date Selection:**
   - Fetch available dates: `GET /api/items/[id]/availability`
   - Allow user to select multiple dates from available dates
   - Validate client-side before submission

2. **Request Creation:**
   - Send `bookingDates` array with request
   - Handle error responses showing conflicting dates
   - Update UI to show which dates are unavailable

3. **Request Approval UI:**
   - Show selected dates for each pending request
   - Display if dates are still available
   - Handle conflict errors gracefully

4. **Calendar View:**
   - Show blocked dates visually
   - Highlight available vs unavailable dates
   - Prevent selection of unavailable dates

## Testing Scenarios

1. **Normal Flow:**
   - User A requests dates [Dec 25, Dec 26] → Success
   - Owner approves → Dates blocked
   - User B requests date Dec 25 → Error: Date already booked

2. **Race Condition:**
   - User A and User B both request Dec 25 simultaneously → Both created (pending)
   - Owner approves User A → Dec 25 blocked
   - Owner tries to approve User B → Error: Conflict detected

3. **Cancellation:**
   - User requests dates → Created
   - User cancels → Dates remain unblocked (can be requested again)
   - Owner rejects → Dates freed up

4. **Re-approval:**
   - Request approved → Dates blocked
   - Request cancelled → Dates unblocked
   - Same dates can be requested again by different user

