import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { coupons } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { CouponForm } from "../../CouponForm";
import { updateCoupon } from "../../actions";

function toDateInput(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireStaffSession();

  const [coupon] = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select()
      .from(coupons)
      .where(and(eq(coupons.storeId, session.user.storeId), eq(coupons.id, id)))
      .limit(1)
  );

  if (!coupon) notFound();
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.coupons.editTitle")}</h1>
      <CouponForm
        action={updateCoupon.bind(null, coupon.id)}
        title={t("admin.coupons.editTitle")}
        submitLabel={t("admin.coupons.saveChanges")}
        initialValues={{
          code: coupon.code,
          type: coupon.type,
          value: coupon.type === "free_delivery" ? "" : String(Number(coupon.value)),
          minSubtotal: coupon.minSubtotal ?? "",
          maxUses: coupon.maxUses === null ? "" : String(coupon.maxUses),
          maxUsesPerPhone: coupon.maxUsesPerPhone === null ? "" : String(coupon.maxUsesPerPhone),
          startsAt: toDateInput(coupon.startsAt),
          endsAt: toDateInput(coupon.endsAt),
          isActive: coupon.isActive,
        }}
      />
    </div>
  );
}
