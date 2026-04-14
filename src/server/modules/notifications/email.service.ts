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
}
