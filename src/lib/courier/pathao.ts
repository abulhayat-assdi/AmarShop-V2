import { CourierApiError, CourierNotConfiguredError, type CourierAdapter } from "./adapter";
import type {
  CourierConfig,
  CreateShipmentParams,
  CreateShipmentResult,
  RateEstimate,
  RateEstimateParams,
  ShipmentStatus,
  TrackingStatus,
} from "./types";

// Pathao Courier — Merchant (Aladdin) API. OAuth2 password grant + a
// location model (city/zone/area IDs) the merchant configures a default
// for. Written against the published API contract; NOT yet exercised
// against a live account.
const SANDBOX_URL = "https://courier-api-sandbox.pathao.com";
const LIVE_URL = "https://api-hermes.pathao.com";
const TRACKING_URL = "https://merchant.pathao.com/tracking";

// One access token per (base + client + user), reused until ~1 min before
// expiry. Process-local; fine for a single app instance.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function statusOf(raw: string): ShipmentStatus {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("deliver") && s.includes("fail")) return "failed";
  if (s.includes("return")) return "returned";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("partial") || s === "delivered") return "delivered";
  if (
    s.includes("picked") ||
    s.includes("sorting") ||
    s.includes("last_mile") ||
    s.includes("last mile") ||
    s.includes("assigned_for_delivery") ||
    s.includes("hold")
  ) {
    return "in_transit";
  }
  return "booked";
}

type TokenResponse = { access_token?: string; expires_in?: number };
type OrderResponse = {
  data?: { consignment_id?: string; order_status?: string; delivery_fee?: number };
  message?: string;
};
type PriceResponse = { data?: { price?: number; final_price?: number } };

export class PathaoAdapter implements CourierAdapter {
  readonly provider = "pathao" as const;
  private readonly base: string;
  private readonly c: {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    storeId: string;
    cityId: string;
    zoneId: string;
    areaId: string;
  };

  constructor(config: CourierConfig) {
    this.base = config.sandbox ? SANDBOX_URL : LIVE_URL;
    const cr = config.credentials;
    this.c = {
      clientId: cr.clientId ?? "",
      clientSecret: cr.clientSecret ?? "",
      username: cr.username ?? "",
      password: cr.password ?? "",
      storeId: cr.storeId ?? "",
      cityId: cr.defaultCityId ?? "",
      zoneId: cr.defaultZoneId ?? "",
      areaId: cr.defaultAreaId ?? "",
    };
  }

  private assertConfigured() {
    const { clientId, clientSecret, username, password, storeId } = this.c;
    if (!clientId || !clientSecret || !username || !password || !storeId) {
      throw new CourierNotConfiguredError(
        "pathao",
        "client id/secret, username, password and store id are all required"
      );
    }
  }

  private async token(): Promise<string> {
    this.assertConfigured();
    const key = `${this.base}|${this.c.clientId}|${this.c.username}`;
    const cached = tokenCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.token;

    const res = await fetch(`${this.base}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: this.c.clientId,
        client_secret: this.c.clientSecret,
        grant_type: "password",
        username: this.c.username,
        password: this.c.password,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as TokenResponse;
    if (!res.ok || !data.access_token) {
      throw new CourierApiError("pathao", `token request failed (HTTP ${res.status})`);
    }
    tokenCache.set(key, {
      token: data.access_token,
      expiresAt: Date.now() + Math.max((data.expires_in ?? 3600) - 60, 60) * 1000,
    });
    return data.access_token;
  }

  private async authed(path: string, init: RequestInit): Promise<Response> {
    const token = await this.token();
    return fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const res = await this.authed("/aladdin/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        store_id: this.c.storeId,
        merchant_order_id: params.orderRef,
        recipient_name: params.recipientName,
        recipient_phone: params.recipientPhone,
        recipient_address: params.recipientAddress,
        recipient_city: this.c.cityId || undefined,
        recipient_zone: this.c.zoneId || undefined,
        recipient_area: this.c.areaId || undefined,
        delivery_type: 48,
        item_type: 2,
        item_quantity: 1,
        item_weight: params.weightKg ?? 0.5,
        amount_to_collect: params.codAmount,
        item_description: params.itemDescription,
        special_instruction: params.notes ?? "",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as OrderResponse;
    if (!res.ok || !data.data?.consignment_id) {
      throw new CourierApiError("pathao", data.message || `HTTP ${res.status}`);
    }
    const cid = data.data.consignment_id;
    return {
      consignmentId: cid,
      trackingCode: cid,
      trackingUrl: `${TRACKING_URL}?consignment_id=${encodeURIComponent(cid)}`,
      status: statusOf(data.data.order_status ?? "pending"),
      charge: data.data.delivery_fee ?? null,
    };
  }

  async getTrackingStatus(consignmentId: string): Promise<TrackingStatus> {
    const res = await this.authed(
      `/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`,
      { method: "GET" }
    );
    const data = (await res.json().catch(() => ({}))) as OrderResponse;
    if (!res.ok) throw new CourierApiError("pathao", `HTTP ${res.status}`);
    const raw = data.data?.order_status ?? "unknown";
    return { status: statusOf(raw), rawStatus: raw };
  }

  async getRateEstimate(params: RateEstimateParams): Promise<RateEstimate> {
    const res = await this.authed("/aladdin/api/v1/merchant/price-plan", {
      method: "POST",
      body: JSON.stringify({
        store_id: this.c.storeId,
        item_type: 2,
        delivery_type: 48,
        item_weight: params.weightKg ?? 0.5,
        recipient_city: this.c.cityId || undefined,
        recipient_zone: this.c.zoneId || undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as PriceResponse;
    if (!res.ok) throw new CourierApiError("pathao", `HTTP ${res.status}`);
    return { charge: data.data?.final_price ?? data.data?.price ?? 0 };
  }

  async cancelShipment(): Promise<void> {
    throw new CourierApiError(
      "pathao",
      "Pathao orders are cancelled from the merchant panel, not the API."
    );
  }
}
