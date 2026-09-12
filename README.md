# Abio Admin

Responsive staff workspace built with React, Vite, TanStack Router/Query, and Zustand.

## Development

Run `npm install`, then `npm run dev`. The admin runs at http://localhost:3001.

Set `VITE_API_BASE_URL` in `.env`:

- Local backend: `/api/v1` (Vite proxies `/api` to `http://localhost:9800`).
- Hosted backend: the full API base ending in `/api/v1`. Allow the admin origin in backend CORS configuration, with credentials enabled.

Sign in with an existing verified, active admin or moderator account. Staff authorization is checked through `/admin/me`.

## Implemented

- Login, token refresh/retry, logout with refresh-token revocation, local session/cache cleanup, access-denied and connection-error screens.
- Responsive staff shell with a collapsible mobile menu.
- Live all-time dashboard metrics, order/payment breakdowns, recent orders, refresh, loading, empty and error states.

- Products: search/status filters, pagination, create/edit, catalog visibility, and variant editing (stock, colors, image URLs, nullable price overrides).
- Users: search/status/badge filters, pagination, profile detail, activation, verified badge grant/revoke, and badge records.
- Verification: pending/approved/rejected queues, document links, and confirmed review actions.
- Consistent SVG navigation icons and active-page breadcrumbs.

Dashboard recent orders link to their order details. The app does not contain demo data; browser tests intercept API requests with fixtures.

## Invitations

Admins can open `/invites` to list invitations, filter by pending/accepted/expired status, and create moderator invitations. Creation sends an invitation email through the backend email provider. The dialog reports send failures and retains a one-time link for manual sharing. Set backend `ADMIN_URL` to the deployed admin origin for email links (local development defaults to `http://localhost:3001`). Existing invitations are not emailed retroactively; create a replacement to send a fresh link.

The `/admin/accept-invite` page lets recipients sign in with their verified account, switch accounts when necessary, and accept the invitation before entering the staff workspace. The account email must match the invitation. Raw creation tokens are not persisted in local storage.

Run the mocked invitation browser checks with `PLAYWRIGHT_MODULE=/absolute/path/to/playwright node tests/invites-flow.cjs`.

## Validation

Run `npm run typecheck`, `npm run lint`, and `npm run build`.

`tests/admin-flow.cjs` exercises authentication, authorization, mobile navigation, dashboard states, refresh, and logout. Start the dev server, then run it with an installed Playwright module:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node tests/admin-flow.cjs
```

An optional `SCREENSHOT_DIR` captures the real login screen and dashboard layouts using explicitly mocked test data. The browser suite performs no backend mutations.

The management browser suite covers the product, variant, user, and verification workflows:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node tests/management-flow.cjs
```

Catalog image fields accept HTTP(S) URLs; uploads and editable existing slugs await backend support. All management mutations refresh related admin queries, including dashboard metrics and verification queues.

## Themes

`/themes` lists and previews profile themes; `/themes/new` creates them and `/themes/:id` edits them with live typography, link-button, and wallpaper previews. Creation uses JSON at `POST /themes` (admins and moderators). Themes can be edited from their preview and deleted after confirmation. The backend blocks deleting themes selected by profiles. Image wallpaper uses a hosted HTTP(S) URL; the theme controller currently does not persist uploaded files. Fonts use a curated system-font list and may vary by device.

Run the fixture-based theme browser checks with:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node tests/themes-flow.cjs
```

## Orders and fulfillment

`/orders` supports buyer/order/tracking search, order/payment filters, and pagination. Detail pages use checkout snapshots (with legacy fallbacks), show delivery totals and customization, and allow tracking updates/removal.

Only the next fulfillment step is offered for successful payments. Cancellation is offered only for processing/ready orders without successful/reversed payments, with explicit confirmation. Backend responses remain authoritative; conflicts refetch the order and disable stale actions. Payments are read-only.

Browser checks (mock API, no live orders changed):
`PLAYWRIGHT_MODULE=/absolute/path/to/playwright node tests/orders-flow.cjs`

## Catalog source of truth

Products now feed the public store, dashboard store, and landing product section in `new-abio` through the public catalog API. Product metadata includes tagline, badge, feature bullets, and optional dynamic preview configuration. Admin product editing also supports editable slugs and ordered product gallery URLs.

Use hosted gallery URLs in this order: front/cover, back, extra photos. Variant galleries override the product gallery; empty variant galleries use the product gallery. Dynamic preview overlays should be transparent artwork with no baked-in background color. Keep full-color product photos in the gallery. Existing products retain empty metadata until edited; no demo products or stock quantities are seeded.

The customer store uses catalog prices without discounts. Standard options carry variant IDs, stock, colors, and price overrides; custom selections carry name, preferred color, instructions, and optional uploaded artwork. Cart selections remain on-device in this phase; server cart synchronization and payment checkout are deferred. Legacy static cart entries are cleared by a version migration because their IDs are not backend product IDs.

Regression check with both dev servers running: `PLAYWRIGHT_MODULE=/absolute/path/to/playwright node tests/catalog-source.cjs`. Requests, uploads, and product writes are mocked.
