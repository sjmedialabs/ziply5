/** Customer shipment progress steps (shared server + client). */
export const SHIPMENT_UI_STEPS = [
  { key: "confirmed", label: "Order Confirmed" },
  { key: "awb_assigned", label: "AWB Assigned" },
  { key: "picked_up", label: "Picked Up" },
  { key: "in_transit", label: "In Transit" },
  { key: "out_for_delivery", label: "Out For Delivery" },
  { key: "delivered", label: "Delivered" },
] as const

export type ShipmentUiStepKey = (typeof SHIPMENT_UI_STEPS)[number]["key"]
