import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"

export async function GET(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null

  const endpoints = [
    clientIp ? `https://ipapi.co/${clientIp}/json/` : "https://ipapi.co/json/",
    "https://freeipapi.com/api/json/",
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) continue
      const data = await res.json()
      const city = data.city || data.cityName
      const region = data.region || data.regionName || data.principalSubdivision
      if (!city) continue
      const label = region ? `${city}, ${region}` : String(city)
      return ok({ label }, "Approximate location")
    } catch {
      /* try next provider */
    }
  }

  return fail("Unable to resolve approximate location", 503)
}
