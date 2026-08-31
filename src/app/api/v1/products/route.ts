import { and, desc, eq, inArray } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants } from "@/db/schema";
import {
  authenticateApi,
  jsonCreated,
  jsonError,
  jsonOk,
  readJson,
  readPage,
} from "@/lib/api/http";
import { productToDto } from "@/lib/api/dto";
import { loadProductDto } from "@/lib/api/records";
import { BadField, money, nonNegInt, optStr, str } from "@/lib/api/validate";
import { checkPlanLimit } from "@/lib/billing/limits";
import { uniqueSlug } from "@/lib/slugify";
import { PRODUCT_STATUSES } from "@/lib/enum-labels";

export async function GET(req: Request) {
  const ctx = await authenticateApi(req, "read:products");
  if (!("storeId" in ctx)) return ctx;

  const { page, limit, offset } = readPage(req.url);
  const status = new URL(req.url).searchParams.get("status");
  if (status && !(PRODUCT_STATUSES as string[]).includes(status)) {
    return jsonError(400, "bad_request", "Unknown `status` value.");
  }

  const data = await withStoreContext(ctx.storeId, async (tx) => {
    const conds = [eq(products.storeId, ctx.storeId)];
    if (status) conds.push(eq(products.status, status as (typeof PRODUCT_STATUSES)[number]));

    const rows = await tx
      .select({ product: products, categoryName: categories.name })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(...conds))
      .orderBy(desc(products.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const pageRows = rows.slice(0, limit);
    const ids = pageRows.map((r) => r.product.id);
    const variants = ids.length
      ? await tx
          .select()
          .from(productVariants)
          .where(
            and(eq(productVariants.storeId, ctx.storeId), inArray(productVariants.productId, ids))
          )
      : [];

    const byProduct = new Map<string, typeof variants>();
    for (const v of variants) {
      const list = byProduct.get(v.productId) ?? [];
      list.push(v);
      byProduct.set(v.productId, list);
    }

    return {
      dtos: pageRows.map((r) =>
        productToDto(
          r.product,
          byProduct.get(r.product.id) ?? [],
          r.product.categoryId && r.categoryName
            ? { id: r.product.categoryId, name: r.categoryName }
            : null
        )
      ),
      hasMore: rows.length > limit,
    };
  });

  return jsonOk(data.dtos, { page, limit, hasMore: data.hasMore });
}

type VariantInput = { sku: string; price: string; quantity: number; discountedPrice: string | null; optionsLabel: string | null };

// POST /api/v1/products — create a physical product with one or more
// variants. Body: { name, categoryId?, brand?, description?, vatPercent?,
// status?, variants: [{ sku, price, quantity?, discountedPrice?,
// optionsLabel? }] }. Counts against the plan's product cap. Digital
// products are admin-only for now.
export async function POST(req: Request) {
  const ctx = await authenticateApi(req, "write:products");
  if (!("storeId" in ctx)) return ctx;

  const body = await readJson(req);
  if (!body) return jsonError(400, "bad_request", "Send a JSON object body.");

  let name: string;
  let categoryId: string | null;
  let brand: string | null;
  let description: string | null;
  let vatPercent: string;
  let status: (typeof PRODUCT_STATUSES)[number];
  let variants: VariantInput[];
  try {
    name = str(body.name, "name", 200);
    categoryId = optStr(body.categoryId, "categoryId", 64);
    brand = optStr(body.brand, "brand", 120);
    description = optStr(body.description, "description", 5000);
    vatPercent = "vatPercent" in body ? money(body.vatPercent, "vatPercent") : "0";
    status =
      "status" in body
        ? (str(body.status, "status", 16) as (typeof PRODUCT_STATUSES)[number])
        : "draft";
    if (!(PRODUCT_STATUSES as string[]).includes(status)) {
      return jsonError(400, "bad_request", "Unknown `status` value.");
    }

    const rawVariants = body.variants;
    if (!Array.isArray(rawVariants) || rawVariants.length === 0) {
      return jsonError(400, "bad_request", "`variants` must be a non-empty array.");
    }
    variants = rawVariants.map((v, i) => {
      const o = (v ?? {}) as Record<string, unknown>;
      return {
        sku: str(o.sku, `variants[${i}].sku`, 64),
        price: money(o.price, `variants[${i}].price`),
        quantity: "quantity" in o ? nonNegInt(o.quantity, `variants[${i}].quantity`) : 0,
        discountedPrice:
          o.discountedPrice == null ? null : money(o.discountedPrice, `variants[${i}].discountedPrice`),
        optionsLabel: optStr(o.optionsLabel, `variants[${i}].optionsLabel`, 120),
      };
    });
    for (const [i, v] of variants.entries()) {
      if (v.discountedPrice != null && Number(v.discountedPrice) >= Number(v.price)) {
        return jsonError(400, "bad_request", `variants[${i}].discountedPrice must be less than price.`);
      }
    }
  } catch (e) {
    if (e instanceof BadField) return jsonError(400, "bad_request", e.message);
    throw e;
  }

  const plan = await checkPlanLimit(ctx.storeId, "products", 1);
  if (!plan.ok) {
    return jsonError(
      403,
      "plan_limit",
      `Your plan allows ${plan.limit} products and ${plan.used} exist. Upgrade to add more.`
    );
  }

  let created: { code: 400; message: string } | { code: 201; dto: NonNullable<Awaited<ReturnType<typeof loadProductDto>>> };
  try {
    created = await withStoreContext(ctx.storeId, async (tx) => {
      if (categoryId) {
        const [cat] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(and(eq(categories.storeId, ctx.storeId), eq(categories.id, categoryId)))
          .limit(1);
        if (!cat) {
          return { code: 400 as const, message: "`categoryId` is not a category in this store." };
        }
      }

      const slug = await uniqueSlug(name, async (candidate) => {
        const [hit] = await tx
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.storeId, ctx.storeId), eq(products.slug, candidate)))
          .limit(1);
        return Boolean(hit);
      });

      // A duplicate-SKU throw here rolls the whole transaction back — it's
      // caught OUTSIDE withStoreContext so no orphan product row commits.
      const [product] = await tx
        .insert(products)
        .values({ storeId: ctx.storeId, categoryId, name, slug, brand, description, vatPercent, status })
        .returning({ id: products.id });

      await tx.insert(productVariants).values(
        variants.map((v) => ({
          storeId: ctx.storeId,
          productId: product.id,
          sku: v.sku,
          price: v.price,
          discountedPrice: v.discountedPrice,
          quantity: v.quantity,
          optionsLabel: v.optionsLabel,
        }))
      );

      const dto = await loadProductDto(tx, ctx.storeId, product.id);
      return { code: 201 as const, dto: dto! };
    });
  } catch (err) {
    if (isUniqueViolation(err, "product_variants_store_sku_idx")) {
      return jsonError(409, "sku_taken", "A variant with that SKU already exists in this store.");
    }
    throw err;
  }

  if (created.code === 400) return jsonError(400, "bad_request", created.message);
  return jsonCreated(created.dto);
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
