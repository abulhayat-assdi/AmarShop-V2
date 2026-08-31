# AmarShop Public API (v1)

Read-only REST access to a single store's data. The full write surface,
webhooks, and the OAuth app-install flow come in later Phase 6 slices.

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
