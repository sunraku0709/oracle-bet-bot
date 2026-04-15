"""
Generate placeholder assets for Oracle Bet mobile app.
Run: python3 generate_assets.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

# Design colours (RGB tuples for RGB images)
BG       = (10,  10,  10)      # #0a0a0a
BG_CARD  = (26,  26,  26)      # #1a1a1a
GOLD     = (255, 215,   0)     # #FFD700
GOLD_DIM = (60,  51,   0)      # subtle gold tint
GRAY     = (90,  90,  90)      # tagline


def try_font(size: int) -> ImageFont.FreeTypeFont:
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def draw_logo(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int) -> None:
    """
    Draws the Oracle Bet logo:
      • Gold ring (outline only — dark fill to show bolt clearly)
      • Lightning bolt polygon inside the ring
    """
    r = radius
    # Ring: fill with bg_card so bolt contrasts, then gold outline
    draw.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        fill=BG_CARD,
        outline=GOLD,
        width=max(3, r // 12),
    )

    # Lightning bolt — 6-point polygon fitting inside the ring
    s = r * 0.52
    bolt = [
        (cx + s * 0.10,  cy - s * 0.95),   # top-right
        (cx - s * 0.12,  cy - s * 0.08),   # mid-left
        (cx + s * 0.24,  cy - s * 0.08),   # mid-right (inner notch)
        (cx - s * 0.10,  cy + s * 0.95),   # bottom-left
        (cx + s * 0.12,  cy + s * 0.08),   # mid-right
        (cx - s * 0.24,  cy + s * 0.08),   # mid-left (inner notch)
    ]
    draw.polygon(bolt, fill=GOLD)


def make_icon(path: str, size: int = 1024) -> None:
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2
    ring_cy = cy - size // 12        # shifted up slightly
    radius  = size // 4

    draw_logo(draw, cx, ring_cy, radius)

    # "ORACLE BET"
    font_big = try_font(size // 13)
    text = "ORACLE BET"
    bbox = draw.textbbox((0, 0), text, font=font_big)
    tw   = bbox[2] - bbox[0]
    ty   = ring_cy + radius + size // 20
    draw.text(((size - tw) // 2, ty), text, font=font_big, fill=GOLD)

    # Tagline
    font_sm = try_font(size // 28)
    tag  = "ANALYSES SPORTIVES IA"
    bbox2 = draw.textbbox((0, 0), tag, font=font_sm)
    tw2   = bbox2[2] - bbox2[0]
    draw.text(((size - tw2) // 2, ty + size // 10 + size // 40), tag, font=font_sm, fill=GRAY)

    img.save(path, "PNG", optimize=True)
    print(f"  ✓ {path}  ({size}×{size})")


def make_splash(path: str, w: int = 1284, h: int = 2778) -> None:
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    cx = w // 2
    cy = int(h * 0.38)
    radius = w // 6

    # Subtle background circle halo (hand-drawn as concentric ring)
    for offset, alpha_col in [(radius + 40, (20, 16, 0)), (radius + 20, (30, 23, 0))]:
        draw.ellipse(
            [cx - offset, cy - offset, cx + offset, cy + offset],
            fill=alpha_col,
        )

    draw_logo(draw, cx, cy, radius)

    # Title
    font_title = try_font(w // 9)
    title = "ORACLE BET"
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = bbox[2] - bbox[0]
    ty = cy + radius + w // 18
    draw.text(((w - tw) // 2, ty), title, font=font_title, fill=GOLD)

    # Subtitle
    font_sub = try_font(w // 22)
    sub = "Analyses sportives IA"
    bbox2 = draw.textbbox((0, 0), sub, font=font_sub)
    tw2 = bbox2[2] - bbox2[0]
    draw.text(((w - tw2) // 2, ty + w // 8 + w // 40), sub, font=font_sub, fill=GRAY)

    img.save(path, "PNG", optimize=True)
    print(f"  ✓ {path}  ({w}×{h})")


def make_adaptive_icon(path: str, size: int = 1024) -> None:
    """Android adaptive icon foreground — transparent background."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2
    radius  = size // 3

    # Ring (transparent-fill so only ring + bolt show)
    draw.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        fill=(26, 26, 26, 220),
        outline=(*GOLD, 255),
        width=max(4, radius // 10),
    )

    s = radius * 0.52
    bolt = [
        (cx + s * 0.10,  cy - s * 0.95),
        (cx - s * 0.12,  cy - s * 0.08),
        (cx + s * 0.24,  cy - s * 0.08),
        (cx - s * 0.10,  cy + s * 0.95),
        (cx + s * 0.12,  cy + s * 0.08),
        (cx - s * 0.24,  cy + s * 0.08),
    ]
    draw.polygon(bolt, fill=(*GOLD, 255))

    img.save(path, "PNG", optimize=True)
    print(f"  ✓ {path}  ({size}×{size}, transparent bg)")


def make_favicon(path: str, size: int = 48) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    r = size // 2 - 2
    draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                 fill=(26, 26, 26, 255), outline=(*GOLD, 255), width=2)
    s = r * 0.45
    bolt = [
        (cx + s * 0.10,  cy - s * 0.95),
        (cx - s * 0.12,  cy - s * 0.08),
        (cx + s * 0.24,  cy - s * 0.08),
        (cx - s * 0.10,  cy + s * 0.95),
        (cx + s * 0.12,  cy + s * 0.08),
        (cx - s * 0.24,  cy + s * 0.08),
    ]
    draw.polygon(bolt, fill=(*GOLD, 255))
    img.save(path, "PNG", optimize=True)
    print(f"  ✓ {path}  ({size}×{size})")


if __name__ == "__main__":
    print("Generating Oracle Bet assets…")
    make_icon(os.path.join(ASSETS_DIR, "icon.png"))
    make_splash(os.path.join(ASSETS_DIR, "splash.png"))
    make_adaptive_icon(os.path.join(ASSETS_DIR, "adaptive-icon.png"))
    make_favicon(os.path.join(ASSETS_DIR, "favicon.png"))
    print("Done.")
