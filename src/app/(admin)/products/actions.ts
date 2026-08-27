"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants } from "@/db/schema";
import { uniqueSlug } from "@/lib/slugify";
import {
  countProductMedia,
  removeProductMedia,
  storeProductMedia,
  validateMediaFiles,
} from "@/lib/products/media";

function formMediaFiles(formData: FormData): { images: File[]; videos: File[] } {
  const pick = (name: string) =>
    formData.getAll(name).filter((v): v is File => v instanceof File);
  return { images: pick("images"), videos: pick("videos") };
}

export type ProductField = "name" | "categoryId" | "sku" | "price" | "quantity";
export type ProductFormState = { error?: string; field?: ProductField };

type ParsedProduct = {
  name: string;
  categoryId: string | null;
  brand: string | null;
  description: string | null;
  vatPercent: string;
  sku: string;
  price: string;
  discountedPrice: string | null;
  quantity: number;
};

function parseProductForm(formData: FormData): { error: ProductFormState } | { data: ParsedProduct } {
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const vatPercent = String(formData.get("vatPercent") ?? "").trim() || "0";
  const sku = String(formData.get("sku") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const discountedPriceRaw = String(formData.get("discountedPrice") ?? "").trim();
  const quantityRaw = String(formData.get("quantity") ?? "").trim();

  if (!name) return { error: { error: "Product name is required.", field: "name" } };
  if (!sku) return { error: { error: "SKU is required.", field: "sku" } };

  const priceNum = Number(price);
  if (!price || Number.isNaN(priceNum) || priceNum < 0) {
    return { error: { error: "Enter a valid price.", field: "price" } };
  }

  const quantity = quantityRaw === "" ? 0 : Number(quantityRaw);
  if (Number.isNaN(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
    return { error: { error: "Enter a valid whole-number stock quantity.", field: "quantity" } };
  }

  return {
    data: {
      name,
      categoryId,
      brand,
      description,
      vatPercent,
      sku,
      price,
      discountedPrice: discountedPriceRaw || null,
      quantity,
    },
  };
}

function isUniqueViolation(err: unknown, constraint: string): boolean {
  const cause = (err as { cause?: unknown } | null)?.cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: string }).code === "23505" &&
    (cause as { constraint_name?: string }).constraint_name === constraint
  );
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const session = await requireStaffSession();
  const parsed = parseProductForm(formData);
  if ("error" in parsed) return parsed.error;
  const { name, categoryId, brand, description, vatPercent, sku, price, discountedPrice, quantity } =
    parsed.data;

  // Validate media before creating anything — pure type/size/count checks,
  // so a bad file never leaves a half-made product behind.
  const newMedia = formMediaFiles(formData);
  const mediaCheck = validateMediaFiles(newMedia.images, newMedia.videos);
  if ("error" in mediaCheck) return { error: mediaCheck.error };

  let newProductId: string;
  try {
    newProductId = await withStoreContext(session.user.storeId, async (tx) => {
      if (categoryId) {
        // Confirms the category belongs to THIS store, not just that some
        // category with this id exists somewhere — RLS already guarantees
        // this (the row is invisible under another tenant's context), but
        // the check is kept explicit here per CLAUDE.md rule #1 rather than
        // relying solely on RLS to catch a mismatched id from the client.
        const [validCategory] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(and(eq(categories.storeId, session.user.storeId), eq(categories.id, categoryId)))
          .limit(1);
        if (!validCategory) {
          throw Object.assign(new Error("Invalid category"), { isInvalidCategory: true });
        }
      }

      const slug = await uniqueSlug(name, async (candidate) => {
        const [existing] = await tx
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.storeId, session.user.storeId), eq(products.slug, candidate)))
          .limit(1);
        return Boolean(existing);
      });

      const [product] = await tx
        .insert(products)
        .values({
          storeId: session.user.storeId,
          categoryId,
          name,
          slug,
          brand,
          description,
          vatPercent,
        })
        .returning();

      await tx.insert(productVariants).values({
        storeId: session.user.storeId,
        productId: product.id,
        sku,
        price,
        discountedPrice,
        quantity,
      });

      return product.id;
    });
  } catch (err) {
    if (isUniqueViolation(err, "product_variants_store_sku_idx")) {
      return { error: "That SKU is already in use — try another one.", field: "sku" };
    }
    if ((err as { isInvalidCategory?: boolean } | null)?.isInvalidCategory) {
      return { error: "Please choose a valid category.", field: "categoryId" };
    }
    throw err;
  }

  await storeProductMedia(session.user.storeId, newProductId, mediaCheck.ok);

  revalidatePath("/products");
  // Land on the edit page — that's where media management lives.
  redirect(`/products/${newProductId}/edit`);
}

export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const session = await requireStaffSession();
  const parsed = parseProductForm(formData);
  if ("error" in parsed) return parsed.error;
  const { name, categoryId, brand, description, vatPercent, sku, price, discountedPrice, quantity } =
    parsed.data;

  const newMedia = formMediaFiles(formData);
  let mediaToStore: { images: File[]; videos: File[] } = { images: [], videos: [] };
  if (newMedia.images.length > 0 || newMedia.videos.length > 0) {
    const existing = await countProductMedia(session.user.storeId, productId);
    const mediaCheck = validateMediaFiles(newMedia.images, newMedia.videos, existing);
    if ("error" in mediaCheck) return { error: mediaCheck.error };
    mediaToStore = mediaCheck.ok;
  }

  try {
    await withStoreContext(session.user.storeId, async (tx) => {
      if (categoryId) {
        const [validCategory] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(and(eq(categories.storeId, session.user.storeId), eq(categories.id, categoryId)))
          .limit(1);
        if (!validCategory) {
          throw Object.assign(new Error("Invalid category"), { isInvalidCategory: true });
        }
      }

      const [product] = await tx
        .update(products)
        .set({ categoryId, name, brand, description, vatPercent, updatedAt: new Date() })
        .where(and(eq(products.storeId, session.user.storeId), eq(products.id, productId)))
        .returning();

      if (!product) {
        throw Object.assign(new Error("Product not found"), { isNotFound: true });
      }

      await tx
        .update(productVariants)
        .set({ sku, price, discountedPrice, quantity, updatedAt: new Date() })
        .where(
          and(
            eq(productVariants.storeId, session.user.storeId),
            eq(productVariants.productId, productId)
          )
        );
    });
  } catch (err) {
    if (isUniqueViolation(err, "product_variants_store_sku_idx")) {
      return { error: "That SKU is already in use — try another one.", field: "sku" };
    }
    if ((err as { isInvalidCategory?: boolean } | null)?.isInvalidCategory) {
      return { error: "Please choose a valid category.", field: "categoryId" };
    }
    if ((err as { isNotFound?: boolean } | null)?.isNotFound) {
      return { error: "Product not found." };
    }
    throw err;
  }

  if (mediaToStore.images.length > 0 || mediaToStore.videos.length > 0) {
    await storeProductMedia(session.user.storeId, productId, mediaToStore);
  }

  revalidatePath(`/products/${productId}/edit`);
  revalidatePath("/products");
  redirect("/products");
}

// Bound with (productId, mediaId) from the edit form's per-item "Remove"
// button — same bound-server-action pattern as the order detail page.
export async function deleteProductMedia(productId: string, mediaId: string) {
  const session = await requireStaffSession();
  await removeProductMedia(session.user.storeId, productId, mediaId);
  revalidatePath(`/products/${productId}/edit`);
  revalidatePath("/products");
}
