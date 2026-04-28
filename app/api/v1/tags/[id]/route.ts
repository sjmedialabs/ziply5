import { NextRequest } from "next/server";
import { fail, ok } from "@/src/server/core/http/response";
import { requireAuth } from "@/src/server/middleware/auth";
import { requirePermission } from "@/src/server/middleware/rbac";
import { getSupabaseAdmin } from "@/src/lib/supabase/admin";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const auth = requireAuth(req);
  if ("status" in auth) return auth;

  const denied = requirePermission(auth.user.role, "tags.edit");
  if (denied) return denied;

  try {
    const { id } = params;
    const json = await req.json();
    const client = getSupabaseAdmin();
    const tables = ["Tag", "tags"];
    let updated: Record<string, unknown> | null = null;
    for (const table of tables) {
      const { data: existing, error: readError } = await client.from(table).select("*").eq("id", id).maybeSingle();
      if (readError) continue;
      if (!existing) return fail("Tag not found", 404);
      const patch = {
        ...(json.name !== undefined ? { name: String(json.name) } : {}),
        ...(json.slug !== undefined ? { slug: String(json.slug).trim().toLowerCase().replace(/\s+/g, "-") } : {}),
        ...(json.isActive !== undefined ? { isActive: Boolean(json.isActive) } : {}),
      };
      const { data, error } = await client.from(table).update(patch).eq("id", id).select("*").maybeSingle();
      if (!error && data) {
        updated = data as Record<string, unknown>;
        break;
      }
    }
    if (!updated) return fail("Failed to update tag", 500);
    return ok(updated, "Tag updated");
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Failed to update tag";
    // Postgres unique violations usually surface as 23505 in PostgREST.
    if (String((error as any)?.code ?? "").includes("23505")) {
      return fail("A tag with this name or slug already exists", 409);
    }
    return fail(message, 500);
  }
}