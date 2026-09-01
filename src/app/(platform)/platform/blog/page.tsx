import { requirePlatformAdminPage } from "@/lib/auth/roles";
import { listPostsForAdmin } from "@/lib/blog/query";
import { BlogManager } from "./BlogManager";

// The platform's own content-marketing blog editor. English-only operator
// tool (like /stores/create); the merchant-facing /blog is bilingual.
export default async function PlatformBlogPage() {
  await requirePlatformAdminPage();
  const posts = await listPostsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Blog</h1>
        <p className="text-sm text-gray-600">
          Posts for the public marketing site&apos;s <strong>/blog</strong>. Only <strong>published</strong>{" "}
          posts appear, and the site links to /blog only when at least one is published. The body is
          Markdown (rendered + sanitised, same as the merchant blog).
        </p>
      </div>
      <BlogManager posts={posts} />
    </div>
  );
}
