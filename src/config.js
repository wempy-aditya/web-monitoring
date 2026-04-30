import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const config = {
  rootDir,
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  host: process.env.HOST ?? "0.0.0.0",
  logLevel: process.env.LOG_LEVEL ?? "info",
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH ?? "./database.sqlite"),
  checkTimeoutMs: Number.parseInt(process.env.CHECK_TIMEOUT_MS ?? "5000", 10),
  concurrency: Number.parseInt(process.env.CONCURRENCY ?? "10", 10),
  retentionDays: Number.parseInt(process.env.RESULT_RETENTION_DAYS ?? "30", 10),
  basicAuthUser: process.env.BASIC_AUTH_USER ?? "admin",
  basicAuthPass: process.env.BASIC_AUTH_PASS ?? "admin",
  enableCors: (process.env.ENABLE_CORS ?? (process.env.NODE_ENV !== "production" ? "true" : "false")) === "true"
};

export { config };
