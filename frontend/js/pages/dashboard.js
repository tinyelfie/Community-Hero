import api from '../api.js';

let chartInstances = [];

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="min-h-screen pt-24 pb-12 px-gutter">
      <div class="max-w-6xl mx-auto">
        <h1 class="font-display-xl text-3xl text-on-surface mb-2">City Analytics Dashboard</h1>
        <p class="text-on-surface-variant font-body-md mb-8">Live metrics and insights on community reports.</p>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" id="kpi-grid">
          ${[1,2,3,4].map(() => `<div class="h-28 bg-surface border border-outline-variant rounded-2xl animate-pulse"></div>`).join('')}
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 class="font-bold text-on-surface mb-4">Issues by Category</h3>
            <div class="h-64 relative w-full">
              <canvas id="categoryChart"></canvas>
            </div>
          </div>
          <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 class="font-bold text-on-surface mb-4">Monthly Trend</h3>
            <div class="h-64 relative w-full">
              <canvas id="trendChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const stats = await api.insights.stats();
    
    // Update KPIs
    document.getElementById('kpi-grid').innerHTML = `
      <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center">
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Issues</div>
        <div class="text-4xl font-display-xl text-primary">${stats.total_issues}</div>
      </div>
      <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center">
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Open Issues</div>
        <div class="text-4xl font-display-xl text-error">${stats.open_issues}</div>
      </div>
      <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center">
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Resolved</div>
        <div class="text-4xl font-display-xl text-secondary">${stats.resolved_issues}</div>
      </div>
      <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 text-7xl opacity-5">📈</div>
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Resolution Rate</div>
        <div class="text-4xl font-display-xl text-on-surface">${stats.resolution_rate}%</div>
      </div>
    `;

    // Render Category Chart
    const ctxCategory = document.getElementById('categoryChart');
    if (ctxCategory && window.Chart) {
      const labels = Object.keys(stats.issues_by_category).map(k => k.replace('_', ' ').toUpperCase());
      const data = Object.values(stats.issues_by_category);
      
      chartInstances.push(new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: [
              '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#64748b' } }
          }
        }
      }));
    }

    // Render Trend Chart
    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend && window.Chart) {
      const labels = stats.monthly_trend.map(t => t.month);
      const data = stats.monthly_trend.map(t => t.count);

      chartInstances.push(new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'New Issues',
            data,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
            x: { grid: { display: false }, ticks: { color: '#64748b' } }
          }
        }
      }));
    }

  } catch (err) {
    console.error('Failed to load stats', err);
    container.innerHTML = `<div class="min-h-screen pt-24 pb-12 flex items-center justify-center text-error font-bold">Failed to load dashboard data.</div>`;
  }
}

export function cleanupDashboard() {
  chartInstances.forEach(chart => chart.destroy());
  chartInstances = [];
}
