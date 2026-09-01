import Link from "next/link";
import { requirePermission } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { countReviewsByStatus, listReviewsForAdmin } from "@/lib/reviews/query";
import { isReviewStatus, type ReviewStatus } from "@/lib/reviews/types";
import { ReviewRow } from "./ReviewRow";

const TABS: (ReviewStatus | "all")[] = ["pending", "approved", "rejected", "all"];
const TAB_KEY: Record<ReviewStatus | "all", string> = {
  pending: "admin.reviews.tabPending",
  approved: "admin.reviews.tabApproved",
  rejected: "admin.reviews.tabRejected",
  all: "admin.reviews.tabAll",
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requirePermission("content:manage");
  const { t } = await getTranslator();
  const sp = await searchParams;

  const active: ReviewStatus | "all" = isReviewStatus(sp.status ?? "")
    ? (sp.status as ReviewStatus)
    : sp.status === "all"
      ? "all"
      : "pending";

  const [rows, counts] = await Promise.all([
    listReviewsForAdmin(session.user.storeId, active === "all" ? undefined : active),
    countReviewsByStatus(session.user.storeId),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("admin.reviews.title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("admin.reviews.intro")}</p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b text-sm">
        {TABS.map((tab) => {
          const count = tab === "all" ? undefined : counts[tab];
          return (
            <Link
              key={tab}
              href={tab === "pending" ? "/reviews" : `/reviews?status=${tab}`}
              className={`-mb-px border-b-2 px-3 py-2 ${
                active === tab
                  ? "border-black font-medium text-black"
                  : "border-transparent text-gray-500 hover:text-black"
              }`}
            >
              {t(TAB_KEY[tab])}
              {count ? ` (${count})` : ""}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded border border-dashed px-4 py-8 text-center text-sm text-gray-500">
          {t("admin.reviews.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
