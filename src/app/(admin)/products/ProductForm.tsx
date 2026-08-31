"use client";

import { useActionState, useState } from "react";
import { ProductMedia } from "@/components/product-media";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MEDIA_UPLOAD_HINT,
} from "@/lib/products/media-constants";
import { useTranslator } from "@/components/i18n-provider";
import { deleteProductMedia, removeDigitalFileAction } from "./actions";
import type { ProductField, ProductFormState } from "./actions";
import {
  generateDescriptionAction,
  generateSeoAction,
  type AiDescState,
  type AiSeoState,
} from "./ai-actions";

type CategoryOption = { id: string; name: string };

type ExistingMedia = { id: string; kind: "image" | "video"; url: string };
type ExistingDigitalFile = { id: string; fileName: string; sizeBytes: number };

type ProductFormValues = {
  name: string;
  categoryId: string;
  brand: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  vatPercent: string;
  sku: string;
  price: string;
  discountedPrice: string;
  quantity: string;
  isDigital: boolean;
};

const emptyValues: ProductFormValues = {
  name: "",
  categoryId: "",
  brand: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  vatPercent: "0",
  sku: "",
  price: "",
  discountedPrice: "",
  quantity: "0",
  isDigital: false,
};

const initialState: ProductFormState = {};
const initialAiState: AiDescState = {};
const initialSeoState: AiSeoState = {};

type ProductFormProps = {
  action: (prevState: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: CategoryOption[];
  submitLabel: string;
  initialValues?: ProductFormValues;
  // Edit only: the product's current media, with a per-item remove button.
  productId?: string;
  existingMedia?: ExistingMedia[];
  // Whether this store may sell digital products (stores.digitalEnabled).
  digitalAllowed?: boolean;
  // Edit only: the product's current digital PDF files.
  existingDigitalFiles?: ExistingDigitalFile[];
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
  digitalAllowed = false,
  existingDigitalFiles = [],
}: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [aiState, aiAction, aiPending] = useActionState(
    generateDescriptionAction,
    initialAiState,
  );
  const [seoState, seoAction, seoPending] = useActionState(
    generateSeoAction,
    initialSeoState,
  );
  const t = useTranslator();
  const values = initialValues ?? emptyValues;

  const [name, setName] = useState(values.name);
  const [categoryId, setCategoryId] = useState(values.categoryId);
  const [brand, setBrand] = useState(values.brand);
  const [description, setDescription] = useState(values.description);
  const [seoTitle, setSeoTitle] = useState(values.seoTitle);
  const [seoDescription, setSeoDescription] = useState(values.seoDescription);
  const [vatPercent, setVatPercent] = useState(values.vatPercent);
  const [sku, setSku] = useState(values.sku);
  const [price, setPrice] = useState(values.price);
  const [discountedPrice, setDiscountedPrice] = useState(values.discountedPrice);
  const [quantity, setQuantity] = useState(values.quantity);
  const [isDigital, setIsDigital] = useState(values.isDigital);

  // Render-time reconcile (same no-effect pattern as CheckoutForm's coupon
  // block): when the AI action returns fresh text, drop it into the
  // description field.
  const [handledAi, setHandledAi] = useState(aiState);
  if (aiState !== handledAi) {
    setHandledAi(aiState);
    if (aiState.text) setDescription(aiState.text);
  }
  const [handledSeo, setHandledSeo] = useState(seoState);
  if (seoState !== handledSeo) {
    setHandledSeo(seoState);
    if (seoState.title !== undefined) setSeoTitle(seoState.title);
    if (seoState.metaDescription !== undefined) setSeoDescription(seoState.metaDescription);
  }

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
          <span className="text-sm font-medium">{t("admin.products.currentMedia")}</span>
          <div className="flex flex-wrap gap-3">
            {existingMedia.map((item) => (
              <div key={item.id} className="flex w-24 flex-col items-center gap-1">
                <ProductMedia item={item} className="w-24 border" />
                <form action={deleteProductMedia.bind(null, productId, item.id)}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    {t("admin.products.remove")}
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
          {t("admin.products.productName")}
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`rounded border px-3 py-2 ${errorBorder("name")}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("admin.products.category")}
          <select
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`rounded border px-3 py-2 ${errorBorder("categoryId")}`}
          >
            <option value="">{t("admin.products.noCategory")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t("admin.products.brandOptional")}
          <input
            name="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>

        {digitalAllowed && (
          <div className="flex flex-col gap-2 rounded border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="isDigital"
                checked={isDigital}
                onChange={(e) => setIsDigital(e.target.checked)}
              />
              {t("admin.products.isDigital")}
            </label>
            {isDigital && (
              <>
                {existingDigitalFiles.length > 0 && (
                  <ul className="flex flex-col gap-1 text-sm">
                    {existingDigitalFiles.map((f) => (
                      <li key={f.id} className="flex items-center gap-3">
                        <span className="font-mono text-xs">{f.fileName}</span>
                        <span className="text-xs text-gray-400">
                          {(f.sizeBytes / 1024).toFixed(0)} KB
                        </span>
                        {productId && (
                          <form action={removeDigitalFileAction.bind(null, productId, f.id)}>
                            <button type="submit" className="text-xs text-red-600 underline">
                              {t("admin.products.removeFile")}
                            </button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <label className="flex flex-col gap-1 text-sm">
                  {t("admin.products.digitalFiles")}
                  <input
                    type="file"
                    name="digitalFiles"
                    accept="application/pdf,.pdf"
                    multiple
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <span className="text-xs text-gray-500">{t("admin.products.digitalFileHint")}</span>
                </label>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            {t("admin.products.descriptionOptional")}
            <textarea
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              formAction={aiAction}
              formNoValidate
              disabled={aiPending}
              className="self-start rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {aiPending ? t("admin.products.aiGenerating") : t("admin.products.aiGenerate")}
            </button>
            {aiState.error && <span className="text-sm text-red-700">{t(aiState.error)}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded border p-3">
          <label className="flex flex-col gap-1">
            {t("admin.products.seoTitleOptional")}
            <input
              name="seoTitle"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            {t("admin.products.seoDescriptionOptional")}
            <textarea
              name="seoDescription"
              rows={2}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              formAction={seoAction}
              formNoValidate
              disabled={seoPending}
              className="self-start rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {seoPending ? t("admin.products.aiSeoGenerating") : t("admin.products.aiSeoGenerate")}
            </button>
            {seoState.error && <span className="text-sm text-red-700">{t(seoState.error)}</span>}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          {t("admin.products.vat")}
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
            {t("admin.products.photos")}{" "}
            {productId ? t("admin.products.addMore") : t("admin.products.optional")}
            <input
              type="file"
              name="images"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              multiple
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            {t("admin.products.videos")}{" "}
            {productId ? t("admin.products.addMore") : t("admin.products.optional")}
            <input
              type="file"
              name="videos"
              accept={ALLOWED_VIDEO_TYPES.join(",")}
              multiple
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <span className="text-xs text-gray-500">{MEDIA_UPLOAD_HINT}</span>
        </div>
        <hr />
        <label className="flex flex-col gap-1">
          {t("admin.products.sku")}
          <input
            name="sku"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={`rounded border px-3 py-2 ${errorBorder("sku")}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("admin.products.price")}
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
          {t("admin.products.discountedPriceOptional")}
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
        {isDigital ? (
          <input type="hidden" name="quantity" value="0" />
        ) : (
          <label className="flex flex-col gap-1">
            {t("admin.products.stockQuantity")}
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
        )}
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("admin.common.saving") : submitLabel}
        </button>
      </form>
    </div>
  );
}
