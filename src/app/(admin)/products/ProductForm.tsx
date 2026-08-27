"use client";

import { useActionState, useState } from "react";
import { ProductMedia } from "@/components/product-media";
import { MEDIA_UPLOAD_HINT } from "@/lib/products/media-constants";
import { deleteProductMedia } from "./actions";
import type { ProductField, ProductFormState } from "./actions";

type CategoryOption = { id: string; name: string };

type ExistingMedia = { id: string; kind: "image" | "video"; url: string };

type ProductFormValues = {
  name: string;
  categoryId: string;
  brand: string;
  description: string;
  vatPercent: string;
  sku: string;
  price: string;
  discountedPrice: string;
  quantity: string;
};

const emptyValues: ProductFormValues = {
  name: "",
  categoryId: "",
  brand: "",
  description: "",
  vatPercent: "0",
  sku: "",
  price: "",
  discountedPrice: "",
  quantity: "0",
};

const initialState: ProductFormState = {};

type ProductFormProps = {
  action: (prevState: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: CategoryOption[];
  submitLabel: string;
  initialValues?: ProductFormValues;
  // Edit only: the product's current media, with a per-item remove button.
  productId?: string;
  existingMedia?: ExistingMedia[];
};

// Shared by create and edit — same controlled-inputs + per-field red-border
// pattern as src/app/(platform)/stores/create/CreateStoreForm.tsx (React
// resets uncontrolled form fields after any action completes, success or
// handled error — controlled inputs are what actually survives that).
export function ProductForm({
  action,
  categories,
  submitLabel,
  initialValues,
  productId,
  existingMedia,
}: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const values = initialValues ?? emptyValues;

  const [name, setName] = useState(values.name);
  const [categoryId, setCategoryId] = useState(values.categoryId);
  const [brand, setBrand] = useState(values.brand);
  const [description, setDescription] = useState(values.description);
  const [vatPercent, setVatPercent] = useState(values.vatPercent);
  const [sku, setSku] = useState(values.sku);
  const [price, setPrice] = useState(values.price);
  const [discountedPrice, setDiscountedPrice] = useState(values.discountedPrice);
  const [quantity, setQuantity] = useState(values.quantity);

  function errorBorder(field: ProductField) {
    return state.field === field ? "border-red-500 focus:border-red-500" : "border-gray-300";
  }

  // Number inputs change value on mouse-wheel scroll while focused — a
  // well-known footgun where scrolling the page past a focused price/stock
  // field silently changes it. Blurring on wheel keeps typing and the
  // native up/down arrows working, and just lets the scroll pass through
  // as a normal page scroll instead.
  function blurOnWheel(e: React.WheelEvent<HTMLInputElement>) {
    e.currentTarget.blur();
  }

  // The "Current media" block sits OUTSIDE the main form on purpose — each
  // remove button is its own <form>, and forms can't nest.
  return (
    <div className="flex flex-col gap-6">
      {productId && existingMedia && existingMedia.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Current media</span>
          <div className="flex flex-wrap gap-3">
            {existingMedia.map((item) => (
              <div key={item.id} className="flex w-24 flex-col items-center gap-1">
                <ProductMedia item={item} className="w-24 border" />
                <form action={deleteProductMedia.bind(null, productId, item.id)}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        {state.error && (
          <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <label className="flex flex-col gap-1">
          Product name
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`rounded border px-3 py-2 ${errorBorder("name")}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          Category
          <select
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`rounded border px-3 py-2 ${errorBorder("categoryId")}`}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Brand (optional)
          <input
            name="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Description (optional)
          <textarea
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          VAT %
          <input
            name="vatPercent"
            type="number"
            step="0.01"
            min="0"
            value={vatPercent}
            onChange={(e) => setVatPercent(e.target.value)}
            onWheel={blurOnWheel}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            Photos {productId ? "(add more)" : "(optional)"}
            <input
              type="file"
              name="images"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            Videos {productId ? "(add more)" : "(optional)"}
            <input
              type="file"
              name="videos"
              accept="video/mp4,video/webm"
              multiple
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <span className="text-xs text-gray-500">{MEDIA_UPLOAD_HINT}</span>
        </div>
        <hr />
        <label className="flex flex-col gap-1">
          SKU
          <input
            name="sku"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={`rounded border px-3 py-2 ${errorBorder("sku")}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          Price
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onWheel={blurOnWheel}
            className={`rounded border px-3 py-2 ${errorBorder("price")}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          Discounted price (optional)
          <input
            name="discountedPrice"
            type="number"
            step="0.01"
            min="0"
            value={discountedPrice}
            onChange={(e) => setDiscountedPrice(e.target.value)}
            onWheel={blurOnWheel}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Stock quantity
          <input
            name="quantity"
            type="number"
            step="1"
            min="0"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onWheel={blurOnWheel}
            className={`rounded border px-3 py-2 ${errorBorder("quantity")}`}
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
      </form>
    </div>
  );
}
