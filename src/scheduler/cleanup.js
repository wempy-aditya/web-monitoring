import cron from "node-cron";
import { cleanupResults } from "../repositories/results.js";
import { config } from "../config.js";

export function startCleanupJob() {
  cron.schedule("0 0 * * *", () => {
    const removed = cleanupResults(config.retentionDays);
    if (removed > 0) {
      console.info(`Cleanup removed ${removed} old records`);
    }
  });
}
