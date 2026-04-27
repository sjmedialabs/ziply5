import Hero from "@/components/Hero"
import ProductCategories from "@/components/ProductCategories"
import TrendingFood from "@/components/TrendingFood"
import BestSellers from "@/components/BestSellers"
import CollectionBanner from "@/components/CollectionBanner"
import CravingsGallery from "@/components/CravingsGallery"
import { getCmsPageSafe } from "@/src/server/modules/cms/cms.safe"

export default async function HomePage() {
  const page = await getCmsPageSafe("home")

  // Use page.sections directly if you want to see content regardless of status (e.g., during development)
  const sections = page?.sections || []

  const getCmsData = (type: string) => {
    return sections.find(s => s.sectionType === type)?.contentJson
  }

  return (
    <div className="flex flex-col w-full bg-white">
      <Hero cmsData={getCmsData('hero')} />
      <ProductCategories cmsData={getCmsData('our-products')} />
      <TrendingFood cmsData={getCmsData('trending')} />
      <BestSellers cmsData={getCmsData('best-sellers')} />
      <CollectionBanner cmsData={getCmsData('collection-banner')} />
      <CravingsGallery cmsData={getCmsData('cravings')} />
    </div>
  )
}
