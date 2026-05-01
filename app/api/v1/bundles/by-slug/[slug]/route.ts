import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { getBundlePublicBySlug } from "@/src/server/modules/bundles/bundles.service"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const bundle = await getBundlePublicBySlug(slug)
    if (!bundle || bundle.isActive === false) return fail("Bundle not found", 404)
    return ok(bundle, "Bundle fetched")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to fetch bundle", 400)
  }
}
