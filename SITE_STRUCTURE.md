# Site Structure & Page Specification

Companion to `PROJECT_PLAN.md` and `CLAUDE.md`. This document answers: **which pages exist, what sections/fields each page contains, and which build phase each belongs to.** Part A (public marketing site) includes a live reference URL for every page — pull it up side-by-side while building the equivalent page, since the content/layout below is a direct, verified transcript of what's actually on that page, not a paraphrase. Part B (merchant admin dashboard) has no reference URL because it sits behind a login; its spec below is the full page/section transcript from the audit instead. Part C (customer-facing storefront) is a live audit of two real merchant storefronts found on the platform's own storefront-hosting domain — same rigor and reference-URL approach as Part A.

Every "avoid this" note below is a specific, verified bug found in the audited product — not a generic best-practice reminder. Build the equivalent feature correctly the first time rather than fixing it later.

---

## Part A — Public Marketing Site

**Purpose:** sells the platform *to prospective merchants*. Doesn't touch the commerce engine at all, so it can be designed and built in parallel with Phase 0, or even before it — a reasonable very-first milestone if you want something live (even just for a waitlist) while the real product is still being built.

| Page | Reference URL | Purpose |
| :---- | :---- | :---- |
| Homepage | `https://bitcommerz.com/` | Primary landing page, full value proposition |
| Features | `https://bitcommerz.com/features/` | Comprehensive feature catalog |
| Pricing | `https://bitcommerz.com/pricing/` | Plan comparison |
| Testimonials | `https://bitcommerz.com/testimonials/` | Social proof |
| Blog (list) | `https://bitcommerz.com/blog/` | Content marketing hub |
| Blog (article) | `https://bitcommerz.com/blog/best-platform-e-commerce-for-businesses/` (one example — pattern is `/blog/<slug>/`) | Individual article page |
| About Us | `https://bitcommerz.com/about/` | Brand/mission narrative |
| Enterprise | `https://bitcommerz.com/enterprise/` | High-touch B2B lead-gen funnel |
| Sign Up / Free Trial | `https://bitcommerz.com/signup/` | Self-serve account creation |
| Login | *(no independent reference — see note below)* | Auth entry point |

The **global nav** and **global footer** are shared, identical components on every page above — build them once, not per-page. The **language toggle** (Bengali default / English) is a cross-cutting feature, not a separate page — see the note at the end of this section.

### Homepage

Sections, top to bottom, with what each contains:

1. **Hero** — headline \+ subtext \+ two CTAs ("Start Free Trial — 7 Days Free" / "Watch a 2-min Demo") \+ a browser-mockup illustration of the admin dashboard \+ a 4-item trust checklist.  
2. **Stats bar** — 4 metrics (stores created / monthly sales / active merchants / verified reviews).  
3. **Trusted-merchants marquee** — auto-scrolling row of real merchant logos, live-API-backed.  
4. **Problem/solution comparison** — two-column "selling on social media" vs. "selling with us."  
5. **Feature showcase** — a multi-card walkthrough of \~10 headline features (AI tools, builder, analytics, stock/order, payment, courier, invoice, POS), each with an icon, description, checkmarked bullets, and a mock-UI screenshot. **Scope note:** drop the POS card when building your own version of this section — POS is out of scope for this project (see `CLAUDE.md`). Replace it with another real feature (e.g. multi-warehouse stock, or digital product delivery) so the section still has a full card count.  
6. **No-code builder deep-dive** — drag-and-drop pitch with a builder mock UI.  
7. **Template gallery** — a handful of theme previews with "see all templates" link.  
8. **"How it works" 3-step section** — choose plan → build store → share link and sell.  
9. **Marketing & tracking section** — Meta Pixel/CAPI, GTM/GA4, server-side tracking pitch, with a live "conversion events" mock feed.  
10. **Testimonials preview** — 2–3 testimonial cards (paginated, links to the full Testimonials page).  
11. **Mobile app section** — app-store badge \+ feature bullets \+ phone mockup.  
12. **AI order-protection section** — fraud checker \+ abandoned-checkout recovery, with a mock risk-scored order list.  
13. **AI assistant deep-dive** — 6 AI capability cards (product writer, SEO auto-fill, fraud scoring, demand forecasting, recommendations, cart recovery) with a live demo panel.  
14. **Pricing teaser** — 3 plan cards \+ monthly/yearly toggle \+ Enterprise callout (full detail lives on the dedicated Pricing page — same data, shared component).  
15. **Developer platform section** — revenue-share pitch for third-party app developers (Phase 6 feature; this teaser section can still exist earlier, just link to a "coming soon" page).  
16. **FAQ accordion** — 10–12 objection-handling Q\&As.  
17. **Closing CTA band** — final "start free" push.

**Avoid this:** the audited hero's "how fast can I launch" claim contradicts itself across at least 3 different numbers (6 hours / 1 hour / 6 minutes / "a day") depending on which rotating headline variant is showing. Pick **one** number, store it in one place, and use it everywhere on this page and every other page that repeats it. Also avoid a fragile scroll-jacked carousel for section 5 — use a tested carousel library or a simple tabbed/paginated layout instead (a real bug in the audited site made one of ten cards unreachable by scrolling).

### Features page

- Hero with feature-count claim (**state it once, correctly** — the audited page says "40+" in the hero and "41+" in the very next line, a copy-editing miss you can trivially avoid by pulling both from the same constant).  
- 9 category sections, each a colored accent-dot \+ heading \+ card grid: AI & Intelligence, Store & Products, Orders & Inventory, Payments & Checkout, Delivery & Logistics, SEO & Marketing, Analytics & Data, Team & Operations, Physical & POS — roughly 40 individual feature cards total across all 9 (icon \+ title \+ 1–2 line description each). **Scope note:** build only **8** categories — drop "Physical & POS" entirely (both its POS card and its "physical store" framing are out of scope). Its one legitimately-needed card, cloud file storage for product images/video, isn't a "physical store" feature at all — fold it into "Store & Products" instead of giving it its own category.  
- Closing CTA band \+ footer (shared components, same as homepage).

### Pricing page

- Unique hero only ("an affordable plan for every business," 7-day trial, no credit card).  
- Everything below — the 3 plan cards, monthly/yearly toggle, feature-inclusion lists, Enterprise callout, FAQ, closing CTA, footer — should be **the exact same shared component** used on the homepage's pricing teaser, reading from one source of pricing data (a config or a `/api/plans` endpoint), not duplicated markup. This is the single most important "don't repeat yourself" pattern on the whole site — verified in the audited product to keep prices from ever drifting out of sync between pages, and you should build it the same way from day one.

### Testimonials page

- Hero \+ an embedded testimonial-carousel component (name, role/company, quote, one-line outcome badge, e.g. "Launched in 1 day").  
- **Avoid this:** the audited page claims "50+ reviews" in three separate places but only ever shows 4, and the carousel's "Next" button dead-ends instead of looping. Whatever number you show, make sure it's either backed by that many real, browsable reviews, or don't state a specific number yet.  
- Shared stats bar, marquee, closing CTA, footer below.

### Blog

- **List page:** hero, category filter pills, and a card grid (title, category badge, date, excerpt) — no pagination needed until you have dozens of posts.  
- **Article detail page:** byline, hero image, rich-text body with inline links, author sidebar card, a "start your store" signup CTA box embedded in the article, back-to-all-posts link.  
- **Avoid this:** don't ever render a raw internal category-path string (like `Marketing>Ecommerce|Uncategorized`) as a user-facing filter label or badge — always map to a clean display name.

### About Us

- Mission statement, a 4-card "our values" grid, and a founding-story section.  
- Should be the one page that explicitly names your own operating company/legal entity in its body copy (not just buried in the footer's copyright line) — the audited product's own About page never does this, which this plan flags as a missed-trust-opportunity worth not repeating.

### Enterprise

- Hero with page-specific stats bar (uptime SLA, support hours, enterprise client count, onboarding time — distinct numbers from the homepage's stats bar, not reused).  
- "Why Enterprise" feature-card section \+ a detailed 4-column checklist (Operations/Support/Technical/Commerce) showing this tier as a superset of the standard plans.  
- 3-step "how enterprise onboarding works" section.  
- A qualified lead-generation contact form (name, business name, phone, email, monthly-order-volume dropdown, optional message) — **not** a self-serve signup form.  
- **Avoid this:** don't follow that lead-gen form with a generic "just sign up yourself" closing CTA band — it undercuts the whole point of routing enterprise visitors to sales. Give this page its own, sales-appropriate closing CTA.

### Sign Up / Free Trial

- Two-panel layout: plan selector (radio cards, prices pulled from the same shared pricing source as the Pricing page) on one side, account-creation form (name, phone with country-code prefix, email, password, ToS checkbox) on the other.  
- **Avoid this:** the audited page pre-selects none of the three plans by default, adding avoidable friction. Pre-select your recommended tier.

### Login

No independent reference URL exists for this — in the audited product, this link always resolved straight into an already-authenticated admin session during the audit (ordinary browser cookie-sharing, not a security gap), so its actual login-form fields were never independently observed. Build a standard email/phone \+ password form with a "forgot password" link; there's nothing specific to copy here beyond that.

### Language toggle (cross-cutting)

Not a page — a persistent nav element (globe icon pill) that switches the *entire* site between Bengali and English, and whose preference **persists across page navigations** (a positive detail worth replicating exactly — confirmed in the audit as real cookie/state persistence, not just a per-page toggle). Confirm your own translated copy states the same "how fast" claim (and every other repeated figure) consistently in both languages — the audited product's English hero has the exact same internal contradiction as its Bengali one, just independently written, which shows the bug lives in the underlying data/copy source, not in translation.

---

## Part B — Merchant Admin Dashboard

**Purpose:** where a merchant, once signed up, runs their store. This is the actual product — phase-gate its build against `PROJECT_PLAN.md` Section 8\. Grouped below by sidebar module, matching the audited product's own information architecture (a sound, generic e-commerce-admin IA worth reusing — nothing about this grouping is brand-specific).

**Shared shell (build once, in Phase 0):** fixed left sidebar; top bar with global search, a "View Store" link, light/dark theme toggle, notifications, and account menu. Support a "pin to top" favorites feature on primary nav items **with a visible tooltip this time** — the audited product has this feature but with zero labeling, so almost nobody finds it.

### Home — Phase 0/1

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| Dashboard | `/` | Store performance at a glance | Total Sales / Orders / Customers / Low Stock stat cards; weekly sales chart; today/week/month comparison; top-selling products; customer-type breakdown |

**Avoid this:** make sure every stat card on this page and every other overview screen counts the same underlying thing consistently — the audited product's Home and Marketing Overview both report "1 customer" while the actual Customers list shows 0, a cross-screen mismatch that quietly erodes trust in every other number on the dashboard.

### Orders — Phase 1

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| Order List | `/orders` | View & manage all orders | Order ID, Customer, Items, Date, Total, Payment, Courier, Status, Risk; filter by payment status/method/courier/date; status tabs (Placed/Confirmed/Ready/Shipped/Delivered/Completed/Canceled); column show/hide; export |
| Create Order | `/orders/create` | Manually create an order (phone/walk-in orders) | Product search, delivery option \+ charge, payment method (COD/bKash/aggregator), coupon, manual discount, customer details |

**Avoid this:** sync the active status tab to the URL query string the same way pagination already is — the audited product only syncs pagination, so refreshing or sharing a link always drops back to "All," losing the merchant's filtered view. Also: if no delivery zones are configured yet, show an empty-state row in the delivery dropdown with a direct link to go configure one, rather than a silently blank list.

### Payments — Phase 1

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| Online Payments | `/payments` | Track gateway transactions | Transaction ID, status (Pending/Success/Failed/Refunded), search |

### Products — Phase 1

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| Product List | `/products` | Catalog management | Standard list/grid, illustrated empty state for first-time setup |
| Add/Edit Product | `/products/create` | Create a product | Product type selector (General/Digital — add Book only if you actually plan to support ISBN-style catalogs); name, SKU, brand, categories, description, price/discounted price/quantity/purchase price, specifications, variants/options, status, VAT%, media gallery |

**Avoid this — this is the single most important product-catalog bug in the whole audit:** in the audited product, switching the product-type selector to "Book" or "Digital" silently **removes the price/quantity fields entirely with nothing replacing them**, making those product types unsellable through the form. Whatever non-General product types you support, make sure every type has a complete, working pricing/delivery path before shipping it — don't let a type exist in the selector before its full flow is built.

### Customers — Phase 1

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| All Customers | `/customers` | Customer list | Status filter (Active/Inactive), search |

### Discounts — Phase 2

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| Discounts List | `/discounts` | Manage coupons & automatic discounts | — |
| Create Discount | `/discounts/create` | Build a discount | Name, type (code/automatic/free delivery), coupon code \+ generate button, percentage/flat amount, min purchase, max discount, usage limit, free-delivery toggle, date range, category/gateway scoping |

### Marketing — Phase 2 (tracking integrations), Phase 3 for AI-adjacent pieces

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| Overview | `/marketing` | Campaign/sales snapshot | Sales/orders/AOV stats, recent campaigns table |
| Create Campaign | `/marketing/campaigns/create` | Date-ranged promotional campaign | Name, discount type/value, date range, banner image, product targeting; a live-updating summary side panel |
| Facebook | `/facebook` | Meta Pixel \+ Conversions API | Pixel ID, CAPI token, App ID, domain verification; browser/server toggles; **COD-aware event mapping** (report initial COD orders as "Lead," not "Purchase," until payment is confirmed — this is a genuinely good pattern from the audit worth copying exactly); test events; catalog feed URL |
| TikTok | `/tiktok` | TikTok Pixel \+ Events API | Same shape as Facebook |
| Google Tags & Analytics | `/google-analytics` | GA4/GTM/Ads tagging | GA4/GTM/Ads IDs, Search Console verification, server-side toggle, Measurement Protocol secret, catalog feed |
| Microsoft Clarity (optional) | `/clarity` | Session recording/heatmaps | Project ID |
| WhatsApp | `/whatsapp` | Floating chat button | WhatsApp number |

**Avoid this:** build the COD-aware Lead-vs-Purchase event mapping (Facebook, above) **once, as a shared piece of logic**, and apply it to every ad-pixel integration you offer (Facebook, TikTok, Google Ads). The audited product built this thoughtfully for Facebook only and left TikTok without it, despite the identical COD-inflated-conversion problem affecting both.

### Content — Phase 2

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| Media Library | `/media` | File/folder management | All Files/Images/Documents/Folders filters, upload |
| Blog | `/blog`, `/blog/create` | Store's own blog authoring | Title, slug, excerpt, rich-text content, featured image, SEO fields (with a character counter), categories, tags, status |
| Forms | `/forms`, `/forms/create` | Custom form builder | Drag-and-drop field palette (text/email/phone/textarea/dropdown/radio/checkbox/number/date), per-field label/placeholder/required |

### Online Shop (storefront customization) — Phase 1 basics, Phase 2 for the richer builder tools

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| Pages | `/online-shop/pages` | Custom storefront pages | Title, type, visibility, last updated; add blank/landing page |
| Default Pages | `/online-shop/default-pages` | Customize built-in page layouts (home, PDP, cart, checkout, etc.) | Per-page section builder — reorder/show-hide/restyle sections |
| Checkout Settings | `/online-shop/checkout-settings` | Custom checkout questions | Preset fields (gift message, delivery instructions, preferred time, business VAT number) \+ custom field builder |
| Headers / Footers | `/online-shop/headers`, `/online-shop/footers` | Reusable header/footer components | Drag-and-drop widget builder (heading/text/links/newsletter for footers) |
| Appearance | `/online-shop/appearance` | Storefront design tokens | Brand colors (primary/secondary/accent/danger/success/warning/info), typography, logo upload, nav-menu bindings, mobile bottom nav |
| Menu Builder | `/menu-builder` | Navigation menus | Menu name/status; items (custom link/page/category/brand/external), visible/open-in-new-tab |
| Shop Preview | `/shop-preview` | Live preview of the actual storefront | Desktop/tablet/mobile viewport toggle |

**Avoid this — three real bugs to design around from day one:**

1. Don't create two different sidebar entries that resolve to the identical route (the audited product's "Online Shop → Overview" and "Themes → Theme Marketplace" are literally the same page under two names — confusing and pointless). Give "Online Shop" a real overview/summary screen if you want one, distinct from the theme marketplace.  
2. Bind menu items to header/footer slots **by a stable ID, not by matching a name string** — the audited product's menu-to-slot binding is fragile string-matching (rename a menu and its binding silently breaks).  
3. "Shop Preview" must show the actual, real, current storefront — not a separate, differently-branded builder tool showing its own unrelated onboarding screen, which is what the audited product does. If you ever have two site-building tools during development, retire one before merchants can see both.  
4. Any action that instantly creates a persisted record (like "+ Add page → Blank page") should require at least a name before saving — and any destructive action (Delete) should use your own consistent custom confirmation modal, never a native browser `confirm()`, which can freeze automated tooling and is visually inconsistent with the rest of the app.

### Operations — Phase 1 (Delivery), Phase 4 (Warehouses), Phase 3 (Fraud Checker)

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| Delivery | `/delivery-charge` | Shipping-rate configuration | Delivery type (Inside Dhaka/Outside Dhaka/Custom), charge name/amount/text, display order; custom adds a city picker |
| Warehouses | `/warehouses` | Manage fulfillment warehouse locations | Name, slug, address, phone, email — internal stock-allocation locations only |
| Fraud Checker | `/fraud-checker` | Order risk-score lookup | Searchable fraud-check history by order number or phone — build against the rules-based scoring approach in `PROJECT_PLAN.md` Section 5 |

**Out of scope (per your instruction):** the audited product's Warehouses page manages both `Shop` and `Warehouse` type locations in one screen — with lat/long, map link, business hours, and a 360° tour field, clearly meant to double as a public store-locator for walk-in customers. Don't build that. This project's `Warehouses` page is fulfillment-only (multi-warehouse stock for online orders), so drop the `type` selector and every physical-retail-only field (map link, hours, 360° image, lat/long) — there's no POS and no walk-in shop to point customers to.

### Themes — Phase 1 (need at least one working theme to render a storefront at all), full marketplace Phase 2+

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| Theme Marketplace | `/themes/marketplace` | Browse/purchase themes | Theme library grid, preview/customize/purchase per theme |
| Purchased Themes | `/themes` | Themes owned by this store | Active-theme banner, owned-theme grid |
| Active Theme | `/themes/active` | Current theme status | Developer/version info, configure, import sample products |

**Avoid this:** don't format a missing/zero timestamp as a literal date (the audited product shows "Last Updated: January 1, 1970" — the classic null-timestamp-as-epoch bug). Fall back to a plain "—" or "Never updated" string instead.

### Apps — Phase 6 for a real third-party marketplace; but the *concept* of "installable first-party feature modules" is worth using internally much earlier

| Page | Route | Purpose |
| :---- | :---- | :---- |
| App Store | `/app-store` | Browse/install optional feature modules |
| Installed Apps | `/installed-apps` | Manage installed modules |
| URL Redirects | `/redirects` | 301/302 redirect management |
| Order Flow | reached via an installed app's "Manage" link | Visual order-status-lifecycle editor |
| Product Reviews | reached via an installed app's "Manage" link | Review moderation |

A structural note worth taking seriously: the audited product implements nearly every non-core feature (blog, forms, pixels, courier, fraud checker, order flow, product reviews, chat widget, gateways) as an individually-versioned installable "app," even though all of them ship free with every plan today. That's a genuinely useful internal architecture pattern — it means you can build features as decoupled modules from the start, and only decide later which ones actually gate behind a paid tier or a real third-party marketplace, without having to refactor a monolith to add that gating.

### Integrations — Phase 2

| Page | Route | Purpose | Key fields |
| :---- | :---- | :---- | :---- |
| SMS Gateways | `/sms-gateways` | Connect an SMS provider | Provider marketplace \+ active connection |
| Email Gateways | `/email-gateways` | Connect a transactional email provider | Name/provider (SMTP/SendGrid/Mailgun/SES)/host/port/credentials |

### Settings — Phase 0/1 basics, Phase 5 for Billing

**Users & Access** | Page | Route | Purpose | |---|---|---| | Admins | `/admin` | Manage admin accounts | | Staff | `/users` | Manage staff accounts | | Roles | `/roles` | RBAC role & permission management (granular per-resource CRUD-style permissions) |

**Avoid this:** if you build a granular permissions UI like this, **make sure it's actually enforced server-side.** The audited product's own Roles screen shows its top role missing 6 of 211 permissions (all 5 Email Gateway permissions, plus one order-price permission) — yet that same account could fully use the Email Gateway page anyway in the same session, meaning the checkboxes don't reflect real access control. A permissions UI that doesn't gate anything is worse than not having one, because it actively misleads whoever configures it.

**General Settings (tabbed)** | Tab | Purpose | |---|---| | Profile | Admin's own name/avatar/bio/contact | | Appearance | Personal theme mode, color scheme, font size, border radius | | Notifications | Channel \+ category toggles | | Security | Password, 2FA, session timeout, login notifications, IP allowlist | | Company | Business profile (name, address, timezone, currency) | | System | Version info, backup, maintenance, data export, account deletion |

**Avoid this — two real, serious bugs here:** (1) never ship a settings tab pre-populated with fake demo data ("Acme Corp," a San Francisco address, a US phone number) that a merchant could accidentally leave in place and have it leak onto real customer-facing documents — leave new-account fields genuinely blank instead. (2) A destructive "Delete All Data" button needs a strong, explicit confirmation step (e.g., type the store name to confirm) — never ship a one-click irreversible action, especially inside otherwise-unfinished settings scaffolding.

**Billing** | Page | Route | Purpose | |---|---|---| | Plans & Pricing | `/billing` | Compare/change subscription tier — this is Section 5's "platform billing" layer from `PROJECT_PLAN.md`, not merchant-facing payments | | Billing History | `/billing-history` | Past platform-subscription transactions | | Invoices | `/invoices` | Platform subscription invoices (PDF) | | Package Overview | `/package-overview` | Current plan usage meters (orders/products/staff/storage) |

**Avoid this:** the audited plan-comparison cards all show the literal placeholder word "description" instead of real copy, and the usage-meter page renders raw backend fields (a Mongo-style `__v` version key, `null` soft-delete fields, and one field that renders as the literal string `[object Object]`). Write an explicit allowlist of merchant-relevant fields with human-readable labels for any usage/meter display — never render a database document directly.

**Standalone Settings pages** | Page | Route | Purpose | |---|---|---| | Shop Settings | `/setting/shop` | Store branding, contact, SEO meta, pagination | | Guest Checkout & OTP | `/guest-checkout` | Login requirements, OTP config — correctly gray out OTP options until an SMS gateway is actually connected | | Domain | `/setting/domain` | Free subdomain \+ custom domain connection (see `PROJECT_PLAN.md` Section 3 for the SSL mechanics) | | Locations | `/locations` | Bangladesh country/city/area reference data — seed this once, platform-wide, not per-tenant (64 districts, \~2,750 upazila-level areas is the right granularity, matching Bangladesh's real administrative structure) | | Notices | `/notices` | Real system/shop notifications | | Support | `/support` | Contact channels, live chat |

**Avoid this:** make the notification bell in the top bar read from the exact same real data source as the Notices page. The audited product's bell shows 5 entirely fake, hardcoded demo notifications (a fictional low-stock alert, a fictional failed-login alert, etc.) that contradict the real Notices page showing "no notices yet" — a jarring inconsistency the moment a merchant compares the two. Also: never ship an obviously fake placeholder support phone number (the audited product's is a "555"-prefixed US number) — leave it blank until real support contact info exists.

---

## Part C — Customer-Facing Storefront

**Purpose:** the merchant's actual shop, as seen by *their own customers* — product catalog, product detail pages, cart, checkout, and account pages, themed with that merchant's own branding. This is the actual "store" a merchant gets; without it there's nothing for their customers to shop on, so treat it as core Phase 1 scope, not an optional extra.

**Methodology:** per your instruction, this section is a live audit, not a generic e-commerce spec — same rigor as Parts A and B. Two real, live, fully-populated BitCommerz-powered merchant storefronts were found and browsed this session by guessing tenant slugs (from Report 2's static-asset URL pattern) against the `commerzly.site` hosting domain disclosed in Report 1:

- **Primary reference:** `https://manfarebd.commerzly.site/` — storefront brand "RANGEEN." (page-title metadata still reads "Manfare," the tenant slug — see brand-identity bug below).  
- **Secondary reference (theme-variation check):** `https://treeliving.commerzly.site/` — storefront brand "Tree," which turned out to redirect straight to the merchant's own **custom domain**, `https://www.treeliving.co/` — a real, live confirmation that BitCommerz's custom-domain feature (`PROJECT_PLAN.md` Section 3\) actually works in production, not just in theory.

No checkout was ever submitted on either site (Confirm Order was never clicked) — cart and checkout were populated and viewed only, per this audit's standing read-only rule.

| Page | Route pattern (both sites) | Purpose |
| :---- | :---- | :---- |
| Homepage | `/` | Brand hero, category shortcuts, best-sellers, new arrivals |
| Category listing | `/category/<slug>` | Browse one category, with filters/sort |
| Search results | `/search` (empty state) → `/search/<query>` (results) | Full-catalog search |
| Product detail (PDP) | `/product/<slug>` | Single product: media, variant selection, add-to-cart |
| Cart | `/cart` | Review/edit items before checkout |
| Checkout | `/checkout` | Address, delivery option, payment method, place order |
| Login | `/auth/login` | Customer sign-in |
| Register | `/auth/register` | Customer account creation |

**Structural note — theme variation is real and significant:** Manfare/RANGEEN and Tree are visibly different *themes* (different fonts, header layout, hero style, color palette, product-card design — see the two homepages side by side at the reference URLs above), while the **page types and routes above are identical, platform-level structure** shared by both. This confirms the right build order: get these page types working against **one** clean starter theme first (Phase 1, per `PROJECT_PLAN.md` Section 8), then let `Online Shop`/`Themes` (Part B) drive real visual variation later — don't hard-code any theme's specific layout into the page logic itself.

### Homepage

Sections observed, top to bottom (RANGEEN):

1. **Hero** — full-bleed campaign banner (product photography \+ a large "collection" wordmark, e.g. "Old Money Striped Shirt"), with small decorative UI chrome (a season/year label, a "Best / Collection" index number, a QR-style graphic, a barcode icon) — these are theme decoration, not functional controls.  
2. **"Our Brands"** — a row of brand tiles (this store showed 2: "manfare" and "I-phone") linking to a brand-filtered view. This is a legitimate pattern worth keeping: `PROJECT_PLAN.md` Section 4 already has a `brand` field on `Product` (confirmed in Part B's Add/Edit Product page) — surface a "shop by brand" section on the storefront homepage when a store has more than one brand, don't build it as a one-off.  
3. **"Browse our categories"** — a tile grid of top-level categories (this store: Panjabi, Half Shirt, Drop Shoulder T-Shirt, Polo Shirt, Wallet, Belt, Bootcut Formal Pant — all menswear).  
4. **"Best Selling Products"** — a product-card grid (image, name, price, review count or "No Review Yet"), with a "View All" link.  
5. **"New Arrival Products"** — same card format, "See All" link.  
6. **Footer** — brand name \+ one-line tagline, a "Shop" link column, a "Company" link column (About us/Contact/Privacy policy), a newsletter-subscribe box, and a copyright line repeating the tagline.

Persistent, site-wide (not part of any one page): a floating cart widget (bottom-right, item count \+ running total, visible on every page and correctly persisted across navigation) and floating WhatsApp \+ Messenger contact buttons — the latter is a live, working confirmation that Part B's Marketing → WhatsApp integration (`/whatsapp`, "Floating chat button") genuinely renders on the real storefront, not just in the admin settings screen.

**Avoid this — real, verified bug, and a specific one worth naming precisely:** this store's own footer tagline reads *"RANGEEN. Bold everyday fashion **for women**, made in Bangladesh."* — but every category, best-seller, and new-arrival product actually shown on the homepage, category pages, and search results is menswear/streetwear (panjabi, polo shirts, drop-shoulder tees, chinos, joggers, boxers). Separately, the top nav's own links (Sarees, Three-Piece, Kurtis, Western, Sale) are almost all women's-fashion category *names*, yet none of them match the real category taxonomy visible on `/search` or the homepage's own "browse our categories" tiles (Panjabi, T-Shirt, Shirt, Polo Shirt, Boxer, Winter, Trouser, Shoe, etc.). Two independent signals pointing at the same root cause: **the nav menu and marketing copy are stale/hand-written, disconnected from the real product catalog.** Build your equivalent of Part B's `Menu Builder` so nav items are generated from (or at minimum validated against) real category data, and never let static brand copy (taglines, "for women"/"for men" framing) drift out of sync with what the catalog actually contains — the same "single source of truth" principle as `PROJECT_PLAN.md` Section 2's very first bullet, just discovered again on a different surface.

### Category listing page

Reference: `https://www.treeliving.co/category/twill-pants-jeans` (Tree's theme renders this the most fully of the two).

- Breadcrumb (Home / Categories / Category name), H1 category title, sort dropdown (e.g. "Newest First").  
- **Filter sidebar:** Price Range (min/max number inputs \+ 4 quick-range buttons: Under ৳500 / ৳500–1000 / ৳1000–2000 / Over ৳2000), Color (collapsible swatch list), Size (collapsible). "Clear All" link.  
- Product grid: card \= image, discount-percentage corner ribbon when on sale, name, current price \+ strikethrough original price.

**Build note:** treat the filter sidebar (price/color/size \+ sort) as the Phase 1 baseline for your one starter theme, not an optional enhancement — it was the more complete of the two real examples, and faceted filtering is standard-expected e-commerce behavior, not a nice-to-have.

### Search

- Dedicated `/search` page (not a dropdown/overlay): hero-style "Search Our Products" heading, one input \+ "Search" button, and — usefully — a "Shop by category" tile grid shown by default before any query is entered (so the page is never a dead end).  
- Submitting navigates to `/search/<query>` (a real, bookmarkable, shareable URL) and shows a result grid identical in card format to the category listing page, plus a result count ("Showing N results for ''") and its own sort dropdown (Relevance/Price low-high/Price high-low/Newest/Highest Rated). Results paginate via a "Load More Products" button, not classic numbered pagination.  
- **Confirmed: not live/instant search.** Typing into the box does not filter anything until Search is submitted — a full-page navigation, not an autocomplete/live-filter experience. Fine to keep this way for Phase 1 (simple, works, cacheable URL); an instant-search dropdown is a reasonable Phase 2 polish item, not a Phase 1 requirement.  
- **Confirmed useful cross-check:** search results for the exact same product that's missing its price on the PDP (see next section) show that product's price correctly — proof the price data itself exists and is queryable; the bug is specifically in the PDP's own rendering, not the underlying data.

### Product Detail Page (PDP)

Reference: both sites use the same page shape — image/video gallery (thumbnail strip below a large main image; one of RANGEEN's gallery slots is a video, confirmed by a play-button overlay), Color selector, Size selector (button group), live stock count with a colored dot ("N in stock"), quantity stepper, "Add To Cart" \+ "Buy Now" buttons, wishlist icon, a Description/Reviews tab pair, a size chart table (for apparel), and a long-form marketing description with a bullet-point "Product Highlights" block and care instructions.

**Avoid this — the single most important storefront bug found, re-confirmed live this session with a full add-to-cart round trip:** on the RANGEEN/Manfare theme, the PDP layout above renders **every** field — color, size, stock count, quantity, both buttons, the full description — **except the price**. It is not a loading glitch: the full page (including the size chart and long description) finishes rendering with no price anywhere. Confirmed as theme-specific, not platform-wide: the same product's price displays correctly in that store's own search results, and Tree's PDP (a different theme, same platform) shows its price prominently, directly under the title, with zero issue. **When building your own PDP template, treat "does the price actually render" as a required check in every theme/template you ship**, not something you assume works because it works elsewhere on the same page or the same platform.

### Cart

Reference: `https://manfarebd.commerzly.site/cart`, viewed live with 2 real items added this session.

- Header: "Shopping Cart" \+ "N items in your cart" subtitle.  
- Per-item row: thumbnail, name, selected variant (color/size), unit price (+ strikethrough original if discounted), quantity stepper, computed item subtotal, "Remove" link, and an inline low-stock warning ("Only N left in stock") when relevant.  
- "Refresh" and "Clear Cart" controls above the item list.  
- Order Summary card: Subtotal (N items), Total, "Proceed to Checkout" (primary), "Continue Shopping" (secondary), and a "🔒 Secure Checkout" trust line.  
- No bugs found on this page — it's clean and internally consistent (item subtotals and the cart total both matched simple arithmetic on the items actually added).

### Checkout

Reference: `https://manfarebd.commerzly.site/checkout`, viewed live through to the payment-method step; **Confirm Order was never clicked.**

- **Delivery Address:** Full Name\*, Phone Number\*, Complete Address\* — inline required-field validation (a red banner names exactly which fields are still missing).  
- **Delivery Options:** radio cards for "Inside Dhaka" / "Outside Dhaka." Selecting one **live-recalculates the shipping line and order total** in the Order Summary panel (confirmed: Inside Dhaka added a real ৳70 shipping charge and the Total updated from ৳1,940 to ৳2,010 immediately) — a working, real-time confirmation that Part B's `/delivery-charge` config genuinely drives storefront checkout math, not just an admin-side number. Build this coupling correctly from day one; it's exactly the kind of "one number, one source" pattern `PROJECT_PLAN.md` Section 2 asks for elsewhere.  
- **Select Payment:** two radio options, "Cash on Delivery" (default, shows a COD graphic) and "Online Payment." Choosing Online Payment reveals a real gateway logo strip: **bKash, Nagad, DBBL Nexus, Visa, Mastercard**, plus one additional regional wallet/gateway logo not clearly legible at this resolution — six methods in total, consistent with an aggregator-backed checkout (`PROJECT_PLAN.md` Section 5\) rather than one-off individual integrations.  
- Order Notes (optional free-text), a Gift Card/Discount code field with an "Apply" button, and the same live-updating Order Summary as the cart.  
- No POS, no in-store pickup, no physical-location selector anywhere on this page or anywhere else in the storefront — consistent with this project's own scope decision (see `CLAUDE.md`, "Out of scope").

### Login (`/auth/login`)

"Sign in to your account" — a **Password Login / OTP Login** tab toggle (confirming Part B's Guest Checkout & OTP admin setting is a real, live customer-facing choice, not just a dashboard toggle), Email-or-Phone \+ Password fields under Password Login, a "Forgot password?" link, a "Sign in" button, and a "Don't have an account? Sign up" link.

### Register (`/auth/register`)

"Create your account" — First Name\*, Last Name\*, Phone Number\*, Email Address\*, Password\*, Confirm Password\*, a "Create Account" button, and a "Sign in" link back. Clean, standard, no bugs found.

### Phase mapping

All pages in this Part are **Phase 1 — Core commerce MVP** (`PROJECT_PLAN.md` Section 8): a merchant isn't sellable without homepage, category, PDP, cart, checkout, and basic auth. Richer theme customization (multiple themes, drag-and-drop section builder, the fuller filter/search experience) is Part B's `Online Shop`/`Themes` territory and phases the same way those already do (Phase 1 basics, Phase 2 for the richer builder tools).  
