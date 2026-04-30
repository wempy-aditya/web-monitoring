import cron from "node-cron";
import pLimit from "p-limit";
import { config } from "../config.js";
import { listDueUrls, updateLastChecked } from "../repositories/urls.js";
import { insertResult } from "../repositories/results.js";
import { checkUrl } from "./checker.js";

let isRunning = false;

async function runChecks() {
  const dueUrls = listDueUrls();
  if (dueUrls.length === 0) {
    return;
  }

  const limit = pLimit(config.concurrency);

  await Promise.all(
    dueUrls.map((urlEntry) =>
      limit(async () => {
        const result = await checkUrl(urlEntry.url, config.checkTimeoutMs);
        const checkedAt = new Date().toISOString();

        insertResult({
          urlId: urlEntry.id,
          status: result.status,
          statusCode: result.statusCode,
          responseTimeMs: result.responseTimeMs,
          errorMessage: result.errorMessage,
          checkedAt
        });

        updateLastChecked(urlEntry.id, checkedAt);
      })
    )
  );
}

export function startScheduler() {
  cron.schedule("* * * * *", async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    try {
      await runChecks();
    } catch (error) {
      console.error("Scheduler error", error);
    } finally {
      isRunning = false;
    }
  });
}
