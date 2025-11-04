/**
 * Email notification service
 * Supports Resend (recommended) and fallback to console logging
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  // If Resend API key is not set, log to console (for development)
  if (!apiKey) {
    console.log("📧 Email (dev mode):", {
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true; // Return true for dev mode
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Neighbour Link <noreply@neighbourlink.app>",
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Email sending failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

export function generateRequestEmailHTML(
  requesterName: string,
  itemTitle: string,
  itemOwnerName: string,
  message?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3399cc; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 10px 20px; background: #3399cc; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Neighbour Link</h1>
        </div>
        <div class="content">
          <h2>New Item Request</h2>
          <p>Hello ${itemOwnerName},</p>
          <p><strong>${requesterName}</strong> has requested your item: <strong>${itemTitle}</strong></p>
          ${message ? `<p><em>"${message}"</em></p>` : ""}
          <p>Please log in to your dashboard to approve or reject this request.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard" class="button">View Dashboard</a>
          <p>Best regards,<br>The Neighbour Link Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

