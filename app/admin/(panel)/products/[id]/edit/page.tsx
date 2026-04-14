import { ProductConsolePage } from "@/components/dashboard/ProductConsolePage"

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProductConsolePage adminView mode="edit" productId={id} />
}
