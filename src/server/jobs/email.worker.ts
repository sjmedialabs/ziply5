import { Worker } from "bullmq"
import nodemailer from "nodemailer"
import { redis } from "@/src/server/db/redis"
import { env } from "@/src/server/core/config/env"
import type { EmailJobPayload } from "@/src/server/modules/notifications/email.service"

const transporter =
  env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT),
        secure: Number(env.SMTP_PORT) === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      })
    : null

export const emailWorker = new Worker<EmailJobPayload>(
  "email-queue",
  async (job) => {
    if (!transporter) {
      console.info("[email:mock]", job.data.to, job.data.subject)
      return
    }
    await transporter.sendMail({
      from: env.SMTP_FROM ?? env.SMTP_USER ?? "noreply@ziply5.com",
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
    })
  },
  { connection: redis },
)

emailWorker.on("failed", (job, err) => {
  console.error("[email:worker:failed]", job?.id, err?.message)
})
