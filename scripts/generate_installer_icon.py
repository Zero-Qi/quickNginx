from PIL import Image, ImageDraw, ImageFont
import os

def create_installer_icon():
    # 创建 1024x1024 的图像（Mac 应用图标推荐尺寸）
    size = (1024, 1024)
    image = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # 浅绿色 (#90EE90)
    light_green = (144, 238, 144)
    
    # 绘制椭圆
    padding = 50  # 边距
    draw.ellipse([padding, padding, size[0]-padding, size[1]-padding], 
                 fill=light_green)
    
    # 添加白色 "N" 文字
    try:
        # 尝试使用系统字体
        font_size = 600
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        # 如果找不到 Helvetica，使用默认字体
        font = ImageFont.load_default()
    
    # 绘制白色 "N"
    text = "N"
    text_bbox = font.getbbox(text)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    # 计算文字位置使其居中
    x = (size[0] - text_width) // 2
    y = (size[1] - text_height) // 2 - text_height // 4  # 稍微上移一点
    
    # 绘制文字
    draw.text((x, y), text, fill='white', font=font)
    
    # 确保 build 目录存在
    if not os.path.exists('build'):
        os.makedirs('build')
    
    # 保存为 PNG
    png_path = os.path.join('build', 'icon.png')
    image.save(png_path, quality=95)  # 使用高质量保存
    print(f"PNG icon saved to: {png_path}")

if __name__ == '__main__':
    create_installer_icon() 