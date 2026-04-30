export type MessageChannel = "email" | "sms" | "whatsapp"
export type MessagingProviderKey =
  | "resend"
  | "ses"
  | "sendgrid"
  | "smtp"
  | "twilio"
  | "msg91"
  | "textlocal"
  | "exotel"
  | "meta_whatsapp"
  | "interakt"
  | "gupshup"

export type SendMessageInput = {
  channel: MessageChannel
  to: string
  subject?: string
  text?: string
  html?: string
  templateKey?: string
  templateVars?: Record<string, string | number | boolean | null | undefined>
  metadata?: Record<string, unknown>
}

export type SendMessageResult = {
  provider: MessagingProviderKey
  providerMessageId?: string | null
  status: "queued" | "sent" | "failed"
  raw?: unknown
}

export interface MessagingProvider {
  key: MessagingProviderKey
  channels: MessageChannel[]
  send(input: SendMessageInput): Promise<SendMessageResult>
}

