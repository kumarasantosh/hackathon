-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table (synced with Clerk)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  location TEXT,
  trust_score INTEGER DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  verified BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items table (for sharing/renting/selling)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  location TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('free', 'paid')),
  amount DECIMAL(10, 2),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'sold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT paid_items_require_amount CHECK (
    (type = 'free' AND amount IS NULL) OR 
    (type = 'paid' AND amount IS NOT NULL AND amount > 0)
  )
);

-- Orders table (for paid items via Razorpay)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- Requests table (for free items)
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, item_id, status) WHERE status = 'pending'
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('request', 'approved', 'rejected', 'message', 'order', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_location ON items(location);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_item_id ON orders(item_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_requester_id ON requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_item_id ON requests(item_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_booking_dates_request_id ON booking_dates(request_id);
CREATE INDEX IF NOT EXISTS idx_booking_dates_item_id ON booking_dates(item_id);
CREATE INDEX IF NOT EXISTS idx_booking_dates_date ON booking_dates(booking_date);
CREATE INDEX IF NOT EXISTS idx_booking_dates_item_date_blocked ON booking_dates(item_id, booking_date, is_blocked) WHERE is_blocked = true;

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_dates ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Note: User INSERT is handled via service role key in the application
-- This is necessary because RLS can't directly verify Clerk authentication
-- The webhook handler and getOrCreateUser helper use service role for inserts

-- Items policies
CREATE POLICY "Anyone can view available items" ON items FOR SELECT USING (status = 'available');
CREATE POLICY "Users can create items" ON items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);
CREATE POLICY "Users can update own items" ON items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = items.user_id 
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = orders.user_id 
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);
CREATE POLICY "Users can create own orders" ON orders FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Cart items policies
CREATE POLICY "Users can view own cart" ON cart_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = cart_items.user_id 
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = cart_items.user_id 
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Requests policies
CREATE POLICY "Users can view own requests" ON requests FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = requests.requester_id 
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
  OR
  EXISTS (
    SELECT 1 FROM items i
    JOIN users u ON u.id = i.user_id
    WHERE i.id = requests.item_id
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);
CREATE POLICY "Users can create requests" ON requests FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);
CREATE POLICY "Item owners can update requests" ON requests FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM items i
    JOIN users u ON u.id = i.user_id
    WHERE i.id = requests.item_id
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = notifications.user_id 
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = notifications.user_id 
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Booking dates policies
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
CREATE POLICY "Users can create booking dates" ON booking_dates FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM requests r
    JOIN users u ON u.id = r.requester_id
    WHERE r.id = booking_dates.request_id
    AND r.status = 'pending'
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);
CREATE POLICY "Item owners can update booking dates" ON booking_dates FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM requests r
    JOIN items i ON i.id = r.item_id
    JOIN users u ON u.id = i.user_id
    WHERE r.id = booking_dates.request_id
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

