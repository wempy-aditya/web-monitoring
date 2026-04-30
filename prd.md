# 📄 Product Requirements Document (PRD)

## Web Monitoring App (Lightweight Node.js + SQLite)

---

# 1. 📌 Overview

A lightweight web-based monitoring system that allows users to track the availability (uptime), status code, and response time of multiple URLs. The system periodically sends HTTP requests to registered URLs and logs the results for analysis.

Target:

- Personal use / small-scale monitoring
- Low resource server (VPS / local server)
- Simple but extensible architecture

---

# 2. 🎯 Objectives

- Monitor website uptime efficiently
- Provide historical logs for analysis
- Keep system resource usage low
- Provide configurable interval checking

Success Criteria:

- Able to monitor 50–200 URLs reliably
- Response time logging works consistently
- Scheduler runs without blocking API

---

# 3. 🧑‍💻 Target Users

- Developers
- Students
- Small project owners

---

# 4. 🧩 Core Features

## 4.1 URL Management

- Add URL to monitor
- Edit URL
- Delete URL
- Enable/disable monitoring
- Set interval (per URL)

Fields:

- URL
- Interval (seconds)
- Is Active

---

## 4.2 Monitoring Engine

- Periodically checks URLs
- Supports timeout (default: 5s)
- Records:
  - Status (UP/DOWN)
  - Status Code
  - Response Time
  - Error Message
  - Timestamp

---

## 4.3 Dashboard

- List of monitored URLs
- Latest status (UP/DOWN)
- Last checked time
- Avg response time

---

## 4.4 Logs / History

- Table of results
- Filter by URL
- Filter by date

---

## 4.5 Analytics (Basic)

- Uptime percentage
- Avg response time

---

## 4.6 Optional (Phase 2)

- Alert (Telegram/email)
- Keyword validation (content check)

---

# 5. ⚙️ Technical Requirements

## 5.1 Stack

Backend:

- Node.js
- Fastify (preferred) or Express

Scheduler:

- node-cron (MVP)
- optional: BullMQ (future scaling)

Database:

- SQLite (primary choice)

Frontend:

- Vanilla JS / simple SPA

---

## 5.2 Why SQLite (Decision)

Pros:

- Very lightweight
- No server needed
- Easy deployment

Cons:

- Limited concurrency
- Not suitable for very large scale

Decision:

- ✅ Suitable for MVP and small scale
- Upgrade path → PostgreSQL if needed

---

# 6. 🗄️ Database Schema

## 6.1 monitored_urls

- id (PK)
- url (TEXT)
- interval_seconds (INTEGER)
- is_active (BOOLEAN)
- created_at (DATETIME)
- updated_at (DATETIME)

## 6.2 check_results

- id (PK)
- url_id (FK)
- status (TEXT: UP/DOWN)
- status_code (INTEGER)
- response_time_ms (INTEGER)
- error_message (TEXT, nullable)
- checked_at (DATETIME)

Indexes:

- index on url_id
- index on checked_at

---

# 7. 🔄 System Architecture

Components:

1. API Server
2. Scheduler Worker (same process for MVP)
3. SQLite DB

Flow:

1. User adds URL
2. Stored in DB
3. Scheduler runs every minute
4. Checks which URLs need execution
5. Performs HTTP request
6. Saves result

---

# 8. ⏱️ Scheduling Logic

Instead of separate cron per URL:

- Use 1 global cron (every 1 minute)
- Query URLs where:
  last_checked_at + interval <= now

Benefits:

- More efficient
- Scalable

---

# 9. 🔒 Non-Functional Requirements

Performance:

- Max concurrent requests: configurable (default: 5–10)

Reliability:

- Retry not required (MVP)

Timeout:

- Default 5 seconds

Storage:

- Auto cleanup older than 30 days

---

# 10. ⚠️ Constraints

- SQLite write locking
- Single server instance recommended
- Not designed for distributed system (yet)

---

# 11. 📈 Future Improvements

- Redis + BullMQ queue
- Multi-region checks
- Distributed workers
- Real-time websocket updates
- Alert system

---

# 12. 📂 Project Structure

```
project-root/
│
├── src/
│   ├── server/
│   ├── scheduler/
│   ├── services/
│   ├── repositories/
│   ├── routes/
│   ├── utils/
│   └── db/
│
├── frontend/
│
├── database.sqlite
└── package.json
```

---

# 13. 🔌 API Endpoints

## URL Management

- GET /urls
- POST /urls
- PUT /urls/:id
- DELETE /urls/:id

## Monitoring

- GET /results
- GET /results/:url_id

---

# 14. 🧪 Edge Cases

- URL timeout
- DNS failure
- SSL error
- Redirect loops

---

# 15. 🚀 Deployment

- Single VPS (low spec OK)
- Run with PM2

---

# 16. 📊 Scaling Strategy

Phase 1:

- SQLite + single worker

Phase 2:

- PostgreSQL
- Redis queue

Phase 3:

- Distributed workers

---

# 17. 🧠 Key Design Decisions

- Use pull-based scheduler
- Store raw logs (for flexibility)
- Optimize later with aggregation

---

# 18. 📌 Summary

This system is designed to be:

- Lightweight
- Simple to deploy
- Feature-complete for small-scale monitoring

With a clear upgrade path to a scalable architecture.

---

END OF PRD
