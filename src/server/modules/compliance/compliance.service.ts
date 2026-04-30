import { pgQuery } from "@/src/server/db/pg"
import { randomUUID } from "crypto"

export const getComplianceProfile = async (productId: string) => {
  const [profileRows, certs] = await Promise.all([
    pgQuery<Array<Record<string, unknown>>>(`SELECT * FROM "ProductComplianceProfile" WHERE "productId" = $1 LIMIT 1`, [productId]),
    pgQuery<Array<Record<string, unknown>>>(
      `SELECT * FROM "ComplianceCertificate" WHERE "productId" = $1 ORDER BY "createdAt" DESC`,
      [productId],
    ).catch(() => []),
  ])
  const profile = profileRows[0]
  if (!profile) return null
  return { ...profile, certificates: certs }
}

export const upsertComplianceProfile = async (
  productId: string,
  input: {
    ingredients?: string | null
    nutritionFacts?: unknown
    storageInstructions?: string | null
    fssaiDetails?: string | null
    allergenInfo?: string | null
    ingredientDeclaration?: string | null
    complianceState?: string
    requiresColdChain?: boolean
    storageTempMin?: number | null
    storageTempMax?: number | null
  },
) => {
  const rows = await pgQuery<Array<Record<string, unknown>>>(
    `
      INSERT INTO "ProductComplianceProfile" (
        id, "productId", ingredients, "nutritionFacts", "storageInstructions", "fssaiDetails",
        "allergenInfo", "ingredientDeclaration", "complianceState", "requiresColdChain", "storageTempMin", "storageTempMax",
        "createdAt", "updatedAt"
      )
      VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,now(),now())
      ON CONFLICT ("productId") DO UPDATE SET
        ingredients = EXCLUDED.ingredients,
        "nutritionFacts" = EXCLUDED."nutritionFacts",
        "storageInstructions" = EXCLUDED."storageInstructions",
        "fssaiDetails" = EXCLUDED."fssaiDetails",
        "allergenInfo" = EXCLUDED."allergenInfo",
        "ingredientDeclaration" = EXCLUDED."ingredientDeclaration",
        "complianceState" = EXCLUDED."complianceState",
        "requiresColdChain" = EXCLUDED."requiresColdChain",
        "storageTempMin" = EXCLUDED."storageTempMin",
        "storageTempMax" = EXCLUDED."storageTempMax",
        "updatedAt" = now()
      RETURNING *
    `,
    [
      randomUUID(),
      productId,
      input.ingredients ?? null,
      JSON.stringify(input.nutritionFacts ?? null),
      input.storageInstructions ?? null,
      input.fssaiDetails ?? null,
      input.allergenInfo ?? null,
      input.ingredientDeclaration ?? null,
      input.complianceState ?? "draft",
      input.requiresColdChain ?? false,
      input.storageTempMin ?? null,
      input.storageTempMax ?? null,
    ],
  )
  const certs = await pgQuery<Array<Record<string, unknown>>>(
    `SELECT * FROM "ComplianceCertificate" WHERE "productId" = $1 ORDER BY "createdAt" DESC`,
    [productId],
  ).catch(() => [])
  return { ...rows[0], certificates: certs }
}
