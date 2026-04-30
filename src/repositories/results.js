import { db } from "../db/index.js";

const insertResultStmt = db.prepare(`
  INSERT INTO check_results (
    url_id,
    status,
    status_code,
    response_time_ms,
    error_message,
    checked_at
  ) VALUES (?, ?, ?, ?, ?, ?)
`);

export function insertResult({
  urlId,
  status,
  statusCode,
  responseTimeMs,
  errorMessage,
  checkedAt
}) {
  insertResultStmt.run(
    urlId,
    status,
    statusCode,
    responseTimeMs,
    errorMessage,
    checkedAt
  );
}

export function listResults({ urlId, from, to, limit, offset }) {
  const conditions = [];
  const params = [];

  if (urlId) {
    conditions.push("url_id = ?");
    params.push(urlId);
  }

  if (from) {
    conditions.push("checked_at >= ?");
    params.push(from);
  }

  if (to) {
    conditions.push("checked_at <= ?");
    params.push(to);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const stmt = db.prepare(`
    SELECT id, url_id, status, status_code, response_time_ms, error_message, checked_at
    FROM check_results
    ${whereClause}
    ORDER BY checked_at DESC
    LIMIT ? OFFSET ?
  `);

  params.push(limit, offset);
  return stmt.all(...params);
}

export function cleanupResults(retentionDays) {
  const stmt = db.prepare(
    "DELETE FROM check_results WHERE checked_at < datetime('now', '-' || ? || ' days')"
  );

  return stmt.run(retentionDays).changes;
}
