import { Chart, registerables } from "chart.js";
import { apiRequest, clearAuth, getAuthHeader, setAuth } from "./api.js";

Chart.register(...registerables);

const elements = {
  authStatus: document.querySelector("#auth-status"),
  setAuth: document.querySelector("#set-auth"),
  clearAuth: document.querySelector("#clear-auth"),
  urlForm: document.querySelector("#url-form"),
  formStatus: document.querySelector("#form-status"),
  urlsTableBody: document.querySelector("#urls-table tbody"),
  resultsTableBody: document.querySelector("#results-table tbody"),
  analyticsTableBody: document.querySelector("#analytics-table tbody"),
  filterUrl: document.querySelector("#filter-url"),
  filterFrom: document.querySelector("#filter-from"),
  filterTo: document.querySelector("#filter-to"),
  refreshUrls: document.querySelector("#refresh-urls"),
  refreshResults: document.querySelector("#refresh-results"),
  refreshAnalytics: document.querySelector("#refresh-analytics"),
  applyFilters: document.querySelector("#apply-filters"),
  overallUptime: document.querySelector("#overall-uptime"),
  overallAvg: document.querySelector("#overall-avg"),
  overallTotal: document.querySelector("#overall-total"),
  chartUrlSelect: document.querySelector("#chart-url"),
  uptimeUrlSelect: document.querySelector("#uptime-url"),
  responseChartCanvas: document.querySelector("#response-chart"),
  uptimeOverallCanvas: document.querySelector("#uptime-overall-chart"),
  uptimeUrlCanvas: document.querySelector("#uptime-url-chart")
};

let cachedUrls = [];
let responseChart = null;
let uptimeOverallChart = null;
let uptimeUrlChart = null;

const chartPalette = {
  primary: "#1f6f8b",
  accent: "#f18f01",
  success: "#1e8449"
};

function updateAuthStatus() {
  elements.authStatus.textContent = getAuthHeader()
    ? "Auth set"
    : "Auth not set";
}

function promptAuth() {
  const username = window.prompt("Username");
  if (!username) {
    return false;
  }

  const password = window.prompt("Password");
  if (!password) {
    return false;
  }

  setAuth(username, password);
  updateAuthStatus();
  return true;
}

async function withAuthRetry(task) {
  try {
    return await task();
  } catch (error) {
    if (error?.status === 401) {
      clearAuth();
      updateAuthStatus();
      const ok = promptAuth();
      if (ok) {
        return task();
      }
    }

    throw error;
  }
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function formatNumber(value, suffix = "") {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value}${suffix}`;
}

function escapeHtml(value) {
  const holder = document.createElement("div");
  holder.textContent = value ?? "";
  return holder.innerHTML;
}

function setFormStatus(message, isError = false) {
  elements.formStatus.textContent = message;
  elements.formStatus.classList.toggle("error", isError);
}

function formatHourLabel(value) {
  if (!value) {
    return "-";
  }

  const isoValue = `${value.replace(" ", "T")}Z`;
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDayLabel(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function createLineChart(canvas, { label, color, ySuffix, suggestedMax }) {
  if (!canvas) {
    return null;
  }

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label,
          data: [],
          borderColor: color,
          backgroundColor: color,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          suggestedMin: 0,
          suggestedMax,
          ticks: {
            callback: (value) => `${value}${ySuffix ?? ""}`
          }
        }
      }
    }
  });
}

function updateLineChart(chartRef, canvas, { labels, data, label, color, ySuffix, suggestedMax }) {
  let chart = chartRef;
  if (!chart) {
    chart = createLineChart(canvas, { label, color, ySuffix, suggestedMax });
  }

  if (!chart) {
    return null;
  }

  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.data.datasets[0].label = label;
  chart.update();
  return chart;
}

function renderUrls(urls) {
  elements.urlsTableBody.innerHTML = "";

  urls.forEach((urlEntry) => {
    const row = document.createElement("tr");
    const statusClass =
      urlEntry.latest_status === "UP"
        ? "up"
        : urlEntry.latest_status === "DOWN"
          ? "down"
          : "";

    row.innerHTML = `
      <td>${escapeHtml(urlEntry.url)}</td>
      <td>${formatNumber(urlEntry.interval_seconds, "s")}</td>
      <td>${urlEntry.is_active ? "Yes" : "No"}</td>
      <td class="status ${statusClass}">${escapeHtml(
        urlEntry.latest_status ?? "-"
      )}</td>
      <td>${formatDate(urlEntry.latest_checked_at ?? urlEntry.last_checked_at)}</td>
      <td>${formatNumber(urlEntry.avg_response_time_ms, "ms")}</td>
      <td>
        <button class="ghost" data-action="toggle">${
          urlEntry.is_active ? "Disable" : "Enable"
        }</button>
        <button class="ghost" data-action="edit">Edit</button>
        <button class="danger" data-action="delete">Delete</button>
      </td>
    `;

    row.querySelector("[data-action='toggle']").addEventListener("click", () =>
      handleToggle(urlEntry)
    );
    row.querySelector("[data-action='edit']").addEventListener("click", () =>
      handleEdit(urlEntry)
    );
    row.querySelector("[data-action='delete']").addEventListener("click", () =>
      handleDelete(urlEntry)
    );

    elements.urlsTableBody.appendChild(row);
  });
}

function renderUrlFilter(urls) {
  elements.filterUrl.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All URLs";
  elements.filterUrl.appendChild(allOption);

  urls.forEach((urlEntry) => {
    const option = document.createElement("option");
    option.value = urlEntry.id;
    option.textContent = urlEntry.url;
    elements.filterUrl.appendChild(option);
  });
}

function renderChartUrlOptions(selectElement, urls, currentValue) {
  selectElement.innerHTML = "";

  if (!urls.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No URLs";
    option.disabled = true;
    option.selected = true;
    selectElement.appendChild(option);
    return;
  }

  urls.forEach((urlEntry) => {
    const option = document.createElement("option");
    option.value = urlEntry.id;
    option.textContent = urlEntry.url;
    selectElement.appendChild(option);
  });

  if (currentValue) {
    selectElement.value = String(currentValue);
  }

  if (!selectElement.value) {
    selectElement.value = String(urls[0].id);
  }
}

function renderResults(results) {
  elements.resultsTableBody.innerHTML = "";

  const urlMap = new Map(cachedUrls.map((entry) => [entry.id, entry.url]));

  results.forEach((result) => {
    const row = document.createElement("tr");
    const statusClass = result.status === "UP" ? "up" : "down";
    const urlLabel = urlMap.get(result.url_id) ?? "-";

    row.innerHTML = `
      <td>${escapeHtml(urlLabel)}</td>
      <td>${formatDate(result.checked_at)}</td>
      <td class="status ${statusClass}">${result.status}</td>
      <td>${formatNumber(result.status_code)}</td>
      <td>${formatNumber(result.response_time_ms)}</td>
      <td>${escapeHtml(result.error_message ?? "-")}</td>
    `;

    elements.resultsTableBody.appendChild(row);
  });
}

function renderAnalytics(analytics) {
  const overall = analytics.overall ?? {};

  elements.overallUptime.textContent =
    overall.uptime_pct === null || overall.uptime_pct === undefined
      ? "-"
      : `${overall.uptime_pct}%`;
  elements.overallAvg.textContent = formatNumber(overall.avg_response_time_ms, "ms");
  elements.overallTotal.textContent = formatNumber(overall.total_checks);

  elements.analyticsTableBody.innerHTML = "";
  analytics.per_url.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.url)}</td>
      <td>${row.uptime_pct ?? "-"}</td>
      <td>${formatNumber(row.avg_response_time_ms, "ms")}</td>
      <td>${formatNumber(row.total_checks)}</td>
    `;

    elements.analyticsTableBody.appendChild(tr);
  });
}

function renderCharts({ responseSeries, uptimeSeries, responseLabel, uptimeLabel }) {
  const responseLabels = responseSeries.response_series.map((point) =>
    formatHourLabel(point.bucket)
  );
  const responseData = responseSeries.response_series.map((point) =>
    point.avg_response_time_ms ?? 0
  );

  responseChart = updateLineChart(responseChart, elements.responseChartCanvas, {
    labels: responseLabels,
    data: responseData,
    label: responseLabel,
    color: chartPalette.primary,
    ySuffix: " ms"
  });

  const uptimeOverallLabels = responseSeries.uptime_overall.map((point) =>
    formatDayLabel(point.day)
  );
  const uptimeOverallData = responseSeries.uptime_overall.map((point) =>
    point.uptime_pct ?? 0
  );

  uptimeOverallChart = updateLineChart(
    uptimeOverallChart,
    elements.uptimeOverallCanvas,
    {
      labels: uptimeOverallLabels,
      data: uptimeOverallData,
      label: "Overall uptime",
      color: chartPalette.success,
      ySuffix: "%",
      suggestedMax: 100
    }
  );

  const uptimeUrlLabels = uptimeSeries.uptime_by_url.map((point) =>
    formatDayLabel(point.day)
  );
  const uptimeUrlData = uptimeSeries.uptime_by_url.map((point) =>
    point.uptime_pct ?? 0
  );

  uptimeUrlChart = updateLineChart(uptimeUrlChart, elements.uptimeUrlCanvas, {
    labels: uptimeUrlLabels,
    data: uptimeUrlData,
    label: uptimeLabel,
    color: chartPalette.accent,
    ySuffix: "%",
    suggestedMax: 100
  });
}

async function loadUrls() {
  const urls = await withAuthRetry(() => apiRequest("/urls"));
  cachedUrls = urls;
  renderUrls(urls);
  renderUrlFilter(urls);
  renderChartUrlOptions(
    elements.chartUrlSelect,
    urls,
    elements.chartUrlSelect.value
  );
  renderChartUrlOptions(
    elements.uptimeUrlSelect,
    urls,
    elements.uptimeUrlSelect.value
  );
}

async function loadResults() {
  const params = new URLSearchParams();
  if (elements.filterUrl.value) {
    params.set("url_id", elements.filterUrl.value);
  }
  if (elements.filterFrom.value) {
    params.set("from", elements.filterFrom.value);
  }
  if (elements.filterTo.value) {
    params.set("to", elements.filterTo.value);
  }

  const query = params.toString();
  const results = await withAuthRetry(() =>
    apiRequest(`/results${query ? `?${query}` : ""}`)
  );

  renderResults(results);
}

async function loadAnalytics() {
  const params = new URLSearchParams();
  if (elements.filterFrom.value) {
    params.set("from", elements.filterFrom.value);
  }
  if (elements.filterTo.value) {
    params.set("to", elements.filterTo.value);
  }

  const query = params.toString();
  const analytics = await withAuthRetry(() =>
    apiRequest(`/analytics${query ? `?${query}` : ""}`)
  );

  renderAnalytics(analytics);
}

async function loadAnalyticsSeries() {
  if (!cachedUrls.length) {
    renderCharts({
      responseSeries: { response_series: [], uptime_overall: [] },
      uptimeSeries: { uptime_by_url: [] },
      responseLabel: "Response time",
      uptimeLabel: "Uptime per URL"
    });
    return;
  }

  const baseParams = new URLSearchParams();
  if (elements.filterFrom.value) {
    baseParams.set("from", elements.filterFrom.value);
  }
  if (elements.filterTo.value) {
    baseParams.set("to", elements.filterTo.value);
  }

  if (!elements.chartUrlSelect.value) {
    elements.chartUrlSelect.value = String(cachedUrls[0].id);
  }
  if (!elements.uptimeUrlSelect.value) {
    elements.uptimeUrlSelect.value = String(cachedUrls[0].id);
  }

  const responseParams = new URLSearchParams(baseParams);
  responseParams.set("url_id", elements.chartUrlSelect.value);

  const uptimeParams = new URLSearchParams(baseParams);
  uptimeParams.set("url_id", elements.uptimeUrlSelect.value);

  const responseSeries = await withAuthRetry(() =>
    apiRequest(`/analytics/series?${responseParams.toString()}`)
  );

  const uptimeSeries =
    elements.chartUrlSelect.value === elements.uptimeUrlSelect.value
      ? responseSeries
      : await withAuthRetry(() =>
          apiRequest(`/analytics/series?${uptimeParams.toString()}`)
        );

  const responseUrlLabel =
    cachedUrls.find((entry) => String(entry.id) === elements.chartUrlSelect.value)
      ?.url ?? "Response time";
  const uptimeUrlLabel =
    cachedUrls.find((entry) => String(entry.id) === elements.uptimeUrlSelect.value)
      ?.url ?? "Uptime per URL";

  renderCharts({
    responseSeries,
    uptimeSeries,
    responseLabel: `Response time: ${responseUrlLabel}`,
    uptimeLabel: `Uptime: ${uptimeUrlLabel}`
  });
}

async function handleToggle(urlEntry) {
  await withAuthRetry(() =>
    apiRequest(`/urls/${urlEntry.id}`, {
      method: "PUT",
      body: JSON.stringify({
        url: urlEntry.url,
        interval_seconds: urlEntry.interval_seconds,
        is_active: !urlEntry.is_active
      })
    })
  );

  await loadUrls();
}

async function handleEdit(urlEntry) {
  const newUrl = window.prompt("URL", urlEntry.url);
  if (!newUrl) {
    return;
  }

  const newInterval = window.prompt(
    "Interval (seconds)",
    String(urlEntry.interval_seconds)
  );
  if (!newInterval) {
    return;
  }

  const intervalValue = Number.parseInt(newInterval, 10);
  if (Number.isNaN(intervalValue) || intervalValue <= 0) {
    window.alert("Interval must be a positive number");
    return;
  }

  await withAuthRetry(() =>
    apiRequest(`/urls/${urlEntry.id}`, {
      method: "PUT",
      body: JSON.stringify({
        url: newUrl,
        interval_seconds: intervalValue,
        is_active: urlEntry.is_active
      })
    })
  );

  await loadUrls();
}

async function handleDelete(urlEntry) {
  const confirmed = window.confirm(`Delete ${urlEntry.url}?`);
  if (!confirmed) {
    return;
  }

  await withAuthRetry(() =>
    apiRequest(`/urls/${urlEntry.id}`, { method: "DELETE" })
  );

  await loadUrls();
}

async function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.urlForm);
  const url = formData.get("url");
  const intervalSeconds = Number.parseInt(formData.get("interval"), 10);
  const isActive = Boolean(formData.get("isActive"));

  if (!url || Number.isNaN(intervalSeconds) || intervalSeconds <= 0) {
    setFormStatus("Provide a valid URL and interval.", true);
    return;
  }

  try {
    await withAuthRetry(() =>
      apiRequest("/urls", {
        method: "POST",
        body: JSON.stringify({
          url,
          interval_seconds: intervalSeconds,
          is_active: isActive
        })
      })
    );

    elements.urlForm.reset();
    elements.urlForm.querySelector("[name='interval']").value = "60";
    elements.urlForm.querySelector("[name='isActive']").checked = true;
    setFormStatus("URL added.");
    await loadUrls();
  } catch (error) {
    setFormStatus(error?.message ?? "Failed to add URL", true);
  }
}

async function bootstrap() {
  updateAuthStatus();
  if (!getAuthHeader()) {
    promptAuth();
  }

  try {
    await loadUrls();
    await loadResults();
    await loadAnalytics();
    await loadAnalyticsSeries();
  } catch (error) {
    console.error(error);
    setFormStatus("Failed to load data. Check credentials.", true);
  }
}

elements.setAuth.addEventListener("click", () => {
  promptAuth();
});

elements.clearAuth.addEventListener("click", () => {
  clearAuth();
  updateAuthStatus();
});

elements.urlForm.addEventListener("submit", handleSubmit);

elements.refreshUrls.addEventListener("click", loadUrls);

elements.refreshResults.addEventListener("click", loadResults);

elements.refreshAnalytics.addEventListener("click", loadAnalytics);
elements.chartUrlSelect.addEventListener("change", loadAnalyticsSeries);
elements.uptimeUrlSelect.addEventListener("change", loadAnalyticsSeries);

elements.applyFilters.addEventListener("click", async () => {
  if (!cachedUrls.length) {
    await loadUrls();
  }
  await loadResults();
  await loadAnalytics();
  await loadAnalyticsSeries();
});

bootstrap();
