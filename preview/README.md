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
JSON and substitute it for the `DATA` constant. Keep the file pure ASCII —
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
