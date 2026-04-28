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
      const tables = ["Warehouse", "warehouses", "warehouse"];
      let rows: Array<Record<string, unknown>> = [];
      for (const table of tables) {
        const { data, error } = await client.from(table).select("id,name").order("name", { ascending: true });
        if (!error && Array.isArray(data)) {
          rows = data as Array<Record<string, unknown>>;
          break;
        }
      }
      locations = rows.map((w) => ({ label: String((w as any).name ?? ""), value: String((w as any).id ?? "") })).filter((x) => x.label && x.value);
    } else if (type === "state") {
      const tables = ["Setting", "settings"];
      let rows: Array<Record<string, unknown>> = [];
      for (const table of tables) {
        const attempts = [
          () => client.from(table).select("key,valueJson,value_json").eq("group", "STATES").order("key", { ascending: true }),
          () => client.from(table).select("key,valueJson,value_json").eq("group", "STATES"),
        ];
        for (const run of attempts) {
          const { data, error } = await run();
          if (!error && Array.isArray(data)) {
            rows = data as Array<Record<string, unknown>>;
            break;
          }
        }
        if (rows.length) break;
      }
      locations = rows.map((s) => {
        const val = ((s as any).valueJson ?? (s as any).value_json ?? null) as Record<string, unknown> | null;
        const key = String((s as any).key ?? "");
        return { label: key, value: String((val as any)?.value || key) };
      }).filter((x) => x.label && x.value);
    } else if (type === "city") {
      const tables = ["Setting", "settings"];
      let rows: Array<Record<string, unknown>> = [];
      for (const table of tables) {
        const attempts = [
          () => client.from(table).select("key,valueJson,value_json").eq("group", "CITIES").order("key", { ascending: true }),
          () => client.from(table).select("key,valueJson,value_json").eq("group", "CITIES"),
        ];
        for (const run of attempts) {
          const { data, error } = await run();
          if (!error && Array.isArray(data)) {
            rows = data as Array<Record<string, unknown>>;
            break;
          }
        }
        if (rows.length) break;
      }
      if (parentState) {
        rows = rows.filter((c) => {
          const val = ((c as any).valueJson ?? (c as any).value_json ?? null) as Record<string, unknown> | null;
          return String((val as any)?.stateCode ?? "") === parentState;
        });
      }
      locations = rows.map((c) => {
        const val = ((c as any).valueJson ?? (c as any).value_json ?? null) as Record<string, unknown> | null;
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
      const tables = ["Warehouse", "warehouses", "warehouse"];
      for (const table of tables) {
        const { error } = await client.from(table).delete().eq("id", id);
        if (!error) break;
      }
    } else if (type === "state") {
      if (!key) return NextResponse.json({ success: false, message: "State key is required" }, { status: 400 });
      const tables = ["Setting", "settings"];
      // Delete the state row (best-effort). City cleanup is best-effort too due to JSON-path limitations in PostgREST.
      for (const table of tables) {
        const { error } = await client.from(table).delete().eq("group", "STATES").eq("key", key);
        if (!error) break;
      }
    } else if (type === "city") {
      if (!key) return NextResponse.json({ success: false, message: "City key is required" }, { status: 400 });
      const tables = ["Setting", "settings"];
      for (const table of tables) {
        const { error } = await client.from(table).delete().eq("group", "CITIES").eq("key", key);
        if (!error) break;
      }
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

    let newLocation;
    const client = getSupabaseAdmin();

    if (type === "warehouse") {
      const generatedCode = value || label.toUpperCase().replace(/\s+/g, "-");
      const tables = ["Warehouse", "warehouses", "warehouse"];
      for (const table of tables) {
        const { data, error } = await client.from(table).insert({ name: label, code: generatedCode }).select("*").maybeSingle();
        if (!error && data) {
          newLocation = data;
          break;
        }
      }
    } else if (type === "state") {
      const tables = ["Setting", "settings"];
      for (const table of tables) {
        const payload = { group: "STATES", key: label, valueJson: { value } };
        const { data, error } = await client.from(table).upsert(payload as any, { onConflict: "group,key" }).select("*").maybeSingle();
        if (!error && data) {
          newLocation = data;
          break;
        }
      }
    } else if (type === "city") {
      const tables = ["Setting", "settings"];
      for (const table of tables) {
        const payload = { group: "CITIES", key: label, valueJson: { value, stateCode: parentState } };
        const { data, error } = await client.from(table).upsert(payload as any, { onConflict: "group,key" }).select("*").maybeSingle();
        if (!error && data) {
          newLocation = data;
          break;
        }
      }
    }

    return NextResponse.json({ success: true, data: newLocation });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create location";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}