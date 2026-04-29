import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic"; // Ensure API is never statically cached

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const parentState = searchParams.get("parentState");

    let locations: { label: string; value: string }[] = [];
    const client = getSupabaseAdmin();

    if (type === "warehouse") {
      const { data: rows, error } = await client.from("Warehouse").select("id,name").order("name", { ascending: true });
      if (error) throw new Error(`Failed to fetch warehouses. DB Error: ${error.message}`);
      locations = rows.map((w) => ({ label: String((w as any).name ?? ""), value: String((w as any).id ?? "") })).filter((x) => x.label && x.value);
    } else if (type === "state") {
      const { data: rows, error } = await client.from("Setting").select("key,valueJson").eq("group", "STATES").order("key", { ascending: true });
      if (error) throw new Error(`Failed to fetch states. DB Error: ${error.message}`);

      locations = rows.map((s) => {
        const val = (s as any).valueJson as Record<string, unknown> | null;
        const key = String((s as any).key ?? "");
        return { label: key, value: String((val as any)?.value || key) };
      }).filter((x) => x.label && x.value);
    } else if (type === "city") {
      const { data, error } = await client.from("Setting").select("key,valueJson").eq("group", "CITIES").order("key", { ascending: true });
      if (error) throw new Error(`Failed to fetch cities. DB Error: ${error.message}`);

      let rows = data || [];
      if (parentState) {
        rows = rows.filter((c) => {
          const val = (c as any).valueJson as Record<string, unknown> | null;
          return String((val as any)?.stateCode ?? "") === parentState;
        });
      }
      locations = rows.map((c) => {
        const val = (c as any).valueJson as Record<string, unknown> | null;
        const key = String((c as any).key ?? "");
        return { label: key, value: String((val as any)?.value || key) };
      }).filter((x) => x.label && x.value);
    }

    return NextResponse.json({
      success: true,
      data: locations,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch locations";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { type, id, key } = body; // id for warehouse, key for state/city

    if (!type || (!id && !key)) {
      return NextResponse.json(
        { success: false, message: "Type and identifier (id/key) are required" },
        { status: 400 }
      );
    }
    const client = getSupabaseAdmin();

    if (type === "warehouse") {
      if (!id) return NextResponse.json({ success: false, message: "Warehouse ID is required" }, { status: 400 });
      const { error } = await client.from("Warehouse").delete().eq("id", id);
      if (error) throw error;
    } else if (type === "state") {
      if (!key) return NextResponse.json({ success: false, message: "State key is required" }, { status: 400 });
      // Delete the state row (best-effort). City cleanup is best-effort too due to JSON-path limitations in PostgREST.
      const { error } = await client.from("Setting").delete().eq("group", "STATES").eq("key", key);
      if (error) throw error;
    } else if (type === "city") {
      if (!key) return NextResponse.json({ success: false, message: "City key is required" }, { status: 400 });
      const { error } = await client.from("Setting").delete().eq("group", "CITIES").eq("key", key);
      if (error) throw error;
    } else {
      return NextResponse.json({ success: false, message: "Invalid location type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { message: `${type} deleted successfully` } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete location";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, label, value, parentState } = body;

    if (!type || !label) {
      return NextResponse.json(
        { success: false, message: "Type and label are required" },
        { status: 400 }
      );
    }

    const client = getSupabaseAdmin();

    if (type === "warehouse") {
      const now = new Date().toISOString();
      const warehouseCode = value || label.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      let { data, error } = await client.from("Warehouse").insert({ name: label, code: warehouseCode, updatedAt: now }).select().single();
      if (error && error.message?.includes('id')) {
        // Try with an ID if it's missing (common when using Prisma schemas directly via Supabase API)
        ({ data, error } = await client.from("Warehouse").insert({ id: crypto.randomUUID(), name: label, code: warehouseCode, updatedAt: now }).select().single());
      }
      if (error) throw new Error(`Failed to create warehouse. DB Error: ${error.message}`);
      return NextResponse.json({ success: true, data });
    } else if (type === "state") {
      const payloadJson = { value: value || label };
      const now = new Date().toISOString();
      let { data, error } = await client.from("Setting").insert({ group: "STATES", key: label, valueJson: payloadJson, updatedAt: now }).select().single();

      if (error && error.message?.includes('id')) {
        ({ data, error } = await client.from("Setting").insert({ id: crypto.randomUUID(), group: "STATES", key: label, valueJson: payloadJson, updatedAt: now }).select().single());
      }
      if (error) throw new Error(`Failed to create state. DB Error: ${error.message}`);
      return NextResponse.json({ success: true, data });
    } else if (type === "city") {
      const payloadJson = { value: value || label, stateCode: parentState };
      const now = new Date().toISOString();
      let { data, error } = await client.from("Setting").insert({ group: "CITIES", key: label, valueJson: payloadJson, updatedAt: now }).select().single();

      if (error && error.message?.includes('id')) {
        ({ data, error } = await client.from("Setting").insert({ id: crypto.randomUUID(), group: "CITIES", key: label, valueJson: payloadJson, updatedAt: now }).select().single());
      }
      if (error) throw new Error(`Failed to create city. DB Error: ${error.message}`);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, message: "Invalid location type" }, { status: 400 });
  } catch (error: any) {
    const message = error?.message || "Failed to create location";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}