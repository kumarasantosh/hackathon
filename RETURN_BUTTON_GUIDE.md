# Return Button Location Guide

## Where to Find the Return Button

The return button appears in **2 locations**:

### 1. Orders List Page (`/orders`)
- Go to: **Orders** page from dashboard
- The button appears on each **item order card** (not service orders)
- Location: Below the "View Item" and "View Details" buttons

### 2. Order Details Page (`/orders/[id]`)
- Go to: Click "View Details" on any order
- The button appears at the bottom of the order details
- Location: Above the "Back to Orders" and "Back to Dashboard" buttons

## Requirements for Button to Appear

The return button **only shows** when **ALL** of these conditions are met:

1. ✅ Order is an **item order** (not a service order)
2. ✅ Order status is **"completed"** (payment completed)
3. ✅ Today is the **last booking date** (the exact last day, not before or after)
4. ✅ Return status is **null** (not already "pending" or "approved")
5. ✅ Booking dates exist for the order

## Step 1: Run the Migration

**IMPORTANT**: You must run the migration first in Supabase SQL Editor:

```sql
-- Copy and run this in Supabase SQL Editor
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT NULL CHECK (return_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS return_approved_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_return_status ON orders(return_status) WHERE return_status IS NOT NULL;
```

Or run the entire migration file:
```bash
# Copy contents of supabase/migrations_add_return_status.sql
# Paste in Supabase SQL Editor and run
```

## Step 2: Verify Your Order Meets Requirements

1. **Check if order is completed:**
   - Go to `/orders` page
   - Look for orders with status "completed"
   - Only completed orders can be returned

2. **Check booking dates:**
   - The order must have booking dates
   - Today must be the **last booking date** (exact match)

3. **Check if return already requested:**
   - If `return_status` is "pending" → Shows "Return request pending" message
   - If `return_status` is "approved" → Shows "Return approved" message
   - If `return_status` is null → Button should appear on last day

## Testing the Flow

1. **Create a test order:**
   - Create an item
   - Request it with booking dates
   - Pay for it (order becomes "completed")

2. **Wait for the last booking date:**
   - The button only appears on the **exact last booking date**
   - Not before, not after

3. **Click "Return Item":**
   - Button should be visible on the last day
   - Clicking it sends a return request to the owner

4. **Owner approves:**
   - Owner sees pending return in `/dashboard/requests?type=received`
   - Owner clicks "Approve Return & Refund Deposit"
   - Security deposit is refunded to borrower

## Troubleshooting

### Button Not Showing?

1. **Run the migration** (see Step 1 above)
2. **Check order status** - must be "completed"
3. **Check today's date** - must match the last booking date exactly
4. **Check browser console** - look for any errors
5. **Refresh the page** - after running migration

### Button Appears But Not Working?

1. Check browser console for errors
2. Verify API endpoint is accessible: `/api/orders/[id]/return`
3. Check network tab for failed requests

### Need to Test Before Last Date?

You can temporarily modify the date check in:
- `app/orders/page.tsx` (line ~168)
- `app/orders/[id]/page.tsx` (line ~172)

Change from:
```typescript
return today.getTime() === lastDate.getTime();
```

To (for testing):
```typescript
return today.getTime() >= lastDate.getTime(); // Allow on or after last date
```

**Remember to revert this for production!**

