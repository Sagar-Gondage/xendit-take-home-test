// src/jobs/scheduler.ts
import cron from 'node-cron';
import { SchedulingService } from '../services/scheduling.service';
import { LoyaltyService } from '../services/loyalty.service';

const schedulingService = new SchedulingService();
const loyaltyService = new LoyaltyService();

export function startScheduledJobs(): void {
  // Process scheduled orders every minute
  cron.schedule('* * * * *', async () => {
    try {
      const processed = await schedulingService.processScheduledOrders();
      if (processed.length > 0) {
        console.log(`[Scheduler] Processed ${processed.length} scheduled orders`);
      }
    } catch (error) {
      console.error('[Scheduler] Error processing scheduled orders:', error);
    }
  });

  // Expire loyalty points daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const expired = await loyaltyService.expirePoints();
      if (expired > 0) {
        console.log(`[Scheduler] Expired ${expired} loyalty point records`);
      }
    } catch (error) {
      console.error('[Scheduler] Error expiring loyalty points:', error);
    }
  });

  console.log('[Scheduler] Cron jobs started');
}
