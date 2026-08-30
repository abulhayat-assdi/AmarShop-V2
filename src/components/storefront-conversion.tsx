"use client";

import { useEffect, useRef } from "react";
import { safeStoreAnalytics, type StoreAnalytics } from "@/lib/analytics/config";

type FbqFn = (event: string, name: string, params?: Record<string, unknown>) => void;
type GtagFn = (command: string, name: string, params?: Record<string, unknown>) => void;

// Fires the conversion once on the order-confirmation page, on top of the
// PageView the base tags already sent. COD-aware (PROJECT_PLAN.md §2): a
// paid order is a Purchase, an unpaid/COD order is a Lead until payment is
// confirmed. Guarded so a blocked or slow base tag never throws.
export function StorefrontConversion({
  analytics,
  value,
  paid,
}: {
  analytics: StoreAnalytics;
  value: number;
  paid: boolean;
}) {
  const fired = useRef(false);
  const { metaPixelId, ga4MeasurementId } = safeStoreAnalytics(analytics);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const w = window as typeof window & { fbq?: FbqFn; gtag?: GtagFn };
    try {
      if (metaPixelId && typeof w.fbq === "function") {
        w.fbq("track", paid ? "Purchase" : "Lead", { value, currency: "BDT" });
      }
      if (ga4MeasurementId && typeof w.gtag === "function") {
        w.gtag("event", paid ? "purchase" : "generate_lead", { value, currency: "BDT" });
      }
    } catch {
      // A tracking failure must never affect the confirmation page.
    }
  }, [metaPixelId, ga4MeasurementId, value, paid]);

  return null;
}
