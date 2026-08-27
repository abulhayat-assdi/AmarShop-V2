"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Not live search — submitting navigates to the bookmarkable
// /search/<query> URL (SITE_STRUCTURE.md Part C). Kept small and
// self-contained so a later slice can reuse it in the storefront header.
export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/search/${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search products…"
        aria-label="Search products"
        className="flex-1 rounded border border-gray-300 px-3 py-2"
      />
      <button
        type="submit"
        className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
      >
        Search
      </button>
    </form>
  );
}
