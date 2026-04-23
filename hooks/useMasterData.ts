"use client"

import { useQuery } from "@tanstack/react-query"

type MasterValue = {
  id: string
  groupKey: string
  label: string
  value: string
  sortOrder: number
  isActive: boolean
}

type MasterGroup = {
  id: string
  key: string
  name: string
  description?: string | null
  isActive: boolean
}

const fetchJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  const payload = (await res.json()) as { success?: boolean; message?: string; data?: T }
  if (!res.ok || payload.success === false || payload.data === undefined) {
    throw new Error(payload.message ?? "Request failed")
  }
  return payload.data
}

export const useMasterValues = (groupKey: string, enabled = true) => {
  return useQuery({
    queryKey: ["master-values", groupKey],
    enabled: enabled && Boolean(groupKey),
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: () =>
      fetchJson<MasterValue[]>(
        `/api/master/values?group=${encodeURIComponent(groupKey)}&activeOnly=true`,
      ),
  })
}

export const useMasterGroups = (enabled = true) => {
  return useQuery({
    queryKey: ["master-groups"],
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: () => fetchJson<MasterGroup[]>("/api/master/groups?activeOnly=true"),
  })
}

export const useAllMasterData = (enabled = true) => {
  return useQuery({
    queryKey: ["master-all"],
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: () => fetchJson<Array<MasterGroup & { values: MasterValue[] }>>("/api/master/all"),
  })
}
