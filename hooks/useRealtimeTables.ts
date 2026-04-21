"use client"

import { useEffect } from "react"
import { getSupabaseRealtimeClient } from "@/lib/supabase-realtime"

type Props = {
  tables: Array<"orders" | "returns" | "refunds">
  onChange: () => void
  fallbackPollMs?: number
}

const tableMap: Record<Props["tables"][number], string> = {
  orders: "Order",
  returns: "ReturnRequest",
  refunds: "RefundRecord",
}

export function useRealtimeTables({ tables, onChange, fallbackPollMs = 20_000 }: Props) {
  const tableKey = tables.join(",")

  useEffect(() => {
    const supabase = getSupabaseRealtimeClient()
    if (!supabase) {
      const id = window.setInterval(onChange, fallbackPollMs)
      return () => window.clearInterval(id)
    }

    const channel = supabase.channel(`ziply5-realtime-${tableKey.replaceAll(",", "-")}-${Date.now()}`)
    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableMap[table] },
        () => {
          onChange()
        },
      )
    }

    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fallbackPollMs, onChange, tableKey])
}
