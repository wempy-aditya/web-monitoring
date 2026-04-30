import {
  createUrl,
  deleteUrl,
  listUrlsWithStatus,
  updateUrl
} from "../repositories/urls.js";
import { isValidUrl, parseBoolean, parsePositiveInt } from "../utils/validators.js";

export function registerUrlRoutes(app) {
  app.get("/urls", () => listUrlsWithStatus());

  app.post("/urls", (request, reply) => {
    const { url, interval_seconds: intervalSecondsRaw, is_active: isActiveRaw } =
      request.body ?? {};

    if (!isValidUrl(url)) {
      reply.code(400).send({ error: "Invalid url" });
      return;
    }

    const intervalSeconds = parsePositiveInt(intervalSecondsRaw, null);
    if (!intervalSeconds) {
      reply.code(400).send({ error: "Interval must be a positive integer" });
      return;
    }

    const isActive = parseBoolean(isActiveRaw, true);
    const created = createUrl({ url, intervalSeconds, isActive });

    reply.code(201).send(created);
  });

  app.put("/urls/:id", (request, reply) => {
    const id = parsePositiveInt(request.params?.id, null);
    if (!id) {
      reply.code(400).send({ error: "Invalid id" });
      return;
    }

    const { url, interval_seconds: intervalSecondsRaw, is_active: isActiveRaw } =
      request.body ?? {};

    if (!isValidUrl(url)) {
      reply.code(400).send({ error: "Invalid url" });
      return;
    }

    const intervalSeconds = parsePositiveInt(intervalSecondsRaw, null);
    if (!intervalSeconds) {
      reply.code(400).send({ error: "Interval must be a positive integer" });
      return;
    }

    const isActive = parseBoolean(isActiveRaw, true);
    const updated = updateUrl(id, { url, intervalSeconds, isActive });

    if (!updated) {
      reply.code(404).send({ error: "URL not found" });
      return;
    }

    reply.send(updated);
  });

  app.delete("/urls/:id", (request, reply) => {
    const id = parsePositiveInt(request.params?.id, null);
    if (!id) {
      reply.code(400).send({ error: "Invalid id" });
      return;
    }

    const deleted = deleteUrl(id);
    if (!deleted) {
      reply.code(404).send({ error: "URL not found" });
      return;
    }

    reply.send({ success: true });
  });
}
