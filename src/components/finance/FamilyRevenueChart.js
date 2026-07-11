import { GBP_WHOLE, escapeHtml } from './utils.js';
import { destroyChart, loadChartJs } from './utils.js';

let familyChartInstance = null;

export function renderFamilyRevenueChartShell() {
  return `
    <article class="finance-card finance-family-card finance-bento-chart">
      <div class="finance-card-header">
        <div>
          <span class="finance-kicker">Family economics</span>
          <h3>Revenue and profit by family</h3>
        </div>
        <span class="finance-chart-key"><i class="revenue"></i>Planned revenue <i class="profit"></i>Contribution profit</span>
      </div>
      <div class="finance-chart-wrap finance-family-chart-wrap">
        <canvas id="familyRevenueChart" aria-label="Horizontal bar chart of planned revenue and contribution profit by family"></canvas>
      </div>
      <div class="finance-chart-fallback visually-hidden" id="familyRevenueFallback"></div>
    </article>`;
}

export async function mountFamilyRevenueChart(canvas, families) {
  if (!canvas) return null;
  destroyChart(familyChartInstance);
  familyChartInstance = null;

  const fallback = document.getElementById('familyRevenueFallback');
  if (!families.length) {
    canvas.closest('.finance-chart-wrap')?.classList.add('hidden');
    if (fallback) {
      fallback.classList.remove('visually-hidden');
      fallback.innerHTML = '<div class="finance-empty">No family fee profiles are available yet.</div>';
    }
    return null;
  }

  canvas.closest('.finance-chart-wrap')?.classList.remove('hidden');
  fallback?.classList.add('visually-hidden');

  const rowHeight = 28;
  const height = Math.max(280, families.length * rowHeight + 80);
  canvas.height = height;
  canvas.style.height = `${height}px`;

  const { Chart } = await loadChartJs();
  const labels = families.map((f) => f.parentName);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  familyChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Planned revenue',
          data: families.map((f) => f.monthlyRevenue),
          backgroundColor: 'rgba(0, 122, 255, 0.85)',
          borderRadius: 6,
          barThickness: 10,
        },
        {
          label: 'Contribution profit',
          data: families.map((f) => f.monthlyProfit),
          backgroundColor: 'rgba(53, 199, 89, 0.85)',
          borderRadius: 6,
          barThickness: 10,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 600 },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${GBP_WHOLE.format(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            callback: (v) => GBP_WHOLE.format(v),
            maxRotation: 0,
          },
          grid: { color: 'rgba(29,29,31,0.06)' },
        },
        y: {
          ticks: { font: { size: 11 }, autoSkip: false },
          grid: { display: false },
        },
      },
    },
  });

  if (fallback) {
    fallback.innerHTML = `
      <table class="finance-sr-table">
        <caption>Family revenue and contribution profit</caption>
        <thead><tr><th>Family</th><th>Planned revenue</th><th>Contribution profit</th></tr></thead>
        <tbody>${families.map((f) => `<tr><td>${escapeHtml(f.parentName)}</td><td>${GBP_WHOLE.format(f.monthlyRevenue)}</td><td>${GBP_WHOLE.format(f.monthlyProfit)}</td></tr>`).join('')}</tbody>
      </table>`;
  }

  return familyChartInstance;
}

export function destroyFamilyRevenueChart() {
  destroyChart(familyChartInstance);
  familyChartInstance = null;
}
