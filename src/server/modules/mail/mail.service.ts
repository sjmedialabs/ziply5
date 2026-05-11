import nodemailer from "nodemailer";
import { env } from "@/src/server/core/config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT || "587"),
  secure: env.SMTP_PORT === "465",
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const mailService = {
  async send({
    to,
    subject,
    text,
    html,
  }: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) {
    if (!env.SMTP_HOST || !env.SMTP_USER) {
      console.warn("[Mail Service] SMTP credentials missing. Mail skipped.");
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to,
        subject,
        text,
        html,
      });
      return info;
    } catch (error) {
      console.error("[Mail Service] Failed to send email:", error);
      throw error;
    }
  },

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5001"}/reset-password?token=${token}`;
    
    await this.send({
      to: email,
      subject: "Reset your password - Ziply5",
      text: `You requested a password reset. Please use the following link to reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #7B3010;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested to reset your password for your Ziply5 account. Click the button below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #FFC222; color: #7B3010; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you did not request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">Team Ziply5</p>
        </div>
      `,
    });
  }
};
