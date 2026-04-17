import { ProductConsolePage } from "@/components/dashboard/ProductConsolePage"

export default async function AdminViewProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProductConsolePage adminView mode="view" productId={id} />
}