# The Diine — Catering Website & Order Management System

A website and order management system for The Diine, a home-catering business in Egypt.
Replaces manual order-taking over Instagram DMs.

## Status

**Planning.** No application code has been written yet — the plan is awaiting the
owner's review and sign-off.

Documents, newest first:

- [`docs/spec.html`](docs/spec.html) — **product specification (rev 2).** The current
  source of truth for scope and business rules: the normal and event ordering flows,
  menu/product structure read from the supplied PDF, checkout and scheduling rules,
  cancellation rules, admin functionality, kitchen prep view, MVP boundary, and the
  open-questions register.
- [`docs/plan.html`](docs/plan.html) — the original plan. Still current for the
  technology stack, database entities, running costs and build phases.
- [`docs/source-menu-full-buffet.pdf`](docs/source-menu-full-buffet.pdf) — the menu
  as supplied. Image-only, no text layer; read page by page as images.

## Confirmed business rules

| | Normal orders | Event orders |
|---|---|---|
| Minimum notice | 48 hours | 5 days |
| Daily capacity | 3 orders/day | manual confirmation |
| Free cancellation until | 24h before | 48h before |
| Late cancellation | 20% charge | 20% charge |
| Minimum order value | none | none |
| Fulfilment | delivery or pickup | delivery/venue |

Serving setup (returnable or disposable dishes) is chosen on every order. Payment is
recorded, not processed; orders are confirmed over WhatsApp. English at launch, built
to add Arabic without a rebuild.

## Blocked on

Seven blockers, listed in section 09 of the spec. The largest:

- **À la carte or buffet package?** The PDF is titled "Full Buffet Menu" — it is not
  clear whether dishes are priced individually or sold as a per-person package.
- **Unit of sale and prices** per category (per tray / kilo / person / piece).
- **Missing menu sections** — printed page numbers reach 9; there is no Desserts
  section despite desserts being referenced.
- Delivery areas and fees; time slots and working days.
