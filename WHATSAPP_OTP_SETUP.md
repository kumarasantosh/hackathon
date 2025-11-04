# WhatsApp OTP Setup Guide

## Overview
The OTP system now supports sending verification codes via WhatsApp using Twilio's WhatsApp Business API.

## Setup Instructions

### 1. Twilio WhatsApp Setup

1. **Get Twilio Account**
   - Sign up at [twilio.com](https://www.twilio.com)
   - Get your Account SID and Auth Token from the dashboard

2. **Enable WhatsApp on Twilio**
   - Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message
   - Follow the setup wizard to get your WhatsApp number
   - Twilio provides a sandbox number like `whatsapp:+14155238886` for testing
   - For production, you need to get your WhatsApp Business Account approved

3. **Add Environment Variables**
   Add these to your `.env.local`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Twilio WhatsApp number (sandbox or approved)
   # OR use your regular number (it will add whatsapp: prefix automatically)
   TWILIO_PHONE_NUMBER=+1234567890  # Fallback SMS number
   ```

### 2. Testing with Twilio Sandbox

For testing, Twilio provides a sandbox number:
- **Sandbox Number**: `whatsapp:+14155238886`
- To test, users need to send "join [your-code]" to this number first
- Get your code from: Twilio Console → Messaging → Try it out → WhatsApp → Sandbox

### 3. Production Setup

For production use:

1. **Apply for WhatsApp Business API**
   - Go to Twilio Console → Messaging → Settings → WhatsApp sandbox settings
   - Click "Request WhatsApp Production Access"
   - Complete the Business Verification process
   - Once approved, you'll get a dedicated WhatsApp Business number

2. **Create Message Templates**
   - WhatsApp requires pre-approved message templates for outbound messages
   - Go to Twilio Console → Messaging → Content → Templates
   - Create an OTP template like:
     ```
     Your Neighbour Link verification code is {{1}}. Valid for 10 minutes.
     For your security, do not share this code with anyone.
     ```
   - Submit for approval (usually takes 24-48 hours)

3. **Update Code (if using templates)**
   If you want to use approved templates instead of free-form messages, update `lib/otp.ts`:
   ```typescript
   // Instead of Body, use:
   ContentSid: 'your_template_sid',
   ContentVariables: JSON.stringify({
     '1': otp
   })
   ```

### 4. Fallback to SMS

The system automatically falls back to SMS if WhatsApp fails:
- Ensure `TWILIO_PHONE_NUMBER` is set for SMS fallback
- The system will try WhatsApp first, then SMS if WhatsApp fails

### 5. Development Mode

Without Twilio configured:
- OTPs are logged to console for testing
- Shows "WhatsApp OTP (dev mode)" in logs
- Copy the OTP from console to verify

## How It Works

1. User enters phone number on verification page
2. System generates 6-digit OTP
3. OTP is stored in Supabase `otp_verifications` table
4. System sends OTP via WhatsApp using Twilio
5. If WhatsApp fails, automatically falls back to SMS
6. User enters OTP to verify
7. OTP is verified and deleted after successful verification

## Message Format

Current WhatsApp message format:
```
Your Neighbour Link verification code is: *123456*. Valid for 10 minutes.

For your security, do not share this code with anyone.
```

The `*` creates bold text in WhatsApp.

## Troubleshooting

### WhatsApp Not Working
1. Check if you're using sandbox (need to send "join" message first)
2. Verify `TWILIO_WHATSAPP_NUMBER` format: `whatsapp:+1234567890`
3. Check Twilio Console for error messages
4. Ensure WhatsApp is enabled on your Twilio account

### Fallback to SMS
- System automatically tries SMS if WhatsApp fails
- Check logs for "SMS OTP sent as fallback" message
- Ensure `TWILIO_PHONE_NUMBER` is configured

### Template Approval
- Free-form messages work in sandbox
- Production requires approved templates
- Template approval takes 24-48 hours
- Use sandbox for testing during development

## Cost Considerations

- **WhatsApp**: Twilio charges per message (check current pricing)
- **SMS**: Twilio charges per SMS (usually cheaper than WhatsApp)
- **Sandbox**: Free for testing (limited to sandbox numbers)

## Security Notes

- OTPs expire after 10 minutes
- Maximum 5 verification attempts
- OTPs are stored securely in Supabase
- OTPs are deleted after successful verification
- Phone numbers are normalized for consistency

