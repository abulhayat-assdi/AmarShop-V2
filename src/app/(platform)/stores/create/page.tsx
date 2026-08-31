import { requirePlatformAdminPage } from "@/lib/auth/roles";
import { CreateStoreForm } from "./CreateStoreForm";

export default async function CreateStorePage() {
  await requirePlatformAdminPage();
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Create your store</h1>
      <CreateStoreForm />
    </main>
  );
}
