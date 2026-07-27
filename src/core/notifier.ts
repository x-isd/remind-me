import TelegramService from '../services/telegram.js';
import PushPlusService from '../services/pushplus.js';
import EmailService from '../services/email.js';
import WebhookService from '../services/webhook.js';
import { getSettings } from '../services/settings.js';
import { NotificationChannel, NotificationResult, Reminder } from '../types/index.js';

class Notifier {
  private telegram: TelegramService;
  private pushplus: PushPlusService;
  private email: EmailService;
  private webhook: WebhookService;

  constructor() {
    this.telegram = new TelegramService();
    this.pushplus = new PushPlusService();
    this.email = new EmailService();
    this.webhook = new WebhookService();
  }

  /**
   * 根据提醒配置，向所有指定渠道发送通知
   */
  async sendNotification(reminder: Reminder): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    for (const channel of reminder.channels) {
      const result = await this.sendToChannel(channel, reminder, timestamp);
      results.push(result);
    }

    return results;
  }

  /**
   * 发送到指定渠道
   */
  private async sendToChannel(
    channel: NotificationChannel,
    reminder: Reminder,
    timestamp: string
  ): Promise<NotificationResult> {
    const channelConfig = reminder.channelConfig || {};

    switch (channel) {
      case 'telegram':
        return this.sendTelegram(reminder, channelConfig, timestamp);
      case 'pushplus':
        return this.sendPushPlus(reminder, channelConfig, timestamp);
      case 'email':
        return this.sendEmail(reminder, channelConfig, timestamp);
      case 'webhook':
        return this.sendWebhook(reminder, channelConfig, timestamp);
      default:
        return {
          channel,
          success: false,
          error: `Unknown notification channel: ${channel}`,
        };
    }
  }

  private async sendTelegram(
    reminder: Reminder,
    channelConfig: Record<string, any>,
    timestamp: string
  ): Promise<NotificationResult> {
    const settings = await getSettings();
    const chatId = channelConfig.telegram?.chatId || settings.telegram.chatId;
    const botToken = channelConfig.telegram?.botToken || settings.telegram.botToken;
    const message = this.formatTelegramMessage(reminder, timestamp);
    return this.telegram.sendMessage(message, chatId, botToken);
  }

  private async sendPushPlus(
    reminder: Reminder,
    channelConfig: Record<string, any>,
    timestamp: string
  ): Promise<NotificationResult> {
    const settings = await getSettings();
    const token = channelConfig.pushplus?.token || settings.pushplus.token;
    const title = `⏰ ${reminder.name}`;
    const content = this.formatPushPlusMessage(reminder, timestamp);
    return this.pushplus.sendMessage(title, content, token);
  }

  private async sendEmail(
    reminder: Reminder,
    channelConfig: Record<string, any>,
    timestamp: string
  ): Promise<NotificationResult> {
    const settings = await getSettings();
    const to = channelConfig.email?.to || settings.smtp.defaultTo;
    if (!to) {
      return {
        channel: 'email',
        success: false,
        error: '未填写收件邮箱：请在任务里填写，或在「渠道设置」中设置默认收件邮箱',
      };
    }
    const subject = `⏰ 提醒: ${reminder.name}`;
    const content = this.formatEmailMessage(reminder, timestamp);
    return this.email.sendMessage(to, subject, content, settings.smtp);
  }

  private async sendWebhook(
    reminder: Reminder,
    channelConfig: Record<string, any>,
    timestamp: string
  ): Promise<NotificationResult> {
    const settings = await getSettings();
    const url = channelConfig.webhook?.url || settings.webhook.url;
    if (!url) {
      return {
        channel: 'webhook',
        success: false,
        error: '未填写 Webhook URL：请在任务里填写，或在「渠道设置」中设置默认 URL',
      };
    }
    const payload = {
      event: 'reminder_triggered',
      reminder: {
        id: reminder.id,
        name: reminder.name,
        message: reminder.message,
      },
      timestamp,
    };
    return this.webhook.sendMessage(url, payload);
  }

  /**
   * Telegram 消息格式
   */
  private formatTelegramMessage(reminder: Reminder, timestamp: string): string {
    return [
      `⏰ <b>提醒: ${reminder.name}</b>`,
      ``,
      `📋 ${reminder.message}`,
      ``,
      `📅 周期: 每 ${reminder.intervalDays} 天`,
      `🕐 时间: ${timestamp}`,
      ``,
      `<i>— 来自保号提醒系统</i>`,
    ].join('\n');
  }

  /**
   * PushPlus 消息格式
   */
  private formatPushPlusMessage(reminder: Reminder, timestamp: string): string {
    return `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #e74c3c;">⏰ ${reminder.name}</h2>
        <p style="font-size: 16px; color: #333;">${reminder.message}</p>
        <hr style="border: 1px solid #eee;" />
        <p style="color: #666; font-size: 14px;">
          📅 周期: 每 ${reminder.intervalDays} 天<br/>
          🕐 时间: ${timestamp}
        </p>
        <p style="color: #999; font-size: 12px;">— 来自保号提醒系统</p>
      </div>
    `;
  }

  /**
   * 邮件消息格式
   */
  private formatEmailMessage(reminder: Reminder, timestamp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, sans-serif; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #e74c3c; margin-top: 0;">⏰ ${reminder.name}</h1>
          <p style="font-size: 18px; color: #333; line-height: 1.6;">${reminder.message}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <table style="width: 100%; color: #666; font-size: 14px;">
            <tr><td>📅 周期</td><td>每 ${reminder.intervalDays} 天</td></tr>
            <tr><td>🕐 触发时间</td><td>${timestamp}</td></tr>
          </table>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">— 来自保号提醒系统</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 测试指定渠道：真实发送一条测试消息
   */
  async testChannel(channel: NotificationChannel): Promise<NotificationResult> {
    const settings = await getSettings();
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const testReminder: Reminder = {
      id: 'test',
      name: '渠道测试',
      message: '这是一条测试消息，收到说明该通知渠道配置成功 ✅',
      intervalDays: 0,
      lastNotifiedAt: null,
      channels: [channel],
      channelConfig: {},
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    switch (channel) {
      case 'telegram':
        return this.telegram.sendMessage(
          this.formatTelegramMessage(testReminder, timestamp),
          settings.telegram.chatId,
          settings.telegram.botToken
        );
      case 'pushplus':
        return this.pushplus.sendMessage(
          '⏰ 渠道测试',
          this.formatPushPlusMessage(testReminder, timestamp),
          settings.pushplus.token
        );
      case 'email': {
        const to = settings.smtp.defaultTo;
        if (!to) {
          return {
            channel: 'email',
            success: false,
            error: '请先在「渠道设置」中填写默认收件邮箱',
          };
        }
        return this.email.sendMessage(
          to,
          '⏰ 渠道测试 - 保号提醒系统',
          this.formatEmailMessage(testReminder, timestamp),
          settings.smtp
        );
      }
      case 'webhook': {
        const url = settings.webhook.url;
        if (!url) {
          return {
            channel: 'webhook',
            success: false,
            error: '请先在「渠道设置」中填写 Webhook URL',
          };
        }
        return this.webhook.sendMessage(url, {
          event: 'channel_test',
          message: testReminder.message,
          timestamp,
        });
      }
      default:
        return {
          channel,
          success: false,
          error: `Unknown channel: ${channel}`,
        };
    }
  }
}

export default Notifier;
