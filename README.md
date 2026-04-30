# Web Monitoring

Lightweight web monitoring app using Node.js, Fastify, and SQLite with a Vite-based dashboard.

## Requirements

- Node.js 20+

## Setup

1. Install dependencies:

   npm install

2. Create env file:

   copy .env.example .env

3. Run in development mode:

   npm run dev

The API runs on http://localhost:3000 and the Vite client on http://localhost:5173.

If you need to point the client to a different API host, copy [frontend/.env.example](frontend/.env.example)
to frontend/.env and set VITE_API_BASE_URL.

## Production

1. Build the frontend:

   npm run build:client

2. Start the server:

   npm start

## API

- GET /urls
- POST /urls
- PUT /urls/:id
- DELETE /urls/:id
- GET /results
- GET /results/:url_id
- GET /analytics
- GET /health
