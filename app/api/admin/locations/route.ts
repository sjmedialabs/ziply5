import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic"; // Ensure API is never statically cached

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const parentState = searchParams.get("parentState");

    let locations: { label: string; value: string }[] = [];

    if (type === "warehouse") {
      const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
      locations = warehouses.map((w) => ({ label: w.name, value: w.id }));
    } else if (type === "state") {
      const states = await prisma.setting.findMany({
        where: { group: "STATES" },
        orderBy: { key: "asc" }
      });
      locations = states.map((s) => {
        const val = s.valueJson as Record<string, unknown> | null;
        return { label: s.key, value: String(val?.value || s.key) };
      });
    } else if (type === "city") {
      let cities = await prisma.setting.findMany({
        where: { group: "CITIES" },
        orderBy: { key: "asc" }
      });
      
      if (parentState) {
        cities = cities.filter((c) => {
          const val = c.valueJson as Record<string, unknown> | null;
          return val?.stateCode === parentState;
        });
      }
      locations = cities.map((c) => {
        const val = c.valueJson as Record<string, unknown> | null;
        return { label: c.key, value: String(val?.value || c.key) };
      });
    }

    return NextResponse.json({
      success: true,
      data: locations,
    });
  } catch (error: unknown) {
    console.error("Location GET Error:", error);
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

    if (type === "warehouse") {
      if (!id) return NextResponse.json({ success: false, message: "Warehouse ID is required" }, { status: 400 });
      await prisma.warehouse.delete({ where: { id } });
    } else if (type === "state") {
      if (!key) return NextResponse.json({ success: false, message: "State key is required" }, { status: 400 });

      const stateSetting = await prisma.setting.findUnique({
        where: { group_key: { group: "STATES", key } },
      });

      if (stateSetting) {
        const stateValue = stateSetting.valueJson as { value?: string };
        const stateCode = stateValue?.value;

        if (stateCode) {
          // Delete all cities associated with this state
          await prisma.setting.deleteMany({
            where: {
              group: 'CITIES',
              valueJson: { path: ['stateCode'], equals: stateCode },
            },
          });
        }
      }

      // Delete the state
      await prisma.setting.delete({
        where: { group_key: { group: "STATES", key } },
      });
    } else if (type === "city") {
      if (!key) return NextResponse.json({ success: false, message: "City key is required" }, { status: 400 });
      await prisma.setting.delete({
        where: { group_key: { group: "CITIES", key } },
      });
    } else {
      return NextResponse.json({ success: false, message: "Invalid location type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { message: `${type} deleted successfully` } });
  } catch (error: unknown) {
    console.error("Location DELETE Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ success: false, message: "Location not found to delete." }, { status: 404 });
    }
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

    if (type === "warehouse") {
      const generatedCode = value || label.toUpperCase().replace(/\s+/g, "-");
      newLocation = await prisma.warehouse.create({
        data: { name: label, code: generatedCode }
      });
    } else if (type === "state") {
      newLocation = await prisma.setting.upsert({
        where: { group_key: { group: "STATES", key: label } },
        update: { valueJson: { value } },
        create: { group: "STATES", key: label, valueJson: { value } }
      });
    } else if (type === "city") {
      newLocation = await prisma.setting.upsert({
        where: { group_key: { group: "CITIES", key: label } },
        update: { valueJson: { value, stateCode: parentState } },
        create: {
          group: "CITIES",
          key: label,
          valueJson: { value, stateCode: parentState }
        }
      });
    }

    return NextResponse.json({ success: true, data: newLocation });
  } catch (error: unknown) {
    console.error("Location POST Error:", error);
    const message = error instanceof Error ? error.message : "Failed to create location";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}