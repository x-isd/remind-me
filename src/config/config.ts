import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

export const config = {
  // 应用配置
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // 存储配置
  storageType: process.env.STORAGE_TYPE || 'json',
  databaseUrl: process.env.DATABASE_URL || '',
  dataDir: path.resolve(__dirname, '../../data'),

  // 调度模式
  schedulerMode: process.env.SCHEDULER_MODE || 'internal',

  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },

  // PushPlus
  pushplus: {
    token: process.env.PUSHPLUS_TOKEN || '',
  },

  // 邮箱配置
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },

  // API 认证
  apiKey: process.env.API_KEY || '',
};

export default config;
