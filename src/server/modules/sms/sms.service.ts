import { env } from "@/src/server/core/config/env"
import { pgQuery } from "@/src/server/db/pg"
import util from "util"

export type SmsTemplateKey =
  | "PASSWORD_RESET"
  | "PAYMENT_CONFIRM"
  | "OTP_VERIFY"
  | "WELCOME"
  | "ORDER_PAID"
  | "LOGIN_OTP"
  | "ORDER_CONFIRM"
  | "ORDER_CANCEL"

const DLT_CONFIG: Record<SmsTemplateKey, { id?: string; msg?: string }> = {
  PASSWORD_RESET: { id: env.DLT_PASSWORD_RESET_ID, msg: env.DLT_PASSWORD_RESET_MSG },
  PAYMENT_CONFIRM: { id: env.DLT_TRANSACTION_ID, msg: env.DLT_TRANSACTION_MSG },
  OTP_VERIFY: { id: env.DLT_REG_OTP_ID, msg: env.DLT_REG_OTP_MSG },
  WELCOME: { id: env.DLT_WELCOME_ID, msg: env.DLT_WELCOME_MSG },
  ORDER_PAID: { id: env.DLT_PAYMENT_ID, msg: env.DLT_PAYMENT_MSG },
  LOGIN_OTP: { id: env.DLT_LOGIN_OTP_ID, msg: env.DLT_LOGIN_OTP_MSG },
  ORDER_CONFIRM: { id: env.DLT_ORDER_CONFIRM_ID, msg: env.DLT_ORDER_CONFIRM_MSG },
  ORDER_CANCEL: { id: env.DLT_ORDER_CANCEL_ID, msg: env.DLT_ORDER_CANCEL_MSG },
}

type SendSmsOptions = {
  mobile: string
  templateKey: SmsTemplateKey
  variables: string[]
  body?: string // Optional now, will use DLT_MSG if available
}

export const smsService = {
  async send({ mobile, templateKey, variables, body }: SendSmsOptions) {
    console.log(`[SMS SERVICE ENTRY] Template: ${templateKey}, To: ${mobile}`)
    const config = DLT_CONFIG[templateKey]
    const templateId = config?.id || env[`SMS_TEMPLATE_${templateKey}` as keyof typeof env] as string
    
    // Auto-format body if template msg exists
    let finalBody = body || ""
    if (config?.msg) {
      finalBody = util.format(config.msg, ...variables)
    }

    console.log(`[SMS] Sending to ${mobile}: Template ${templateKey} (${templateId}), Body: "${finalBody}"`)

    const provider = (env.SMS_PROVIDER ?? "mock").toLowerCase()
    
    let status = "sent"
    let providerResponse = ""

    try {
      if (provider === "mock") {
        console.info(`[SMS MOCK] To: ${mobile}, Template: ${templateKey}, Body: ${finalBody}`)
        providerResponse = "MOCK_SUCCESS"
      } else {
        providerResponse = await this.dispatchViaProvider(mobile, finalBody, templateId)
      }
    } catch (err) {
      status = "failed"
      providerResponse = err instanceof Error ? err.message : String(err)
      console.error(`[SMS ERROR] To: ${mobile}`, err)
    }

    // Audit Log
    await pgQuery(
      `INSERT INTO sms_logs (mobile, template, payload, status, provider_response) VALUES ($1, $2, $3, $4, $5)`,
      [mobile, templateKey, JSON.stringify({ variables, body: finalBody }), status, providerResponse]
    ).catch(e => console.error("Failed to log SMS", e))

    if (status === "failed") throw new Error(`SMS delivery failed: ${providerResponse}`)
    return { status, providerResponse }
  },


  formatMobile(mobile: string) {
    const d = mobile.replace(/\D/g, "")
    if (d.length === 10) return `91${d}`
    return d
  },

  async dispatchViaProvider(mobile: string, body: string, templateId?: string) {
    const provider = (env.SMS_PROVIDER ?? "mock").toLowerCase()
    if (provider === "twilio") return this.sendViaTwilio(mobile, body)
    if (provider === "msg91") return this.sendViaMsg91(mobile, body, templateId)
    return this.sendViaGeneric(mobile, body, templateId)
  },

  async sendViaTwilio(mobile: string, body: string) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.SMTP_FROM) { // Using SMTP_FROM as placeholder for From number if not set
      throw new Error("Twilio credentials missing")
    }
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")
    const params = new URLSearchParams({ To: mobile, From: env.SMS_FROM || "", Body: body })
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    })
    return res.text()
  },

  async sendViaMsg91(mobile: string, body: string, templateId?: string) {
    if (!env.MSG91_AUTH_KEY) throw new Error("MSG91 auth key missing")
    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { authkey: env.MSG91_AUTH_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: templateId || env.MSG91_TEMPLATE_ID,
        recipients: [{ mobiles: mobile.replace(/\D/g, ""), message: body }],
      }),
    })
    return res.text()
  },

  async sendViaGeneric(mobile: string, body: string, templateId?: string) {
    const username = env.SMS_USERNAME
    const apikey = env.SMS_API_KEY
    const senderid = env.SMS_SENDER_ID
    const baseUrl = env.SMS_BASE_URL || (process.env as any).SMS_API_URL || "http://sms.vyaapsms.com/api/v2/sms/send"

    if (!username || !apikey || !senderid) {
      throw new Error("SMS provider credentials missing")
    }

    const params = new URLSearchParams({
      username,
      apikey,
      senderid,
      mobile: this.formatMobile(mobile),
      message: body,
      ...(templateId ? { templateid: templateId } : {}),
    })

    const res = await fetch(`${baseUrl}?${params.toString()}`, { method: "GET" })
    const text = await res.text()

    console.log(`[SMS Gateway Response] Status: ${res.status}, Body: "${text}"`)

    if (!res.ok) {
      throw new Error(`Gateway Error ${res.status}: ${text.slice(0, 100)}`)
    }
    return text
  },
}

