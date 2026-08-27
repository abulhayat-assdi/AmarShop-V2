// Pure types — client-safe (no fetch, no node imports).

export type CourierProvider = "steadfast" | "pathao" | "redx";

// Normalised shipment state (matches the shipment_status DB enum). Each
// adapter maps its provider's own status strings onto this.
export type ShipmentStatus =
  | "pending"
  | "booked"
  | "in_transit"
  | "delivered"
  | "returned"
  | "cancelled"
  | "failed";

export type CourierCredentials = Record<string, string>;

export type CourierConfig = {
  sandbox: boolean;
  credentials: CourierCredentials;
};

export type CreateShipmentParams = {
  orderRef: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  itemDescription: string;
  codAmount: number;
  weightKg?: number;
  notes?: string;
};

export type CreateShipmentResult = {
  consignmentId: string;
  trackingCode: string;
  trackingUrl: string | null;
  status: ShipmentStatus;
  charge: number | null;
};

export type TrackingStatus = {
  status: ShipmentStatus;
  rawStatus: string;
};

export type RateEstimateParams = {
  recipientAddress: string;
  weightKg?: number;
  codAmount: number;
};

export type RateEstimate = {
  charge: number;
  etaDays?: number;
};
