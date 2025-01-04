const fs = require('fs');
const path = require('path');

// 创建 build 目录
const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
}

// 简单的图标数据 (16x16 PNG, 绿色圆形)
const iconData = `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdAAAAHQBMYXlgQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABkSURBVDiNY/wPBAxUAExUNQAggBFkABcPJ4rU/f7zl+H7tx+oYjgN+PrtO8P/f/8YPn3+ghszkgiSkpMZ/v//z3Dt2jWcGK8X2NnZGZiYmBiYmZkZeHh4cGKCsUAMwGcIVQwAAKRzGxHz4gwxAAAAAElFTkSuQmCC`;

// 保存为 PNG
const pngPath = path.join(buildDir, 'icon.png');
fs.writeFileSync(pngPath, Buffer.from(iconData, 'base64'));
console.log('PNG icon saved to:', pngPath);

// 创建 iconset 目录
const iconsetPath = path.join(buildDir, 'icon.iconset');
if (!fs.existsSync(iconsetPath)) {
    fs.mkdirSync(iconsetPath);
}

// 复制相同的图标到不同尺寸
const sizes = [16, 32, 64, 128, 256, 512];
sizes.forEach(size => {
    const normalPath = path.join(iconsetPath, `icon_${size}x${size}.png`);
    const retinaPath = path.join(iconsetPath, `icon_${size}x${size}@2x.png`);
    fs.copyFileSync(pngPath, normalPath);
    if (size <= 512) {
        fs.copyFileSync(pngPath, retinaPath);
    }
});

// 使用 iconutil 转换为 icns
const icnsPath = path.join(buildDir, 'icon.icns');
require('child_process').execSync(`iconutil -c icns "${iconsetPath}" -o "${icnsPath}"`);
console.log('ICNS icon saved to:', icnsPath); 