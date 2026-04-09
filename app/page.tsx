import Hero from "../components/Hero"
import ProductCategories from "../components/ProductCategories"
import TrendingFood from "../components/TrendingFood"
import BestSellers from "../components/BestSellers"
import CollectionBanner from "../components/CollectionBanner"
import CravingsGallery from "../components/CravingsGallery"

export default function HomePage() {
  return (
    <div className="flex flex-col w-full bg-white">
      <Hero />
      <ProductCategories />
      <TrendingFood />
      <BestSellers />
      <CollectionBanner />
      <CravingsGallery />
    </div>
  )
}
