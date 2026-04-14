import { env } from "@/src/server/core/config/env"

type SendSmsInput = {
  to: string
  body: string
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
      template_id: env.MSG91_TEMPLATE_ID,
      recipients: [{ mobiles: input.to.replace(/\D/g, ""), message: input.body }],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MSG91 send failed: ${res.status} ${text.slice(0, 120)}`)
  }
}

const sendMock = async (input: SendSmsInput) => {
  console.info("[sms:mock]", input.to, input.body)
}

export const smsService = {
  async send(input: SendSmsInput) {
    const provider = (env.SMS_PROVIDER ?? "mock").toLowerCase()
    if (provider === "twilio") return sendViaTwilio(input)
    if (provider === "msg91") return sendViaMsg91(input)
    return sendMock(input)
  },
}
