export async function checkUrl(targetUrl, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: "follow"
    });

    const responseTimeMs = Date.now() - start;
    const statusCode = response.status;
    const status = statusCode >= 200 && statusCode < 400 ? "UP" : "DOWN";

    return {
      status,
      statusCode,
      responseTimeMs,
      errorMessage: null
    };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    const errorMessage =
      error?.name === "AbortError"
        ? `Timeout after ${timeoutMs}ms`
        : error?.message ?? "Request failed";

    return {
      status: "DOWN",
      statusCode: null,
      responseTimeMs,
      errorMessage
    };
  } finally {
    clearTimeout(timeout);
  }
}
