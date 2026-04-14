import { Queue } from "bullmq"
import { env } from "@/src/server/core/config/env"
import { redis } from "@/src/server/db/redis"

const defaultJobOptions = {
  attempts: 3,
  removeOnComplete: true,
}

let emailQueueImpl: Queue | null = null
let notificationQueueImpl: Queue | null = null

const getEmailQueue = () => {
  if (!env.REDIS_URL) return null
  if (!emailQueueImpl) {
    emailQueueImpl = new Queue("email-queue", {
      connection: redis,
      defaultJobOptions,
    })
  }
  return emailQueueImpl
}

const getNotificationQueue = () => {
  if (!env.REDIS_URL) return null
  if (!notificationQueueImpl) {
    notificationQueueImpl = new Queue("notification-queue", {
      connection: redis,
      defaultJobOptions,
    })
  }
  return notificationQueueImpl
}

export const emailQueue = {
  async add(name: string, data: unknown) {
    const queue = getEmailQueue()
    if (!queue) return null
    return queue.add(name, data)
  },
}

export const notificationQueue = {
  async add(name: string, data: unknown) {
    const queue = getNotificationQueue()
    if (!queue) return null
    return queue.add(name, data)
  },
}
