import Link from "next/link";
import { requireStaffSession } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { listFraudChecks } from "@/lib/fraud/history";
import { FRAUD_RISK_LEVELS, type FraudRiskLevel } from "@/lib/fraud";
import { FRAUD_RISK_LEVEL_KEYS } from "@/lib/enum-labels";
import { RiskBadge } from "@/components/risk-badge";
import { PhoneLookup } from "./PhoneLookup";

const PAGE_SIZE = 25;

export default async function FraudCheckerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; risk?: string; page?: string }>;
}) {
  const session = await requireStaffSession();
  const { t, locale } = await getTranslator();
  const sp = await searchParams;

  const query = (sp.q ?? "").trim();
  const risk = FRAUD_RISK_LEVELS.includes(sp.risk as FraudRiskLevel)
    ? (sp.risk as FraudRiskLevel)
    : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await listFraudChecks(session.user.storeId, {
    query,
    risk,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const dateFmt = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (risk) params.set("risk", risk);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/fraud-checker?${qs}` : "/fraud-checker";
  };

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("admin.fraudChecker.title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("admin.fraudChecker.intro")}</p>
      </div>

      <PhoneLookup />

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t("admin.fraudChecker.historyTitle")}</h2>

        <form className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            {t("admin.fraudChecker.searchLabel")}
            <input
              name="q"
              defaultValue={query}
              placeholder={t("admin.fraudChecker.searchPlaceholder")}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            {t("admin.fraudChecker.riskLabel")}
            <select
              name="risk"
              defaultValue={risk ?? ""}
              className="rounded border border-gray-300 px-3 py-2"
            >
              <option value="">{t("admin.fraudChecker.riskAll")}</option>
              {FRAUD_RISK_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {t(FRAUD_RISK_LEVEL_KEYS[lvl])}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
          >
            {t("admin.fraudChecker.searchSubmit")}
          </button>
          {(query || risk) && (
            <Link href="/fraud-checker" className="px-2 py-2 underline">
              {t("admin.fraudChecker.clear")}
            </Link>
          )}
        </form>

        {rows.length === 0 ? (
          <p className="rounded border border-dashed px-4 py-8 text-center text-sm text-gray-500">
            {t("admin.fraudChecker.empty")}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2">{t("admin.fraudChecker.colOrder")}</th>
                    <th className="py-2">{t("admin.fraudChecker.colCustomer")}</th>
                    <th className="py-2">{t("admin.fraudChecker.colPhone")}</th>
                    <th className="py-2">{t("admin.fraudChecker.colRisk")}</th>
                    <th className="py-2">{t("admin.fraudChecker.colRatio")}</th>
                    <th className="py-2">{t("admin.fraudChecker.colChecked")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.orderId} className="border-b align-top">
                      <td className="py-2">
                        <Link href={`/orders/${r.orderId}`} className="font-mono underline">
                          {r.orderCode}
                        </Link>
                      </td>
                      <td className="py-2">{r.customerName}</td>
                      <td className="py-2 font-mono text-xs">{r.customerPhone}</td>
                      <td className="py-2">
                        <RiskBadge level={r.riskLevel} />
                      </td>
                      <td className="py-2">
                        {r.successRatio != null ? `${r.successRatio}%` : "—"}
                      </td>
                      <td className="py-2 text-xs text-gray-500">
                        {dateFmt.format(r.checkedAt)}
                        {r.verdict && (
                          <div className="mt-0.5 max-w-xs text-gray-400">{r.verdict}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {t("admin.fraudChecker.pageOf", { page, pages: pageCount })}
                </span>
                <div className="flex gap-3">
                  {page > 1 && (
                    <Link href={pageHref(page - 1)} className="underline">
                      {t("admin.fraudChecker.prev")}
                    </Link>
                  )}
                  {page < pageCount && (
                    <Link href={pageHref(page + 1)} className="underline">
                      {t("admin.fraudChecker.next")}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
