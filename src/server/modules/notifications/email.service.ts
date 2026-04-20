import { emailQueue } from "@/src/server/jobs/queue"

export type EmailJobPayload = {
  to: string
  subject: string
  html: string
}

export const enqueueEmail = async (payload: EmailJobPayload) => {
  try {
    await emailQueue.add("send-email", payload)
  } catch {
    // Non-blocking in app flow; worker/queue failures should not break requests.
  }
}

export const emailTemplates = {
  welcome: (name: string) => ({
    subject: "Welcome to Ziply5",
    html: `<p>Hi ${name},</p><p>Welcome to Ziply5. Your account is ready.</p>`,
  }),
  orderPlaced: (orderId: string) => ({
    subject: `Order placed: ${orderId.slice(0, 8)}`,
    html: `<p>Your order <strong>${orderId}</strong> has been placed successfully.</p>`,
  }),
  orderStatus: (orderId: string, status: string) => ({
    subject: `Order update: ${status}`,
    html: `<p>Your order <strong>${orderId}</strong> is now <strong>${status}</strong>.</p>`,
  }),
 adminCreated: (name: string, password: string, email: string) => ({
  subject: `Your Ziply5 Account Has Been Created 🎉`,

  html: `
  <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f8; padding: 20px;">
    
    <table align="center" width="600" cellpadding="0" cellspacing="0"
      style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <tr>
        <td style="background-color: #4f46e5; padding: 20px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0;">Welcome to Ziply5 🎉</h2>
          <p style="margin: 5px 0 0; font-size: 14px;">
            Your account is ready to use
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding: 30px;">
          
          <p style="font-size: 16px; margin-bottom: 10px;">
            Hi <strong>${name}</strong>,
          </p>

          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            An administrator has created an account for you on 
            <strong>Ziply5</strong>.  
            You can now log in using the credentials provided below.
          </p>

          <!-- Credentials Box -->
          <div style="
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          ">
            
            <p style="margin: 8px 0; font-size: 14px;">
              <strong>Email:</strong> ${email}
            </p>

            <p style="margin: 8px 0; font-size: 14px;">
              <strong>Password:</strong> ${password}
            </p>

          </div>

          <!-- Login Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://yourwebsite.com/login"
              style="
                background-color: #4f46e5;
                color: #ffffff;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                font-size: 14px;
                display: inline-block;
              ">
              Login to Your Account
            </a>
          </div>

          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
            🔐 <strong>Security Tip:</strong>  
            Please change your password after your first login to keep your account secure.
          </p>

          <p style="font-size: 14px; line-height: 1.6;">
            If you did not expect this email, please contact your administrator immediately.
          </p>

          <p style="font-size: 15px; margin-top: 25px;">
            Best regards,<br/>
            <strong>Ziply5 Team</strong>
          </p>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="
          background-color: #f9fafb;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        ">
          © ${new Date().getFullYear()} Ziply5. All rights reserved.
        </td>
      </tr>

    </table>

  </div>
  `,
}),
userStatusChanged: (name: string, status: string) => ({

  subject: `Your Account Status Has Been Updated – ${status.toUpperCase()}`,

  html: `
  <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f8; padding: 20px;">
    
    <table align="center" width="600" cellpadding="0" cellspacing="0"
      style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <tr>
        <td style="background-color: #4f46e5; padding: 20px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0;">Account Status Update</h2>
          <p style="margin: 5px 0 0; font-size: 14px;">
            Important information about your account
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding: 30px;">
          
          <p style="font-size: 16px;">
            Hi <strong>${name}</strong>,
          </p>

          <p style="font-size: 15px; line-height: 1.6;">
            Your account status has been updated by the administrator.
          </p>

          <!-- Status Box -->
          <div style="
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          ">
            <p style="margin: 0; font-size: 14px;">
              <strong>Current Status:</strong>
            </p>

            <p style="
              font-size: 18px;
              font-weight: bold;
              color: ${
                status === "active"
                  ? "#16a34a"
                  : status === "suspended"
                  ? "#dc2626"
                  : "#6b7280"
              };
              margin-top: 8px;
            ">
              ${status.toUpperCase()}
            </p>
          </div>

          ${
            status === "active"
              ? `
              <p style="font-size: 14px;">
                🎉 Your account is now active. You can log in and start using our services.
              </p>
              `
              : status === "suspended"
              ? `
              <p style="font-size: 14px;">
                ⚠️ Your account has been temporarily suspended. 
                Please contact support if you believe this is a mistake.
              </p>
              `
              : `
              <p style="font-size: 14px;">
                ❗ Your account has been marked as deleted. 
                If this was unexpected, please contact support immediately.
              </p>
              `
          }

          <p style="font-size: 14px; margin-top: 25px;">
            If you have any questions, please contact our support team.
          </p>

          <p style="font-size: 15px; margin-top: 25px;">
            Best regards,<br/>
            <strong>Ziply5 Team</strong>
          </p>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="
          background-color: #f9fafb;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        ">
          © ${new Date().getFullYear()} Ziply5. All rights reserved.
        </td>
      </tr>

    </table>

  </div>
  `,
}),
}
