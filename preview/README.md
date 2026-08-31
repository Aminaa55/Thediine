# Static preview

`index.html` is a self-contained, clickable preview of the customer website —
one file, no server, no database. It exists so the business owner can open the
design in a browser before the real application is deployed.

It mirrors the real site's design and carries the same catalogue, exported from
`prisma/catalogue.ts`. It is **not** the application: there is no database, no
server-side price resolution, and no checkout.

Checkout is mirrored as well, including both order types, the payment methods and
the confirmation. Orders placed in the preview are kept in the browser's own
storage so the confirmation page works; the real site writes them to the database.
Two rules the preview cannot enforce are enforced by the real site: it resolves
every price from the database again before writing, and it counts the orders a
day already holds before accepting another.

`admin.html` is the same kind of thing for the admin dashboard: its screens and
its rules, running on sample orders held in the browser, so the dashboard can be
used and judged before the site is deployed.

Its menu screens carry the **real** menu -- `MENU_SEED` is exported from the
database, so every dish, price, course, allergen tag and priced choice is the
business's own. Edits made in the preview change only that browser's copy;
"Reset the sample data" puts the real menu back. The rules the real admin
enforces are enforced here too: a price is typed in pounds and held in piastres,
a dish has either one price or priced choices, a choice that has been ordered
cannot be removed, event bands may not overlap, a missing selling unit is only
flagged where the dish has been marked as needing one, and a dish is retired
rather than deleted -- which is a different thing from being unavailable today.

The settings screens are mirrored too, with the same rules and the same refusals:
a capacity that is not a whole number, a time that ends before it starts, bands
that overlap, the last payment method being switched off. What the preview cannot
show is the part that matters most -- that changing a rule leaves existing orders
untouched -- because that is enforced by the real database. It is covered by a
test against the real application instead.

It does **not** use the real authentication and does not weaken it. The real
sign-in hashes passwords with scrypt and carries a signed session cookie, both
server-side; neither can run in a static page. The preview therefore has its own
stand-in sign-in, which is why its credentials are printed on its own screen —
they unlock sample data in one browser and nothing else. Nothing here can reach
a database.

Card payments are the one thing the preview cannot show: they need a server to
talk to Paymob, so the card option stays disabled here and says so. On the real
site it turns on by itself once the Paymob keys are set.

Event pricing is mirrored too: `EVENT_TIERS` in the script is the same guest-count
ladder that `EventPriceTier` holds in the real site, and `scaled()` is the same
integer arithmetic as `eventUnitPrice`. The difference is that the real site reads
the ladder from the database and lets any dish override it, while the preview has
one shared ladder written into the file.

The real site lives in `src/app` and needs hosting plus a PostgreSQL database.

To regenerate after the catalogue changes, re-export `prisma/catalogue.ts` to
JSON and substitute it for the `DATA` constant, and re-export the database to
JSON for `admin.html`'s `MENU_SEED`. Keep the file pure ASCII —
non-ASCII characters must be written as HTML entities or `\uXXXX` escapes, so
the page cannot break if it is served without a charset header.

## Escaping

The file is pure ASCII so it cannot break when served without a charset header.
The two regions escape differently, and mixing them up is a real bug:

- **HTML markup** uses HTML entities (`&mdash;`, `&rsquo;`).
- **JavaScript strings** use `\uXXXX` escapes.

An HTML entity inside a JS string is escaped a second time by `esc()` and the
customer literally sees `&mdash;` on the page. That is exactly what happened on
the Events page in the first preview.
