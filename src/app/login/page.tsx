import { authenticate } from "./actions";

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form action={authenticate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Email
          <input name="email" type="email" required className="rounded border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Password
          <input name="password" type="password" required className="rounded border px-3 py-2" />
        </label>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
