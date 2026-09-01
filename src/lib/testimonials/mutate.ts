import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { testimonials, type Testimonial } from "@/db/schema";

// Writes for /platform/testimonials. Callers (the Server Actions) gate
// with requirePlatformAdmin() before reaching here — there is no RLS on
// this table (platform-owned marketing content, see the schema file), so
// the app-layer gate is the only guard.

export type TestimonialInput = {
  authorName: string;
  authorRole: string | null;
  quote: string;
  outcome: string | null;
  displayOrder: number;
  published: boolean;
};

export type TestimonialError = "author_required" | "quote_required";
export type TestimonialResult = { ok: true; id: string } | { ok: false; error: TestimonialError };

function clean(input: TestimonialInput): TestimonialInput | TestimonialError {
  const authorName = input.authorName.trim();
  const quote = input.quote.trim();
  if (!authorName) return "author_required";
  if (!quote) return "quote_required";
  return {
    authorName,
    authorRole: input.authorRole?.trim() || null,
    quote,
    outcome: input.outcome?.trim() || null,
    displayOrder: Number.isFinite(input.displayOrder) ? Math.trunc(input.displayOrder) : 0,
    published: input.published,
  };
}

export async function createTestimonial(input: TestimonialInput): Promise<TestimonialResult> {
  const c = clean(input);
  if (typeof c === "string") return { ok: false, error: c };
  const [row] = await db.insert(testimonials).values(c).returning({ id: testimonials.id });
  return { ok: true, id: row.id };
}

export async function updateTestimonial(
  id: string,
  input: TestimonialInput
): Promise<TestimonialResult> {
  const c = clean(input);
  if (typeof c === "string") return { ok: false, error: c };
  await db
    .update(testimonials)
    .set({ ...c, updatedAt: new Date() })
    .where(eq(testimonials.id, id));
  return { ok: true, id };
}

export async function setTestimonialPublished(id: string, published: boolean): Promise<void> {
  await db
    .update(testimonials)
    .set({ published, updatedAt: new Date() })
    .where(eq(testimonials.id, id));
}

export async function deleteTestimonial(id: string): Promise<void> {
  await db.delete(testimonials).where(eq(testimonials.id, id));
}

export type { Testimonial };
