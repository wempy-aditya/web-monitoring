import { buildApp } from "./app.js";
import { startScheduler } from "./scheduler/scheduler.js";
import { startCleanupJob } from "./scheduler/cleanup.js";
import { config } from "./config.js";

const app = await buildApp();

startScheduler();
startCleanupJob();

try {
  await app.listen({
    port: config.port,
    host: config.host
  });

  app.log.info(`Server listening on ${config.host}:${config.port}`);
} catch (error) {
  app.log.error(error, "Failed to start server");
  process.exit(1);
}
