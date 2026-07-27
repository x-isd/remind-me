import config from '../config/config.js';
import { NotificationResult } from '../types/index.js';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

class EmailService {
  async sendMessage(
    to: string,
    subject: string,
    content: string,
    smtp?: SmtpConfig
  ): Promise<NotificationResult> {
    const cfg: SmtpConfig = smtp && smtp.host ? smtp : {
      host: config.smtp.host,
      port: config.smtp.port,
      user: config.smtp.user,
      password: config.smtp.password,
    };

    if (!cfg.host || !cfg.user || !cfg.password) {
      return {
        channel: 'email',
        success: false,
        error: '未配置 SMTP，请在「渠道设置」中填写 SMTP 服务器、账号和授权码',
      };
    }

    try {
      // 动态引入 nodemailer（可选依赖）
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = await (Function('return import("nodemailer")')() as Promise<any>);
      const transporter = nodemailer.default.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.port === 465,
        auth: {
          user: cfg.user,
          pass: cfg.password,
        },
      });

      const result = await transporter.sendMail({
        from: cfg.user,
        to: to,
        subject: subject,
        html: content,
      });

      return {
        channel: 'email',
        success: true,
        message: `Email sent to ${to} (ID: ${result.messageId})`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 如果是 nodemailer 未安装的错误
      if (errorMessage.includes('Cannot find module') || errorMessage.includes('ERR_MODULE_NOT_FOUND')) {
        return {
          channel: 'email',
          success: false,
          error: 'nodemailer not installed. Run: npm install nodemailer',
        };
      }

      return {
        channel: 'email',
        success: false,
        error: errorMessage,
      };
    }
  }

  async testConnection(smtp?: SmtpConfig): Promise<boolean> {
    const cfg = smtp && smtp.host ? smtp : config.smtp;
    return !!(cfg.host && cfg.user && cfg.password);
  }
}

export default EmailService;
