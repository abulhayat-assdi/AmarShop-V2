import { CourierApiError, CourierNotConfiguredError, type CourierAdapter } from "./adapter";
import type {
  CourierConfig,
  CreateShipmentParams,
  CreateShipmentResult,
  RateEstimate,
  ShipmentStatus,
  TrackingStatus,
} from "./types";

// REDX — Open API (v1.0.0-beta). Bearer access token from the REDX
// dashboard + an area model the merchant sets a default for. Written
// against the published API contract; NOT yet exercised against a live
// account.
const SANDBOX_URL = "https://sandbox.redx.com.bd/v1.0.0-beta";
const LIVE_URL = "https://openapi.redx.com.bd/v1.0.0-beta";
const TRACKING_URL = "https://redx.com.bd/track-global-parcel/";

function statusOf(message: string): ShipmentStatus {
  const s = (message ?? "").toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("return")) return "returned";
  if (s.includes("delivered")) return "delivered";
  if (s.includes("failed")) return "failed";
  if (s.includes("transit") || s.includes("out for delivery") || s.includes("picked")) {
    return "in_transit";
  }
  return "booked";
}

type CreateParcelResponse = { tracking_id?: string; message?: string };
type TrackResponse = { tracking?: Array<{ message_en?: string; time?: string }> };

export class RedxAdapter implements CourierAdapter {
  readonly provider = "redx" as const;
  private readonly base: string;
  private readonly accessToken: string;
  private readonly areaId: string;
  private readonly areaName: string;

  constructor(config: CourierConfig) {
    this.base = config.sandbox ? SANDBOX_URL : LIVE_URL;
    this.accessToken = config.credentials.accessToken ?? "";
    this.areaId = config.credentials.defaultAreaId ?? "";
    this.areaName = config.credentials.defaultAreaName ?? "";
  }

  private headers(): HeadersInit {
    if (!this.accessToken) {
      throw new CourierNotConfiguredError("redx", "access token missing");
    }
    return {
      "API-ACCESS-TOKEN": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const res = await fetch(`${this.base}/parcel`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        customer_name: params.recipientName,
        customer_phone: params.recipientPhone,
        customer_address: params.recipientAddress,
        delivery_area: this.areaName || undefined,
        delivery_area_id: this.areaId ? Number(this.areaId) : undefined,
        merchant_invoice_id: params.orderRef,
        cash_collection_amount: String(params.codAmount),
        parcel_weight: Math.round((params.weightKg ?? 0.5) * 1000),
        value: Math.max(params.codAmount, 1),
        instruction: params.notes ?? "",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as CreateParcelResponse;
    if (!res.ok || !data.tracking_id) {
      throw new CourierApiError("redx", data.message || `HTTP ${res.status}`);
    }
    return {
      consignmentId: data.tracking_id,
      trackingCode: data.tracking_id,
      trackingUrl: `${TRACKING_URL}?trackingId=${encodeURIComponent(data.tracking_id)}`,
      status: "booked",
      charge: null,
    };
  }

  async getTrackingStatus(consignmentId: string): Promise<TrackingStatus> {
    const res = await fetch(
      `${this.base}/parcel/track/${encodeURIComponent(consignmentId)}`,
      { headers: this.headers() }
    );
    const data = (await res.json().catch(() => ({}))) as TrackResponse;
    if (!res.ok) throw new CourierApiError("redx", `HTTP ${res.status}`);
    const latest = data.tracking?.[0]?.message_en ?? "";
    return { status: statusOf(latest), rawStatus: latest || "unknown" };
  }

  async getRateEstimate(): Promise<RateEstimate> {
    // REDX has no public price endpoint in the open API — surface that
    // rather than returning a fake number.
    if (!this.accessToken) throw new CourierNotConfiguredError("redx", "access token missing");
    throw new CourierApiError("redx", "REDX does not expose a rate estimate API.");
  }

  async cancelShipment(): Promise<void> {
    throw new CourierApiError(
      "redx",
      "REDX parcels are cancelled from the REDX dashboard, not the API."
    );
  }
}
