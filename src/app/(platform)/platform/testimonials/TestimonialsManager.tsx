"use client";

import { useActionState, useState } from "react";
import type { Testimonial } from "@/db/schema";
import {
  createTestimonialAction,
  updateTestimonialAction,
  togglePublishedAction,
  deleteTestimonialAction,
  type ManagerState,
} from "./actions";

const empty: ManagerState = {};
const inputCls = "rounded border border-gray-300 px-3 py-2 text-sm";

function Fields({ t }: { t?: Testimonial }) {
  return (
    <>
      <input name="authorName" defaultValue={t?.authorName ?? ""} placeholder="Author name *" required className={inputCls} />
      <input name="authorRole" defaultValue={t?.authorRole ?? ""} placeholder="Role / company (optional)" className={inputCls} />
      <textarea name="quote" defaultValue={t?.quote ?? ""} placeholder="Quote *" required rows={3} className={`${inputCls} sm:col-span-2`} />
      <input name="outcome" defaultValue={t?.outcome ?? ""} placeholder="Outcome badge, e.g. Launched in 1 day (optional)" className={inputCls} />
      <input name="displayOrder" type="number" defaultValue={t?.displayOrder ?? 0} placeholder="Order" className={inputCls} />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="published" defaultChecked={t?.published ?? false} />
        Published (visible on the marketing site)
      </label>
    </>
  );
}

function CreateForm() {
  const [state, action, pending] = useActionState(createTestimonialAction, empty);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold">Add a testimonial</h2>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Fields />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}

function Row({ item }: { item: Testimonial }) {
  const [state, action, pending] = useActionState(updateTestimonialAction, empty);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
          }`}
        >
          {item.published ? "Published" : "Draft"}
        </span>
        <div className="flex gap-2">
          <form action={togglePublishedAction}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="published" value={item.published ? "false" : "true"} />
            <button className="rounded border border-gray-300 px-3 py-1 text-xs hover:border-gray-500">
              {item.published ? "Unpublish" : "Publish"}
            </button>
          </form>
          {confirmDelete ? (
            <form action={deleteTestimonialAction}>
              <input type="hidden" name="id" value={item.id} />
              <button className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700">
                Confirm delete
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded border border-red-300 px-3 py-1 text-xs text-red-600 hover:border-red-500"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={item.id} />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-green-600">Saved.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Fields t={item} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:border-gray-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

export function TestimonialsManager({ items }: { items: Testimonial[] }) {
  return (
    <div className="flex flex-col gap-4">
      <CreateForm />
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No testimonials yet.</p>
      ) : (
        items.map((item) => <Row key={item.id} item={item} />)
      )}
    </div>
  );
}
