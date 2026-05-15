import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Cache for pincode data to avoid repeated disk reads
let pincodeCache: any[] | null = null;

function getPincodeData() {
  if (pincodeCache) return pincodeCache;

  try {
    const filePath = path.join(process.cwd(), "public", "data", "pincodes_detailed.json");
    if (!fs.existsSync(filePath)) {
      console.warn("[Pincode API] Detailed pincode database not found at:", filePath);
      return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const cleanContent = fileContent.trim().replace(/^\uFEFF/, "");
    const json = JSON.parse(cleanContent);
    
    pincodeCache = Array.isArray(json) ? json : (json.Sheet1 || null);
    return pincodeCache;
  } catch (error) {
    console.error("[Pincode API] Error loading local pincode database:", error);
    return null;
  }
}

/**
 * Cleans the office name to get a more readable city/area name.
 * Removes common postal suffixes like S.O, B.O, Bazar, etc.
 */
function cleanCityName(name: string): string {
  if (!name) return "";
  return name
    .replace(/\s+(S\.O|B\.O|H\.O|G\.P\.O|Bazar|Town|City|MDL|Mandal|Sub Post Office|Branch Post Office)$/gi, "")
    .trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pincode: string }> }
) {
  const { pincode } = await params;

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      { success: false, message: "Invalid pincode format" },
      { status: 400 }
    );
  }

  const records = getPincodeData();
  if (records) {
    const pinNum = parseInt(pincode, 10);
    const pinRecords = records.filter((r) => (r.pincode === pinNum || String(r.pincode) === pincode));

    if (pinRecords.length > 0) {
      // 1. Try to find an office that matches the Taluk name (often the main town office)
      let bestMatch = pinRecords.find(r => 
        r.taluk && r.officeName && 
        r.officeName.toLowerCase().includes(r.taluk.toLowerCase()) &&
        !r.officeName.toLowerCase().includes(" b.o") // Prefer S.O or H.O
      );

      // 2. Fallback to any S.O (Sub Office) or H.O (Head Office)
      if (!bestMatch) {
        bestMatch = pinRecords.find(r => 
          r.officeName && (r.officeName.includes("S.O") || r.officeName.includes("H.O"))
        );
      }

      // 3. Fallback to the first available record
      const matched = bestMatch || pinRecords[0];
      
      // For Andhra Pradesh/Telangana, Taluk is often the Mandal. 
      // If the Office Name is more specific, we use a cleaned version of it.
      const exactCity = cleanCityName(matched.officeName) || matched.taluk;

      return NextResponse.json({
        success: true,
        source: "local_detailed_v2",
        data: {
          city: exactCity,
          district: matched.districtName,
          state: matched.stateName,
          office: matched.officeName,
          taluk: matched.taluk
        }
      });
    }
  }

  return NextResponse.json(
    { success: false, message: "No data found for this pincode" },
    { status: 404 }
  );
}
