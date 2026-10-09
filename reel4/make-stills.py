"""Pre-scale the hero frames with a good resampler and a light sharpen, so the
   browser never has to upscale a photograph at render time."""
from PIL import Image, ImageFilter


def frame(src, box, out, size=(1080, 1920)):
    im = Image.open(src).convert("RGB")
    if box is None:                      # cover the frame, centred
        W, H = im.size
        s = max(size[0] / W, size[1] / H)
        im = im.resize((round(W * s), round(H * s)), Image.LANCZOS)
        l = (im.width - size[0]) // 2
        t = (im.height - size[1]) // 2
        im = im.crop((l, t, l + size[0], t + size[1]))
    else:
        im = im.crop(box).resize(size, Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=62, threshold=3))
    im.save(out, quality=94)
    print(out, im.size)


# the hook: golden croquettes. wide first, then a punch into the crust.
frame("food/6.jpg", None, "stills/hook-wide.jpg")
frame("food/6.jpg", (248, 118, 754, 1018), "stills/hook-tight.jpg")
# the payoff: the tiramisu, to match the dish the film browses to
frame("food/8.jpg", None, "stills/pay-wide.jpg")
frame("food/8.jpg", (236, 300, 798, 1300), "stills/pay-tight.jpg")
# the dish's own heading block, lifted off its real page so it can open
Image.open("shots/tiramisu-full.png").convert("RGB") \
     .crop((77, 426, 1213, 1148)).save("stills/head.jpg", quality=95)
