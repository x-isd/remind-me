import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/config.js';
import { initializeStorage, resolveStorageType } from './services/storage.js';
import { authMiddleware, logMiddleware } from './api/middleware.js';
import apiRoutes from './api/routes.js';
import Scheduler from './core/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('========================================');
  console.log('  ⏰ 保号提醒系统 v1.0.0');
  console.log('========================================');
  console.log(`  环境: ${config.nodeEnv}`);
  console.log(`  调度模式: ${config.schedulerMode}`);
  console.log(`  存储类型: ${resolveStorageType()}`);
  console.log('========================================');

  // 初始化存储
  await initializeStorage();
  console.log('[Storage] Initialized');

  // 创建 Express 应用
  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json());
  app.use(logMiddleware);
  app.use('/api', authMiddleware);

  // API 路由
  app.use('/api', apiRoutes);

  // 静态文件服务（前端页面）
  const publicDir = path.resolve(__dirname, '../public');
  app.use(express.static(publicDir));

  // 所有非 API 路由返回前端页面（SPA 支持）
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // 启动内部调度器（Docker 模式）
  const scheduler = new Scheduler();
  scheduler.start();

  // 启动服务器
  const server = app.listen(config.port, () => {
    console.log(`[Server] Listening on http://localhost:${config.port}`);
    console.log(`[Server] Open http://localhost:${config.port} in your browser`);
  });

  // 优雅关闭
  const gracefulShutdown = () => {
    console.log('\n[Server] Shutting down...');
    scheduler.stop();
    server.close(() => {
      console.log('[Server] Goodbye!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

main().catch((error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});

export default main;
