import fs from 'fs/promises';
import path from 'path';
import { Reminder } from '../types/index.js';
import config from '../config/config.js';

interface StorageData {
  reminders: Reminder[];
}

/**
 * 统一存储接口：JSON 文件 / PostgreSQL / MySQL 都实现它
 */
export interface StorageBackend {
  load(): Promise<void>;
  getAllReminders(): Promise<Reminder[]>;
  getReminderById(id: string): Promise<Reminder | null>;
  createReminder(reminder: Reminder): Promise<Reminder>;
  updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null>;
  deleteReminder(id: string): Promise<boolean>;
  getEnabledReminders(): Promise<Reminder[]>;
  /** 渠道设置（settings.json 的数据库等价物） */
  readSettings(): Promise<Record<string, any>>;
  writeSettings(settings: Record<string, any>): Promise<void>;
}

class JsonStorage implements StorageBackend {
  private filePath: string;
  private settingsPath: string;
  private data: StorageData;

  constructor() {
    this.filePath = path.join(config.dataDir, 'reminders.json');
    this.settingsPath = path.join(config.dataDir, 'settings.json');
    this.data = { reminders: [] };
  }

  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(content);
    } catch (error) {
      // 文件不存在或解析失败，使用默认值
      await this.save();
    }
  }

  async save(): Promise<void> {
    try {
      // 确保目录存在
      await fs.mkdir(config.dataDir, { recursive: true });
      await fs.writeFile(
        this.filePath,
        JSON.stringify(this.data, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving storage:', error);
      throw error;
    }
  }

  async getAllReminders(): Promise<Reminder[]> {
    return this.data.reminders;
  }

  async getReminderById(id: string): Promise<Reminder | null> {
    return this.data.reminders.find(r => r.id === id) || null;
  }

  async createReminder(reminder: Reminder): Promise<Reminder> {
    this.data.reminders.push(reminder);
    await this.save();
    return reminder;
  }

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null> {
    const index = this.data.reminders.findIndex(r => r.id === id);
    if (index === -1) return null;

    const reminder = this.data.reminders[index];
    const updated = { ...reminder, ...updates, updatedAt: new Date().toISOString() };
    this.data.reminders[index] = updated;
    await this.save();
    return updated;
  }

  async deleteReminder(id: string): Promise<boolean> {
    const initialLength = this.data.reminders.length;
    this.data.reminders = this.data.reminders.filter(r => r.id !== id);
    if (this.data.reminders.length < initialLength) {
      await this.save();
      return true;
    }
    return false;
  }

  async getEnabledReminders(): Promise<Reminder[]> {
    return this.data.reminders.filter(r => r.enabled);
  }

  async readSettings(): Promise<Record<string, any>> {
    try {
      const raw = await fs.readFile(this.settingsPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  async writeSettings(settings: Record<string, any>): Promise<void> {
    await fs.mkdir(config.dataDir, { recursive: true });
    await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  }
}

let storage: StorageBackend;

/**
 * 根据配置选择存储后端：
 * - STORAGE_TYPE=postgres 或 DATABASE_URL 以 postgres 开头 → PostgreSQL
 * - STORAGE_TYPE=mysql 或 DATABASE_URL 以 mysql 开头 → MySQL
 * - 其他 → JSON 文件（默认）
 */
export async function initializeStorage(): Promise<void> {
  const type = resolveStorageType();
  if (type === 'postgres') {
    const { PostgresStorage } = await import('./storage-db.js');
    storage = new PostgresStorage();
  } else if (type === 'mysql') {
    const { MysqlStorage } = await import('./storage-db.js');
    storage = new MysqlStorage();
  } else {
    storage = new JsonStorage();
  }
  await storage.load();
}

export function resolveStorageType(): 'postgres' | 'mysql' | 'json' {
  const t = (process.env.STORAGE_TYPE || '').toLowerCase();
  const url = config.databaseUrl;
  if (t === 'postgres' || t === 'postgresql' || t === 'pg') return 'postgres';
  if (t === 'mysql') return 'mysql';
  if (t === 'json') return 'json';
  // STORAGE_TYPE 未显式指定时，按 DATABASE_URL 协议自动识别
  if (/^postgres(ql)?:\/\//i.test(url)) return 'postgres';
  if (/^mysql:\/\//i.test(url)) return 'mysql';
  return 'json';
}

export function getStorage(): StorageBackend {
  if (!storage) {
    throw new Error('Storage not initialized. Call initializeStorage() first.');
  }
  return storage;
}

export default JsonStorage;
