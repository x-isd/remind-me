import { Reminder } from '../types/index.js';
import config from '../config/config.js';
import { StorageBackend } from './storage.js';

const SETTINGS_KEY = 'channel_settings';

/**
 * PostgreSQL 存储（适用于 Aiven / Neon / Supabase 等托管 PG）
 * 表结构自动创建：reminders(id, data JSONB) + settings(k, v)
 */
export class PostgresStorage implements StorageBackend {
  private pool: any;

  async load(): Promise<void> {
    const { default: pg } = await import('pg');
    this.pool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 3,
      ssl: config.databaseUrl.includes('sslmode=disable')
        ? undefined
        : { rejectUnauthorized: false },
    });
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        k VARCHAR(64) PRIMARY KEY,
        v TEXT NOT NULL
      )`);
    console.log('[Storage] PostgreSQL connected, tables ready');
  }

  async getAllReminders(): Promise<Reminder[]> {
    const res = await this.pool.query('SELECT data FROM reminders');
    return res.rows.map((r: any) => r.data as Reminder);
  }

  async getReminderById(id: string): Promise<Reminder | null> {
    const res = await this.pool.query('SELECT data FROM reminders WHERE id = $1', [id]);
    return res.rows[0] ? (res.rows[0].data as Reminder) : null;
  }

  async createReminder(reminder: Reminder): Promise<Reminder> {
    await this.pool.query('INSERT INTO reminders (id, data) VALUES ($1, $2)', [
      reminder.id,
      JSON.stringify(reminder),
    ]);
    return reminder;
  }

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null> {
    const current = await this.getReminderById(id);
    if (!current) return null;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.pool.query('UPDATE reminders SET data = $1 WHERE id = $2', [
      JSON.stringify(updated),
      id,
    ]);
    return updated;
  }

  async deleteReminder(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM reminders WHERE id = $1', [id]);
    return res.rowCount > 0;
  }

  async getEnabledReminders(): Promise<Reminder[]> {
    return (await this.getAllReminders()).filter(r => r.enabled);
  }

  async readSettings(): Promise<Record<string, any>> {
    const res = await this.pool.query('SELECT v FROM settings WHERE k = $1', [SETTINGS_KEY]);
    if (!res.rows[0]) return {};
    try { return JSON.parse(res.rows[0].v); } catch { return {}; }
  }

  async writeSettings(settings: Record<string, any>): Promise<void> {
    await this.pool.query(
      `INSERT INTO settings (k, v) VALUES ($1, $2)
       ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`,
      [SETTINGS_KEY, JSON.stringify(settings)]
    );
  }
}

/**
 * MySQL 存储（适用于 Aiven / PlanetScale 等托管 MySQL）
 * 表结构自动创建：reminders(id, data JSON) + settings(k, v)
 */
export class MysqlStorage implements StorageBackend {
  private pool: any;

  async load(): Promise<void> {
    const mysql = await import('mysql2/promise');
    // Aiven MySQL 连接串形如 mysql://user:pass@host:port/db?ssl-mode=REQUIRED
    const url = new URL(config.databaseUrl);
    const sslDisabled = /ssl-mode=disabled/i.test(config.databaseUrl);
    this.pool = mysql.createPool({
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      connectionLimit: 3,
      ssl: sslDisabled ? undefined : { rejectUnauthorized: false },
    });
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id VARCHAR(64) PRIMARY KEY,
        data JSON NOT NULL
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        k VARCHAR(64) PRIMARY KEY,
        v TEXT NOT NULL
      )`);
    console.log('[Storage] MySQL connected, tables ready');
  }

  private parseRow(data: any): Reminder {
    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  async getAllReminders(): Promise<Reminder[]> {
    const [rows] = await this.pool.query('SELECT data FROM reminders');
    return (rows as any[]).map(r => this.parseRow(r.data));
  }

  async getReminderById(id: string): Promise<Reminder | null> {
    const [rows] = await this.pool.query('SELECT data FROM reminders WHERE id = ?', [id]);
    const row = (rows as any[])[0];
    return row ? this.parseRow(row.data) : null;
  }

  async createReminder(reminder: Reminder): Promise<Reminder> {
    await this.pool.query('INSERT INTO reminders (id, data) VALUES (?, ?)', [
      reminder.id,
      JSON.stringify(reminder),
    ]);
    return reminder;
  }

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null> {
    const current = await this.getReminderById(id);
    if (!current) return null;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.pool.query('UPDATE reminders SET data = ? WHERE id = ?', [
      JSON.stringify(updated),
      id,
    ]);
    return updated;
  }

  async deleteReminder(id: string): Promise<boolean> {
    const [res] = await this.pool.query('DELETE FROM reminders WHERE id = ?', [id]);
    return (res as any).affectedRows > 0;
  }

  async getEnabledReminders(): Promise<Reminder[]> {
    return (await this.getAllReminders()).filter(r => r.enabled);
  }

  async readSettings(): Promise<Record<string, any>> {
    const [rows] = await this.pool.query('SELECT v FROM settings WHERE k = ?', [SETTINGS_KEY]);
    const row = (rows as any[])[0];
    if (!row) return {};
    try { return JSON.parse(row.v); } catch { return {}; }
  }

  async writeSettings(settings: Record<string, any>): Promise<void> {
    await this.pool.query(
      'INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)',
      [SETTINGS_KEY, JSON.stringify(settings)]
    );
  }
}
