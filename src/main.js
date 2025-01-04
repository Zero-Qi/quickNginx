const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const sudo = require('sudo-prompt');
const { exec, execSync } = require('child_process');

let tray = null;
let window = null;
let currentConfig = null;

// 定义默认的 Nginx 相关路径
const DEFAULT_NGINX_PATHS = {
  bin: '/usr/local/bin/nginx',
  conf: '/usr/local/nginx/conf/nginx.conf',
  confDir: '/usr/local/nginx/conf',
  logDir: '/usr/local/nginx/logs',
  runDir: '/usr/local/nginx'
};

// 当前使用的 Nginx 路径配置
let NGINX_PATHS = { ...DEFAULT_NGINX_PATHS };

// 更新 Nginx 路径配置
function updateNginxPaths(newPaths) {
  if (newPaths.bin) {
    NGINX_PATHS.bin = newPaths.bin;
  }
  if (newPaths.conf) {
    NGINX_PATHS.conf = newPaths.conf;
    // 更新其他相关路径
    NGINX_PATHS.confDir = path.dirname(newPaths.conf);
    NGINX_PATHS.logDir = path.join(path.dirname(path.dirname(newPaths.conf)), 'logs');
    NGINX_PATHS.runDir = path.dirname(path.dirname(newPaths.conf));
  }
}

// 获取当前 Nginx 路径配置
function getNginxPaths() {
  return NGINX_PATHS;
}

// 初始化时设置权限
async function initializePermissions() {
  try {
    // 先检查 Nginx 是否已安装
    if (!fs.existsSync(NGINX_PATHS.bin)) {
      throw new Error('Nginx 未安装，请先安装 Nginx');
    }

    // 使用 sudo-prompt 执行命令来设置权限
    const commands = [
      // 确保配置文件存在
      `touch ${NGINX_PATHS.conf}`,
      // 设置主配置文件的权限为 644 (用户可读写，其他人只读)
      `chmod 644 ${NGINX_PATHS.conf}`,
      // 修改主配置文件的所有者为当前用户
      `chown ${process.env.USER} ${NGINX_PATHS.conf}`,
      // 给 nginx 可执行文件设置 777 权限
      `chmod 777 ${NGINX_PATHS.bin}`,
      // 给 nginx 可执行文件设置当前用户为所有者
      `chown ${process.env.USER} ${NGINX_PATHS.bin}`
    ].join(' && ');

    await new Promise((resolve, reject) => {
      sudo.exec(commands, {
        name: 'quickNginx'
      }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    console.log('权限设置成功');
    return true;
  } catch (error) {
    console.error('权限设置失败:', error);
    return false;
  }
}

// 执行 nginx 命令
async function executeNginxCommand(command) {
  return new Promise(async (resolve, reject) => {
    let cmd;
    switch (command) {
      case 'start':
        try {
          // 先尝试停止现有的 nginx 进程
          console.log('尝试停止现有的 nginx 进程');
          await executeNginxCommand('stop').catch(() => {}); // 忽略停止时的错误
          // 等待进程完全终止
          await new Promise(resolve => setTimeout(resolve, 1000));
          cmd = NGINX_PATHS.bin;
        } catch (error) {
          console.error('停止现有进程失败:', error);
        }
        break;
      case 'stop':
        cmd = `${NGINX_PATHS.bin} -s stop`;
        break;
      case 'reload':
        cmd = `${NGINX_PATHS.bin} -s reload`;
        break;
      default:
        reject(new Error('无效的命令'));
        return;
    }

    try {
      const { stdout } = await new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve({ stdout });
        });
      });
      
      console.log('Nginx命令执行成功:', stdout);
      await updateTrayIcon();
      resolve(stdout);
    } catch (error) {
      console.error('执行Nginx命令失败:', error);
      await updateTrayIcon();
      reject(error);
    }
  });
}

// 修改 Nginx 配置文件
function modifyNginxConfig(configToEnable) {
  try {
    const configPath = NGINX_PATHS.conf;
    console.log('正在读取配置文件:', configPath);
    
    let configContent = fs.readFileSync(configPath, 'utf8');

    // 找到注释 "# 这里写对应include的文件" 的位置
    const commentRegex = /(# 这里写对应include的文件\n)/;
    
    // 准备所有可能的 include 语句
    const allConfigs = {
      'yx_main': 'include ./yx_conf/yx_main.conf;',
      'yx_h5': 'include ./yx_conf/yx_h5.conf;',
      'yx_tob': 'include ./yx_conf/yx_tob.conf;',
      'yx_tob_admin': 'include ./yx_conf/yx_tob_admin.conf;'
    };

    // 先移除所有现有的 include 语句
    configContent = configContent.replace(/^\s*include\s+\.\/yx_conf\/yx_[^\.]+\.conf;\s*$/gm, '');

    // 在注释后添加新的 include 语句
    configContent = configContent.replace(commentRegex, (match) => {
      if (configToEnable && allConfigs[configToEnable]) {
        return `${match}        ${allConfigs[configToEnable]}\n`;
      }
      return match;
    });

    console.log('更新后的配置内容:', configContent);
    fs.writeFileSync(configPath, configContent, 'utf8');
    console.log(`Nginx 配置已更新: ${configToEnable}`);
  } catch (error) {
    console.error('修改 Nginx 配置失败:', error);
    throw error;
  }
}

// 检查 Nginx 状态
async function checkNginxStatus() {
  return new Promise((resolve) => {
    exec(`ps aux | grep "${NGINX_PATHS.bin}" | grep -v grep`, (error) => {
      resolve(!error);
    });
  });
}

function createWindow() {
  window = new BrowserWindow({
    width: 300,
    height: 500,
    show: false,
    frame: true,
    resizable: true,
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  window.loadFile('src/index.html');
  window.once('ready-to-show', () => {
    window.show();
  });
}

// 创建托盘图标
async function createTray() {
  try {
    if (tray) {
      tray.destroy();
      tray = null;
    }

    // 根据是否是打包环境选择正确的路径
    let iconPath;
    if (app.isPackaged) {
      iconPath = path.join(process.resourcesPath, 'build', 'tray.png');
    } else {
      iconPath = path.join(__dirname, '..', 'build', 'tray.png');
    }

    console.log('尝试加载托盘图标:', iconPath);
    
    // 确保图标文件存在
    if (!fs.existsSync(iconPath)) {
      console.error(`图标文件不存在: ${iconPath}`);
      // 尝试使用备用图标
      const backupIconPath = path.join(__dirname, '..', 'build', 'tray.png');
      if (fs.existsSync(backupIconPath)) {
        iconPath = backupIconPath;
        console.log('使用备用图标:', iconPath);
      } else {
        console.error('备用图标也不存在');
        return false;
      }
    }

    // 创建原始尺寸的图标
    const originalIcon = nativeImage.createFromPath(iconPath);
    console.log('原始图标尺寸:', originalIcon.getSize());

    // 根据平台调整图标尺寸
    const icon = process.platform === 'darwin' 
      ? originalIcon.resize({ width: 18, height: 18 })
      : originalIcon.resize({ width: 16, height: 16 });

    // 创建托盘
    tray = new Tray(icon);
    tray.setToolTip('quickNginx');

    // 设置初始菜单
    const initialMenu = Menu.buildFromTemplate([
      { label: 'quickNginx', enabled: false },
      { type: 'separator' },
      { label: '正在加载...', enabled: false }
    ]);
    tray.setContextMenu(initialMenu);

    // 确保托盘图标创建成功
    if (!tray) {
      console.error('托盘创建失败');
      return false;
    }

    console.log('托盘创建成功');

    // 异步更新托盘状态
    setTimeout(async () => {
      await updateTrayIcon();
    }, 1000);

    return true;
  } catch (error) {
    console.error('创建托盘图标失败:', error);
    return false;
  }
}

// 创建配置菜单项
function createConfigMenuItems() {
  const configs = ['yx_main', 'yx_h5', 'yx_tob', 'yx_tob_admin'];
  return configs.map(config => {
    const isActive = currentConfig === config;
    return {
      label: `${isActive ? '停止' : '启动'} ${config}`,
      click: async () => {
        try {
          if (isActive) {
            await executeNginxCommand('stop');
            currentConfig = null;
          } else {
            if (await checkNginxStatus()) {
              await executeNginxCommand('stop');
            }
            modifyNginxConfig(config);
            await executeNginxCommand('start');
            currentConfig = config;
          }
          await updateTrayIcon();
        } catch (error) {
          console.error('操作失败:', error);
          dialog.showErrorBox('错误', `操作失败: ${error.message}`);
        }
      }
    };
  });
}

// 更新托盘图标状态
async function updateTrayIcon() {
  if (!tray) {
    console.log('托盘对象不存在，尝试重新创建');
    await createTray();
    return;
  }

  try {
    const isRunning = await checkNginxStatus();
    
    let statusText = isRunning ? '运行中' : '已停止';
    if (isRunning && currentConfig) {
      statusText = `运行中 - ${currentConfig}`;
    }
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Nginx 状态: ${statusText}`,
        enabled: false,
        id: 'status'
      },
      { type: 'separator' },
      {
        label: isRunning ? '停止 Nginx' : '启动 Nginx',
        click: async () => {
          try {
            const command = isRunning ? 'stop' : 'start';
            await executeNginxCommand(command);
            if (command === 'stop') {
              currentConfig = null;
            }
          } catch (error) {
            console.error('Nginx操作失败:', error);
            dialog.showErrorBox('Nginx 错误', `操作失败: ${error.message}`);
          }
        }
      },
      { type: 'separator' },
      ...createConfigMenuItems(),
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    // 更新图标
    const iconName = isRunning ? 'tray.png' : 'tray-disabled.png';
    let iconPath;
    if (app.isPackaged) {
      iconPath = path.join(process.resourcesPath, 'build', iconName);
    } else {
      iconPath = path.join(__dirname, '..', 'build', iconName);
    }

    if (!fs.existsSync(iconPath)) {
      console.error(`图标文件不存在: ${iconPath}，使用默认图标`);
      iconPath = path.join(__dirname, '..', 'build', 'tray.png');
    }
    
    console.log('更新托盘图标:', iconPath);
    
    // 创建原始尺寸的图标
    const originalIcon = nativeImage.createFromPath(iconPath);
    console.log('原始图标尺寸:', originalIcon.getSize());

    // 根据平台调整图标尺寸
    const icon = process.platform === 'darwin' 
      ? originalIcon.resize({ width: 18, height: 18 })
      : originalIcon.resize({ width: 16, height: 16 });

    tray.setImage(icon);
  } catch (error) {
    console.error('更新托盘图标失败:', error);
  }
}

// 添加 IPC 处理程序
ipcMain.handle('get-nginx-paths', () => {
  return getNginxPaths();
});

ipcMain.handle('update-nginx-paths', async (event, newPaths) => {
  try {
    updateNginxPaths(newPaths);
    // 验证新路径
    if (!fs.existsSync(NGINX_PATHS.bin)) {
      throw new Error('Nginx 可执行文件不存在');
    }
    if (!fs.existsSync(NGINX_PATHS.conf)) {
      throw new Error('Nginx 配置文件不存在');
    }
    // 重新初始化权限
    await initializePermissions();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('nginx-command', async (event, command, config) => {
  try {
    // 如果是状态检查命令
    if (command === 'status') {
      const isRunning = await checkNginxStatus();
      return { 
        success: true, 
        isRunning: isRunning,
        currentConfig: currentConfig 
      };
    }

    // 如果是启动命令且指定了配置
    if (command === 'start' && config) {
      // 修改配置文件
      modifyNginxConfig(config);
      currentConfig = config;
    }
    
    await executeNginxCommand(command);
    
    // 如果是停止命令，清除当前配置
    if (command === 'stop') {
      currentConfig = null;
      modifyNginxConfig(null); // 清除配置文件中的include
    }
    
    // 立即更新托盘图标和菜单
    await updateTrayIcon();
    
    // 获取最新状态
    const isRunning = await checkNginxStatus();
    
    // 广播状态变化给所有窗口
    if (window) {
      window.webContents.send('nginx-status-changed', {
        isRunning: isRunning,
        currentConfig: currentConfig
      });
    }
    
    return { 
      success: true,
      isRunning: isRunning,
      currentConfig: currentConfig
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  await initializePermissions();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 