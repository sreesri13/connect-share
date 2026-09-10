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
    # 1. Launcher Icon for APK and AAB: OneConnectHubLogo.png
    app_icon_src = "public/Logos/OneConnectHubLogo.png"
    # 2. Splash Screen Logo: ConnectHub Web Logo.png
    splash_src = "public/Logos/ConnectHub Web Logo.png"

    if not os.path.exists(app_icon_src):
        print(f"Error: {app_icon_src} not found!")
        return
    if not os.path.exists(splash_src):
        print(f"Error: {splash_src} not found!")
        return

    icon_img = Image.open(app_icon_src).convert("RGBA")
    splash_img_src = Image.open(splash_src).convert("RGBA")
    bg_color = (15, 23, 42, 255) # #0F172A

    # 1. Update release-builds 512x512 icon for APK/AAB store listing
    os.makedirs("release-builds", exist_ok=True)
    icon_512 = icon_img.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save("release-builds/connecthub_app_icon_512.png")
    print("Updated release-builds/connecthub_app_icon_512.png from OneConnectHubLogo.png")

    # 2. Update Splash screen Flutter asset from ConnectHub Web Logo.png
    os.makedirs("assets/logos", exist_ok=True)
    splash_asset_512 = splash_img_src.resize((512, 512), Image.Resampling.LANCZOS)
    splash_asset_512.save("assets/logos/connecthub_web_logo.png")
    print("Updated assets/logos/connecthub_web_logo.png from ConnectHub Web Logo.png")

    # 3. Android Mipmap Launcher Icons (from OneConnectHubLogo.png)
    res_dir = "android/app/src/main/res"
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
        sq_img = icon_img.resize((sq_size, sq_size), Image.Resampling.LANCZOS)
        sq_img.save(os.path.join(folder_path, "ic_launcher.png"))

        # ic_launcher_round.png (Circular)
        round_img = make_circle(sq_img)
        round_img.save(os.path.join(folder_path, "ic_launcher_round.png"))

        # ic_launcher_foreground.png (Foreground for adaptive icon - scaled to 72% for safe zone)
        fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        logo_scale = int(fg_size * 0.72)
        logo_fg = icon_img.resize((logo_scale, logo_scale), Image.Resampling.LANCZOS)
        fg_x = (fg_size - logo_fg.width) // 2
        fg_y = (fg_size - logo_fg.height) // 2
        fg_canvas.paste(logo_fg, (fg_x, fg_y), logo_fg)
        fg_canvas.save(os.path.join(folder_path, "ic_launcher_foreground.png"))

        print(f"Updated {folder} launcher icons from OneConnectHubLogo.png")

    # 4. Android Native Splash Screen sizes (from ConnectHub Web Logo.png)
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
        splash_img = create_splash(splash_img_src, bg_color, w, h)
        splash_img.save(os.path.join(folder_path, "splash.png"))
        print(f"Updated splash in {folder} from ConnectHub Web Logo.png")

    print("\n[SUCCESS] APK/AAB Launcher Icons updated with OneConnectHubLogo.png")
    print("[SUCCESS] Splash screens updated with ConnectHub Web Logo.png")

if __name__ == "__main__":
    main()
