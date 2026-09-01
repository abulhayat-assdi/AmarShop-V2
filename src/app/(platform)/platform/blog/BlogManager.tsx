"use client";

import { useActionState, useState } from "react";
import type { BlogPost } from "@/db/schema";
import {
  createPostAction,
  updatePostAction,
  togglePostPublishedAction,
  deletePostAction,
  type BlogManagerState,
} from "./actions";

const empty: BlogManagerState = {};
const inputCls = "rounded border border-gray-300 px-3 py-2 text-sm";

function Fields({ p }: { p?: BlogPost }) {
  return (
    <>
      <input name="title" defaultValue={p?.title ?? ""} placeholder="Title *" required className={inputCls} />
      <input name="slug" defaultValue={p?.slug ?? ""} placeholder="Slug (auto from title if blank)" className={inputCls} />
      <input name="category" defaultValue={p?.category ?? ""} placeholder="Category label, e.g. Guides (optional)" className={inputCls} />
      <input name="authorName" defaultValue={p?.authorName ?? ""} placeholder="Author (optional)" className={inputCls} />
      <input name="coverImageUrl" defaultValue={p?.coverImageUrl ?? ""} placeholder="Cover image URL (optional)" className={`${inputCls} sm:col-span-2`} />
      <input name="excerpt" defaultValue={p?.excerpt ?? ""} placeholder="Excerpt (optional)" className={`${inputCls} sm:col-span-2`} />
      <textarea name="bodyMarkdown" defaultValue={p?.bodyMarkdown ?? ""} placeholder="Body (Markdown) *" required rows={8} className={`${inputCls} sm:col-span-2 font-mono`} />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="published" defaultChecked={p?.published ?? false} />
        Published (visible on the marketing site)
      </label>
    </>
  );
}

function CreateForm() {
  const [state, action, pending] = useActionState(createPostAction, empty);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold">New post</h2>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Fields />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add post"}
      </button>
    </form>
  );
}

function Row({ post }: { post: BlogPost }) {
  const [state, action, pending] = useActionState(updatePostAction, empty);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              post.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            {post.published ? "Published" : "Draft"}
          </span>
          <span className="text-xs text-gray-400">/blog/{post.slug}</span>
        </div>
        <div className="flex gap-2">
          <form action={togglePostPublishedAction}>
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="published" value={post.published ? "false" : "true"} />
            <button className="rounded border border-gray-300 px-3 py-1 text-xs hover:border-gray-500">
              {post.published ? "Unpublish" : "Publish"}
            </button>
          </form>
          {confirmDelete ? (
            <form action={deletePostAction}>
              <input type="hidden" name="id" value={post.id} />
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
        <input type="hidden" name="id" value={post.id} />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-green-600">Saved.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Fields p={post} />
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

export function BlogManager({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="flex flex-col gap-4">
      <CreateForm />
      {posts.length === 0 ? (
        <p className="text-sm text-gray-500">No posts yet.</p>
      ) : (
        posts.map((post) => <Row key={post.id} post={post} />)
      )}
    </div>
  );
}
