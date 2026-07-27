import config from '../config/config.js';
import { getStorage } from './storage.js';

export interface ChannelSettings {
  telegram: { botToken: string; chatId: string };
  pushplus: { token: string };
  smtp: { host: string; port: number; user: string; password: string; defaultTo: string };
  webhook: { url: string };
}

const EMPTY: ChannelSettings = {
  telegram: { botToken: '', chatId: '' },
  pushplus: { token: '' },
  smtp: { host: '', port: 465, user: '', password: '', defaultTo: '' },
  webhook: { url: '' },
};

async function readStoredSettings(): Promise<Partial<ChannelSettings>> {
  try {
    return await getStorage().readSettings();
  } catch {
    return {};
  }
}

/**
 * 合并优先级：已保存的渠道设置（JSON 文件或数据库） > .env > 空
 */
export async function getSettings(): Promise<ChannelSettings> {
  const file = await readStoredSettings();
  return {
    telegram: {
      botToken: file.telegram?.botToken || config.telegram.botToken,
      chatId: file.telegram?.chatId || config.telegram.chatId,
    },
    pushplus: {
      token: file.pushplus?.token || config.pushplus.token,
    },
    smtp: {
      host: file.smtp?.host || config.smtp.host,
      port: file.smtp?.port || config.smtp.port,
      user: file.smtp?.user || config.smtp.user,
      password: file.smtp?.password || config.smtp.password,
      defaultTo: file.smtp?.defaultTo || '',
    },
    webhook: {
      url: file.webhook?.url || '',
    },
  };
}

export async function saveSettings(updates: Partial<ChannelSettings>): Promise<ChannelSettings> {
  const file = await readStoredSettings();
  const merged = {
    telegram: { ...EMPTY.telegram, ...file.telegram, ...updates.telegram },
    pushplus: { ...EMPTY.pushplus, ...file.pushplus, ...updates.pushplus },
    smtp: { ...EMPTY.smtp, ...file.smtp, ...updates.smtp },
    webhook: { ...EMPTY.webhook, ...file.webhook, ...updates.webhook },
  };
  await getStorage().writeSettings(merged);
  return getSettings();
}
