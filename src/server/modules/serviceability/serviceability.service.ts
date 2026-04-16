import { prisma } from "@/src/server/db/prisma"

export const checkPincodeServiceability = async (pincode: string, temperatureSensitive = false) => {
  const normalized = pincode.trim()
  const numeric = Number(normalized)
  const rules = await prisma.serviceabilityRule.findMany({
    where: {
      zone: { isActive: true },
      OR: [
        { pincodePrefix: { not: null } },
        { AND: [{ pincodeStart: { not: null } }, { pincodeEnd: { not: null } }] },
      ],
    },
    include: {
      zone: {
        include: {
          etaRules: { orderBy: { maxDays: "asc" }, take: 1 },
        },
      },
    },
    orderBy: [{ zone: { priority: "desc" } }],
  })

  const matched = rules.find((rule) => {
    if (rule.pincodePrefix && normalized.startsWith(rule.pincodePrefix)) return true
    if (Number.isFinite(numeric) && rule.pincodeStart != null && rule.pincodeEnd != null) {
      return numeric >= rule.pincodeStart && numeric <= rule.pincodeEnd
    }
    return false
  })

  if (!matched) {
    return {
      serviceable: false,
      codAvailable: false,
      eta: null as null | { minDays: number; maxDays: number },
      reason: "No matching serviceability rule",
    }
  }

  const etaRule = matched.zone.etaRules[0]
  if (!etaRule) {
    return {
      serviceable: matched.isServiceable,
      codAvailable: matched.codAvailable,
      eta: null as null | { minDays: number; maxDays: number },
      zone: matched.zone.name,
    }
  }

  const extra = temperatureSensitive ? etaRule.temperatureSensitiveExtraDays : 0
  return {
    serviceable: matched.isServiceable,
    codAvailable: matched.codAvailable,
    eta: {
      minDays: etaRule.minDays + extra,
      maxDays: etaRule.maxDays + extra,
    },
    zone: matched.zone.name,
  }
}
