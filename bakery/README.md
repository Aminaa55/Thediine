# The Cozy Loaf — customer homepage

A single self-contained page: one HTML file, no build step, no server, no
database. Open `index.html` in a browser and it works.

This is a **design direction for review** — the homepage only. No admin, no
backend, no real order submission yet.

## The brand, as built

| | |
|---|---|
| Butter yellow `#FFD447` | Hero and social grounds — the main cheerful colour |
| Soft blush `#FFD3CC` | Secondary grounds and frames |
| Cherry red `#E5324B` | Buttons, badges, ticker, accents |
| Warm off-white `#FFFAF3` | Breathing space between loud sections |
| Deep berry `#4A0D2C` | All text and every outline |

No brown, no beige, no gold, no black panels. Every section changes ground
colour so the page never settles into one wash.

Type is three voices: **Fraunces** (with its *wonk* and *soft* axes turned up)
for oversized editorial statements, **Figtree** for anything practical, and
**Caveat** for handwritten annotations. There is deliberately no monospace.

## What moves

| | |
|---|---|
| Ticker + marquee band | Two continuous loops, opposite weights |
| Hero | Headline words stagger in; logo ring rotates around the photo; medallion drifts on scroll |
| Rotating word | Cycles through four endings in the hero paragraph |
| Loaves | Slide in from opposite sides; olives bob in the placeholder |
| Why sourdough | Drag-to-scroll carousel, tilted cards, arrow buttons, snap points |
| Gallery | Two marquee rows running opposite ways, pausing on hover |
| Care tips | Rotate flat and lift on hover |
| Buttons | Hard shadow, tilt on hover, press down on click |
| Basket | Counts up live; the confirmation pops in |

Everything is visible at rest — nothing waits on a scroll trigger to appear.
`prefers-reduced-motion` turns all of it off and leaves the page fully readable.

## Editing it

Both prices live in the `PRODUCTS` object at the top of the script:

```js
const PRODUCTS = {
  plain: { name: "Plain Sourdough", price: 230 },
  olive: { name: "Black Olive Sourdough", price: 250 }
};
```

Images go in `assets/` — see [`assets/README.md`](assets/README.md).

## Placeholder copy

Anything not yet confirmed is marked two ways, so nothing fake reaches a
customer by accident:

- a **pink highlighter** behind the text (`class="ph"`)
- a **handwritten ✎ tag** next to the block (`class="ph-tag"`)

Currently marked as placeholder: both loaf descriptions and their little tags,
the three storage tips, the "bestseller" claim, and the Instagram handle. The
gallery frames, contact details, address and hours are empty by design.

## Still needed before this can go live

Loaf descriptions · storage instructions · Instagram handle · contact details ·
address and collection hours · baking schedule and order cut-off · pickup or
delivery · how payment works · the two image files.
