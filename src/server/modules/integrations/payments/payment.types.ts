export type PaymentGatewayKey = "razorpay" | "stripe" | "cashfree" | "payu" | "manual"

export type PaymentAttempt = {
  orderId: string
  amount: number
  currency: string
  customerEmail?: string | null
  customerPhone?: string | null
  metadata?: Record<string, unknown>
}

export type PaymentVerifyInput = {
  orderId: string
  payload: Record<string, unknown>
}

export type PaymentVerifyResult = {
  success: boolean
  provider: PaymentGatewayKey
  providerRef?: string | null
  raw?: unknown
}

export interface PaymentGatewayProvider {
  key: PaymentGatewayKey
  createPaymentAttempt(input: PaymentAttempt): Promise<{ providerOrderId: string; raw?: unknown }>
  verifyPayment(input: PaymentVerifyInput): Promise<PaymentVerifyResult>
}

