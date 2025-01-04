<template>
  <div class="container">
    <div class="status-panel">
      <h2>Nginx 状态: {{ nginxStatus ? '运行中' : '已停止' }}</h2>
      <div class="button-group">
        <button @click="toggleNginx" :class="{ active: nginxStatus }">
          {{ nginxStatus ? '停止' : '启动' }}
        </button>
        <button @click="reloadNginx" :disabled="!nginxStatus">
          重新加载
        </button>
      </div>
    </div>

    <div class="config-panel">
      <h3>配置选择</h3>
      <div class="config-buttons">
        <button
          v-for="config in configs"
          :key="config.id"
          @click="switchConfig(config.id)"
          :class="{ active: currentConfig === config.id }"
        >
          {{ config.name }}
        </button>
      </div>
    </div>

    <div class="logs-panel">
      <div class="logs-header">
        <h3>日志查看器</h3>
        <div class="logs-controls">
          <select v-model="currentLogType" @change="fetchLogs">
            <option value="access">访问日志</option>
            <option value="error">错误日志</option>
          </select>
          <button @click="fetchLogs" class="refresh-btn">
            刷新
          </button>
          <button @click="clearLogs" class="clear-btn">
            清空日志
          </button>
        </div>
      </div>
      <div class="logs-content" ref="logsContent">
        <div v-for="(log, index) in logs" :key="index" class="log-entry">
          <span class="log-timestamp">{{ log.timestamp }}</span>
          <span class="log-content">{{ log.content }}</span>
        </div>
        <div v-if="logs.length === 0" class="no-logs">
          暂无日志记录
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/tauri'

const nginxStatus = ref(false)
const currentConfig = ref(null)
const currentLogType = ref('access')
const logs = ref([])
const logsContent = ref(null)

const configs = [
  { id: 'yx_main', name: 'YX Main' },
  { id: 'yx_h5', name: 'YX H5' },
  { id: 'yx_tob', name: 'YX TOB' },
  { id: 'yx_tob_admin', name: 'YX TOB Admin' }
]

async function checkStatus() {
  try {
    nginxStatus.value = await invoke('check_nginx_status')
  } catch (error) {
    console.error('检查状态失败:', error)
  }
}

async function toggleNginx() {
  try {
    const command = nginxStatus.value ? 'stop' : 'start'
    await invoke('execute_nginx_command', { command })
    await checkStatus()
  } catch (error) {
    console.error('操作失败:', error)
  }
}

async function reloadNginx() {
  try {
    await invoke('execute_nginx_command', { command: 'reload' })
    await checkStatus()
  } catch (error) {
    console.error('重新加载失败:', error)
  }
}

async function switchConfig(configId) {
  try {
    await invoke('modify_nginx_config', { configToEnable: configId })
    currentConfig.value = configId
    await reloadNginx()
  } catch (error) {
    console.error('切换配置失败:', error)
  }
}

async function fetchLogs() {
  try {
    logs.value = await invoke('read_nginx_logs', { logType: currentLogType.value })
    // 滚动到底部
    if (logsContent.value) {
      setTimeout(() => {
        logsContent.value.scrollTop = logsContent.value.scrollHeight
      }, 100)
    }
  } catch (error) {
    console.error('获取日志失败:', error)
  }
}

async function clearLogs() {
  try {
    await invoke('clear_nginx_log', { logType: currentLogType.value })
    logs.value = []
  } catch (error) {
    console.error('清空日志失败:', error)
  }
}

onMounted(async () => {
  await checkStatus()
  await fetchLogs()
  // 每5秒检查一次状态
  setInterval(checkStatus, 5000)
  // 每10秒刷新一次日志
  setInterval(fetchLogs, 10000)
})
</script>

<style>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.status-panel, .config-panel, .logs-panel {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #e0e0e0;
  cursor: pointer;
  transition: all 0.3s;
}

button:hover {
  background: #d0d0d0;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.active {
  background: #4CAF50;
  color: white;
}

.config-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.logs-controls {
  display: flex;
  gap: 10px;
}

.logs-controls select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.logs-content {
  background: white;
  border-radius: 4px;
  padding: 10px;
  height: 400px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 14px;
}

.log-entry {
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}

.log-timestamp {
  color: #666;
  margin-right: 10px;
}

.no-logs {
  text-align: center;
  color: #666;
  padding: 20px;
}

.refresh-btn {
  background: #2196F3;
  color: white;
}

.clear-btn {
  background: #f44336;
  color: white;
}

.refresh-btn:hover {
  background: #1976D2;
}

.clear-btn:hover {
  background: #D32F2F;
}
</style> 