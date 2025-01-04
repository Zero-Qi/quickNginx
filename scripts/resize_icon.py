from PIL import Image
import os

# 打开原始图片
input_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'build', 'icon.png')
output_path = input_path  # 覆盖原文件

# 打开图片并显示当前尺寸
with Image.open(input_path) as img:
    current_size = img.size
    print(f"当前图片尺寸: {current_size[0]}x{current_size[1]} 像素")

    # 目标尺寸
    target_size = (1024, 1024)  # 增加到1024x1024以确保足够大

    # 使用 LANCZOS 重采样方法以获得更好的质量
    resized_img = img.resize(target_size, Image.Resampling.LANCZOS)
    # 保存调整后的图片
    resized_img.save(output_path, 'PNG')

print(f"图标已调整为 {target_size[0]}x{target_size[1]} 像素") 