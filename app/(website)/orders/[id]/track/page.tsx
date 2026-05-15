import { permanentRedirect } from "next/navigation"

type PageProps = {
  params: Promise<{ id: string }>
}

/** Legacy URL: shipment tracking now lives on `/orders/[id]`. */
export default async function LegacyOrderTrackRedirectPage({ params }: PageProps) {
  const { id } = await params
  permanentRedirect(`/orders/${id}`)
}
