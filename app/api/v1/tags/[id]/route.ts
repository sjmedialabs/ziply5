import { NextRequest } from "next/server";
import { prisma } from "@/src/server/db/prisma";
import { fail, ok } from "@/src/server/core/http/response";
import { requireAuth } from "@/src/server/middleware/auth";
import { requirePermission } from "@/src/server/middleware/rbac";
import { updateTag } from "@/src/server/modules/extended/extended.service";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    console.log("[TAG_UPDATE]", { id: params.id });
  const auth = requireAuth(req);
  if ("status" in auth) return auth;

  const denied = requirePermission(auth.user.role, "tags.edit");
  if (denied) return denied;

  try {
    const { id } = params;
    const json = await req.json();
    console.log("[TAG_UPDATE_PAYLOAD]", { id, ...json });
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) return fail("Tag not found", 404);
    console.log("[TAG_UPDATE_EXISTING]", existing);
    const updated = await updateTag(
      id,
      json.name ?? existing.name,
      json.slug ?? existing.slug,
      json.isActive !== undefined ? Boolean(json.isActive) : existing.isActive
    );
    console.log("[TAG_UPDATE_UPDATED]", updated);
    return ok(updated, "Tag updated");
  } catch (error: any) {
    console.error("[TAG_UPDATE_ERROR]", error);
    const isUniqueError = error.code === "P2002";
    return fail(
      isUniqueError ? "A tag with this name or slug already exists" : "Failed to update tag",
      isUniqueError ? 409 : 500
    );
  }
}