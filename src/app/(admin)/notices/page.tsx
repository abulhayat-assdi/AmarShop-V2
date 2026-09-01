import { requireStaffSession } from "@/lib/auth/roles";
import { listNotices } from "@/lib/notices/query";
import { noticeMessage } from "@/lib/notices/message";
import { getTranslator } from "@/lib/i18n/server";
import { markAllNoticesReadAction, markNoticeReadAction } from "./actions";

export default async function NoticesPage() {
  const session = await requireStaffSession();
  const items = await listNotices(session.user.storeId);
  const { t } = await getTranslator();
  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("admin.notices.title")}</h1>
        {unreadCount > 0 && (
          <form action={markAllNoticesReadAction}>
            <button type="submit" className="text-sm underline">
              {t("admin.notices.markAllRead")}
            </button>
          </form>
        )}
      </div>
      <p className="text-sm text-gray-600">{t("admin.notices.intro")}</p>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{t("admin.notices.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-start justify-between gap-3 rounded border px-3 py-2 text-sm ${
                n.readAt ? "border-gray-200 text-gray-500" : "border-gray-300"
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <span
                  className={
                    n.severity === "critical"
                      ? "text-red-600"
                      : n.severity === "warning"
                        ? "text-amber-600"
                        : ""
                  }
                >
                  {noticeMessage(t, n)}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              {!n.readAt && (
                <form action={markNoticeReadAction}>
                  <input type="hidden" name="noticeId" value={n.id} />
                  <button type="submit" className="shrink-0 text-xs underline">
                    {t("admin.notices.markRead")}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
