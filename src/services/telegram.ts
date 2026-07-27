import axios from 'axios';
import config from '../config/config.js';
import { NotificationResult } from '../types/index.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

class TelegramService {
  private botToken: string;
  private chatId: string;
  private apiUrl: string;

  constructor(botToken?: string, chatId?: string) {
    this.botToken = botToken || config.telegram.botToken;
    this.chatId = chatId || config.telegram.chatId;
    this.apiUrl = `${TELEGRAM_API_BASE}/bot${this.botToken}`;
  }

  async sendMessage(
    text: string,
    chatId?: string,
    botToken?: string
  ): Promise<NotificationResult> {
    const targetChatId = chatId || this.chatId;
    const targetToken = botToken || this.botToken;

    if (!targetToken || !targetChatId) {
      return {
        channel: 'telegram',
        success: false,
        error: '未配置 Telegram Bot Token 或 Chat ID，请在「渠道设置」中填写',
      };
    }

    try {
      const response = await axios.post(
        `${TELEGRAM_API_BASE}/bot${targetToken}/sendMessage`,
        {
          chat_id: targetChatId,
          text: text,
          parse_mode: 'HTML',
        },
        {
          timeout: 10000,
        }
      );

      if (response.data.ok) {
        return {
          channel: 'telegram',
          success: true,
          message: `Message sent successfully (ID: ${response.data.result.message_id})`,
        };
      } else {
        return {
          channel: 'telegram',
          success: false,
          error: response.data.description || 'Unknown error',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        channel: 'telegram',
        success: false,
        error: errorMessage,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.botToken) {
      return false;
    }

    try {
      const response = await axios.get(`${this.apiUrl}/getMe`, {
        timeout: 5000,
      });
      return response.data.ok === true;
    } catch (error) {
      return false;
    }
  }
}

export default TelegramService;
