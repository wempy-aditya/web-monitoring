import { db } from "../db/index.js";

function buildJoinFilters({ from, to }) {
  const conditions = [];
  const params = [];

  if (from) {
    conditions.push("r.checked_at >= ?");
    params.push(from);
  }

  if (to) {
    conditions.push("r.checked_at <= ?");
    params.push(to);
  }

  const clause = conditions.length ? `AND ${conditions.join(" AND ")}` : "";
  return { clause, params };
}

function buildWhereFilters({ from, to }) {
  const conditions = [];
  const params = [];

  if (from) {
    conditions.push("checked_at >= ?");
    params.push(from);
  }

  if (to) {
    conditions.push("checked_at <= ?");
    params.push(to);
  }

  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { clause, params };
}

function buildSeriesFilters({ from, to, urlId, requireResponseTime }) {
  const conditions = ["checked_at >= ?", "checked_at <= ?"];
  const params = [from, to];

  if (requireResponseTime) {
    conditions.push("response_time_ms IS NOT NULL");
  }

  if (urlId) {
    conditions.push("url_id = ?");
    params.push(urlId);
  }

  return {
    clause: `WHERE ${conditions.join(" AND ")}`,
    params
  };
}

export function getAnalytics({ from, to }) {
  const { clause: joinClause, params: joinParams } = buildJoinFilters({ from, to });
  const { clause: whereClause, params: whereParams } = buildWhereFilters({ from, to });

  const overallStmt = db.prepare(`
    SELECT
      COUNT(*) AS total_checks,
      ROUND(AVG(response_time_ms), 2) AS avg_response_time_ms,
      ROUND(
        100.0 * SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
        2
      ) AS uptime_pct
    FROM check_results
    ${whereClause}
  `);

  const perUrlStmt = db.prepare(`
    SELECT
      u.id AS url_id,
      u.url AS url,
      COUNT(r.id) AS total_checks,
      ROUND(AVG(r.response_time_ms), 2) AS avg_response_time_ms,
      ROUND(
        100.0 * SUM(CASE WHEN r.status = 'UP' THEN 1 ELSE 0 END) / NULLIF(COUNT(r.id), 0),
        2
      ) AS uptime_pct
    FROM monitored_urls u
    LEFT JOIN check_results r
      ON r.url_id = u.id ${joinClause}
    GROUP BY u.id
    ORDER BY u.id DESC
  `);

  return {
    overall: overallStmt.get(...whereParams),
    per_url: perUrlStmt.all(...joinParams)
  };
}

export function getSeries({ from, to, urlId }) {
  const responseFilters = buildSeriesFilters({
    from,
    to,
    urlId,
    requireResponseTime: true
  });

  const responseStmt = db.prepare(`
    SELECT
      strftime('%Y-%m-%d %H:00:00', checked_at) AS bucket,
      ROUND(AVG(response_time_ms), 2) AS avg_response_time_ms
    FROM check_results
    ${responseFilters.clause}
    GROUP BY bucket
    ORDER BY bucket ASC
  `);

  const uptimeOverallStmt = db.prepare(`
    SELECT
      strftime('%Y-%m-%d', checked_at) AS day,
      ROUND(
        100.0 * SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
        2
      ) AS uptime_pct,
      COUNT(*) AS total_checks
    FROM check_results
    WHERE checked_at >= ? AND checked_at <= ?
    GROUP BY day
    ORDER BY day ASC
  `);

  const uptimeByUrlStmt = db.prepare(`
    SELECT
      strftime('%Y-%m-%d', checked_at) AS day,
      ROUND(
        100.0 * SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
        2
      ) AS uptime_pct,
      COUNT(*) AS total_checks
    FROM check_results
    WHERE checked_at >= ? AND checked_at <= ? AND url_id = ?
    GROUP BY day
    ORDER BY day ASC
  `);

  return {
    response_series: responseStmt.all(...responseFilters.params),
    uptime_overall: uptimeOverallStmt.all(from, to),
    uptime_by_url: urlId ? uptimeByUrlStmt.all(from, to, urlId) : []
  };
}
