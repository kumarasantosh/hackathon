-- Migration: Add service requests table for volunteer/service requests
-- This enables users to request services/volunteers from the community

-- Service requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('free', 'paid')),
  amount DECIMAL(10, 2),
  is_urgent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT paid_services_require_amount CHECK (
    (type = 'free' AND amount IS NULL) OR 
    (type = 'paid' AND amount IS NOT NULL AND amount > 0)
  )
);

-- Service request dates table - stores dates for which service is needed
CREATE TABLE IF NOT EXISTS service_request_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_request_id, service_date)
);

-- Service offers table - stores offers from volunteers/service providers
CREATE TABLE IF NOT EXISTS service_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_request_id, provider_id, status) WHERE status = 'pending'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_type ON service_requests(type);
CREATE INDEX IF NOT EXISTS idx_service_requests_is_urgent ON service_requests(is_urgent);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_service_request_dates_request_id ON service_request_dates(service_request_id);
CREATE INDEX IF NOT EXISTS idx_service_request_dates_date ON service_request_dates(service_date);
CREATE INDEX IF NOT EXISTS idx_service_offers_request_id ON service_offers(service_request_id);
CREATE INDEX IF NOT EXISTS idx_service_offers_provider_id ON service_offers(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_offers_status ON service_offers(status);

-- RLS Policies
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_offers ENABLE ROW LEVEL SECURITY;

-- Service requests policies
CREATE POLICY "Users can view all service requests" ON service_requests FOR SELECT USING (true);
CREATE POLICY "Users can create their own service requests" ON service_requests FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    AND id = user_id
  )
);
CREATE POLICY "Users can update their own service requests" ON service_requests FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    AND id = user_id
  )
);

-- Service request dates policies
CREATE POLICY "Users can view service request dates" ON service_request_dates FOR SELECT USING (
  EXISTS (SELECT 1 FROM service_requests WHERE id = service_request_dates.service_request_id)
);
CREATE POLICY "Users can manage dates for their own requests" ON service_request_dates FOR ALL USING (
  EXISTS (
    SELECT 1 FROM service_requests sr
    JOIN users u ON u.id = sr.user_id
    WHERE sr.id = service_request_dates.service_request_id
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Service offers policies
CREATE POLICY "Users can view service offers" ON service_offers FOR SELECT USING (
  EXISTS (SELECT 1 FROM service_requests WHERE id = service_offers.service_request_id)
);
CREATE POLICY "Users can create offers for service requests" ON service_offers FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
    AND id = provider_id
  )
);
CREATE POLICY "Request owners can manage offers" ON service_offers FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM service_requests sr
    JOIN users u ON u.id = sr.user_id
    WHERE sr.id = service_offers.service_request_id
    AND u.clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

