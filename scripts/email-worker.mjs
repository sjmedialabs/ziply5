import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

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
    if (!transporter) {
      console.info("[email:mock]", job.data.to, job.data.subject);
      return;
    }
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@ziply5.com",
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
    });
  },
  { connection: redis },
);

worker.on("ready", () => console.info("[email-worker] ready"));
worker.on("failed", (job, err) => console.error("[email-worker] failed", job?.id, err?.message));
