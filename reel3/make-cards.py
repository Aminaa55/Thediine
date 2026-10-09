"""Cut the business's own photographs into poster crops.

Slides portrait windows across each photograph, scores them on edge energy,
throws out anything too dark or blown out, and keeps the best four that do not
substantially overlap. Nothing is generated; every output is a sub-rectangle
of a real picture.
"""
from PIL import Image, ImageFilter, ImageStat
import glob, os, json

OUT = "cards"
picked = []
for f in sorted(glob.glob("food/*.jpg")):
    im = Image.open(f).convert("RGB"); W, H = im.size
    base = os.path.basename(f)[:-4]
    cands = []
    for frac in (1.0, 0.72, 0.52):
        ch = int(H * frac); cw = int(ch * 0.75)
        if cw > W:
            cw = W; ch = int(cw / 0.75)
        if ch > H:
            continue
        xs = max(1, (W - cw) // 120 + 1); ys = max(1, (H - ch) // 120 + 1)
        for i in range(xs):
            for j in range(ys):
                x = int(i * (W - cw) / max(1, xs - 1)) if xs > 1 else 0
                y = int(j * (H - ch) / max(1, ys - 1)) if ys > 1 else 0
                c = im.crop((x, y, x + cw, y + ch)).resize((120, 160))
                e = ImageStat.Stat(c.filter(ImageFilter.FIND_EDGES).convert("L")).mean[0]
                b = ImageStat.Stat(c.convert("L")).mean[0]
                if b < 42 or b > 228:          # too dark, or blown out
                    continue
                cands.append((e, x, y, cw, ch, frac))
    cands.sort(reverse=True)
    chosen = []
    for e, x, y, cw, ch, frac in cands:
        if len(chosen) >= 4:
            break
        ok = True
        for _, px, py, pw, ph, _ in chosen:
            ox = max(0, min(x + cw, px + pw) - max(x, px))
            oy = max(0, min(y + ch, py + ph) - max(y, py))
            if ox * oy > 0.42 * min(cw * ch, pw * ph):
                ok = False; break
        if ok:
            chosen.append((e, x, y, cw, ch, frac))
    for k, (e, x, y, cw, ch, frac) in enumerate(chosen):
        c = im.crop((x, y, x + cw, y + ch)).resize((900, 1200), Image.LANCZOS)
        name = f"{base}_{k}.jpg"
        c.save(os.path.join(OUT, name), quality=90)
        picked.append({"file": name, "src": f, "edge": round(e, 1), "frac": frac})
json.dump(picked, open("cards/index.json", "w"), indent=1)
print(len(picked), "crops")
