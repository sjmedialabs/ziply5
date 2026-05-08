import crypto from "node:crypto"
import { redis } from "@/src/server/core/redis/client"
import { pgQuery } from "@/src/server/db/pg"
import { smsService, SmsTemplateKey } from "../sms/sms.service"

export type OtpPurpose = "REGISTER" | "LOGIN" | "RESET_PASSWORD" | "TRANSACTION"

const OTP_CONFIG = {
  expirySec: 300, // 5 minutes
  maxVerifyAttempts: 5,
  maxResendAttempts: 3,
  resendCooldownSec: 60,
  codeLength: 6,
}

const sha256 = (val: string) => crypto.createHash("sha256").update(val).digest("hex")

export const otpService = {
  async generate(mobile: string, purpose: OtpPurpose) {
    // 1. Rate Limit Check
    await this.checkRateLimits(mobile, purpose)

    // 2. Generate Code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const hash = sha256(code)
    const expiresAt = new Date(Date.now() + OTP_CONFIG.expirySec * 1000)

    // 3. Store in Redis for fast access/expiry
    const redisKey = `otp:${mobile}:${purpose}`
    console.log(`[Redis] Attempting SET for key: ${redisKey}`);
    await redis.set(redisKey, JSON.stringify({ hash, attempts: 0 }), "EX", OTP_CONFIG.expirySec)

    // 4. Audit Log in DB
    await pgQuery(
      `INSERT INTO otp_requests (mobile, purpose, otp_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      [mobile, purpose, hash, expiresAt]
    )

    // 5. Track Resend for Cooldown
    await redis.set(`otp_resend_cooldown:${mobile}`, "1", "EX", OTP_CONFIG.resendCooldownSec)
    await redis.incr(`otp_resend_count:${mobile}:${purpose}`)
    await redis.expire(`otp_resend_count:${mobile}:${purpose}`, 3600) // Clear count after 1 hour

    return code
  },

  async verify(mobile: string, purpose: OtpPurpose, code: string) {
    const redisKey = `otp:${mobile}:${purpose}`
    console.log(`[Redis] Attempting GET for key: ${redisKey}`);
    const dataRaw = await redis.get(redisKey)
    
    if (!dataRaw) {
      console.warn(`[Redis] Key not found or expired: ${redisKey}`);
      throw new Error("OTP expired or not found")
    }

    const data = JSON.parse(dataRaw) as { hash: string; attempts: number }

    if (data.attempts >= OTP_CONFIG.maxVerifyAttempts) {
      await redis.del(redisKey)
      throw new Error("Maximum verification attempts exceeded")
    }

    const isMatch = data.hash === sha256(code.trim())

    if (!isMatch) {
      data.attempts += 1
      await redis.set(redisKey, JSON.stringify(data), "KEEPTTL")
      throw new Error(`Invalid OTP. ${OTP_CONFIG.maxVerifyAttempts - data.attempts} attempts remaining.`)
    }

    // Success
    await redis.del(redisKey)
    await pgQuery(
      `UPDATE otp_requests SET verified = true 
       WHERE id = (
         SELECT id FROM otp_requests 
         WHERE mobile = $1 AND purpose = $2 AND verified = false 
         ORDER BY created_at DESC LIMIT 1
       )`,
      [mobile, purpose]
    )

    return true
  },

  async checkRateLimits(mobile: string, purpose: OtpPurpose) {
    // Cooldown check
    const cooldown = await redis.get(`otp_resend_cooldown:${mobile}`)
    if (cooldown) {
      const ttl = await redis.ttl(`otp_resend_cooldown:${mobile}`)
      throw new Error(`Please wait ${ttl}s before requesting another OTP`)
    }

    // Daily/Hourly limit
    const resendCount = await redis.get(`otp_resend_count:${mobile}:${purpose}`)
    if (resendCount && Number(resendCount) >= OTP_CONFIG.maxResendAttempts) {
      throw new Error("Maximum resend attempts reached for this hour")
    }
  }
}
