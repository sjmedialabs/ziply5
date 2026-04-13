"use client";

import { useState } from "react";

const data = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur"],
  Karnataka: ["Bangalore", "Mysore"],
  Delhi: ["New Delhi"],
};

export function useLocation() {
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const states = Object.keys(data);
  const cities = state ? data[state as keyof typeof data] : [];

  return {
    state,
    setState,
    city,
    setCity,
    states,
    cities,
  };
}