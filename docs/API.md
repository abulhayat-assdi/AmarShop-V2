# AmarShop Public API (v1)

Read-only REST access to a single store's data. A caller authenticates
with **either** a merchant-minted API key (below) **or** an OAuth
app-installation token (see [OAuth](#oauth-app-install)). For push
notifications instead of polling, see [Webhooks](#webhooks) at the end.
The full write surface comes in a later Phase 6 slice.

## Base URL

```
https://<store-subdomain>.<platform-root>/api/v1
https://<custom-domain>/api/v1
```

The store is identified by the API key, **not** the host — any host that
routes to the app works, but using the store's own domain is clearest.

## Authentication

Every request needs a key:

```
Authorization: Bearer ak_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Keys are minted by the merchant in **Admin → API Keys**. The full token is
shown once at creation; only its SHA-256 hash and an `ak_XXXXXXXX` prefix
are stored. Revoke a key from the same screen — a revoked key stops
working immediately.

### Scopes

A key carries one or more scopes. An endpoint returns `403
insufficient_scope` if the key lacks the scope it needs.

| Scope | Grants |
| --- | --- |
| `read:products` | `GET /products`, `GET /products/{id}` |
| `read:orders` | `GET /orders`, `GET /orders/{id}` (incl. customer name / phone / address) |

## Conventions

- **Envelope** — success: `{ "data": ... , "page": 1, "limit": 25, "hasMore": false }`
  (list) or `{ "data": { ... } }` (single). Error:
  `{ "error": { "code": "invalid_key", "message": "…" } }`.
- **Pagination** — `?page=` (≥ 1) and `?limit=` (1–100, default 25) on list
  endpoints. `hasMore` tells you whether another page exists.
- **Rate limit** — 120 requests/minute per key. Over the limit → `429
  rate_limited` with a `Retry-After` header (seconds).
- **Timestamps** are ISO 8601 UTC strings. **Money** fields are strings
  (`"1500.00"`), exactly as stored.
- Enum values (`status`, `paymentMethod`, `fraudRiskLevel`) are the raw
  lowercase codes, e.g. `"placed"`, `"cod"` — not display labels.

## Errors

| Status | `code` | When |
| --- | --- | --- |
| 400 | `bad_request` | e.g. an unknown `?status=` value |
| 401 | `unauthorized` | no / malformed `Authorization` header |
| 401 | `invalid_key` | unknown or revoked key |
| 403 | `insufficient_scope` | key lacks the required scope |
| 404 | `not_found` | no such product / order in this store |
| 429 | `rate_limited` | over 120 req/min |

## Endpoints

### `GET /products`

Scope: `read:products`. Query: `?page`, `?limit`, `?status=draft|active|archived`.

```
curl https://demo.example.com/api/v1/products \
  -H "Authorization: Bearer ak_..."
```

```json
{
  "data": [
    {
      "id": "…", "name": "Classic Cotton Panjabi", "slug": "classic-cotton-panjabi",
      "brand": "AmarShop Basics", "description": null,
      "status": "active", "isDigital": false, "vatPercent": "0.00",
      "category": { "id": "…", "name": "Shirts" },
      "variants": [
        { "id": "…", "sku": "PANJABI-001", "optionsLabel": null,
          "price": "1200.00", "discountedPrice": null, "quantity": 25 }
      ],
      "createdAt": "2026-08-26T…Z", "updatedAt": "2026-08-26T…Z"
    }
  ],
  "page": 1, "limit": 25, "hasMore": false
}
```

The merchant's cost price (`purchasePrice`) and SEO fields are **not**
included.

### `GET /products/{id}`

Scope: `read:products`. Returns one `ProductDto` or `404 not_found`.

### `GET /orders`

Scope: `read:orders`. Query: `?page`, `?limit`, `?status=` (any order
status). Orders held back by the plan's monthly order quota are **not**
returned (they aren't visible in the merchant admin either — upgrade to
release them).

```json
{
  "data": [
    {
      "id": "…", "orderCode": "K7M2-9XQ4", "status": "placed",
      "customer": { "name": "…", "phone": "01…", "email": null, "address": "…" },
      "items": [
        { "productName": "…", "sku": "…", "quantity": 2,
          "unitPrice": "950.00", "lineTotal": "1900.00" }
      ],
      "subtotal": "1900.00", "discountAmount": "0.00", "couponCode": null,
      "deliveryCharge": "60.00", "total": "1960.00",
      "paymentMethod": "cod", "notes": null, "fraudRiskLevel": null,
      "placedAt": "2026-08-30T…Z", "updatedAt": "2026-08-30T…Z"
    }
  ],
  "page": 1, "limit": 25, "hasMore": false
}
```

### `GET /orders/{id}`

Scope: `read:orders`. Returns one `OrderDto` or `404 not_found` (a
quota-locked order also returns `404`).

---

## OAuth (app install)

Instead of a merchant pasting an API key into your software, your app can
use the **OAuth 2.0 authorization-code flow**: the merchant clicks
"install", approves a consent screen, and your server receives a
store-scoped access token. Same `/api/v1` surface, same scopes — only how
the token is obtained differs.

### 1. Register the app

A platform admin registers your app in **`/platform/apps`** and gives you:

- `client_id` (`cid_…`, public) and `client_secret` (`cs_…`, secret —
  shown once)
- an exact-match **redirect-URI allowlist**
- the set of scopes the app may request (a subset of the table above)

### 2. Send the merchant to the consent screen

```
GET https://<platform-or-store-host>/oauth/authorize
  ?response_type=code
  &client_id=cid_...
  &redirect_uri=<one of your registered URIs, exact match>
  &scope=read:products%20read:orders      # space- or comma-separated; omit for "all this app may request"
  &state=<opaque anti-CSRF value you generate>
  &code_challenge=<base64url(sha256(verifier))>   # optional PKCE (S256)
  &code_challenge_method=S256
```

The merchant must be signed in to their AmarShop admin as **owner or
admin** (they're bounced through login and back). On approve, we redirect
to `redirect_uri?code=<code>&state=<state>`. On cancel or a bad scope:
`redirect_uri?error=access_denied|invalid_scope&state=<state>`. An invalid
`client_id` / `redirect_uri` / `response_type` renders an error page and
does **not** redirect. The code expires in **10 minutes** and is
single-use.

### 3. Exchange the code for a token

```
POST https://<same-host>/oauth/token
Content-Type: application/x-www-form-urlencoded   # or application/json

grant_type=authorization_code
&code=oac_...
&redirect_uri=<the same redirect_uri>
&client_id=cid_...
&client_secret=cs_...          # or HTTP Basic: Authorization: Basic base64(client_id:client_secret)
&code_verifier=...             # required iff you sent code_challenge
```

```json
{ "access_token": "ato_…", "token_type": "Bearer", "scope": "read:products read:orders" }
```

Errors follow RFC 6749: `{ "error": "invalid_grant", "error_description": "…" }`
with `error` one of `invalid_request` (400), `invalid_client` (401),
`invalid_grant` (400), `unsupported_grant_type` (400).

### 4. Call the API

```
Authorization: Bearer ato_XXXXXXXXXXXXXXXXXXXXXXXX
```

Identical to an API key otherwise — same endpoints, same envelope, same
120 req/min limit (counted per installation).

### Token lifetime

The access token **does not expire**. It stops working the moment the
merchant uninstalls the app (**Admin → Installed Apps**) or a platform
admin disables it. Re-installing issues a fresh token and revokes the old
one. There is no refresh-token grant in this version.

---

## Webhooks

Instead of polling `GET /orders`, register an endpoint and AmarShop will
`POST` a JSON payload to it when an order event happens. The merchant adds
endpoints in **Admin → Webhooks**; each one subscribes to one or more
events and gets its own signing secret.

### Events

| Event | Fires when |
| --- | --- |
| `order.created` | a customer completes checkout, or the merchant enters a manual order |
| `order.status_changed` | an order moves to the next status, or is canceled |

`order.created` for a paid gateway order fires at order creation, not at
payment — a subsequent `order.status_changed` reflects fulfilment
progress. (Payment events land in a later slice.)

### Request

```
POST <your endpoint URL>
Content-Type: application/json
User-Agent: AmarShop-Webhooks/1
X-AmarShop-Event: order.created
X-AmarShop-Delivery: 7c3b…            # unique per delivery row; stable across retries
X-AmarShop-Signature: sha256=<hex>
```

```json
{
  "id": "7c3b…",
  "event": "order.created",
  "createdAt": "2026-09-01T09:15:22.031Z",
  "data": { "...": "the same object as GET /api/v1/orders/{id}" }
}
```

`data` is the exact `OrderDto` the REST API returns — customer name /
phone / address included, cost price and SEO fields excluded. Orders held
back by the plan's monthly quota do **not** fire webhooks.

### Verifying the signature

Compute `HMAC-SHA256(rawRequestBody, endpointSecret)` as lowercase hex and
compare, in constant time, against the hex after `sha256=` in
`X-AmarShop-Signature`. Use the **raw** body bytes, before any JSON
parsing.

```js
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(rawBody, header, secret) {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

The secret is shown (behind a "Reveal") on the **Admin → Webhooks**
screen. Deleting and re-adding the endpoint rotates it.

### Retries & delivery log

Return any `2xx` promptly. A non-2xx response or a connection error is
retried **twice more** (roughly 2s then 8s later) — three attempts total,
all within a few seconds of the event. After that the delivery is marked
**Failed** in the log on **Admin → Webhooks**, where the merchant can hit
**Resend** to run the three attempts again with the identical payload.
There is no long-tail automatic retry queue. Endpoints are never
auto-disabled; a merchant disables or deletes one manually.

Deliver idempotently: dedupe on `X-AmarShop-Delivery`, and treat a
repeated `(event, data.id)` as the same underlying change.
