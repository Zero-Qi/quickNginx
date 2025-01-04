from PIL import Image, ImageDraw, ImageFont
import os

def create_icns():
    # 创建一个 1024x1024 的图像
    size = (1024, 1024)
    image = Image.new('RGBA', size, (0, 0, 0, 0))

    # 创建一个圆形
    circle = Image.new('RGBA', size, (0, 0, 0, 0))
    circle_draw = ImageDraw.Draw(circle)
    circle_draw.ellipse([50, 50, size[0]-50, size[1]-50], fill=(76, 175, 80))

    # 添加 "N" 文字
    font_size = 500
    try:
        # 尝试使用系统字体
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        # 如果找不到 Helvetica，使用默认字体
        font = ImageFont.load_default()
        
    text_draw = ImageDraw.Draw(circle)
    text = "N"
    text_bbox = font.getbbox(text)
    text_pos = ((size[0] - text_bbox[2]) // 2, (size[1] - text_bbox[3]) // 2)
    text_draw.text(text_pos, text, font=font, fill=(255, 255, 255))

    # 确保 build 目录存在
    if not os.path.exists('build'):
        os.makedirs('build')

    # 保存为 PNG
    png_path = os.path.join('build', 'icon.png')
    circle.save(png_path)
    print(f"PNG icon saved to: {png_path}")

    # 转换为 ICNS
    icns_path = os.path.join('build', 'icon.icns')
    if os.system(f'sips -s format icns "{png_path}" --out "{icns_path}"') != 0:
        print("Failed to convert to ICNS using sips, trying iconutil...")
        # 如果 sips 失败，创建 iconset
        iconset_path = os.path.join('build', 'icon.iconset')
        if not os.path.exists(iconset_path):
            os.makedirs(iconset_path)
        
        # 创建不同尺寸的图标
        sizes = [16, 32, 64, 128, 256, 512, 1024]
        for size in sizes:
            resized = circle.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(os.path.join(iconset_path, f'icon_{size}x{size}.png'))
            if size <= 512:  # 创建 @2x 版本
                resized = circle.resize((size*2, size*2), Image.Resampling.LANCZOS)
                resized.save(os.path.join(iconset_path, f'icon_{size}x{size}@2x.png'))
        
        # 使用 iconutil 转换为 icns
        os.system(f'iconutil -c icns "{iconset_path}" -o "{icns_path}"')
        print(f"ICNS icon saved to: {icns_path}")

if __name__ == '__main__':
    create_icns() 