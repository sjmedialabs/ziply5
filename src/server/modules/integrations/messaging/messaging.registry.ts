import type { MessageChannel, MessagingProvider, MessagingProviderKey } from "./messaging.types"

const providers: MessagingProvider[] = []

export const registerMessagingProvider = (provider: MessagingProvider) => {
  if (providers.some((p) => p.key === provider.key)) return
  providers.push(provider)
}

export const listMessagingProviders = () => providers.map((p) => ({ key: p.key, channels: p.channels }))

export const getMessagingProvider = (key: MessagingProviderKey) => providers.find((p) => p.key === key) ?? null

export const pickProviderForChannel = (channel: MessageChannel) =>
  providers.find((p) => p.channels.includes(channel)) ?? null

