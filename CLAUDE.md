# CLAUDE.md — Project Instructions

This file is read automatically at the start of every Claude Code session in this repo. It is the working contract for how this project gets built. Full context and rationale live in `PROJECT_PLAN.md` at the repo root — read it once at project start and whenever a phase changes; this file is the condensed, load-bearing summary you should follow every session.

## What this project is

A multi-tenant e-commerce SaaS platform for the Bangladesh market — merchants sign up, each gets their own online store (subdomain or custom domain), storefront, and admin dashboard, with (over time) AI-assisted tools. Modeled architecturally on a competitor audit (BitCommerz), not on its brand — see "Do not copy" below.

**Stack:** Next.js 16 (Turbopack, App Router), Postgres, Redis, Docker Compose, deployed on a single Hostinger VPS (Ubuntu 24.04, 2 vCPU / 8 GB RAM) behind Caddy \+ Cloudflare. Object storage on Cloudflare R2. Bengali \+ English UI (persisted toggle).

## Non-negotiable rules — check every change against these

1. **Every tenant-scoped table has a `store_id`, and every query is scoped by it.** No query against a tenant-scoped table skips this filter, ever. If you're writing a query and can't immediately point to the `store_id` filter, stop and fix it before moving on.  
2. **Postgres Row-Level Security is on for every tenant-scoped table**, as a second layer under the app-layer scoping above. When you add a new tenant-scoped table, add its RLS policy in the same migration — never as a follow-up.  
3. **Two billing systems, never merged in code:** `Order`/`Payment`/`Invoice` \= a customer paying a merchant. `Store.subscription`/`PlatformInvoice` \= a merchant paying the platform. Keep the naming and the modules separate.  
4. **Every marketing number, price, and feature claim lives in exactly one place** (a constant, a CMS field, a DB row) and every page that shows it reads from that one place. Never hand-write the same figure into two components — this was the single biggest bug class found in the competitor audit.  
5. **External integrations (payment, courier, SMS) go behind one internal adapter interface per concern**, with one implementation per provider. The app calls the interface, never a specific provider's SDK directly, outside that provider's own adapter file.  
6. **No fragile scroll-jacked/IntersectionObserver-driven carousels for anything load-bearing** (feature showcases, product carousels). Use a tested library or a simple paginated/tabbed layout instead.  
7. **Never render raw internal identifiers, category paths, or enum values as user-facing labels.** Always map to a clean display string.  
8. **Any count or claim shown to users (review count, "X merchants," etc.) must be either live/accurate or absent.** Don't hardcode an aspirational number.  
9. **Filter out demo/seed/test data from anything a real customer or merchant can see in production.** Add an `is_demo` flag if you need test fixtures that resemble real data.  
10. **Secrets never get committed.** `.env` is gitignored from the first commit.

## Do not copy

Don't reuse BitCommerz's name, logo, exact color hex values as "the brand," or any of its marketing copy verbatim — those belong to Bit Byte Technology Ltd. Building similar *functionality* is fine and is the whole point of this project; copying their specific brand identity is not, and also isn't useful once we have our own name. Ask the user for the project's real name/branding if it isn't decided yet, and use a clearly generic placeholder (e.g. "Platform") in code and copy until it is.

## Out of scope — do not build

Explicitly excluded by the user, even though the audited competitor has them:

- **POS (point-of-sale) system.** No in-person register/checkout mode, no card-reader/hardware integration, no "sell in-store" flow of any kind.  
- **Physical store / shop-location management.** No store-locator, no walk-in shop address/hours/map/360°-tour fields, no public-facing "visit us" features.

Don't add these back "for completeness" — if a later phase seems to need them, ask first. Note this is distinct from **multi-warehouse stock**, which stays in scope: a merchant can still hold inventory across multiple *fulfillment* warehouses for online orders — that's a backend stock-allocation concern, not a physical retail feature.

## Current phase

Track progress here — update this section as phases complete. Start here:

- [x] **Phase 0 — Foundation (local dev complete):** Next.js 16 scaffold, Postgres \+ RLS (verified: `amarshop_app` role genuinely bound by RLS, migration role bypasses as expected), Redis, Docker Compose, staff auth with roles (Auth.js, owner/admin/staff \+ platform-admin flag), store creation flow, `proxy.ts` host-based tenant resolution — all built and tested against the local Docker stack.  
  - [ ] **Deferred — needs a real VPS:** server hardening (UFW/fail2ban/unattended-upgrades); the GitHub Actions CI/CD deploy pipeline; and activating custom-domain TLS — point docker-compose's `caddy` service at `Caddyfile.production` (on-demand TLS + the `/api/internal/domain-check` ask endpoint), set `PLATFORM_PUBLIC_IP`, and for real `*.PLATFORM_ROOT_DOMAIN` wildcard TLS rebuild Caddy with a DNS-01 provider plugin via xcaddy. The custom-domain admin flow + DNS verification are already built and testable locally with `CUSTOM_DOMAIN_VERIFY_MODE=trust`. Come back to these the moment a VPS is provisioned, before real users touch it — don't let "we're on Phase 1 now" become a reason to skip them later.  
- [x] **Phase 1 — Core commerce MVP (local dev complete):** storefront (home/category/product/cart/checkout/search), guest checkout with COD \+ SSLCommerz (IPN \+ Order Validation, per-store credentials from the admin), manual order entry and the full status pipeline, all three courier adapters behind one interface (credentials per store), auto-generated invoice PDFs, guest order tracking (`/track`), custom domains (admin flow \+ DNS verification \+ Caddy on-demand-TLS ask endpoint), admin shell \+ dashboard, Bengali/English toggle across storefront and admin. Closed out with a QA pass against `PROJECT_PLAN.md` Section 2's bug list — see the "Phase 1 closeout" commit.  
  - [ ] **Not yet exercised against real providers:** SSLCommerz, REDX/Pathao/Steadfast are built to their published contracts but no live merchant account exists yet. Run one real sandbox transaction per provider before any real customer does.  
- [x] **Phase 2 — Growth features (local dev complete):** discount/coupon codes (percent / fixed / free-delivery, total + per-phone limits); staff management UI + own-password change; bulk CSV product import; merchant Meta Pixel / GA4 storefront tags; low-stock alerts in the admin bell (per-store threshold); SMS adapter (BulkSMSBD + `log` dev mode) behind one interface, with order-placed / order-shipped notifications via `after()`; incomplete-checkout leads (debounced capture at checkout, manual phone follow-up, converted-on-order); blog / CMS (one `content_entries` table for posts + static pages, markdown via `marked` + `sanitize-html`, `/blog` + `/pages/[slug]` + footer links + the app's first `generateMetadata`); manual bKash / Nagad payment behind the `PaymentAdapter` interface (per-store numbers, customer enters TrxID, merchant marks paid). Closed out with a QA pass against `PROJECT_PLAN.md` Section 2's bug list — see the "Phase 2 closeout" commit.  
  - [ ] **Not yet exercised against real providers:** BulkSMSBD and the manual-wallet flow are built to their published contracts / the merchant's own instructions but no live account has sent a real message / verified a real payment. Plus the Phase 1 carry-over: SSLCommerz + REDX/Pathao/Steadfast still need one real sandbox transaction each.  
- [ ] Phase 3 — AI features (**current**)  
- [ ] Phase 4 — Multi-warehouse expansion (no POS — see "Out of scope" above)  
- [ ] Phase 5 — Platform billing/business layer  
- [ ] Phase 6 — Ecosystem (apps/developer platform)

Do not start work from a later phase before the current one is checked off, even if it looks quick — `PROJECT_PLAN.md` Section 8 explains why the order matters.

## Conventions

- Tenant/store resolution happens once, in `proxy.ts`, and the resolved store is attached to request context — don't re-derive it ad hoc in individual routes.  
- Courier and payment adapters live in their own module per provider, implementing a shared interface (`CourierAdapter`, `PaymentAdapter`) — see `PROJECT_PLAN.md` Section 5 for the exact shape.  
- Background/async work (invoice PDF generation, fraud-score calculation, cart-recovery SMS) goes through a Redis-backed job queue, not inline in the request path.  
- Prefer Server Components and Server Actions where the data doesn't need client-side interactivity; reach for client components deliberately, not by default.  
- Write migrations, not manual schema edits — every schema change is a migration file, including RLS policy changes.

## Before marking any feature "done"

Run it against the audit's own bug list (`PROJECT_PLAN.md` Section 2): does this page restate a number that lives elsewhere? Does any interactive component depend on fragile scroll-position math? Is any internal string leaking into the UI unformatted? Is any count shown to users actually backed by real data?  
