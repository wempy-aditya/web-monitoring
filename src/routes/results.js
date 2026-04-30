import { listResults } from "../repositories/results.js";
import { parseDateInput, parsePositiveInt } from "../utils/validators.js";

export function registerResultsRoutes(app) {
  app.get("/results", (request, reply) => {
    const urlId = parsePositiveInt(request.query?.url_id, null);
    const limit = parsePositiveInt(request.query?.limit, 100);
    const offset = parsePositiveInt(request.query?.offset, 0) ?? 0;
    const from = parseDateInput(request.query?.from, "start");
    const to = parseDateInput(request.query?.to, "end");

    const cappedLimit = Math.min(limit ?? 100, 500);
    const results = listResults({
      urlId,
      from,
      to,
      limit: cappedLimit,
      offset
    });

    reply.send(results);
  });

  app.get("/results/:url_id", (request, reply) => {
    const urlId = parsePositiveInt(request.params?.url_id, null);
    if (!urlId) {
      reply.code(400).send({ error: "Invalid url id" });
      return;
    }

    const limit = parsePositiveInt(request.query?.limit, 100);
    const offset = parsePositiveInt(request.query?.offset, 0) ?? 0;
    const from = parseDateInput(request.query?.from, "start");
    const to = parseDateInput(request.query?.to, "end");

    const cappedLimit = Math.min(limit ?? 100, 500);
    const results = listResults({
      urlId,
      from,
      to,
      limit: cappedLimit,
      offset
    });

    reply.send(results);
  });
}
