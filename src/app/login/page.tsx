import { getTranslator } from "@/lib/i18n/server";
import { authenticate } from "./actions";

export default async function LoginPage() {
  const { t } = await getTranslator();
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">{t("admin.login.signIn")}</h1>
      <form action={authenticate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          {t("admin.login.email")}
          <input name="email" type="email" required className="rounded border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          {t("admin.login.password")}
          <input name="password" type="password" required className="rounded border px-3 py-2" />
        </label>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          {t("admin.login.signIn")}
        </button>
      </form>
    </main>
  );
}
