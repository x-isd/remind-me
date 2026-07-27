import { Request, Response } from 'express';
import ReminderManager from '../core/reminders.js';
import Scheduler from '../core/scheduler.js';
import Notifier from '../core/notifier.js';
import { getSettings, saveSettings, ChannelSettings } from '../services/settings.js';
import { CreateReminderRequest, UpdateReminderRequest, NotificationChannel } from '../types/index.js';

const reminderManager = new ReminderManager();
const scheduler = new Scheduler();
const notifier = new Notifier();

/**
 * GET /api/health
 * 健康检查
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/reminders
 * 获取所有提醒
 */
export async function getReminders(_req: Request, res: Response): Promise<void> {
  try {
    const reminders = await reminderManager.getAllReminders();
    res.json({ success: true, data: reminders });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * GET /api/reminders/:id
 * 获取单个提醒
 */
export async function getReminderById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const status = await reminderManager.getReminderStatus(id);

    if (!status) {
      res.status(404).json({ success: false, error: 'Reminder not found' });
      return;
    }

    res.json({ success: true, data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * POST /api/reminders
 * 创建提醒
 */
export async function createReminder(req: Request, res: Response): Promise<void> {
  try {
    const { name, message, intervalDays, channels, channelConfig } = req.body as CreateReminderRequest;

    // 参数校验
    if (!name || !message || !intervalDays) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name, message, intervalDays',
      });
      return;
    }

    if (!Array.isArray(channels) || channels.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one notification channel is required',
      });
      return;
    }

    if (intervalDays <= 0) {
      res.status(400).json({
        success: false,
        error: 'intervalDays must be a positive number',
      });
      return;
    }

    const reminder = await reminderManager.createReminder({
      name,
      message,
      intervalDays,
      channels,
      channelConfig: channelConfig || {},
    });

    res.status(201).json({ success: true, data: reminder });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * PUT /api/reminders/:id
 * 更新提醒
 */
export async function updateReminder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body as UpdateReminderRequest;

    const updated = await reminderManager.updateReminder(id, updates);

    if (!updated) {
      res.status(404).json({ success: false, error: 'Reminder not found' });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * DELETE /api/reminders/:id
 * 删除提醒
 */
export async function deleteReminder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await reminderManager.deleteReminder(id);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Reminder not found' });
      return;
    }

    res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * POST /api/check
 * 检查所有提醒并触发通知（用于外部 Cron 调用）
 */
export async function checkReminders(_req: Request, res: Response): Promise<void> {
  try {
    const result = await scheduler.runCheck();
    res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * POST /api/reminders/:id/trigger
 * 手动触发指定提醒（用于测试）
 */
export async function triggerReminder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await reminderManager.triggerReminder(id);

    if (!result) {
      res.status(404).json({ success: false, error: 'Reminder not found' });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * GET /api/settings
 * 获取渠道设置（密码/Token 打码返回）
 */
export async function getChannelSettings(_req: Request, res: Response): Promise<void> {
  try {
    const s = await getSettings();
    const mask = (v: string) => (v ? v.slice(0, 3) + '****' + v.slice(-3) : '');
    res.json({
      success: true,
      data: {
        telegram: {
          botToken: mask(s.telegram.botToken),
          botTokenSet: !!s.telegram.botToken,
          chatId: s.telegram.chatId,
        },
        pushplus: {
          token: mask(s.pushplus.token),
          tokenSet: !!s.pushplus.token,
        },
        smtp: {
          host: s.smtp.host,
          port: s.smtp.port,
          user: s.smtp.user,
          password: s.smtp.password ? '********' : '',
          passwordSet: !!s.smtp.password,
          defaultTo: s.smtp.defaultTo,
        },
        webhook: { url: s.webhook.url },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * PUT /api/settings
 * 保存渠道设置。带 **** 的打码值视为"未修改"，跳过。
 */
export async function updateChannelSettings(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Partial<ChannelSettings>;
    const current = await getSettings();
    const isMasked = (v: unknown) => typeof v === 'string' && v.includes('****');

    const updates: Partial<ChannelSettings> = {
      telegram: {
        botToken: isMasked(body.telegram?.botToken)
          ? current.telegram.botToken
          : (body.telegram?.botToken ?? current.telegram.botToken),
        chatId: body.telegram?.chatId ?? current.telegram.chatId,
      },
      pushplus: {
        token: isMasked(body.pushplus?.token)
          ? current.pushplus.token
          : (body.pushplus?.token ?? current.pushplus.token),
      },
      smtp: {
        host: body.smtp?.host ?? current.smtp.host,
        port: Number(body.smtp?.port) || current.smtp.port,
        user: body.smtp?.user ?? current.smtp.user,
        password: isMasked(body.smtp?.password)
          ? current.smtp.password
          : (body.smtp?.password ?? current.smtp.password),
        defaultTo: body.smtp?.defaultTo ?? current.smtp.defaultTo,
      },
      webhook: {
        url: body.webhook?.url ?? current.webhook.url,
      },
    };

    await saveSettings(updates);
    res.json({ success: true, message: '设置已保存' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * POST /api/notify/test
 * 测试通知渠道
 */
export async function testNotification(req: Request, res: Response): Promise<void> {
  try {
    const { channel } = req.body as { channel: NotificationChannel };

    if (!channel) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: channel (telegram | pushplus | email | webhook)',
      });
      return;
    }

    const result = await notifier.testChannel(channel);
    res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}
