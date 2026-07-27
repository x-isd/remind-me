import axios from 'axios';
import config from '../config/config.js';
import { NotificationResult } from '../types/index.js';

const PUSHPLUS_API_BASE = 'http://www.pushplus.plus/send';

class PushPlusService {
  private token: string;

  constructor(token?: string) {
    this.token = token || config.pushplus.token;
  }

  async sendMessage(
    title: string,
    content: string,
    token?: string
  ): Promise<NotificationResult> {
    const targetToken = token || this.token;

    if (!targetToken) {
      return {
        channel: 'pushplus',
        success: false,
        error: 'Missing PushPlus token',
      };
    }

    try {
      const response = await axios.post(
        PUSHPLUS_API_BASE,
        {
          token: targetToken,
          title: title,
          content: content,
          template: 'html',
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.code === 200) {
        return {
          channel: 'pushplus',
          success: true,
          message: `Message sent successfully`,
        };
      } else {
        return {
          channel: 'pushplus',
          success: false,
          error: response.data.msg || 'Unknown error',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        channel: 'pushplus',
        success: false,
        error: errorMessage,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    // PushPlus 没有专门的 test 接口，只能通过发送消息测试
    return !!this.token;
  }
}

export default PushPlusService;
