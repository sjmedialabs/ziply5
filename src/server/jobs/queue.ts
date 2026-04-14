import { Queue } from "bullmq"
import { redis } from "@/src/server/db/redis"

export const emailQueue = new Queue("email-queue", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: true,
  },
})

export const notificationQueue = new Queue("notification-queue", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: true,
  },
})
