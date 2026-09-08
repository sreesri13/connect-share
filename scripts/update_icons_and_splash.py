import os
from PIL import Image, ImageDraw

def make_circle(img):
    img = img.convert("RGBA")
    size = img.size
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0], size[1]), fill=255)
    result = img.copy()
    result.putalpha(mask)
    return result

def create_splash(src_img, bg_color, width, height):
    splash = Image.new("RGBA", (width, height), bg_color)
    min_dim = min(width, height)
    logo_size = int(min_dim * 0.45)
    logo = src_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS).convert("RGBA")
    x = (width - logo_size) // 2
    y = (height - logo_size) // 2
    splash.paste(logo, (x, y), logo)
    return splash

def main():
    src_path = "public/Logos/New ConnectHub Logo.png"
    if not os.path.exists(src_path):
        print(f"Error: {src_path} not found!")
        return

    src_img = Image.open(src_path).convert("RGBA")
    bg_color = (15, 23, 42, 255) # #0F172A

    # 1. Update release-builds and assets 512x512 icon
    os.makedirs("release-builds", exist_ok=True)
    icon_512 = src_img.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save("release-builds/connecthub_app_icon_512.png")
    
    os.makedirs("assets/logos", exist_ok=True)
    icon_512.save("assets/logos/connecthub_web_logo.png")
    print("Updated 512x512 app icons in release-builds and assets/logos")

    # 2. Update Android ic_launcher_background.xml
    bg_xml_path = "android/app/src/main/res/values/ic_launcher_background.xml"
    with open(bg_xml_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1A90C7</color>\n</resources>\n')
    print("Updated ic_launcher_background.xml to #1A90C7")

    res_dir = "android/app/src/main/res"

    # 3. Mipmap Launcher Icon sizes
    mipmap_sizes = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432),
    }

    for folder, (sq_size, fg_size) in mipmap_sizes.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # ic_launcher.png (Square)
        sq_img = src_img.resize((sq_size, sq_size), Image.Resampling.LANCZOS)
        sq_img.save(os.path.join(folder_path, "ic_launcher.png"))

        # ic_launcher_round.png (Circular)
        round_img = make_circle(sq_img)
        round_img.save(os.path.join(folder_path, "ic_launcher_round.png"))

        # ic_launcher_foreground.png (Foreground for adaptive icon - scaled to 72% for safe zone)
        fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        logo_scale = int(fg_size * 0.72)
        logo_fg = src_img.resize((logo_scale, logo_scale), Image.Resampling.LANCZOS)
        fg_x = (fg_size - logo_fg.width) // 2
        fg_y = (fg_size - logo_fg.height) // 2
        fg_canvas.paste(logo_fg, (fg_x, fg_y), logo_fg)
        fg_canvas.save(os.path.join(folder_path, "ic_launcher_foreground.png"))

        print(f"Updated {folder}")

    # 4. Splash Screen sizes
    splash_sizes = {
        "drawable": (512, 512),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
    }

    for folder, (w, h) in splash_sizes.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        splash_img = create_splash(src_img, bg_color, w, h)
        splash_img.save(os.path.join(folder_path, "splash.png"))
        print(f"Updated splash in {folder}")

    # 5. Web PWA Icons
    web_icons = {
        "public/pwa-192x192.png": (192, 192),
        "public/pwa-512x512.png": (512, 512),
        "public/pwa-maskable-192x192.png": (192, 192),
        "public/pwa-maskable-512x512.png": (512, 512),
        "public/apple-touch-icon.png": (180, 180),
        "public/favicon.png": (64, 64),
    }

    for path, (w, h) in web_icons.items():
        web_img = src_img.resize((w, h), Image.Resampling.LANCZOS)
        web_img.save(path)
        print(f"Updated web icon {path}")

    # Generate favicon.ico (multi-resolution ICO)
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    src_img.save("public/favicon.ico", format="ICO", sizes=ico_sizes)
    print("Updated public/favicon.ico")

    print("\nAll icons, assets, and splash screens updated successfully from New ConnectHub Logo.png!")

if __name__ == "__main__":
    main()
