#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const sudo = require('sudo-prompt');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const nginxCommands = {
  start: 'nginx',
  stop: 'nginx -s stop',
  reload: 'nginx -s reload',
  status: 'ps aux | grep nginx',
};

async function executeNginxCommand(command) {
  return new Promise((resolve, reject) => {
    sudo.exec(command, { name: 'quickNginx' }, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
}

async function checkNginxStatus() {
  try {
    const { stdout } = await execAsync(nginxCommands.status);
    const isRunning = stdout.toLowerCase().includes('nginx: master process');
    return isRunning;
  } catch (error) {
    return false;
  }
}

async function main() {
  const isRunning = await checkNginxStatus();
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '请选择要执行的操作：',
      choices: [
        { name: 'Nginx状态', value: 'status' },
        { name: isRunning ? '停止 Nginx' : '启动 Nginx', value: isRunning ? 'stop' : 'start' },
        { name: '重新加载配置', value: 'reload' },
        { name: '退出', value: 'exit' },
      ],
    },
  ]);

  if (action === 'exit') {
    console.log(chalk.yellow('再见！'));
    process.exit(0);
  }

  try {
    if (action === 'status') {
      console.log(chalk.blue(`Nginx 当前状态: ${isRunning ? '运行中' : '已停止'}`));
      return;
    }

    console.log(chalk.yellow(`执行命令: ${nginxCommands[action]}`));
    await executeNginxCommand(nginxCommands[action]);
    console.log(chalk.green(`操作成功完成！`));
  } catch (error) {
    console.error(chalk.red(`错误: ${error.message}`));
  }
}

program
  .version('1.0.0')
  .description('Nginx 管理工具')
  .action(main);

program.parse(process.argv); 