import Fastify from "fastify";
import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import path from "path";
import { config } from "./config.js";
import { registerRoutes } from "./routes/index.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel
    }
  });

  if (config.enableCors) {
    await app.register(cors, {
      origin: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    });
  }

  app.addHook("onRequest", async (request, reply) => {
    const header = request.headers?.authorization ?? "";
    if (!header.startsWith("Basic ")) {
      reply.header("WWW-Authenticate", "Basic realm=\"Web Monitoring\"");
      reply.code(401).send({ error: "Unauthorized" });
      return reply;
    }

    const encoded = header.slice("Basic ".length).trim();
    let decoded = "";
    try {
      decoded = Buffer.from(encoded, "base64").toString("utf8");
    } catch {
      reply.header("WWW-Authenticate", "Basic realm=\"Web Monitoring\"");
      reply.code(401).send({ error: "Unauthorized" });
      return reply;
    }

    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) {
      reply.header("WWW-Authenticate", "Basic realm=\"Web Monitoring\"");
      reply.code(401).send({ error: "Unauthorized" });
      return reply;
    }

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    if (username !== config.basicAuthUser || password !== config.basicAuthPass) {
      reply.header("WWW-Authenticate", "Basic realm=\"Web Monitoring\"");
      reply.code(401).send({ error: "Unauthorized" });
      return reply;
    }
  });

  registerRoutes(app);

  const staticRoot = path.join(config.rootDir, "frontend", "dist");
  await app.register(staticPlugin, {
    root: staticRoot,
    prefix: "/"
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({ error: error.message ?? "Request failed" });
  });

  app.setNotFoundHandler((request, reply) => {
    const acceptHeader = request.headers?.accept ?? "";
    if (acceptHeader.includes("application/json")) {
      reply.code(404).send({ error: "Not found" });
      return;
    }

    reply.sendFile("index.html");
  });

  return app;
}
