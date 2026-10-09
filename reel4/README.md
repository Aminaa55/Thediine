# Draft 4 — one hero at a time

Drafts 2 and 3 failed the same way from opposite directions: a 3D flythrough
of screenshots, then a wall of forty cards. Both filled the frame with things
competing for attention. This one has a single rule.

**At any moment there is one hero. Everything else is a soft layer behind it,
blurred and dimmed, there only for depth.** The compositions are simple; the
transitions between them are where the work went.

| | hero | how it hands over |
|---|---|---|
| 0.0–2.0 | a real photograph, full bleed | slow push, then a hard punch into a tighter crop of the same picture |
| 2.0–4.0 | the real Desserts page, wider than the frame | the food is shoved left, blurs and dims; the page arrives over it |
| 4.0–5.5 | the same page, scrolling | one steady flick down the real dessert list, then a run back up onto one dish |
| 5.5–6.1 | the dish's own page | it rises over the list, the way the site navigates |
| 6.1–8.0 | the photograph again | **the dish's heading block grows and dissolves into the food** |
| 8.0–10.0 | the ordering page | the food recedes; one press, the button answers, the cart goes to one |
| 10.0–11.5 | the sign-off | the food comes back, held down behind the type |

## What is real

`capture.mjs` drives the app running locally at a phone's own width and
screenshots the real pages. Every website frame in the film comes from there:
the Desserts list, the Tiramisu page, the same page after the button is
actually pressed. The cart badge going from nothing to one is the real
header, not a graphic. The photographs are the business's own, pre-scaled in
`make-stills.py` so the browser never upscales at render time.

**One thing to check.** The film browses to *Tiramisu — Big Bowl* and pays off
on the business's own tiramisu photographs, which show it served in individual
glasses rather than in a bowl. Same dessert, different presentation. If that
reads wrong, the pairing is two lines to change.

## Rendering

    node reel4/render.mjs            # 360x640 @ 12fps preview, ~9 seconds
    node reel4/render.mjs --final    # 1080x1920 @ 30fps, only on request
    node reel4/capture.mjs           # re-take the website frames (app on :3100)

ffmpeg comes from `imageio-ffmpeg`; the build Playwright ships cannot read a
frame sequence.
