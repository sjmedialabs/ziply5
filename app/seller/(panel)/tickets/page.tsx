import { PanelPlaceholder } from "@/components/dashboard/PanelPlaceholder"

export default function SellerTicketsPage() {
  return (
    <PanelPlaceholder title="Support">
      <p>
        Open a ticket with <code className="rounded bg-[#F5F1E6] px-1">POST /api/v1/tickets</code>. Your list is{" "}
        <code className="rounded bg-[#F5F1E6] px-1">GET /api/v1/tickets</code> (own tickets only for non-admin roles).
      </p>
    </PanelPlaceholder>
  )
}
