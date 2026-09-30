"""将现有原创分层插画合成统一光色的今日场景。需要 Pillow。"""

from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw


ROOT = Path(__file__).resolve().parents[1] / "src" / "static" / "scene"
SIZE = (900, 720)
PAPER = (248, 248, 237)


def grade(image: Image.Image, saturation: float = 0.79) -> Image.Image:
    """所有图层使用同一低饱和、暖纸色调，保留原素材的笔触。"""
    image = ImageEnhance.Color(image).enhance(saturation)
    image = ImageEnhance.Contrast(image).enhance(0.91)
    warm = Image.new("RGB", image.size, PAPER)
    return Image.blend(image, warm, 0.09)


def cutout(name: str, visible_height: int) -> Image.Image:
    image = Image.open(ROOT / f"{name}.png").convert("RGBA")
    image = image.crop(image.getbbox())
    width = round(image.width * visible_height / image.height)
    image = image.resize((width, visible_height), Image.Resampling.LANCZOS)
    alpha = image.getchannel("A").filter(ImageFilter.GaussianBlur(0.55))
    if name in {"leaf-tree", "camellia-shrub"}:
        # 原植物底部附带浅色土壤边缘，渐隐后才会落在场景草地里。
        fade = Image.new("L", image.size, 255)
        pixels = fade.load()
        for y in range(max(0, image.height - 36), image.height):
            opacity = round(255 * (image.height - y - 1) / 36)
            for x in range(image.width):
                pixels[x, y] = opacity
        from PIL import ImageChops

        alpha = ImageChops.multiply(alpha, fade)
    image = image.convert("RGB")
    image = grade(image, 0.71 if name in {"leaf-tree", "camellia-shrub"} else 0.75)
    image = image.convert("RGBA")
    image.putalpha(alpha)
    return image


def shadow(canvas: Image.Image, box: tuple[int, int, int, int], opacity: int) -> None:
    layer = Image.new("RGBA", SIZE)
    draw = ImageDraw.Draw(layer)
    draw.ellipse(box, fill=(43, 68, 42, opacity))
    layer = layer.filter(ImageFilter.GaussianBlur(20))
    canvas.alpha_composite(layer)


def make_scene(plant_name: str, companion_name: str) -> None:
    landscape = Image.open(ROOT / "meadow-sky.png").convert("RGB")
    landscape = ImageOps.fit(landscape, SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.63))
    landscape = landscape.filter(ImageFilter.GaussianBlur(1.15))
    canvas = grade(landscape, 0.73).convert("RGBA")

    plant = cutout(plant_name, 612 if plant_name == "leaf-tree" else 540)
    plant_x = round((SIZE[0] - plant.width) * (0.48 if plant_name == "leaf-tree" else 0.44))
    plant_y = 633 - plant.height
    shadow(canvas, (plant_x + 75, 614, plant_x + plant.width - 52, 657), 105)
    canvas.alpha_composite(plant, (plant_x, plant_y))

    companion = cutout(companion_name, 202 if companion_name == "fawn" else 170)
    companion_x = 627 if companion_name == "fawn" else 650
    companion_y = 654 - companion.height
    shadow(canvas, (companion_x + 18, 636, companion_x + companion.width - 10, 675), 135)
    canvas.alpha_composite(companion, (companion_x, companion_y))

    # 一层很轻的纸色空气透视把前景与远景收在同一画面中。
    veil = Image.new("RGBA", SIZE, (251, 245, 224, 14))
    canvas.alpha_composite(veil)
    output = ROOT / f"meadow-{plant_name}-{companion_name}.png"
    canvas.convert("RGB").save(output, optimize=True)
    print(output)


for plant in ("leaf-tree", "camellia-shrub"):
    for companion in ("fawn", "tit-bird"):
        make_scene(plant, companion)
