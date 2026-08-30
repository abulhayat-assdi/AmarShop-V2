import { getTranslator } from "@/lib/i18n/server";
import { FRAUD_RISK_LEVEL_KEYS } from "@/lib/enum-labels";
import type { FraudRiskLevel } from "@/lib/fraud";

const CLASSES: Record<FraudRiskLevel, string> = {
  safe: "bg-green-100 text-green-800",
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  danger: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-600",
};

// Server component — the fraud risk pill shown on the order list + detail.
// Renders a muted dash when the order hasn't been checked yet.
export async function RiskBadge({ level }: { level: FraudRiskLevel | null }) {
  if (!level) {
    return <span className="text-gray-400">—</span>;
  }
  const { t } = await getTranslator();
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${CLASSES[level]}`}>
      {t(FRAUD_RISK_LEVEL_KEYS[level])}
    </span>
  );
}
