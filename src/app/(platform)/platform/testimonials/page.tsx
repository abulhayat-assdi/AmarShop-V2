import { requirePlatformAdminPage } from "@/lib/auth/roles";
import { listTestimonialsForAdmin } from "@/lib/testimonials/query";
import { TestimonialsManager } from "./TestimonialsManager";

// Where a platform operator curates the quotes on the public marketing
// site's /testimonials page + homepage preview. English-only operator
// tool (like /stores/create); the merchant-facing side is bilingual.
export default async function PlatformTestimonialsPage() {
  await requirePlatformAdminPage();
  const items = await listTestimonialsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Testimonials</h1>
        <p className="text-sm text-gray-600">
          Merchant quotes for the public marketing site. Only <strong>published</strong> ones are
          shown, and the site links to the page only when at least one is published.
        </p>
      </div>
      <TestimonialsManager items={items} />
    </div>
  );
}
