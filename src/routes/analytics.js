import { getAnalytics, getSeries } from "../repositories/analytics.js";
import { parseDateInput, parsePositiveInt } from "../utils/validators.js";

export function registerAnalyticsRoutes(app) {
  app.get("/analytics", (request, reply) => {
    const from = parseDateInput(request.query?.from, "start");
    const to = parseDateInput(request.query?.to, "end");

    const analytics = getAnalytics({ from, to });
    const overall = analytics.overall ?? {
      total_checks: 0,
      avg_response_time_ms: null,
      uptime_pct: null
    };

    reply.send({
      overall,
      per_url: analytics.per_url ?? []
    });
  });

  app.get("/analytics/series", (request, reply) => {
    const urlIdRaw = request.query?.url_id;
    const urlId = parsePositiveInt(urlIdRaw, null);
    if (urlIdRaw !== undefined && urlIdRaw !== "" && !urlId) {
      reply.code(400).send({ error: "Invalid url id" });
      return;
    }

    const parsedFrom = parseDateInput(request.query?.from, "start");
    const parsedTo = parseDateInput(request.query?.to, "end");
    const now = new Date();
    const to = parsedTo ?? now.toISOString();
    const from =
      parsedFrom ?? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const series = getSeries({ from, to, urlId: urlId ?? null });

    reply.send({
      range: { from, to },
      ...series
    });
  });
}
