import os
from PIL import Image, ImageDraw

def make_circle(img):
    # Convert RGBA
    img = img.convert("RGBA")
    size = img.size
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0], size[1]), fill=255)
    result = img.copy()
    result.putalpha(mask)
    return result

def create_splash(src_img, bg_color, width, height):
    # Create background canvas
    splash = Image.new("RGBA", (width, height), bg_color)
    
    # Calculate logo size (e.g. 40% of smallest dimension)
    min_dim = min(width, height)
    logo_size = int(min_dim * 0.45)
    
    # Resize source logo
    logo = src_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS).convert("RGBA")
    
    # Calculate position to center logo
    x = (width - logo_size) // 2
    y = (height - logo_size) // 2
    
    # Paste logo on splash canvas
    splash.paste(logo, (x, y), logo)
    return splash

def main():
    src_path = "release-builds/connecthub_app_icon_512.png"
    if not os.path.exists(src_path):
        print(f"Error: {src_path} not found!")
        return

    src_img = Image.open(src_path).convert("RGBA")
    bg_color = (15, 15, 35, 255) # #0F0F23

    res_dir = "android/app/src/main/res"

    # Mipmap Launcher Icon sizes (square, foreground, round)
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

        # ic_launcher_foreground.png (Foreground for adaptive icon)
        fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        logo_fg = src_img.resize((int(fg_size * 0.7), int(fg_size * 0.7)), Image.Resampling.LANCZOS)
        fg_x = (fg_size - logo_fg.width) // 2
        fg_y = (fg_size - logo_fg.height) // 2
        fg_canvas.paste(logo_fg, (fg_x, fg_y), logo_fg)
        fg_canvas.save(os.path.join(folder_path, "ic_launcher_foreground.png"))

        print(f"Updated {folder}")

    # Splash Screen sizes
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

    # Web PWA Icons
    web_icons = {
        "public/pwa-192x192.png": (192, 192),
        "public/pwa-512x512.png": (512, 512),
        "public/pwa-maskable-192x192.png": (192, 192),
        "public/pwa-maskable-512x512.png": (512, 512),
        "public/apple-touch-icon.png": (180, 180),
    }

    for path, (w, h) in web_icons.items():
        web_img = src_img.resize((w, h), Image.Resampling.LANCZOS)
        web_img.save(path)
        print(f"Updated web icon {path}")

    print("All icons and splash screens updated successfully!")

if __name__ == "__main__":
    main()
