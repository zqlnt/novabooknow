import { GBP_WHOLE, NUMBER, escapeHtml } from './utils.js';
import { destroyChart, loadChartJs } from './utils.js';

let donutInstance = null;

export function renderProfitCostDonutShell(overview) {
  const revenue = overview?.plannedRevenue ?? 0;
  return `
    <article class="finance-card finance-donut-card finance-bento-donut">
      <div class="finance-card-header">
        <div>
          <span class="finance-kicker">Revenue structure</span>
          <h3>Cost and profit split</h3>
        </div>
      </div>
      <div class="finance-donut-layout">
        <div class="finance-chart-wrap finance-donut-wrap">
          <canvas id="profitCostDonut" aria-label="Donut chart showing contribution profit and allocated costs"></canvas>
        </div>
        <div class="finance-donut-legend" id="profitCostLegend">
          <div><span><i class="legend-dot margin"></i>Contribution profit</span><strong>${GBP_WHOLE.format(overview?.plannedProfit ?? 0)}</strong></div>
          <div><span><i class="legend-dot cost"></i>Allocated cost</span><strong>${GBP_WHOLE.format(overview?.plannedCost ?? 0)}</strong></div>
          <div class="finance-total-line"><span>Total planned revenue</span><strong>${GBP_WHOLE.format(revenue)}</strong></div>
        </div>
      </div>
    </article>`;
}

export async function mountProfitCostDonut(canvas, overview) {
  if (!canvas) return null;
  destroyChart(donutInstance);
  donutInstance = null;

  const profit = overview?.plannedProfit ?? 0;
  const cost = overview?.plannedCost ?? 0;
  const revenue = overview?.plannedRevenue ?? 0;

  if (revenue <= 0) return null;

  const { Chart } = await loadChartJs();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  donutInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Contribution profit', 'Allocated cost'],
      datasets: [{
        data: [profit, cost],
        backgroundColor: ['rgba(53, 199, 89, 0.9)', 'rgba(111, 113, 120, 0.85)'],
        borderWidth: 0,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      animation: reducedMotion ? false : { duration: 700 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${GBP_WHOLE.format(ctx.raw)} (${NUMBER.format((ctx.raw / revenue) * 100)}%)`,
          },
        },
      },
    },
    plugins: [{
      id: 'centreText',
      beforeDraw(chart) {
        const { ctx, chartArea: { width, height } } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 11px -apple-system, sans-serif';
        ctx.fillStyle = '#787980';
        ctx.fillText('Planned revenue', width / 2, height / 2 - 8);
        ctx.font = '700 18px -apple-system, sans-serif';
        ctx.fillStyle = '#1d1d1f';
        ctx.fillText(GBP_WHOLE.format(revenue), width / 2, height / 2 + 12);
        ctx.restore();
      },
    }],
  });

  return donutInstance;
}

export function destroyProfitCostDonut() {
  destroyChart(donutInstance);
  donutInstance = null;
}
