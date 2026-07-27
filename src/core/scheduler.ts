import config from '../config/config.js';
import ReminderManager from './reminders.js';

class Scheduler {
  private reminderManager: ReminderManager;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.reminderManager = new ReminderManager();
  }

  /**
   * 启动内部调度器（Docker 模式）
   * 每小时检查一次所有提醒
   */
  start(): void {
    if (config.schedulerMode !== 'internal') {
      console.log('[Scheduler] External mode - internal scheduler disabled');
      return;
    }

    // 每小时检查一次（可自定义）
    const intervalMs = 60 * 60 * 1000; // 1 小时

    console.log('[Scheduler] Starting internal scheduler (interval: 1 hour)');

    // 启动后立即检查一次
    this.runCheck();

    // 然后每小时检查一次
    this.intervalId = setInterval(() => {
      this.runCheck();
    }, intervalMs);
  }

  /**
   * 停止内部调度器
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Scheduler] Internal scheduler stopped');
    }
  }

  /**
   * 执行一次检查（外部触发模式也使用）
   */
  async runCheck() {
    try {
      console.log(`[Scheduler] Running check at ${new Date().toISOString()}`);
      const result = await this.reminderManager.checkAndNotify();
      return result;
    } catch (error) {
      console.error('[Scheduler] Error during check:', error);
      throw error;
    }
  }
}

export default Scheduler;
