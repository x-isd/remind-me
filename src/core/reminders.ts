import { v4 as uuidv4 } from 'uuid';
import { getStorage } from '../services/storage.js';
import Notifier from './notifier.js';
import {
  Reminder,
  CreateReminderRequest,
  UpdateReminderRequest,
  CheckResult,
} from '../types/index.js';

class ReminderManager {
  private notifier: Notifier;

  constructor() {
    this.notifier = new Notifier();
  }

  /**
   * 创建提醒
   */
  async createReminder(request: CreateReminderRequest): Promise<Reminder> {
    const storage = getStorage();
    const now = new Date().toISOString();

    const reminder: Reminder = {
      id: uuidv4(),
      name: request.name,
      message: request.message,
      intervalDays: request.intervalDays,
      lastNotifiedAt: null, // 首次创建，还没有通知过
      channels: request.channels,
      channelConfig: request.channelConfig || {},
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    await storage.createReminder(reminder);
    console.log(`[Reminder] Created: ${reminder.name} (${reminder.id})`);
    return reminder;
  }

  /**
   * 获取所有提醒
   */
  async getAllReminders(): Promise<Reminder[]> {
    const storage = getStorage();
    return storage.getAllReminders();
  }

  /**
   * 获取单个提醒
   */
  async getReminderById(id: string): Promise<Reminder | null> {
    const storage = getStorage();
    return storage.getReminderById(id);
  }

  /**
   * 更新提醒
   */
  async updateReminder(id: string, updates: UpdateReminderRequest): Promise<Reminder | null> {
    const storage = getStorage();
    const updated = await storage.updateReminder(id, updates);
    if (updated) {
      console.log(`[Reminder] Updated: ${updated.name} (${updated.id})`);
    }
    return updated;
  }

  /**
   * 删除提醒
   */
  async deleteReminder(id: string): Promise<boolean> {
    const storage = getStorage();
    const deleted = await storage.deleteReminder(id);
    if (deleted) {
      console.log(`[Reminder] Deleted: ${id}`);
    }
    return deleted;
  }

  /**
   * 检查所有提醒并触发通知
   * 这是核心逻辑：遍历所有启用的提醒，检查是否到期
   */
  async checkAndNotify(): Promise<CheckResult> {
    const storage = getStorage();
    const enabledReminders = await storage.getEnabledReminders();
    const now = new Date();

    const result: CheckResult = {
      timestamp: now.toISOString(),
      checkedReminders: enabledReminders.length,
      triggeredReminders: 0,
      results: [],
    };

    console.log(`[Scheduler] Checking ${enabledReminders.length} enabled reminders...`);

    for (const reminder of enabledReminders) {
      const shouldNotify = this.shouldTrigger(reminder, now);

      if (shouldNotify) {
        console.log(`[Scheduler] Triggering: ${reminder.name}`);

        const notificationResults = await this.notifier.sendNotification(reminder);

        // 检查是否至少有一个渠道发送成功
        const hasSuccess = notificationResults.some(r => r.success);

        if (hasSuccess) {
          // 更新最后通知时间
          await storage.updateReminder(reminder.id, {
            lastNotifiedAt: now.toISOString(),
          });
        }

        result.triggeredReminders++;
        result.results.push({
          reminderId: reminder.id,
          reminderName: reminder.name,
          notificationResults,
        });

        // 打印每个渠道的结果
        for (const nr of notificationResults) {
          if (nr.success) {
            console.log(`  ✅ [${nr.channel}] ${nr.message}`);
          } else {
            console.log(`  ❌ [${nr.channel}] ${nr.error}`);
          }
        }
      }
    }

    console.log(
      `[Scheduler] Done. Checked: ${result.checkedReminders}, Triggered: ${result.triggeredReminders}`
    );

    return result;
  }

  /**
   * 判断提醒是否需要触发
   */
  private shouldTrigger(reminder: Reminder, now: Date): boolean {
    // 如果从来没有通知过，使用创建时间作为基准
    const baseTime = reminder.lastNotifiedAt
      ? new Date(reminder.lastNotifiedAt)
      : new Date(reminder.createdAt);

    const daysSinceBase = (now.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceBase >= reminder.intervalDays;
  }

  /**
   * 手动触发指定提醒（用于测试）
   */
  async triggerReminder(id: string): Promise<CheckResult | null> {
    const storage = getStorage();
    const reminder = await storage.getReminderById(id);

    if (!reminder) {
      return null;
    }

    const now = new Date();
    const notificationResults = await this.notifier.sendNotification(reminder);

    return {
      timestamp: now.toISOString(),
      checkedReminders: 1,
      triggeredReminders: 1,
      results: [
        {
          reminderId: reminder.id,
          reminderName: reminder.name,
          notificationResults,
        },
      ],
    };
  }

  /**
   * 获取提醒状态信息
   */
  async getReminderStatus(id: string): Promise<{
    reminder: Reminder;
    nextTriggerAt: string;
    daysUntilTrigger: number;
  } | null> {
    const storage = getStorage();
    const reminder = await storage.getReminderById(id);

    if (!reminder) return null;

    const baseTime = reminder.lastNotifiedAt
      ? new Date(reminder.lastNotifiedAt)
      : new Date(reminder.createdAt);

    const nextTriggerAt = new Date(
      baseTime.getTime() + reminder.intervalDays * 24 * 60 * 60 * 1000
    );

    const daysUntilTrigger = Math.max(
      0,
      (nextTriggerAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return {
      reminder,
      nextTriggerAt: nextTriggerAt.toISOString(),
      daysUntilTrigger: Math.round(daysUntilTrigger * 10) / 10,
    };
  }
}

export default ReminderManager;
