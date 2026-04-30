import { db } from "../db/index.js";

const listUrlsStmt = db.prepare(`
  SELECT
    u.id,
    u.url,
    u.interval_seconds,
    u.is_active,
    u.last_checked_at,
    u.created_at,
    u.updated_at,
    (
      SELECT r.status
      FROM check_results r
      WHERE r.url_id = u.id
      ORDER BY r.checked_at DESC
      LIMIT 1
    ) AS latest_status,
    (
      SELECT r.status_code
      FROM check_results r
      WHERE r.url_id = u.id
      ORDER BY r.checked_at DESC
      LIMIT 1
    ) AS latest_status_code,
    (
      SELECT r.response_time_ms
      FROM check_results r
      WHERE r.url_id = u.id
      ORDER BY r.checked_at DESC
      LIMIT 1
    ) AS latest_response_time_ms,
    (
      SELECT r.checked_at
      FROM check_results r
      WHERE r.url_id = u.id
      ORDER BY r.checked_at DESC
      LIMIT 1
    ) AS latest_checked_at,
    (
      SELECT ROUND(AVG(r.response_time_ms), 2)
      FROM check_results r
      WHERE r.url_id = u.id AND r.response_time_ms IS NOT NULL
    ) AS avg_response_time_ms
  FROM monitored_urls u
  ORDER BY u.id DESC
`);

const getUrlStmt = db.prepare(`
  SELECT
    u.id,
    u.url,
    u.interval_seconds,
    u.is_active,
    u.last_checked_at,
    u.created_at,
    u.updated_at
  FROM monitored_urls u
  WHERE u.id = ?
`);

const createUrlStmt = db.prepare(`
  INSERT INTO monitored_urls (url, interval_seconds, is_active)
  VALUES (?, ?, ?)
`);

const updateUrlStmt = db.prepare(`
  UPDATE monitored_urls
  SET url = ?,
      interval_seconds = ?,
      is_active = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const deleteUrlStmt = db.prepare("DELETE FROM monitored_urls WHERE id = ?");

const dueUrlsStmt = db.prepare(`
  SELECT
    id,
    url,
    interval_seconds,
    is_active,
    last_checked_at
  FROM monitored_urls
  WHERE is_active = 1
    AND (
      last_checked_at IS NULL
      OR datetime(last_checked_at, '+' || interval_seconds || ' seconds') <= CURRENT_TIMESTAMP
    )
`);

const updateLastCheckedStmt = db.prepare(`
  UPDATE monitored_urls
  SET last_checked_at = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

function mapUrlRow(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    is_active: Boolean(row.is_active)
  };
}

export function listUrlsWithStatus() {
  return listUrlsStmt.all().map(mapUrlRow);
}

export function getUrlById(id) {
  return mapUrlRow(getUrlStmt.get(id));
}

export function createUrl({ url, intervalSeconds, isActive }) {
  const info = createUrlStmt.run(url, intervalSeconds, isActive ? 1 : 0);
  return getUrlById(info.lastInsertRowid);
}

export function updateUrl(id, { url, intervalSeconds, isActive }) {
  const info = updateUrlStmt.run(url, intervalSeconds, isActive ? 1 : 0, id);
  if (info.changes === 0) {
    return null;
  }

  return getUrlById(id);
}

export function deleteUrl(id) {
  return deleteUrlStmt.run(id).changes > 0;
}

export function listDueUrls() {
  return dueUrlsStmt.all().map(mapUrlRow);
}

export function updateLastChecked(id, checkedAt) {
  updateLastCheckedStmt.run(checkedAt, id);
}
