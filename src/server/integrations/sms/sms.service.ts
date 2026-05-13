import { env } from "@/src/server/core/config/env"

type SendSmsInput = {
  to: string
  body: string
  templateId?: string
}

const sendViaTwilio = async (input: SendSmsInput) => {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.SMS_FROM) {
    throw new Error("Twilio env missing")
  }
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")
  const params = new URLSearchParams({
    To: input.to,
    From: env.SMS_FROM,
    Body: input.body,
  })
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Twilio send failed: ${res.status} ${text.slice(0, 120)}`)
  }
}

const sendViaMsg91 = async (input: SendSmsInput) => {
  if (!env.MSG91_AUTH_KEY) throw new Error("MSG91 env missing")
  const res = await fetch("https://api.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      authkey: env.MSG91_AUTH_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: input.templateId ?? env.MSG91_TEMPLATE_ID,
      recipients: [{ mobiles: input.to.replace(/\D/g, ""), message: input.body }],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MSG91 send failed: ${res.status} ${text.slice(0, 120)}`)
  }
}

const sendViaVyaap = async (input: SendSmsInput) => {
  if (!env.SMS_USERNAME || !env.SMS_API_KEY || !env.SMS_SENDER_ID) {
    throw new Error("SMS gateway env missing (USERNAME, API_KEY, or SENDER_ID)")
  }
  
  // Use SMS_BASE_URL or fallback to SMS_API_URL or the hardcoded default
  const baseUrl = env.SMS_BASE_URL || (process.env as any).SMS_API_URL || "http://sms.vyaapsms.com/api/v2/sms/send"
  
  const params = new URLSearchParams({
    username: env.SMS_USERNAME,
    apikey: env.SMS_API_KEY,
    senderid: env.SMS_SENDER_ID,
    mobile: (() => {
      const d = input.to.replace(/\D/g, "")
      if (d.length === 10) return `91${d}`
      return d
    })(),
    message: input.body,
    ...(input.templateId ? { templateid: input.templateId } : {}),
  })

  const fullUrl = `${baseUrl}?${params.toString()}`
  console.log("[sms:vyaap] Sending to:", input.to, "Template:", input.templateId)
  // console.log("[sms:vyaap] Request URL:", fullUrl) // Masked for security but useful for local debug if enabled

  try {
    const res = await fetch(fullUrl, {
      method: "GET",
    })

    const text = await res.text()
    console.log("[sms:vyaap] Response:", text)

    if (!res.ok) {
      throw new Error(`SMS gateway returned ${res.status}: ${text.slice(0, 100)}`)
    }
  } catch (error) {
    console.error("[sms:vyaap] Error:", error)
    throw error
  }
}

const sendMock = async (input: SendSmsInput) => {
  console.info("[sms:mock]", input.to, input.body, input.templateId ? `(template: ${input.templateId})` : "")
}

export const smsService = {
  async send(input: SendSmsInput) {
    const provider = (env.SMS_PROVIDER ?? "mock").toLowerCase()
    if (provider === "twilio") return sendViaTwilio(input)
    if (provider === "msg91") return sendViaMsg91(input)
    if (provider === "vyaap" || provider === "custom" || provider === "smslogin") return sendViaVyaap(input)
    return sendMock(input)
  },
}
