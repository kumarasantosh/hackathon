# Phone Verification Setup Guide

## Overview
The dashboard now includes phone number verification with OTP to verify user accounts. Users can verify their phone number to get a verified status badge.

## Setup Instructions

### 1. Database Migration
Run the SQL migration to add the phone number field:
```sql
-- Run this in your Supabase SQL Editor
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
```

### 2. Twilio Setup (Recommended)

1. **Create a Twilio Account**
   - Go to [twilio.com](https://www.twilio.com)
   - Sign up for a free trial account
   - Get your Account SID and Auth Token from the dashboard

2. **Get a Phone Number**
   - In Twilio Console, go to Phone Numbers → Buy a Number
   - Select a number (free trial includes $15 credit)
   - Copy the phone number

3. **Add Environment Variables**
   Add these to your `.env.local`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
   ```

### 3. Alternative OTP Services

If you prefer not to use Twilio, you can modify `lib/otp.ts` to use:

- **AWS SNS**: For SMS via AWS
- **MessageBird**: Alternative SMS provider
- **Vonage (Nexmo)**: Another SMS option
- **Resend SMS**: If Resend adds SMS support

### 4. Development Mode

Without Twilio configured, the system will:
- Log OTPs to console (dev mode)
- Still allow verification to work for testing
- You can copy the OTP from console logs

### 5. How It Works

1. User clicks "Verify Phone Number" on dashboard
2. Enters phone number with country code (e.g., +91 9876543210)
3. Receives 6-digit OTP via SMS
4. Enters OTP to verify
5. Account status updates to "Verified"
6. Phone number is saved to user profile

### 6. Security Features

- OTP expires after 10 minutes
- Maximum 5 verification attempts
- OTPs are stored securely (in-memory for now, use Redis in production)
- Phone number validation before sending

## Testing

1. Start the app: `npm run dev`
2. Go to Dashboard
3. Click "Verify Phone Number" on the verification card
4. Enter phone number (use a test number if using Twilio trial)
5. Check console/logs for OTP (if in dev mode)
6. Enter OTP to complete verification

## Production Recommendations

1. **Use Redis** for OTP storage instead of in-memory
2. **Rate limiting** on OTP requests (prevent abuse)
3. **Phone number formatting** validation per country
4. **Monitoring** for failed SMS deliveries
5. **Cost tracking** for SMS usage

