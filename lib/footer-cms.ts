/** Normalize footer payload from CMS `footer` page sections (shared server + client). */

export type FooterCmsPage = {
  sections?: Array<{ sectionType: string; contentJson: unknown }>
} | null

export function parseCmsContentJson(raw: unknown): Record<string, unknown> {
  if (raw == null) return {}
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown
      return p != null && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>
  return {}
}

/**
 * Reads `sectionType === 'footer'` contentJson, or falls back to the first section
 * when it already looks like footer shape (legacy / mis-typed rows).
 */
export function extractFooterPayloadFromPage(page: FooterCmsPage): Record<string, unknown> {
  const sections = page?.sections
  if (!Array.isArray(sections) || sections.length === 0) return {}

  const footerSection = sections.find((s) => String(s.sectionType ?? "").toLowerCase() === "footer")
  if (footerSection) {
    return parseCmsContentJson(footerSection.contentJson)
  }

  const first = sections[0]
  const parsed = parseCmsContentJson(first?.contentJson)
  const keys = Object.keys(parsed)
  const looksLikeFooter =
    keys.some((k) => k === "section1" || k === "section2" || k === "section3") ||
    keys.includes("logo") ||
    keys.includes("phone") ||
    keys.includes("email") ||
    keys.includes("copyrightMsg")

  return looksLikeFooter ? parsed : {}
}
