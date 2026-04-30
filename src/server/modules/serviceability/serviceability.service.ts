import { pgQuery } from "@/src/server/db/pg"

export const checkPincodeServiceability = async (pincode: string, temperatureSensitive = false) => {
  const normalized = pincode.trim()
  const numeric = Number(normalized)
  const rules = await pgQuery<
    Array<{
      id: string
      pincodePrefix: string | null
      pincodeStart: number | null
      pincodeEnd: number | null
      isServiceable: boolean
      codAvailable: boolean
      zone_name: string
      minDays: number | null
      maxDays: number | null
      temperatureSensitiveExtraDays: number | null
      zone_priority: number
    }>
  >(
    `
      SELECT
        r.id,
        r."pincodePrefix",
        r."pincodeStart",
        r."pincodeEnd",
        r."isServiceable",
        r."codAvailable",
        z.name as zone_name,
        z.priority as zone_priority,
        er."minDays",
        er."maxDays",
        er."temperatureSensitiveExtraDays"
      FROM "ServiceabilityRule" r
      INNER JOIN "ServiceabilityZone" z ON z.id = r."zoneId"
      LEFT JOIN LATERAL (
        SELECT "minDays", "maxDays", "temperatureSensitiveExtraDays"
        FROM "ServiceabilityEtaRule"
        WHERE "zoneId" = z.id
        ORDER BY "maxDays" ASC
        LIMIT 1
      ) er ON true
      WHERE z."isActive" = true
        AND (r."pincodePrefix" IS NOT NULL OR (r."pincodeStart" IS NOT NULL AND r."pincodeEnd" IS NOT NULL))
      ORDER BY z.priority DESC
    `,
  )

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

  const etaRule = matched.minDays != null && matched.maxDays != null ? matched : null
  if (!etaRule) {
    return {
      serviceable: matched.isServiceable,
      codAvailable: matched.codAvailable,
      eta: null as null | { minDays: number; maxDays: number },
      zone: matched.zone_name,
    }
  }

  const extra = temperatureSensitive ? Number(etaRule.temperatureSensitiveExtraDays ?? 0) : 0
  return {
    serviceable: matched.isServiceable,
    codAvailable: matched.codAvailable,
    eta: {
      minDays: Number(etaRule.minDays ?? 0) + extra,
      maxDays: Number(etaRule.maxDays ?? 0) + extra,
    },
    zone: matched.zone_name,
  }
}
