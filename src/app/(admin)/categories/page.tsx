import { eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { categories } from "@/db/schema";
import { CreateCategoryForm } from "./CreateCategoryForm";

export default async function CategoriesPage() {
  const session = await requireStaffSession();

  const rows = await withStoreContext(session.user.storeId, (tx) =>
    tx.select().from(categories).where(eq(categories.storeId, session.user.storeId))
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <CreateCategoryForm />
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Name</th>
            <th className="py-2">Slug</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-4 text-gray-500">
                No categories yet.
              </td>
            </tr>
          ) : (
            rows.map((category) => (
              <tr key={category.id} className="border-b">
                <td className="py-2">{category.name}</td>
                <td className="py-2 text-gray-500">{category.slug}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
