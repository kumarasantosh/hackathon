-- SQL Queries for Damage Reporting System
-- Use these queries to verify, debug, and manage damage reports

-- ============================================
-- 1. CHECK IF DAMAGE COLUMNS EXIST
-- ============================================

-- Verify damage reporting columns are in the orders table
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('damage_reported', 'damage_description', 'damage_reported_at')
ORDER BY column_name;

-- ============================================
-- 2. VIEW ALL DAMAGE REPORTS
-- ============================================

-- View all orders with damage reports
SELECT 
    o.id as order_id,
    o.user_id as borrower_id,
    u_borrower.name as borrower_name,
    u_borrower.trust_score as borrower_trust_score,
    i.title as item_title,
    i.user_id as owner_id,
    u_owner.name as owner_name,
    o.damage_reported,
    o.damage_description,
    o.damage_reported_at,
    o.return_status,
    o.return_approved_at,
    o.status as order_status
FROM orders o
LEFT JOIN items i ON o.item_id = i.id
LEFT JOIN users u_borrower ON o.user_id = u_borrower.id
LEFT JOIN users u_owner ON i.user_id = u_owner.id
WHERE o.damage_reported = true
ORDER BY o.damage_reported_at DESC;

-- View recent damage reports (last 10)
SELECT 
    o.id as order_id,
    i.title as item_title,
    u_borrower.name as borrower_name,
    u_borrower.trust_score as borrower_trust_score,
    u_owner.name as owner_name,
    o.damage_description,
    o.damage_reported_at
FROM orders o
JOIN items i ON o.item_id = i.id
JOIN users u_borrower ON o.user_id = u_borrower.id
JOIN users u_owner ON i.user_id = u_owner.id
WHERE o.damage_reported = true
ORDER BY o.damage_reported_at DESC
LIMIT 10;

-- ============================================
-- 3. ORDERS READY FOR DAMAGE REPORTING
-- ============================================

-- Orders with approved returns where damage can be reported
SELECT 
    o.id as order_id,
    o.user_id as borrower_id,
    u_borrower.name as borrower_name,
    u_borrower.trust_score as borrower_current_trust_score,
    i.title as item_title,
    i.user_id as owner_id,
    u_owner.name as owner_name,
    o.return_status,
    o.return_approved_at,
    o.damage_reported,
    o.status as order_status
FROM orders o
LEFT JOIN items i ON o.item_id = i.id
LEFT JOIN users u_borrower ON o.user_id = u_borrower.id
LEFT JOIN users u_owner ON i.user_id = u_owner.id
WHERE o.return_status = 'approved'
  AND o.damage_reported = false
  AND o.item_id IS NOT NULL
ORDER BY o.return_approved_at DESC;

-- ============================================
-- 4. DAMAGE REPORTS BY BORROWER
-- ============================================

-- Count damage reports per borrower
SELECT 
    u_borrower.id as borrower_id,
    u_borrower.name as borrower_name,
    u_borrower.email as borrower_email,
    u_borrower.trust_score as current_trust_score,
    COUNT(*) as damage_reports_count,
    COUNT(*) * 10 as total_points_deducted
FROM orders o
JOIN users u_borrower ON o.user_id = u_borrower.id
WHERE o.damage_reported = true
GROUP BY u_borrower.id, u_borrower.name, u_borrower.email, u_borrower.trust_score
ORDER BY damage_reports_count DESC;

-- View all damage reports for a specific borrower
-- Replace BORROWER_ID_HERE with actual borrower ID
SELECT 
    o.id as order_id,
    i.title as item_title,
    u_owner.name as owner_name,
    o.damage_description,
    o.damage_reported_at,
    o.return_approved_at
FROM orders o
JOIN items i ON o.item_id = i.id
JOIN users u_owner ON i.user_id = u_owner.id
WHERE o.user_id = 'BORROWER_ID_HERE'
  AND o.damage_reported = true
ORDER BY o.damage_reported_at DESC;

-- ============================================
-- 5. DAMAGE REPORTS BY ITEM OWNER
-- ============================================

-- Count damage reports per item owner
SELECT 
    u_owner.id as owner_id,
    u_owner.name as owner_name,
    COUNT(*) as damage_reports_filed
FROM orders o
JOIN items i ON o.item_id = i.id
JOIN users u_owner ON i.user_id = u_owner.id
WHERE o.damage_reported = true
GROUP BY u_owner.id, u_owner.name
ORDER BY damage_reports_filed DESC;

-- View all damage reports filed by a specific owner
-- Replace OWNER_ID_HERE with actual owner ID
SELECT 
    o.id as order_id,
    i.title as item_title,
    u_borrower.name as borrower_name,
    u_borrower.trust_score as borrower_trust_score,
    o.damage_description,
    o.damage_reported_at
FROM orders o
JOIN items i ON o.item_id = i.id
JOIN users u_borrower ON o.user_id = u_borrower.id
WHERE i.user_id = 'OWNER_ID_HERE'
  AND o.damage_reported = true
ORDER BY o.damage_reported_at DESC;

-- ============================================
-- 6. CHECK SPECIFIC ORDER DAMAGE STATUS
-- ============================================

-- Check damage status for a specific order
-- Replace ORDER_ID_HERE with actual order ID
SELECT 
    o.id as order_id,
    o.damage_reported,
    o.damage_description,
    o.damage_reported_at,
    o.return_status,
    o.return_approved_at,
    i.title as item_title,
    u_borrower.name as borrower_name,
    u_borrower.trust_score as borrower_trust_score,
    u_owner.name as owner_name
FROM orders o
LEFT JOIN items i ON o.item_id = i.id
LEFT JOIN users u_borrower ON o.user_id = u_borrower.id
LEFT JOIN users u_owner ON i.user_id = u_owner.id
WHERE o.id = 'ORDER_ID_HERE';

-- ============================================
-- 7. VERIFY TRUST SCORE AFTER DAMAGE REPORT
-- ============================================

-- Verify trust score was updated correctly after damage reports
SELECT 
    o.id as order_id,
    i.title as item_title,
    u.name as borrower_name,
    u.trust_score as current_trust_score,
    o.damage_reported,
    o.damage_reported_at,
    o.return_approved_at,
    -- Calculate expected trust score (assuming 10 points deducted per damage)
    (SELECT COUNT(*) FROM orders o2 WHERE o2.user_id = u.id AND o2.damage_reported = true) * 10 as expected_points_deducted
FROM orders o
JOIN items i ON o.item_id = i.id
JOIN users u ON o.user_id = u.id
WHERE o.damage_reported = true
ORDER BY o.damage_reported_at DESC;

-- ============================================
-- 8. DATA INTEGRITY CHECKS
-- ============================================

-- Find orders with damage reports but return not approved (data inconsistency)
SELECT 
    o.id as order_id,
    i.title as item_title,
    o.return_status,
    o.damage_reported,
    o.damage_reported_at,
    o.return_approved_at
FROM orders o
JOIN items i ON o.item_id = i.id
WHERE o.damage_reported = true
  AND (o.return_status != 'approved' OR o.return_status IS NULL)
  AND o.item_id IS NOT NULL;

-- Find orders with damage description but damage_reported = false
SELECT 
    o.id as order_id,
    i.title as item_title,
    o.damage_reported,
    o.damage_description
FROM orders o
JOIN items i ON o.item_id = i.id
WHERE o.damage_description IS NOT NULL
  AND o.damage_reported = false;

-- ============================================
-- 9. ANALYTICS
-- ============================================

-- Damage reports over time (daily)
SELECT 
    DATE(damage_reported_at) as report_date,
    COUNT(*) as damage_reports_count
FROM orders
WHERE damage_reported = true
  AND damage_reported_at IS NOT NULL
GROUP BY DATE(damage_reported_at)
ORDER BY report_date DESC;

-- Damage reports over time (monthly)
SELECT 
    DATE_TRUNC('month', damage_reported_at) as report_month,
    COUNT(*) as damage_reports_count
FROM orders
WHERE damage_reported = true
  AND damage_reported_at IS NOT NULL
GROUP BY DATE_TRUNC('month', damage_reported_at)
ORDER BY report_month DESC;

-- Most commonly damaged items (by category or title)
SELECT 
    i.category,
    i.title,
    COUNT(*) as damage_reports_count
FROM orders o
JOIN items i ON o.item_id = i.id
WHERE o.damage_reported = true
GROUP BY i.category, i.title
ORDER BY damage_reports_count DESC;

-- ============================================
-- 10. MANUAL DAMAGE REPORT OPERATIONS
-- ============================================

-- Manually add a damage report (use with caution)
-- Replace ORDER_ID_HERE, DESCRIPTION_HERE, and TIMESTAMP
-- UPDATE orders 
-- SET 
--     damage_reported = true,
--     damage_description = 'DESCRIPTION_HERE',
--     damage_reported_at = 'TIMESTAMP_HERE',
--     updated_at = NOW()
-- WHERE id = 'ORDER_ID_HERE';

-- Manually remove a damage report (use with caution)
-- UPDATE orders 
-- SET 
--     damage_reported = false,
--     damage_description = NULL,
--     damage_reported_at = NULL,
--     updated_at = NOW()
-- WHERE id = 'ORDER_ID_HERE';

-- ============================================
-- 11. TESTING QUERIES
-- ============================================

-- Find test orders: approved return, no damage report, can test damage reporting
SELECT 
    o.id as order_id,
    i.title as item_title,
    u_borrower.name as borrower_name,
    u_borrower.trust_score as borrower_trust_score_before,
    u_owner.name as owner_name,
    o.return_approved_at
FROM orders o
JOIN items i ON o.item_id = i.id
JOIN users u_borrower ON o.user_id = u_borrower.id
JOIN users u_owner ON i.user_id = u_owner.id
WHERE o.return_status = 'approved'
  AND o.damage_reported = false
  AND o.item_id IS NOT NULL
ORDER BY o.return_approved_at DESC
LIMIT 5;

