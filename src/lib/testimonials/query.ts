import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { testimonials, type Testimonial } from "@/db/schema";

// Reads for the public marketing site and the /platform/testimonials
// admin. `testimonials` sits outside the RLS boundary (platform-owned
// marketing content, no tenant dimension — see the schema file), so these
// use the plain `db` handle with explicit filters.

// Published testimonials for the marketing site, best-ordered first.
// `limit` caps the homepage preview; omit it for the full /testimonials page.
export function getPublishedTestimonials(limit?: number): Promise<Testimonial[]> {
  const q = db
    .select()
    .from(testimonials)
    .where(eq(testimonials.published, true))
    .orderBy(asc(testimonials.displayOrder), desc(testimonials.createdAt));
  return limit ? q.limit(limit) : q;
}

// Cheap existence check — drives whether the homepage renders a
// testimonials section and whether the marketing nav shows the link at
// all (CLAUDE.md rule #8: no section, not an empty one, when there's
// nothing real to show).
export async function hasPublishedTestimonials(): Promise<boolean> {
  const [row] = await db
    .select({ id: testimonials.id })
    .from(testimonials)
    .where(eq(testimonials.published, true))
    .limit(1);
  return !!row;
}

// Every testimonial, for the platform admin list.
export function listTestimonialsForAdmin(): Promise<Testimonial[]> {
  return db
    .select()
    .from(testimonials)
    .orderBy(asc(testimonials.displayOrder), desc(testimonials.createdAt));
}

export async function getTestimonial(id: string): Promise<Testimonial | null> {
  const [row] = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  return row ?? null;
}
