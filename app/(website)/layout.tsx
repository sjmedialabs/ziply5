import type React from "react"
import { unstable_noStore as noStore } from "next/cache"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { PageTransition } from "@/components/animations/PageTransition"
import WebsiteImageFallbackHandler from "@/components/website/WebsiteImageFallbackHandler"
import { getCmsPageSafe } from "@/src/server/modules/cms/cms.safe"
import { extractFooterPayloadFromPage } from "@/lib/footer-cms"

export default async function WebsiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  noStore()
  const footerPage = await getCmsPageSafe("footer")
  const footerPayload = extractFooterPayloadFromPage(footerPage)

  return (
    <>
      <WebsiteImageFallbackHandler />
      <Header />
      <main className="flex flex-1 flex-col">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer cmsPayload={footerPayload} />
    </>
  )
}
