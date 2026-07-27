export interface Reminder {
  id: string;
  name: string;
  message: string;
  intervalDays: number;
  lastNotifiedAt: string | null;
  channels: NotificationChannel[];
  channelConfig: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderRequest {
  name: string;
  message: string;
  intervalDays: number;
  channels: NotificationChannel[];
  channelConfig: Record<string, any>;
}

export interface UpdateReminderRequest {
  name?: string;
  message?: string;
  intervalDays?: number;
  channels?: NotificationChannel[];
  channelConfig?: Record<string, any>;
  enabled?: boolean;
}

export type NotificationChannel = 'telegram' | 'pushplus' | 'email' | 'webhook';

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  message?: string;
  error?: string;
}

export interface CheckResult {
  timestamp: string;
  checkedReminders: number;
  triggeredReminders: number;
  results: Array<{
    reminderId: string;
    reminderName: string;
    notificationResults: NotificationResult[];
  }>;
}
