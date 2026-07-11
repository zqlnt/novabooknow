import { GBP_WHOLE, escapeHtml } from './utils.js';
import { destroyChart, loadChartJs } from './utils.js';

let trendInstance = null;

export function renderMonthlyFinanceTrendShell(hasTrend) {
  if (!hasTrend) {
    return `
      <article class="finance-card finance-trend-card finance-bento-trend">
        <div class="finance-card-header">
          <div><span class="finance-kicker">Actual history</span><h3>Monthly invoiced versus received</h3></div>
        </div>
        <div class="finance-empty finance-empty-chart">
          <span class="empty-chart-icon" aria-hidden="true"></span>
          <strong>Trend activates with real invoices</strong>
          <p>Add issued invoices and confirmed payments. The chart will compare actual invoiced and actual received totals month by month.</p>
        </div>
      </article>`;
  }

  return `
    <article class="finance-card finance-trend-card finance-bento-trend">
      <div class="finance-card-header">
        <div><span class="finance-kicker">Actual history</span><h3>Monthly invoiced versus received</h3></div>
        <span class="finance-chart-key"><i class="revenue"></i>Actual invoiced <i class="collection"></i>Actual received</span>
      </div>
      <div class="finance-chart-wrap finance-trend-wrap">
        <canvas id="monthlyFinanceTrend" aria-label="Line chart of monthly invoiced and received amounts"></canvas>
      </div>
      <div class="finance-chart-fallback visually-hidden" id="monthlyTrendFallback"></div>
    </article>`;
}

export async function mountMonthlyFinanceTrend(canvas, trend, overview) {
  if (!canvas || !trend?.length) return null;
  destroyChart(trendInstance);
  trendInstance = null;

  const labels = trend.map((row) =>
    new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' }).format(new Date(`${row.month}T00:00:00`)));

  const { Chart } = await loadChartJs();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const plannedBaseline = overview?.plannedRevenue ?? null;

  const datasets = [
    {
      label: 'Actual invoiced',
      data: trend.map((r) => r.invoiced),
      borderColor: 'rgba(0, 122, 255, 1)',
      backgroundColor: 'rgba(0, 122, 255, 0.08)',
      tension: 0.35,
      fill: false,
    },
    {
      label: 'Actual received',
      data: trend.map((r) => r.received),
      borderColor: 'rgba(155, 124, 232, 1)',
      backgroundColor: 'rgba(155, 124, 232, 0.08)',
      tension: 0.35,
      fill: false,
    },
  ];

  if (plannedBaseline && trend.length) {
    datasets.push({
      label: 'Planned revenue baseline',
      data: trend.map(() => plannedBaseline),
      borderColor: 'rgba(53, 199, 89, 0.45)',
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
    });
  }

  trendInstance = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 650 },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${GBP_WHOLE.format(ctx.raw)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: (v) => GBP_WHOLE.format(v) },
          grid: { color: 'rgba(29,29,31,0.06)' },
        },
        x: { grid: { display: false } },
      },
    },
  });

  const fallback = document.getElementById('monthlyTrendFallback');
  if (fallback) {
    fallback.innerHTML = `
      <table class="finance-sr-table">
        <caption>Monthly finance trend</caption>
        <thead><tr><th>Month</th><th>Actual invoiced</th><th>Actual received</th></tr></thead>
        <tbody>${trend.map((r, i) => `<tr><td>${escapeHtml(labels[i])}</td><td>${GBP_WHOLE.format(r.invoiced)}</td><td>${GBP_WHOLE.format(r.received)}</td></tr>`).join('')}</tbody>
      </table>`;
  }

  return trendInstance;
}

export function destroyMonthlyFinanceTrend() {
  destroyChart(trendInstance);
  trendInstance = null;
}
