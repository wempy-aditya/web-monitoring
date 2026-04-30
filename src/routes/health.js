export function registerHealthRoutes(app) {
  app.get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString()
  }));
}
