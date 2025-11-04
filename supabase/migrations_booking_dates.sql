-- Migration: Add booking dates functionality
-- This enables date-based bookings for items

-- Booking dates table - stores selected dates for each request
CREATE TABLE IF NOT EXISTS booking_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  is_blocked BOOLEAN DEFAULT false, -- true when request is approved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, booking_date, is_blocked) WHERE is_blocked = true -- Prevent double-booking on same date
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_dates_request_id ON booking_dates(request_id);
CREATE INDEX IF NOT EXISTS idx_booking_dates_item_id ON booking_dates(item_id);
CREATE INDEX IF NOT EXISTS idx_booking_dates_date ON booking_dates(booking_date);
CREATE INDEX IF NOT EXISTS idx_booking_dates_item_date_blocked ON booking_dates(item_id, booking_date, is_blocked) WHERE is_blocked = true;

-- RLS Policies
ALTER TABLE booking_dates ENABLE ROW LEVEL SECURITY;

-- Users can view booking dates for requests they can view
CREATE POLICY "Users can view booking dates for their requests" ON booking_dates FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM requests r
    JOIN users u ON u.id = r.requester_id 
    WHERE r.id = booking_dates.request_id
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
  OR
  EXISTS (
    SELECT 1 FROM requests r
    JOIN items i ON i.id = r.item_id
    JOIN users u ON u.id = i.user_id
    WHERE r.id = booking_dates.request_id
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Users can create booking dates for their requests
CREATE POLICY "Users can create booking dates" ON booking_dates FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM requests r
    JOIN users u ON u.id = r.requester_id
    WHERE r.id = booking_dates.request_id
    AND r.status = 'pending'
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Item owners can update booking dates (to block them when approving)
CREATE POLICY "Item owners can update booking dates" ON booking_dates FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM requests r
    JOIN items i ON i.id = r.item_id
    JOIN users u ON u.id = i.user_id
    WHERE r.id = booking_dates.request_id
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Users can delete booking dates for their own cancelled requests
CREATE POLICY "Users can delete booking dates for their requests" ON booking_dates FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM requests r
    JOIN users u ON u.id = r.requester_id
    WHERE r.id = booking_dates.request_id
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
  OR
  EXISTS (
    SELECT 1 FROM requests r
    JOIN items i ON i.id = r.item_id
    JOIN users u ON u.id = i.user_id
    WHERE r.id = booking_dates.request_id
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Function to check if dates are available for an item
CREATE OR REPLACE FUNCTION check_dates_available(
  p_item_id UUID,
  p_dates DATE[]
)
RETURNS TABLE(
  is_available BOOLEAN,
  conflicting_dates DATE[]
) AS $$
DECLARE
  conflicting DATE[];
BEGIN
  -- Check if any of the requested dates are already blocked
  SELECT ARRAY_AGG(DISTINCT booking_date)
  INTO conflicting
  FROM booking_dates
  WHERE item_id = p_item_id
    AND booking_date = ANY(p_dates)
    AND is_blocked = true;

  -- If there are conflicts, return false with conflicting dates
  IF conflicting IS NOT NULL AND array_length(conflicting, 1) > 0 THEN
    RETURN QUERY SELECT false, conflicting;
  ELSE
    -- All dates are available
    RETURN QUERY SELECT true, ARRAY[]::DATE[];
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to block dates when a request is approved
CREATE OR REPLACE FUNCTION block_booking_dates(
  p_request_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Mark all dates for this request as blocked
  UPDATE booking_dates
  SET is_blocked = true
  WHERE request_id = p_request_id
    AND is_blocked = false;
END;
$$ LANGUAGE plpgsql;

-- Function to unblock dates when a request is cancelled/rejected
CREATE OR REPLACE FUNCTION unblock_booking_dates(
  p_request_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Unblock dates by deleting them (or set is_blocked = false if you want to keep history)
  -- For now, we'll delete to clean up cancelled/rejected requests
  DELETE FROM booking_dates
  WHERE request_id = p_request_id
    AND is_blocked = true;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup past booking dates and make items available again
CREATE OR REPLACE FUNCTION cleanup_past_booking_dates()
RETURNS TABLE(
  items_updated INTEGER,
  dates_deleted INTEGER
) AS $$
DECLARE
  deleted_count INTEGER := 0;
  updated_items_count INTEGER := 0;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Delete all blocked booking dates that are in the past
  DELETE FROM booking_dates
  WHERE booking_date < today_date
    AND is_blocked = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Find items that should be available again (all their blocked dates have passed)
  -- Update items that are marked as "rented" but have no future blocked dates
  -- This handles legacy items - ideally items should always stay "available"
  UPDATE items
  SET status = 'available',
      updated_at = NOW()
  WHERE status = 'rented'
    AND id IN (
      SELECT DISTINCT item_id
      FROM booking_dates
      WHERE is_blocked = true
      GROUP BY item_id
      HAVING MAX(booking_date) < today_date
    );
  
  GET DIAGNOSTICS updated_items_count = ROW_COUNT;
  
  -- Also update items that have no blocked dates at all (cleanup edge case)
  UPDATE items
  SET status = 'available',
      updated_at = NOW()
  WHERE status = 'rented'
    AND id NOT IN (
      SELECT DISTINCT item_id
      FROM booking_dates
      WHERE is_blocked = true
        AND booking_date >= today_date
    );
  
  RETURN QUERY SELECT updated_items_count, deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update a specific item's availability based on booking dates
-- Note: This ensures items marked as "rented" become "available" again after all bookings pass
-- However, items should ideally remain "available" and only dates should be blocked
CREATE OR REPLACE FUNCTION update_item_availability(p_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  has_future_bookings BOOLEAN := false;
BEGIN
  -- Check if item has any future blocked dates
  SELECT EXISTS(
    SELECT 1
    FROM booking_dates
    WHERE item_id = p_item_id
      AND is_blocked = true
      AND booking_date >= today_date
  ) INTO has_future_bookings;
  
  -- If item is rented but has no future bookings, make it available
  -- This handles legacy items that were marked as rented
  IF NOT has_future_bookings THEN
    UPDATE items
    SET status = 'available',
        updated_at = NOW()
    WHERE id = p_item_id
      AND status = 'rented';
    
    RETURN true; -- Item was updated
  END IF;
  
  RETURN false; -- No update needed
END;
$$ LANGUAGE plpgsql;

