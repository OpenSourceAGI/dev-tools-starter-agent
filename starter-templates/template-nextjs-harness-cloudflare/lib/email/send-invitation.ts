"use server";

import { Resend } from "resend";

export async function sendTeamInvitationEmail(
  email: string,
  teamName: string,
  inviterId: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const signupUrl = `${appUrl}/auth/signup?email=${encodeURIComponent(email)}`;

  // If no Resend API key is configured, just log the invitation
  if (!process.env.RESEND_API_KEY) {
    console.log(`
      ============================================
      TEAM INVITATION (Email not configured)
      ============================================
      To: ${email}
      Team: ${teamName}
      Signup URL: ${signupUrl}
      ============================================
    `);
    return { success: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@yourdomain.com",
      to: email,
      subject: `You've been invited to join ${teamName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Team Invitation</h1>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">You've been invited!</h2>

              <p style="font-size: 16px; color: #555;">
                You've been invited to join the team <strong>${teamName}</strong>.
              </p>

              <p style="font-size: 16px; color: #555;">
                To accept this invitation, you'll need to create an account first.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Sign Up & Join Team
                </a>
              </div>

              <p style="font-size: 14px; color: #888; margin-top: 30px;">
                This invitation will expire in 7 days.
              </p>

              <p style="font-size: 14px; color: #888;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw error;
  }
}
