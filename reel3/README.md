# Draft 3 — the poster wall

Built after watching the reference the owner sent: a TikTok where a dense,
untidy collage of finished ad posters keeps popping, swapping and overlapping
above the presenter's head. Bright, flat, fast, cluttered on purpose. Drafts 1
and 2 were cinematic camera moves, which is the opposite of that.

There is no camera here and no 3D. `reel3.html` is a wall of cards. Thirty-two
fixed slots each hold a card for a third of a second or so, then swap for
another, staggered so the wall never turns over all at once. Density climbs
from eleven cards to thirty-two inside the first two seconds, the wall drifts
and breathes, and three times a single photograph slams across the whole frame
for a quarter of a second.

## The deck

The business has eight photographs. The reference has roughly forty distinct
creatives. Density had to come from somewhere real, so the deck is:

- **20 photo cards** — the eight photographs cropped tight. `make-cards.py`
  slides portrait windows over each one, scores them on edge energy, rejects
  anything too dark or blown out, and keeps the best four that do not overlap.
  Half carry a caption bar, and every caption is a line already on the live
  site ("Tables we have set", "Four courses, cooked to order", "Everything we
  cook", "Order from The Diine", "Plan an Event").
- **16 dish cards** — name, portion and price exactly as `prisma/catalogue.ts`
  holds them, in three weights (cream, ink, gold) so a wall of them still has
  contrast.
- **10 claim cards** — every number on one of these is on the live site: 70
  dishes, 21 main courses, 22 desserts, 19 side dishes, 8 salads.
- **7 screen cards** — real screenshots of the site.

Photographs are weighted four to one in the draw, because the food is the
point.

**No photograph carries a dish name.** I cannot verify which dish is in which
picture, so the pictures carry only copy that is already published. The dish
names and prices live on the typographic cards, where they are certain.

## Rendering

    node reel3/render.mjs            # 360x640 @ 12fps preview, ~9 seconds
    node reel3/render.mjs --final    # 1080x1920 @ 30fps, only on request

ffmpeg comes from `imageio-ffmpeg`; the build Playwright ships cannot read a
frame sequence.
