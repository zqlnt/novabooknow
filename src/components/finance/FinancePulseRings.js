import { GBP_WHOLE, NUMBER, clampPercent, escapeHtml } from './utils.js';

function ringArc(value, radius, className, reducedMotion) {
  const circumference = 2 * Math.PI * radius;
  const pct = clampPercent(value);
  const offset = circumference * (1 - pct / 100);
  const anim = reducedMotion ? '' : ' class="finance-ring-arc-animate"';
  return `
    <circle class="finance-ring-track" cx="100" cy="100" r="${radius}" fill="none"></circle>
    <circle${anim}
      class="finance-ring-arc ${className}"
      cx="100" cy="100" r="${radius}"
      fill="none"
      stroke-dasharray="${circumference.toFixed(2)}"
      stroke-dashoffset="${offset.toFixed(2)}"
      data-value="${pct.toFixed(1)}"
    ></circle>`;
}

export function renderFinancePulseRings(overview, options = {}) {
  const reducedMotion = options.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const margin = clampPercent(overview?.plannedProfitMarginPercent);
  const collection = clampPercent(overview?.collectionRatePercent);
  const completeness = clampPercent(overview?.feePlanCoveragePercent);
  const profit = overview?.plannedProfit ?? 0;

  const aria = `Contribution margin ${NUMBER.format(margin)} percent, collection rate ${NUMBER.format(collection)} percent, finance profile completeness ${NUMBER.format(completeness)} percent`;

  return `
    <article class="finance-card finance-ring-card finance-bento-ring">
      <div class="finance-card-header">
        <div>
          <span class="finance-kicker">Financial pulse</span>
          <h3>Monthly economics</h3>
        </div>
        <span class="finance-live-pill"><i></i> Live</span>
      </div>
      <div class="finance-ring-layout">
        <div class="finance-ring-graphic finance-ring-responsive" role="img" aria-label="${escapeHtml(aria)}">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            ${ringArc(margin, 78, 'ring-margin', reducedMotion)}
            ${ringArc(collection, 60, 'ring-collection', reducedMotion)}
            ${ringArc(completeness, 42, 'ring-completeness', reducedMotion)}
          </svg>
          <div class="finance-ring-centre">
            <strong>${GBP_WHOLE.format(profit)}</strong>
            <span>Contribution profit</span>
          </div>
        </div>
        <div class="finance-ring-legend" aria-hidden="false">
          <div class="finance-legend-row">
            <span><i class="legend-dot margin"></i>Contribution margin</span>
            <strong>${NUMBER.format(margin)}%</strong>
          </div>
          <div class="finance-legend-row">
            <span><i class="legend-dot collection"></i>Collection rate</span>
            <strong>${NUMBER.format(collection)}%</strong>
          </div>
          <div class="finance-legend-row">
            <span><i class="legend-dot completeness"></i>Finance completeness</span>
            <strong>${NUMBER.format(completeness)}%</strong>
          </div>
        </div>
        <p class="visually-hidden">${aria}</p>
      </div>
    </article>`;
}
