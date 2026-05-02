import type { Metadata } from "next"
import { unstable_noStore as noStore } from "next/cache"
import { pgQuery } from "@/src/server/db/pg"

export type SiteFaviconJson = {
  faviconIco?: string | null
  favicon16?: string | null
  favicon32?: string | null
  appleTouch?: string | null
  svg?: string | null
}

export type StorefrontSeoJson = {
  storeName?: string | null
  tagline?: string | null
  defaultMetaTitle?: string | null
  defaultMetaDescription?: string | null
  canonicalBaseUrl?: string | null
  defaultOgImageUrl?: string | null
  twitterSite?: string | null
}

const defaultTitle = "ZIPLY5 - Nothing Artificial. Everything Delicious."
const defaultDescription =
  "Taste the authentic flavors of home-cooked meals. Ready-to-eat Indian food made with love and zero artificial ingredients."

async function getSettingValue(group: string, key: string): Promise<unknown | null> {
  const rows = await pgQuery<Array<{ valueJson: unknown }>>(
    `SELECT "valueJson" FROM "Setting" WHERE "group" = $1 AND key = $2 LIMIT 1`,
    [group, key],
  )
  const raw = rows[0]?.valueJson
  if (raw == null) return null
  return raw
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length ? t : null
}

export async function getSiteFavicons(): Promise<SiteFaviconJson> {
  const raw = await getSettingValue("site", "favicons")
  const o = asRecord(raw)
  if (!o) return {}
  return {
    faviconIco: str(o.faviconIco),
    favicon16: str(o.favicon16),
    favicon32: str(o.favicon32),
    appleTouch: str(o.appleTouch),
    svg: str(o.svg),
  }
}

export async function getStorefrontSeo(): Promise<StorefrontSeoJson> {
  const raw = await getSettingValue("seo", "storefront")
  const o = asRecord(raw)
  if (!o) return {}
  return {
    storeName: str(o.storeName),
    tagline: str(o.tagline),
    defaultMetaTitle: str(o.defaultMetaTitle),
    defaultMetaDescription: str(o.defaultMetaDescription),
    canonicalBaseUrl: str(o.canonicalBaseUrl),
    defaultOgImageUrl: str(o.defaultOgImageUrl),
    twitterSite: str(o.twitterSite),
  }
}

function buildIcons(f: SiteFaviconJson): Metadata["icons"] {
  const fallback: Metadata["icons"] = {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  }

  type IconDesc = { url: string; sizes?: string; type?: string; media?: string }
  const icon: IconDesc[] = []

  if (f.svg) icon.push({ url: f.svg, type: "image/svg+xml" })
  if (f.favicon16) icon.push({ url: f.favicon16, sizes: "16x16" })
  if (f.favicon32) icon.push({ url: f.favicon32, sizes: "32x32" })

  // `.ico` alone must appear as rel="icon"` — `shortcut` is not enough for most browsers.
  const listed = new Set(icon.map((i) => i.url))
  if (f.faviconIco && !listed.has(f.faviconIco)) {
    icon.push({ url: f.faviconIco })
  }

  const useCustom = icon.length > 0
  const next: Metadata["icons"] = {
    icon: useCustom ? icon : fallback.icon,
    apple: f.appleTouch ?? fallback.apple,
  }

  if (f.faviconIco) {
    next.shortcut = f.faviconIco
  }

  return next
}

/** Root layout metadata from Settings (`site` / `seo` groups). Safe for public read. */
export async function getRootLayoutMetadata(): Promise<Metadata> {
  noStore()
  const [favicons, seo] = await Promise.all([getSiteFavicons(), getStorefrontSeo()])

  const title =
    seo.defaultMetaTitle ??
    (seo.storeName && seo.tagline
      ? `${seo.storeName} — ${seo.tagline}`
      : seo.storeName
        ? seo.storeName
        : defaultTitle)

  const description = seo.defaultMetaDescription ?? defaultDescription

  const metadata: Metadata = {
    title,
    description,
    icons: buildIcons(favicons),
  }

  const base = seo.canonicalBaseUrl?.replace(/\/$/, "")
  if (base) {
    try {
      metadata.metadataBase = new URL(base.endsWith("/") ? base : `${base}/`)
    } catch {
      /* ignore invalid URL */
    }
  }

  if (seo.defaultOgImageUrl) {
    metadata.openGraph = {
      title,
      description,
      images: [{ url: seo.defaultOgImageUrl }],
    }
    metadata.twitter = {
      card: "summary_large_image",
      title,
      description,
      images: [seo.defaultOgImageUrl],
      ...(seo.twitterSite ? { site: seo.twitterSite } : {}),
    }
  }

  return metadata
}
