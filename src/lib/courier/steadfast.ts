import { CourierApiError, CourierNotConfiguredError, type CourierAdapter } from "./adapter";
import type {
  CourierConfig,
  CreateShipmentParams,
  CreateShipmentResult,
  RateEstimate,
  ShipmentStatus,
  TrackingStatus,
} from "./types";

// Steadfast Courier — https://steadfast.com.bd (portal.packzy.com API).
// Simple static-key auth, flat-rate. Written against the published API
// contract; NOT yet exercised against a live account (no credentials in
// this environment). Verify end to end the first time real keys are added.
const BASE_URL = "https://portal.packzy.com/api/v1";
const TRACKING_URL = "https://steadfast.com.bd/t";
const DEFAULT_FLAT_CHARGE = 60;

const STATUS_MAP: Record<string, ShipmentStatus> = {
  pending: "booked",
  in_review: "booked",
  hold: "in_transit",
  partial_delivered: "delivered",
  delivered: "delivered",
  cancelled: "cancelled",
  unknown: "booked",
};

function mapStatus(raw: string): ShipmentStatus {
  return STATUS_MAP[raw?.toLowerCase()] ?? "booked";
}

type CreateOrderResponse = {
  status: number;
  message?: string;
  consignment?: {
    consignment_id: number | string;
    tracking_code: string;
    status?: string;
    cod_amount?: number;
  };
};

type StatusResponse = { status: number; delivery_status?: string };

export class SteadfastAdapter implements CourierAdapter {
  readonly provider = "steadfast" as const;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly flatCharge: number;

  constructor(config: CourierConfig) {
    this.apiKey = config.credentials.apiKey ?? "";
    this.secretKey = config.credentials.secretKey ?? "";
    const parsed = Number(config.credentials.flatCharge);
    this.flatCharge = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FLAT_CHARGE;
  }

  private headers(): HeadersInit {
    if (!this.apiKey || !this.secretKey) {
      throw new CourierNotConfiguredError("steadfast", "API Key / Secret Key missing");
    }
    return {
      "Api-Key": this.apiKey,
      "Secret-Key": this.secretKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const res = await fetch(`${BASE_URL}/create_order`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        invoice: params.orderRef,
        recipient_name: params.recipientName,
        recipient_phone: params.recipientPhone,
        recipient_address: params.recipientAddress,
        cod_amount: params.codAmount,
        note: params.notes ?? "",
        item_description: params.itemDescription,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as CreateOrderResponse;
    if (!res.ok || data.status !== 200 || !data.consignment) {
      throw new CourierApiError("steadfast", data.message || `HTTP ${res.status}`);
    }

    const trackingCode = data.consignment.tracking_code;
    return {
      consignmentId: String(data.consignment.consignment_id),
      trackingCode,
      trackingUrl: trackingCode ? `${TRACKING_URL}/${trackingCode}` : null,
      status: mapStatus(data.consignment.status ?? "pending"),
      charge: this.flatCharge,
    };
  }

  async getTrackingStatus(consignmentId: string): Promise<TrackingStatus> {
    const res = await fetch(`${BASE_URL}/status_by_cid/${encodeURIComponent(consignmentId)}`, {
      headers: this.headers(),
    });
    const data = (await res.json().catch(() => ({}))) as StatusResponse;
    if (!res.ok || data.status !== 200) {
      throw new CourierApiError("steadfast", `HTTP ${res.status}`);
    }
    const raw = data.delivery_status ?? "unknown";
    return { status: mapStatus(raw), rawStatus: raw };
  }

  async getRateEstimate(): Promise<RateEstimate> {
    // Steadfast has no public rate API — flat charge, configurable per store.
    if (!this.apiKey || !this.secretKey) {
      throw new CourierNotConfiguredError("steadfast", "API Key / Secret Key missing");
    }
    return { charge: this.flatCharge };
  }

  async cancelShipment(): Promise<void> {
    throw new CourierApiError(
      "steadfast",
      "Steadfast bookings can't be cancelled through the API — contact Steadfast support."
    );
  }
}
