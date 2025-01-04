const fs = require('fs');
const path = require('path');

// Base64 编码的图标数据
const iconData = {
    on: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKUSURBVFiF7ZdNiFZVGMd/z7lvM42NhY0fA4ERSGREq4jCIFpUizAKoqAghIgWQdDXpl1QizYVLWoRLWzVIopoE0UFQYugD4i+ICOKihhBxCky0xmd9577tLhX5513Zt733pmghf+6557zP8//f+4995zngr3YiwB0dnb2AHuMMWuMMYestR8CvwG7gXXA58aYG4F+4Clr7QDwE/A9sNNa+3tZluPA+8BQURSfAKiqrgYeB+4CbgW+BD4GtgCvAW8Bx4CfgbXAJuBZY8xbwE5V3SkiPwIvqOr9wCAwBLwPXA/MichOEXlFRN5R1btF5DtgG7BSRI6r6gvGmC+AzSLyYwiBOi8gIqjqKPBkVVUngBZwFNhWFMUrwJPAG8AQcB0wDKwANgJfAW8Cw8A0MNBut3cAVwKfAW8Dg8AKa+1uYCtwP3CZtXZIVYeBd4FPgYF2u/0gcDlwEPhQVYestXuBrcD9wICq7gBuAQ4AHwHDwAhwGNhvrd0LbAEeAFYaY3YA1wIHgI+BEeAq4BBwwFq7B7gHeBhYZYzZDlwDfAHsAkaAUeAwsN9auwfYDDwErDbGbAfWA18Cu4H1wDXAYeATa+1uYBPwMLDGGPMccCXwObALWA+MAkeAT621u4CNwKPAWmPMNmCdMeZr4D1gA3A1cAQ4YK3dDdwNPAKsMca8CFwBfAbsAtYDVwNHgU+ttbuAO4HHgHXGmBeAy4HPgPeAjcA1wDHggLV2F3AX8DhwnTFmG7BWRL4B3gU2AFcBx4CD1tpdwB3AE8B1xpjngUuBz4H3gI3AWuA4cNBauwu4E3gMWG+MeQ5YJSJfA+8DG4F1wAngkLV2J3A78CRwvTHmWWPMJcaYfwDmX+W/F/8C1kWjGZcIG3MAAAAASUVORK5CYII=`,
    off: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKUSURBVFiF7ZdNiFZVGMd/z7lvM42NhY0fA4ERSGREq4jCIFpUizAKoqAghIgWQdDXpl1QizYVLWoRLWzVIopoE0UFQYugD4i+ICOKihhBxCky0xmd9577tLhX5513Zt733pmghf+6557zP8//f+4995zngr3YiwB0dnb2AHuMMWuMMYestR8CvwG7gXXA58aYG4F+4Clr7QDwE/A9sNNa+3tZluPA+8BQURSfAKiqrgYeB+4CbgW+BD4GtgCvAW8Bx4CfgbXAJuBZY8xbwE5V3SkiPwIvqOr9wCAwBLwPXA/MichOEXlFRN5R1btF5DtgG7BSRI6r6gvGmC+AzSLyYwiBOi8gIqjqKPBkVVUngBZwFNhWFMUrwJPAG8AQcB0wDKwANgJfAW8Cw8A0MNBut3cAVwKfAW8Dg8AKa+1uYCtwP3CZtXZIVYeBd4FPgYF2u/0gcDlwEPhQVYestXuBrcD9wICq7gBuAQ4AHwHDwAhwGNhvrd0LbAEeAFYaY3YA1wIHgI+BEeAq4BBwwFq7B7gHeBhYZYzZDlwDfAHsAkaAUeAwsN9auwfYDDwErDbGbAfWA18Cu4H1wDXAYeATa+1uYBPwMLDGGPMccCXwObALWA+MAkeAT621u4CNwKPAWmPMNmCdMeZr4D1gA3A1cAQ4YK3dDdwNPAKsMca8CFwBfAbsAtYDVwNHgU+ttbuAO4HHgHXGmBeAy4HPgPeAjcA1wDHggLV2F3AX8DhwnTFmG7BWRL4B3gU2AFcBx4CD1tpdwB3AE8B1xpjngUuBz4H3gI3AWuA4cNBauwu4E3gMWG+MeQ5YJSJfA+8DG4F1wAngkLV2J3A78CRwvTHmWWPMJcaYfwDmX+W/F/8C1kWjGZcIG3MAAAAASUVORK5CYII=`
};

// 确保 icons 目录存在
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// 将 Base64 转换为图片文件
function saveBase64AsImage(base64Data, filename) {
    // 移除 data:image/png;base64, 前缀
    const data = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(path.join(iconsDir, filename), buffer);
}

// 生成两个状态的图标
saveBase64AsImage(iconData.on, 'nginx-on.png');
saveBase64AsImage(iconData.off, 'nginx-off.png');

console.log('图标文件已生成在:', iconsDir); 