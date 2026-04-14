import { ProductConsolePage } from "@/components/dashboard/ProductConsolePage"

export default async function SellerEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProductConsolePage adminView={false} mode="edit" productId={id} />
}
