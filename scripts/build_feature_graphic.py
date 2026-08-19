import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Create 1024x500 canvas
width, height = 1024, 500
img = Image.new("RGBA", (width, height), (15, 15, 35, 255))
draw = ImageDraw.Draw(img)

# 1. Background Gradient & Glow
for y in range(height):
    r = int(15 + (35 - 15) * (y / height))
    g = int(15 + (18 - 15) * (y / height))
    b = int(35 + (65 - 35) * (y / height))
    draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

# Radial Glow Highlights (Cyan on left, Purple on right)
glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_layer)

# Cyan glow left
glow_draw.ellipse([50, 50, 450, 450], fill=(0, 210, 255, 35))
# Purple glow right
glow_draw.ellipse([550, 50, 950, 450], fill=(160, 32, 240, 45))
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(60))
img.alpha_composite(glow_layer)
draw = ImageDraw.Draw(img)

# 2. Draw Network Node Mesh in background
nodes = [(120, 100), (320, 70), (450, 180), (220, 380), (100, 420), (600, 80), (850, 120), (920, 380), (700, 420)]
lines = [(0,1), (1,2), (0,3), (3,4), (2,3), (5,6), (6,7), (7,8), (5,8), (2,5)]

for i, j in lines:
    p1, p2 = nodes[i], nodes[j]
    draw.line([p1, p2], fill=(0, 225, 255, 40), width=2)

for nx, ny in nodes:
    draw.ellipse([nx-5, ny-5, nx+5, ny+5], fill=(0, 240, 255, 180))
    draw.ellipse([nx-10, ny-10, nx+10, ny+10], outline=(0, 240, 255, 60), width=1)

# 3. Draw Smartphone Mockup on Right Side (X: 580 to 860)
phone_x, phone_y = 660, 60
phone_w, phone_h = 220, 380
corner_r = 32

# Phone shadow
shadow = Image.new("RGBA", (width, height), (0,0,0,0))
sh_draw = ImageDraw.Draw(shadow)
sh_draw.rounded_rectangle([phone_x-10, phone_y+10, phone_x+phone_w+10, phone_y+phone_h+20], radius=corner_r+4, fill=(0,0,0,120))
shadow = shadow.filter(ImageFilter.GaussianBlur(25))
img.alpha_composite(shadow)
draw = ImageDraw.Draw(img)

# Phone Outer Frame
draw.rounded_rectangle([phone_x, phone_y, phone_x+phone_w, phone_y+phone_h], radius=corner_r, fill=(20, 22, 35, 255), outline=(0, 210, 255, 180), width=3)

# Phone Screen
screen_padding = 8
scr_x1, scr_y1 = phone_x + screen_padding, phone_y + screen_padding
scr_x2, scr_y2 = phone_x + phone_w - screen_padding, phone_y + phone_h - screen_padding
draw.rounded_rectangle([scr_x1, scr_y1, scr_x2, scr_y2], radius=corner_r-6, fill=(12, 14, 25, 255))

# Phone Screen UI: Header
draw.rectangle([scr_x1, scr_y1, scr_x2, scr_y1+35], fill=(22, 26, 45, 255))
draw.ellipse([phone_x + phone_w//2 - 20, phone_y + 12, phone_x + phone_w//2 + 20, phone_y + 18], fill=(35, 40, 60, 255)) # Notch

# Scanner Viewfinder frame inside screen
vf_x1, vf_y1 = scr_x1 + 25, scr_y1 + 65
vf_x2, vf_y2 = scr_x2 - 25, scr_y1 + 205
draw.rounded_rectangle([vf_x1, vf_y1, vf_x2, vf_y2], radius=12, outline=(0, 240, 255, 220), width=2)

# QR Code inside scanner frame
qr_x, qr_y = vf_x1 + 15, vf_y1 + 15
qr_size = (vf_x2 - vf_x1) - 30
# Draw QR corners inside phone screen
for cx, cy in [(qr_x, qr_y), (qr_x + qr_size - 30, qr_y), (qr_x, qr_y + qr_size - 30)]:
    draw.rectangle([cx, cy, cx+30, cy+30], fill=(255, 255, 255, 240))
    draw.rectangle([cx+5, cy+5, cx+25, cy+25], fill=(12, 14, 25, 255))
    draw.rectangle([cx+10, cy+10, cx+20, cy+20], fill=(0, 240, 255, 255))

# Laser scan line
laser_y = vf_y1 + 70
draw.line([(vf_x1+4, laser_y), (vf_x2-4, laser_y)], fill=(0, 255, 200, 255), width=3)

# Scanned URL Result Box inside phone screen
url_box_y1 = vf_y2 + 20
url_box_y2 = url_box_y1 + 50
draw.rounded_rectangle([scr_x1+15, url_box_y1, scr_x2-15, url_box_y2], radius=8, fill=(28, 35, 60, 255), outline=(130, 80, 255, 200), width=1)
draw.ellipse([scr_x1+25, url_box_y1+18, scr_x1+39, url_box_y1+32], fill=(0, 240, 255, 255))

# Try loading truetype font or fallback to default
try:
    font_title = ImageFont.truetype("arial.ttf", 54)
    font_sub = ImageFont.truetype("arial.ttf", 22)
    font_url = ImageFont.truetype("arial.ttf", 12)
    font_badge = ImageFont.truetype("arialbd.ttf", 16)
    font_badge_sub = ImageFont.truetype("arial.ttf", 10)
except Exception:
    font_title = font_sub = font_url = font_badge = font_badge_sub = ImageFont.load_default()

draw.text((scr_x1 + 46, url_box_y1 + 18), "connecthub.app/share", fill=(255, 255, 255, 240), font=font_url)

# 4. Left Side Typography: ConnectHUB
draw.text((90, 170), "ConnectHUB", fill=(255, 255, 255, 255), font=font_title)
draw.text((92, 240), "Scan  •  Connect  •  Share", fill=(0, 230, 255, 255), font=font_sub)

# Subtitle description line
draw.text((92, 285), "Instant media sharing & connected hubs", fill=(180, 190, 220, 240), font=font_sub)

# 5. Play Store Badge at Bottom Right (X: 740, Y: 410)
badge_x, badge_y = 750, 420
badge_w, badge_h = 220, 60

# Badge Background
draw.rounded_rectangle([badge_x, badge_y, badge_x+badge_w, badge_y+badge_h], radius=10, fill=(0, 0, 0, 220), outline=(255, 255, 255, 120), width=1)

# Play Store Logo Icon (4 colors triangle)
px, py = badge_x + 15, badge_y + 12
draw.polygon([(px, py), (px+24, py+18), (px, py+36)], fill=(0, 230, 255, 255))
draw.polygon([(px+24, py+18), (px+32, py+12), (px+32, py+24)], fill=(255, 200, 0, 255))
draw.polygon([(px, py+36), (px+24, py+18), (px+32, py+24)], fill=(255, 60, 80, 255))
draw.polygon([(px, py), (px+24, py+18), (px+32, py+12)], fill=(0, 200, 100, 255))

# Badge Text
draw.text((badge_x + 60, badge_y + 12), "GET IT ON", fill=(200, 210, 230, 255), font=font_badge_sub)
draw.text((badge_x + 60, badge_y + 26), "Google Play", fill=(255, 255, 255, 255), font=font_badge)

# Save image
img.save("release-builds/connecthub_feature_graphic_1024x500.png", "PNG")
img.save("public/connecthub_feature_graphic_1024x500.png", "PNG")
print("Successfully generated release-builds/connecthub_feature_graphic_1024x500.png")
