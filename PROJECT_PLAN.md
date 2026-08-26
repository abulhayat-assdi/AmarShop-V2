# Multi-Tenant E-Commerce SaaS Platform — Project Plan

**Status:** Pre-development planning document **Prepared from:** the two BitCommerz audit reports (admin dashboard \+ public marketing/conversion site) produced earlier in this engagement, plus your answers below. **Your decisions so far:**

- **Model:** multi-tenant SaaS (many merchants, each with their own store) — same shape as BitCommerz itself.  
- **Scope ambition:** aim for close-to-full feature parity with BitCommerz over time.  
- **Stack:** Next.js full-stack.  
- **Hosting:** Hostinger VPS, KVM 2 plan — 2 vCPU, 8 GB RAM, 100 GB disk, 8 TB bandwidth, Ubuntu 24.04 LTS, Kuala Lumpur (Malaysia) datacenter, weekly snapshots (3 kept).  
- **Market:** Bangladesh, same as the audited product — Bengali \+ English UI, bKash/Nagad/Rocket payments, REDX/Pathao/Steadfast couriers.  
- **Scope exclusion:** POS (point-of-sale) and physical-store/shop-location management are explicitly **out of scope** — the audited product has both, this build won't. Multi-warehouse stock for *online* fulfillment stays in scope; it's a different concern (see Section 4 and Section 8, Phase 4).

This document is the "report." A companion file, `CLAUDE.md`, is the "instructions" — drop it in the root of your new repository and Claude Code will read it automatically at the start of every session. This document is the reference `CLAUDE.md` points back to.

---

## 1\. One honest note before anything else

"Full feature parity" is the right *north star*, but it is not a realistic *first milestone*. BitCommerz, as audited, is a mature product: AI writing/fraud tools, POS, multi-warehouse, a third-party app marketplace with its own OAuth flow, six-plus payment/courier integrations, a mobile app, and a full content/marketing site. Built solo — even with Claude Code doing a large share of the typing — that is realistically **6–12+ months of real work**, not weeks.

The plan below resolves this the way any competent engineering plan would: **architect the data model and platform for the full feature set from day one**, so nothing has to be rebuilt later, but **build and ship in phases**, so you have a real, usable, revenue-capable product after Phase 1 (core commerce) rather than an unfinished everything after month nine. Section 8 lays out the phases. Treat "full parity" as the destination, not the definition of done for launch.

One more housekeeping item: pick your **own brand name, domain, logo, and visual identity**. Everything in the two audit reports — copy, exact color values, the BitCommerz name and logo — belongs to Bit Byte Technology Ltd. Building a *similar product* (multi-tenant e-commerce SaaS for Bangladeshi merchants) is completely normal, legitimate competition — that's what the audit was for. Reusing their specific brand assets or marketing copy verbatim is not, and it also just makes your product forgettable. Everywhere this plan says "the platform," substitute your own name once you've picked one.

---

## 2\. What the two audits are actually worth to this project

The value of the audits isn't "here's a feature list to copy" — it's a working reference of what a mature version of this exact product looks like, plus a list of mistakes already made once that you can design around for free.

**Feature surface to replicate (drawn from both reports):** storefront \+ drag-and-drop no-code builder with 50+ templates; product/variant/inventory management with multi-warehouse support (fulfillment stock only — see scope exclusion above); order management with a full status pipeline; bKash/Nagad/Rocket/card/COD payments; REDX/Pathao/Steadfast courier booking with live tracking; auto-generated branded PDF invoices; abandoned-cart recovery; discounts/campaigns; custom domains; a blog/CMS; SMS gateway integration; staff accounts with role-based permissions; digital product sales; Facebook Pixel \+ Conversions API and GTM/GA4 tracking built in for merchants; AI product-description/SEO writing; AI fraud/risk scoring on COD orders; demand forecasting; product recommendations; a merchant-facing analytics dashboard; a public marketing site with pricing/testimonials/enterprise sales funnel; and, much later, a third-party developer platform/app marketplace with revenue share. **Not being replicated:** POS (point-of-sale) and physical-store/shop-location management — explicitly out of scope per your instruction.

**Mistakes to design around, for free, because someone already made them and you now know about them:**

- **Single source of truth for every number and claim.** The audited site independently states its "how fast can you launch" claim in at least seven different places with three different numbers, because the figure lives in copy scattered across components instead of one config value. Put every marketing figure, plan price, and feature count in one place (a CMS field, a constant, a database row) that every page reads from — never let two pages restate the same fact independently.  
- **Don't build fragile scroll-jacked carousels.** The homepage's pinned/scroll-triggered feature carousel had a real, reproducible bug where one of ten cards couldn't be reached by scrolling in either direction. If you want a "scrollytelling" feature showcase, use a well-tested library (e.g. Framer Motion's scroll utilities, or a simple tabbed/paginated layout) rather than hand-rolled IntersectionObserver boundary math.  
- **Never surface raw internal data in the UI.** The blog's category filter pills leaked raw taxonomy strings like `Marketing>Ecommerce|Uncategorized` straight from the CMS's internal category-path model. Always map internal IDs/paths to a clean display label before rendering.  
- **Don't let trust signals overstate what's actually there.** "50+ reviews" was claimed in three places against 4 real testimonials that didn't loop. If you show a count, make it live and accurate, or don't show a specific number until you have one worth showing.  
- **Keep seed/test data out of production surfaces.** A merchant named "testshop1" was visible in the live "trusted merchants" marquee. Anything pulled from a live API onto a public page needs a `is_demo`/`is_test` flag that's filtered out, or a review step before merchants go live.  
- **Confirm your tracking claims are true, not just written.** The audited site's "we track everything server-side, even past ad-blockers" pitch to merchants was verified as actually true of its own marketing site (GTM/GA4/Meta CAPI genuinely fire) — a real point in its favor. If you make the same pitch, dogfood it the same way, and be able to prove it the same way.  
- **One CTA per intent, per page.** The Enterprise page's bespoke "talk to sales" lead form was immediately followed by a generic "just sign yourself up" band — two conflicting asks in one scroll. Match the call-to-action to the page's actual audience.  
- **Default plan pre-selection.** No plan was pre-selected on the signup page, adding avoidable friction. Pre-select your recommended tier.

---

## 3\. Multi-tenancy architecture

**Tenancy model: row-level multi-tenancy in a single Postgres database.** Every tenant-scoped table carries a `store_id` (or `tenant_id`) column. This is the right choice for a solo team on one VPS — schema-per-tenant and database-per-tenant both multiply migration and operational complexity far beyond what one person can maintain, and row-level multi-tenancy comfortably scales to thousands of small merchants on modest hardware.

**Two layers of isolation, not one:**

1. **Application layer:** every query goes through a data-access layer that automatically injects `WHERE store_id = :currentStore`. Never hand-write a query that skips this.  
2. **Database layer (defense in depth):** turn on Postgres **Row-Level Security (RLS)** policies on every tenant-scoped table, keyed off a session variable (`SET app.current_store_id = ...`) set at the start of each request. If an application bug ever forgets the `store_id` filter, RLS still stops cross-tenant data leakage at the database. This is cheap to set up early and very expensive to retrofit later — build it in from the first migration.

**Store resolution & routing:** every request needs to resolve *which store* it's for before anything else runs. In Next.js 16, do this in `proxy.ts` (the successor to `middleware.ts` — same idea, clearer name, runs on the Node.js runtime): read the `Host` header, look up the store by subdomain (`{slug}.yourplatform.com`) or by a `custom_domain` match, attach the resolved store to the request context, and 404/redirect if nothing matches. The platform's own admin/marketing domains (`app.yourplatform.com`, `www.yourplatform.com`) are special-cased and skip storefront resolution entirely.

**Custom domains (a real BitCommerz feature worth doing properly):** you need automatic SSL for domains merchants type in themselves, which plain Let's Encrypt HTTP-01 can't do for arbitrary third-party domains pointed at your IP. Two realistic options:

- **Caddy with on-demand TLS** (free, self-hosted, runs on your VPS as the reverse proxy) — Caddy will request and manage a certificate the first time a request arrives for a domain you've approved, no manual cert ops. This is the right starting point for an MVP with a handful of custom domains.  
- **Cloudflare for SaaS (Custom Hostnames)** — a paid Cloudflare add-on purpose-built for exactly this "let your customers point their own domain at your SaaS" scenario, with Cloudflare handling certificate issuance/renewal and giving you their CDN/DDoS protection on every custom domain too. Worth switching to once custom domains are a meaningful chunk of your merchant base — check Cloudflare's current pricing directly before committing, as SaaS-plan add-on pricing changes and isn't reliably documented in public search results as of this writing.

---

## 4\. Core data model (entities to design around from day one)

| Entity | Purpose | Key relationships |
| :---- | :---- | :---- |
| `Store` (tenant) | One merchant's shop: slug, custom domain, plan, status, locale, theme/branding settings | Owns almost everything below |
| `PlatformUser` / `StaffMember` | Staff logins for a store, with roles (owner/admin/staff) and granular permissions | Belongs to a `Store`; many-to-many via role |
| `Customer` | A shopper on a specific storefront (not a platform user) | Belongs to a `Store`; has `Order`s, `Cart`s |
| `Product`, `ProductVariant`, `Category` | Catalog | Belongs to a `Store`; variants have their own stock/price |
| `Warehouse`, `InventoryLevel` | Multi-warehouse stock (internal fulfillment locations only — no public-facing shop/store-locator fields) | `InventoryLevel` links `ProductVariant` × `Warehouse` |
| `Order`, `OrderItem`, `OrderStatusEvent` | Sales \+ fulfillment pipeline | Belongs to a `Store` and `Customer` |
| `Payment`, `Invoice` | Money in, and the PDF generated per order | Belongs to an `Order` |
| `Cart`, `AbandonedCartEvent` | Live and abandoned carts, for recovery SMS/automation | Belongs to a `Store` and `Customer` |
| `Shipment` | Courier booking \+ tracking state per order | Belongs to an `Order`; polymorphic adapter to REDX/Pathao/Steadfast |
| `Discount`, `Campaign` | Promotions | Belongs to a `Store` |
| `Review` | Product reviews | Belongs to a `Product` and `Customer` |
| `BlogPost` | Platform's own marketing blog, and (later) per-store blogs | Two scopes: platform-level and store-level |
| `App`, `AppInstallation` | Marketplace apps and what's installed where (Phase 6, low priority) | `AppInstallation` links `App` × `Store` |
| `Subscription`, `Plan`, `PlatformInvoice` | **The platform's own billing of its merchants** — do not confuse with merchant-facing `Payment`/`Invoice` above | Belongs to a `Store` |
| `AuditLog` | Who changed what, per store, for support/debugging | Belongs to a `Store` |

Two billing systems exist and must stay conceptually separate in the code: **merchant-facing payments** (a customer paying a merchant via bKash/card/COD) and **platform billing** (a merchant paying *you* for their SME/Startup/Business/Enterprise plan). Naming them differently in code (`Order.payment` vs. `Store.subscription`) from day one avoids a confusing merge later.

---

## 5\. Third-party integrations & business prerequisites (not coding tasks — start these now, in parallel)

These all require signing up for a business/merchant account with the provider, which takes days to weeks and can't be shortened by writing code faster. Start the applications now so they're not the bottleneck when the integration code is ready.

**Payments — use an aggregator, don't integrate bKash/Nagad/Rocket separately.** Integrating each wallet directly means separate merchant agreements, separate API certifications, and separate code paths for three near-identical flows. A payment aggregator bundles them behind one API:

- **SSLCommerz** — one of the largest, most established gateways in Bangladesh; good default for a growing platform.  
- **ShurjoPay** — notably supports **recurring/subscription payments**, which is exactly what you need for your own platform-billing subscriptions (SME/Startup/Business monthly or yearly), separate from one-off merchant-storefront checkouts. Worth evaluating specifically for that reason, even if you pick a different aggregator for storefront checkout.  
- **AamarPay** — faster approval process, positioned for small/medium businesses; a reasonable fallback if SSLCommerz onboarding is slow.  
- **Moneybag** — newer entrant, advertises a fast self-serve setup and next-day settlement; worth a look but has less of a track record than SSLCommerz.

Confirm current fees, settlement times, and — specifically — recurring-billing support directly with whichever provider(s) you shortlist, since these details change and weren't fully verifiable from public sources at the time of this plan.

**Couriers — build one internal adapter interface, not three separate integrations.** REDX, Pathao, and Steadfast each have their own merchant API (each needs its own business account/API key). Define one internal `CourierAdapter` interface (`createShipment`, `getTrackingStatus`, `getRateEstimate`, `cancelShipment`) and write one adapter per courier behind it — the rest of the app (order screen, storefront tracking, invoice) only ever talks to the interface. This is a validated pattern (a comparable Bangladesh multi-courier SME platform, built independently, used exactly this approach to add four couriers without touching shared code for each new one) and it's also how you'll add couriers 4 and 5 later without a rewrite.

**SMS gateway:** needed for OTP and order/abandoned-cart notifications — evaluate local Bangladeshi SMS API aggregators directly (pricing and reliability vary and weren't independently verified for this plan); treat it the same as payments/couriers: one adapter interface, swappable provider behind it.

**Analytics/tracking (for merchants' storefronts, and for your own platform):** Google Tag Manager \+ GA4, and Meta Pixel \+ Conversions API, the same stack the audited product dogfoods on itself. Set these up on your *own* marketing site first, and build the same merchant-facing toggle (`store.integrations.metaPixelId`, etc.) as a Phase 2 feature.

**AI features (Product Writer, SEO auto-fill, fraud scoring, demand forecasting, recommendations):** the writing/SEO features are a thin wrapper around an LLM API call (Claude or another provider) with a well-crafted prompt and the product's existing fields as context — genuinely achievable early. **Fraud scoring does not need real machine learning to ship a credible v1.** A validated, realistic approach used by a comparable Bangladeshi multi-tenant commerce platform: a **rules-based 0–100 risk score** combining (a) the customer's historical delivery-acceptance rate *within that merchant's own order history*, (b) an external COD-fraud database if/when you can access or build one, and (c) basic address-consistency checks — with graceful degradation (fall back to cached data, then to a neutral score, rather than ever blocking an order because a third-party signal is down). Real ML-based forecasting/scoring is a reasonable Phase 3+ upgrade once you have enough of your own order data to train on — don't block launch on it.

---

## 6\. VPS deployment plan (Hostinger KVM 2 — 2 vCPU / 8 GB RAM / 100 GB disk, Ubuntu 24.04, Kuala Lumpur)

This box is adequate for development, staging, and an early-stage production launch (roughly dozens to a few hundred active merchants, depending on traffic patterns). Plan to vertically scale (more RAM/CPU on the same VPS, which Hostinger supports as a plan upgrade) or split the database onto its own box once real merchant/order volume grows — that's a scaling trigger to watch for, not a day-one blocker. The Kuala Lumpur location is an acceptable, if not perfectly local, choice for a Bangladesh-facing service (roughly the same region); revisit only if latency actually becomes a measured problem.

**Server hardening (do this before anything else is installed):**

1. Create a non-root sudo user; copy your SSH key to it; disable root SSH login and password auth entirely (`PermitRootLogin no`, `PasswordAuthentication no` in `sshd_config`).  
2. Enable UFW, allow only `22` (SSH), `80`, `443`.  
3. Install and enable `fail2ban` for SSH brute-force protection.  
4. Enable `unattended-upgrades` for security patches.  
5. Never paste the root password into a chat, ticket, or AI tool again — you shared the dashboard screenshot for its specs, which was fine, but treat the password field itself the same as any other credential.

**Runtime layout — Docker Compose, one file, four services:**

- **`app`** — the Next.js 16 application (Turbopack build, standalone output mode), built via a multi-stage Dockerfile.  
- **`postgres`** — Postgres 16+, with a named Docker volume for data.  
- **`redis`** — sessions, caching, and the backing store for a job queue (BullMQ or similar) handling background work: fraud-score calculation, invoice PDF generation, abandoned-cart SMS triggers, AI-writer calls.  
- **`caddy`** — reverse proxy in front of `app`, terminating TLS (including on-demand TLS for merchant custom domains, per Section 3\) and forwarding to the app container over the internal Docker network. Postgres and Redis are **never** exposed outside that internal network.

**Object storage — do not store uploaded files on the VPS disk.** Product images, theme/template assets, generated invoices, and data exports should go to **Cloudflare R2** (S3-compatible, free egress, generous free tier) — the same choice the audited product itself makes, now independently validated by this plan rather than assumed. This keeps your 100 GB disk budget almost entirely for the database and logs, and gives you CDN-backed image delivery for free.

**DNS & CDN:** point your domain's nameservers to Cloudflare. Proxy (orange-cloud) the apex and wildcard (`*.yourdomain.com`) records through Cloudflare for free CDN \+ DDoS protection in front of the VPS. Merchant custom domains are handled per Section 3 (Caddy on-demand TLS to start).

**Backups — layer two systems, don't rely on the VPS snapshot alone:** Hostinger's weekly snapshot (already configured, 3 kept) protects against whole-server failure but is coarse and slow to restore from for a single bad migration or accidental delete. Add a **daily `pg_dump` cron job** that pipes an encrypted database dump to a separate Cloudflare R2 bucket (or another off-server location), retained on a rolling window (e.g. 14 daily \+ 8 weekly). This gives you much finer-grained, faster recovery points independent of the hosting provider.

**CI/CD:** a GitHub Actions workflow that, on merge to your deploy branch, SSHs into the VPS (via a deploy key, not your personal key), pulls the latest image/code, and runs `docker compose up -d --build`. Simple, standard, and far more reliable than manual SSH deploys once the project has any real size.

**Resource budget on 8 GB RAM (rough guide, tune once you have real traffic data):** Next.js app \~1–2 GB, Postgres \~1–2 GB (modest `shared_buffers` tuning), Redis \~256–512 MB, Caddy \~100 MB, OS \+ overhead \~1 GB — leaves comfortable headroom for early production load. Watch memory and disk usage from week one (even a simple `docker stats` cron \+ email alert, or a free-tier uptime/monitoring tool, is enough before you need anything heavier like Grafana/Prometheus, which would itself compete for this box's limited RAM).

---

## 7\. Security & multi-tenancy checklist

- Row-level tenant scoping enforced in both the app layer and Postgres RLS (Section 3\) — non-negotiable, build it before the first feature, not after the first incident.  
- Rate limiting on auth endpoints and public storefront APIs, per-IP and per-store.  
- Secrets in `.env`, never committed to git; strict file permissions on the VPS.  
- Staff roles/permissions enforced server-side on every admin action, not just hidden in the UI.  
- Input validation and output encoding everywhere user-supplied content (product descriptions, reviews, custom domain values) is rendered back to other users.  
- Dependency updates on autopilot (Dependabot or Renovate) given how much of this stack is third-party packages.  
- Cloudflare's free-tier WAF/DDoS protection in front of everything, as a baseline.

---

## 8\. Phased roadmap

Architect for the full data model now (Section 4); ship in this order so there's a real, sellable product early.

| Phase | Goal | Key deliverables |
| :---- | :---- | :---- |
| **0 — Foundation** | Repo, infra, auth working end to end | Next.js 16 scaffold; Postgres \+ RLS; Redis; Docker Compose; VPS hardening & CI/CD deploy pipeline; staff auth (Auth.js) with roles; store creation flow; `proxy.ts` host-based tenant resolution |
| **1 — Core commerce MVP** | A merchant can actually sell something | Storefront theme rendering (start with one clean template, not fifty); product/category/inventory (single warehouse to start); cart & checkout with **one** payment aggregator; manual order management; **one** courier integration; auto-generated invoices; custom-domain support (Caddy on-demand TLS); basic admin dashboard |
| **2 — Growth features** | Reduce merchant friction, build trust | Second and third payment/courier options; discounts & abandoned-cart recovery; blog/CMS; merchant-facing GTM/GA4/Meta Pixel toggle; staff roles/permissions UI; low-stock alerts; bulk CSV import |
| **3 — AI features** | The headline differentiator | AI product-description/SEO writer (LLM API); rules-based fraud/risk scoring v1 (Section 5); abandoned-cart SMS automation; demand-forecasting v1 as a simple sales-velocity heuristic, upgraded to real ML once you have order-volume data |
| **4 — Multi-warehouse expansion** | Scale fulfillment for growing merchants | Multi-warehouse stock allocation across fulfillment locations; digital product delivery. (POS and physical-store/shop-location management are explicitly out of scope — see Section 1.) |
| **5 — Platform business layer** | Monetize the platform itself | Merchant subscription billing (SME/Startup/Business/Enterprise, monthly/yearly, 7-day trial) via ShurjoPay or your chosen aggregator's recurring support; Enterprise sales-lead funnel; your own internal admin analytics across all tenants |
| **6 — Ecosystem (lowest priority)** | Third-party extensibility | Public API, webhooks, developer OAuth app-install flow, revenue-shared app marketplace — deliberately last, since it only matters once you have a real merchant base for developers to build for |

A QA pass against Section 2's "mistakes to avoid" list belongs at the end of every phase, not just before launch.

---

## 9\. Open items to settle before or during Phase 0

- Product/company/domain name and visual identity (Section 1).  
- Final choice of payment aggregator(s) and courier(s) for Phase 1 launch (Section 5\) — confirm current fees/onboarding time directly with each provider.  
- Whether platform-billing (your own subscription revenue from merchants) launches manual (generate invoice, staff activates plan by hand) or automated from day one — manual is a completely reasonable Phase 1 choice, deferring automation to Phase 5\.  
- Team size — this plan assumes solo \+ Claude Code; if that changes, the phase order can parallelize (e.g. commerce core and AI features built concurrently by different people) rather than needing to change.

---

## 10\. Getting started

1. Read `CLAUDE.md` (same folder) — that's what you point Claude Code at first; it carries the non-negotiable rules from this document into every coding session.  
2. Start with Phase 0 only. Resist the pull to start on AI features or the app marketplace first — nothing in Phase 3–6 is useful without Phase 0–1 underneath it.  
3. Come back to this document at the start of each new phase to re-check scope before diving in.

---

### Sources consulted for the technical recommendations above

- [Next.js 16](https://nextjs.org/blog/next-16) — Turbopack stability, `proxy.ts`, current framework baseline.  
- [Cloudflare for SaaS — Custom hostnames](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/) — custom-domain SSL mechanism (confirm current pricing directly with Cloudflare).  
- [Building Vendzoo: fraud detection, 4 couriers, RFM engine](https://dev.to/polash/building-vendzoo-how-i-built-a-full-business-os-for-smes-fraud-detection-4-couriers-rfm-engine-2094) — validated courier-adapter and rules-based fraud-scoring patterns for a comparable Bangladeshi SME platform.  
- [10 Best Payment Gateways in Bangladesh — Moneybag](https://moneybag.com.bd/10-best-payment-gateways-in-bangladesh/) — aggregator landscape (SSLCommerz, ShurjoPay, AamarPay, Moneybag).

