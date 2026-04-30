import { registerAnalyticsRoutes } from "./analytics.js";
import { registerHealthRoutes } from "./health.js";
import { registerResultsRoutes } from "./results.js";
import { registerUrlRoutes } from "./urls.js";

export function registerRoutes(app) {
  registerHealthRoutes(app);
  registerUrlRoutes(app);
  registerResultsRoutes(app);
  registerAnalyticsRoutes(app);
}
