import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { coupons } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { DISCOUNT_TYPE_KEYS } from "@/lib/enum-labels";
import { CouponForm } from "./CouponForm";
import { DeleteCouponButton } from "./DeleteCouponButton";
import { createCoupon } from "./actions";

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default async function CouponsPage() {
  const session = await requireStaffSession();
  const { t } = await getTranslator();

  const rows = await withStoreContext(session.user.storeId, (tx) =>
    tx.select().from(coupons).where(eq(coupons.storeId, session.user.storeId))
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.coupons.title")}</h1>

      <CouponForm
        action={createCoupon}
        title={t("admin.coupons.addTitle")}
        submitLabel={t("admin.coupons.addSubmit")}
        clearOnSuccess
      />

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t("admin.coupons.colCode")}</th>
            <th className="py-2">{t("admin.coupons.colType")}</th>
            <th className="py-2">{t("admin.coupons.colValue")}</th>
            <th className="py-2">{t("admin.coupons.colUses")}</th>
            <th className="py-2">{t("admin.coupons.colWindow")}</th>
            <th className="py-2">{t("admin.coupons.colActive")}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-gray-500">
                {t("admin.coupons.noCoupons")}
              </td>
            </tr>
          ) : (
            rows.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2 font-mono">{c.code}</td>
                <td className="py-2">{t(DISCOUNT_TYPE_KEYS[c.type])}</td>
                <td className="py-2">
                  {c.type === "free_delivery"
                    ? "—"
                    : c.type === "percentage"
                      ? `${Number(c.value)}%`
                      : `৳${c.value}`}
                </td>
                <td className="py-2">
                  {c.maxUses === null
                    ? t("admin.coupons.usesUnlimited", { used: c.usedCount })
                    : t("admin.coupons.usesOf", { used: c.usedCount, max: c.maxUses })}
                </td>
                <td className="py-2 text-xs text-gray-500">
                  {fmtDate(c.startsAt)} – {fmtDate(c.endsAt)}
                </td>
                <td className="py-2">
                  {c.isActive ? "✓" : <span className="text-gray-400">{t("admin.coupons.inactive")}</span>}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <Link href={`/coupons/${c.id}/edit`} className="text-sm underline">
                      {t("admin.coupons.edit")}
                    </Link>
                    <DeleteCouponButton couponId={c.id} hasUses={c.usedCount > 0} />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
