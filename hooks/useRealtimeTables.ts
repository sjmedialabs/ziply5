"use client"

import { useEffect, useRef } from "react"
import { getSupabaseRealtimeClient } from "@/lib/supabase-realtime"

type Props = {
  tables: Array<"orders" | "returns" | "refunds" | "shipments">
  onChange: () => void
  fallbackPollMs?: number
}

const tableMap: Record<Props["tables"][number], string> = {
  orders: "Order",
  returns: "ReturnRequest",
  refunds: "RefundRecord",
  shipments: "Shipment",
}

export function useRealtimeTables({ tables, onChange, fallbackPollMs = 20_000 }: Props) {
  const tableKey = tables.join(",")
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const supabase = getSupabaseRealtimeClient()
    if (!supabase) {
      const id = window.setInterval(() => onChangeRef.current(), fallbackPollMs)
      return () => window.clearInterval(id)
    }

    const channel = supabase.channel(`ziply5-realtime-${tableKey.replaceAll(",", "-")}`)
    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableMap[table] },
        () => {
          onChangeRef.current()
        },
      )
    }

    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fallbackPollMs, tableKey])
}
