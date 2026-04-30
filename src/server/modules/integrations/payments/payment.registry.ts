import type { PaymentGatewayKey, PaymentGatewayProvider } from "./payment.types"

// Note: concrete providers can live in `src/server/modules/integrations/payments/providers/*`
// and be wired here without changing any commerce logic.
const providers: PaymentGatewayProvider[] = []

export const registerPaymentProvider = (provider: PaymentGatewayProvider) => {
  if (providers.some((p) => p.key === provider.key)) return
  providers.push(provider)
}

export const getPaymentProvider = (key: PaymentGatewayKey): PaymentGatewayProvider | null => {
  return providers.find((p) => p.key === key) ?? null
}

export const listPaymentProviders = () => providers.map((p) => ({ key: p.key }))

