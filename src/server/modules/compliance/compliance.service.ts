import { prisma } from "@/src/server/db/prisma"

export const getComplianceProfile = async (productId: string) => {
  return prisma.productComplianceProfile.findUnique({
    where: { productId },
    include: { certificates: { orderBy: { createdAt: "desc" } } },
  })
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
  return prisma.productComplianceProfile.upsert({
    where: { productId },
    update: {
      ingredients: input.ingredients ?? null,
      nutritionFacts: input.nutritionFacts === undefined ? undefined : (input.nutritionFacts as never),
      storageInstructions: input.storageInstructions ?? null,
      fssaiDetails: input.fssaiDetails ?? null,
      allergenInfo: input.allergenInfo ?? null,
      ingredientDeclaration: input.ingredientDeclaration ?? null,
      complianceState: input.complianceState ?? undefined,
      requiresColdChain: input.requiresColdChain ?? undefined,
      storageTempMin: input.storageTempMin ?? null,
      storageTempMax: input.storageTempMax ?? null,
    },
    create: {
      productId,
      ingredients: input.ingredients ?? null,
      nutritionFacts: input.nutritionFacts === undefined ? undefined : (input.nutritionFacts as never),
      storageInstructions: input.storageInstructions ?? null,
      fssaiDetails: input.fssaiDetails ?? null,
      allergenInfo: input.allergenInfo ?? null,
      ingredientDeclaration: input.ingredientDeclaration ?? null,
      complianceState: input.complianceState ?? "draft",
      requiresColdChain: input.requiresColdChain ?? false,
      storageTempMin: input.storageTempMin ?? null,
      storageTempMax: input.storageTempMax ?? null,
    },
    include: { certificates: true },
  })
}
