import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import Redis from "ioredis";

//  FIXED Redis config
const redis = new Redis(
  process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  {
    maxRetriesPerRequest: null, //  REQUIRED
  }
);

console.info(" Email worker starting...");

const smtpReady =
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS;

const transporter = smtpReady
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const worker = new Worker(
  "email-queue",
  async (job) => {
    console.log(" Processing email:", job.data.to);

    if (!transporter) {
      console.info("[email:mock]", job.data.to, job.data.subject);
      return;
    }

    await transporter.sendMail({
      from:
        process.env.SMTP_FROM ??
        process.env.SMTP_USER ??
        "noreply@ziply5.com",
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
    });

    console.log(" Email sent:", job.data.to);
  },
  { connection: redis }
);

worker.on("ready", () =>
  console.info("[email-worker] ready")
);

worker.on("failed", (job, err) =>
  console.error(
    " [email-worker] failed",
    job?.id,
    err?.message
  )
);