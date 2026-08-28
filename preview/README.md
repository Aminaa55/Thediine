# Static preview

`index.html` is a self-contained, clickable preview of the customer website —
one file, no server, no database. It exists so the business owner can open the
design in a browser before the real application is deployed.

It mirrors the real site's design and carries the same catalogue, exported from
`prisma/catalogue.ts`. It is **not** the application: there is no database, no
server-side price resolution, and no checkout.

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
