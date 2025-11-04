-- Migration: Add requests and notifications tables
-- Run this if you already have the base schema and need to add these tables

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_requester_id ON requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_item_id ON requests(item_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- Trigger for updated_at
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

