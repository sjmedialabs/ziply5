"use client"

import { useState, useEffect } from "react";
import { authedFetch } from "@/lib/dashboard-fetch";

export type LocationType = 'warehouse' | 'state' | 'city';

export const useLocations = (type: LocationType, parentState?: string) => {
  const [data, setData] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchLocations = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/locations?type=${type}`;
      if (type === 'city' && parentState) {
        url += `&parentState=${parentState}`;
      }
      const response: any = await authedFetch(url);
      setData(Array.isArray(response) ? response : response?.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [type, parentState]);

  return { data, loading, error, refetch: fetchLocations };
};