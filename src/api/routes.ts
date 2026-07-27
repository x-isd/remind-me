import { Router } from 'express';
import {
  healthCheck,
  getReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  checkReminders,
  triggerReminder,
  testNotification,
  getChannelSettings,
  updateChannelSettings,
} from './handlers.js';

const router = Router();

// 健康检查
router.get('/health', healthCheck);

// 提醒 CRUD
router.get('/reminders', getReminders);
router.get('/reminders/:id', getReminderById);
router.post('/reminders', createReminder);
router.put('/reminders/:id', updateReminder);
router.delete('/reminders/:id', deleteReminder);

// 触发检查（供 Cron 调用）
router.post('/check', checkReminders);
router.get('/check', checkReminders); // 也支持 GET 方便调用

// 手动触发指定提醒
router.post('/reminders/:id/trigger', triggerReminder);

// 测试通知渠道
router.post('/notify/test', testNotification);

// 渠道设置
router.get('/settings', getChannelSettings);
router.put('/settings', updateChannelSettings);

export default router;
