import type {
  CourierProvider,
  CreateShipmentParams,
  CreateShipmentResult,
  RateEstimate,
  RateEstimateParams,
  TrackingStatus,
} from "./types";

// One implementation per courier (PROJECT_PLAN.md §5). The rest of the app
// (order screen, storefront tracking) only ever talks to this interface —
// never a provider's API directly, outside that provider's own file.
//
// Concrete adapters are constructed with a CourierConfig (sandbox flag +
// resolved credentials from the store's courier settings) and throw a
// CourierNotConfiguredError when a required credential is missing.
export interface CourierAdapter {
  readonly provider: CourierProvider;
  createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult>;
  getTrackingStatus(consignmentId: string): Promise<TrackingStatus>;
  getRateEstimate(params: RateEstimateParams): Promise<RateEstimate>;
  cancelShipment(consignmentId: string): Promise<void>;
}

export class CourierNotConfiguredError extends Error {
  constructor(provider: CourierProvider, detail: string) {
    super(
      `${provider} isn't set up yet — add its credentials in Courier Settings. (${detail})`
    );
    this.name = "CourierNotConfiguredError";
  }
}

// Thrown for any failed provider API call (bad credentials, rejected
// booking, network). The message is safe to show a staff member.
export class CourierApiError extends Error {
  constructor(provider: CourierProvider, detail: string) {
    super(`${provider} request failed: ${detail}`);
    this.name = "CourierApiError";
  }
}
