"use client";

import { useActionState, useState } from "react";
import { addToCart, type AddToCartState } from "./actions";

const initialState: AddToCartState = {};

export function AddToCartForm({
  productVariantId,
  maxQuantity,
}: {
  productVariantId: string;
  maxQuantity: number;
}) {
  const [state, formAction, isPending] = useActionState(addToCart, initialState);
  const [quantity, setQuantity] = useState(1);

  if (maxQuantity <= 0) {
    return <p className="text-sm text-gray-500">Out of stock</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="productVariantId" value={productVariantId} />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.notice && <p className="text-sm text-amber-700">{state.notice}</p>}
      {state.ok && !state.notice && <p className="text-sm text-green-700">Added to cart.</p>}
      <div className="flex items-center gap-2">
        <input
          type="number"
          name="quantity"
          min={1}
          max={maxQuantity}
          required
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          onWheel={(e) => e.currentTarget.blur()}
          className="w-20 rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add to Cart"}
        </button>
      </div>
    </form>
  );
}
