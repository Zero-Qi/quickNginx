const { ipcRenderer } = require('electron');

// 配置列表
const configs = ['yx_main', 'yx_h5', 'yx_tob', 'yx_tob_admin'];
let currentConfig = null;
let isRunning = false;

// 加载 Nginx 路径设置
async function loadNginxPaths() {
    try {
        const paths = await ipcRenderer.invoke('get-nginx-paths');
        document.getElementById('nginxPath').value = paths.bin;
        document.getElementById('nginxConf').value = paths.conf;
    } catch (error) {
        console.error('加载 Nginx 路径失败:', error);
    }
}

// 保存 Nginx 路径设置
document.getElementById('saveSettings').onclick = async () => {
    try {
        const newPaths = {
            bin: document.getElementById('nginxPath').value,
            conf: document.getElementById('nginxConf').value
        };
        
        const result = await ipcRenderer.invoke('update-nginx-paths', newPaths);
        if (result.success) {
            alert('设置保存成功');
            await checkStatus(); // 重新检查状态
        } else {
            alert('保存失败: ' + result.error);
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        alert('保存设置失败: ' + error.message);
    }
};

// 更新状态显示
function updateStatus() {
    const statusDiv = document.getElementById('status');
    const startButton = document.getElementById('startButton');
    const reloadButton = document.getElementById('reloadButton');
    
    statusDiv.className = 'status ' + (isRunning ? 'running' : 'stopped');
    
    let statusText = isRunning ? '运行中' : '已停止';
    if (isRunning && currentConfig) {
        statusText = `运行中 - ${currentConfig}`;
    }
    statusDiv.textContent = `Nginx 状态: ${statusText}`;

    // 更新按钮状态
    startButton.textContent = isRunning ? '停止 Nginx' : '启动 Nginx';
    startButton.className = isRunning ? 'stop' : 'start';
    reloadButton.disabled = !isRunning;
}

// 更新配置列表
function updateConfigList() {
    const configListDiv = document.getElementById('configList');
    configListDiv.innerHTML = '';

    configs.forEach(config => {
        const configItem = document.createElement('div');
        configItem.className = `config-item ${currentConfig === config ? 'active' : ''}`;

        const configName = document.createElement('span');
        configName.className = 'config-name';
        configName.textContent = config;

        const actionButton = document.createElement('button');
        actionButton.className = currentConfig === config ? 'stop' : 'start';
        actionButton.textContent = currentConfig === config ? '停止' : '启动';
        
        actionButton.onclick = async () => {
            try {
                let result;
                if (currentConfig === config) {
                    // 停止当前配置
                    result = await ipcRenderer.invoke('nginx-command', 'stop');
                } else {
                    // 如果有其他配置在运行，先停止
                    if (isRunning) {
                        await ipcRenderer.invoke('nginx-command', 'stop');
                    }
                    // 启动新配置
                    result = await ipcRenderer.invoke('nginx-command', 'start', config);
                }
                
                if (result.success) {
                    isRunning = result.isRunning;
                    currentConfig = result.currentConfig;
                    updateStatus();
                    updateConfigList();
                }
            } catch (error) {
                console.error('操作失败:', error);
            }
        };

        configItem.appendChild(configName);
        configItem.appendChild(actionButton);
        configListDiv.appendChild(configItem);
    });
}

// 检查 Nginx 状态
async function checkStatus() {
    try {
        const result = await ipcRenderer.invoke('nginx-command', 'status');
        if (result.success) {
            isRunning = result.isRunning;
            currentConfig = result.currentConfig;
            updateStatus();
            updateConfigList();
        }
    } catch (error) {
        console.error('检查状态失败:', error);
    }
}

// 重新加载配置按钮
document.getElementById('reloadButton').onclick = async () => {
    if (!isRunning) return;
    try {
        await ipcRenderer.invoke('nginx-command', 'reload');
        await checkStatus();
    } catch (error) {
        console.error('重新加载失败:', error);
    }
};

// 添加启动按钮的事件处理
document.getElementById('startButton').onclick = async () => {
    try {
        const command = isRunning ? 'stop' : 'start';
        const result = await ipcRenderer.invoke('nginx-command', command);
        if (result.success) {
            isRunning = result.isRunning;
            currentConfig = result.currentConfig;
            updateStatus();
            updateConfigList();
        }
    } catch (error) {
        console.error('操作失败:', error);
    }
};

// 监听来自主进程的状态变化通知
ipcRenderer.on('nginx-status-changed', async (event, { isRunning: newIsRunning, currentConfig: newConfig }) => {
    isRunning = newIsRunning;
    currentConfig = newConfig;
    updateStatus();
    updateConfigList();
});

// 初始化
loadNginxPaths();
checkStatus();

// 定期检查状态
setInterval(checkStatus, 5000); 