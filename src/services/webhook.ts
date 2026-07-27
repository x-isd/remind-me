import axios from 'axios';
import { NotificationResult } from '../types/index.js';

class WebhookService {
  async sendMessage(
    webhookUrl: string,
    payload: Record<string, any>
  ): Promise<NotificationResult> {
    if (!webhookUrl) {
      return {
        channel: 'webhook',
        success: false,
        error: 'Missing webhook URL',
      };
    }

    try {
      const response = await axios.post(webhookUrl, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return {
        channel: 'webhook',
        success: response.status >= 200 && response.status < 300,
        message: `Webhook responded with status ${response.status}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        channel: 'webhook',
        success: false,
        error: errorMessage,
      };
    }
  }
}

export default WebhookService;
