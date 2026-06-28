import api, { API_BASE } from '../api.js';

let chartInstances = [];

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="min-h-screen pt-24 pb-12 px-gutter">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-2">
          <h1 class="font-display-xl text-3xl text-on-surface">City Analytics Dashboard</h1>
          <button id="export-csv-btn" class="bg-primary text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-primary/90 flex items-center gap-2">
            <span>⬇️</span> Export Data
          </button>
        </div>
        <p class="text-on-surface-variant font-body-md mb-8">Live metrics and insights on community reports.</p>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" id="kpi-grid">
          ${[1,2,3,4].map(() => `<div class="h-28 bg-surface border border-outline-variant rounded-2xl animate-pulse"></div>`).join('')}
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 class="font-bold text-on-surface mb-4">Issues by Category</h3>
            <div class="h-64 relative w-full" id="category-chart-container">
              <div class="absolute inset-0 bg-surface-variant animate-pulse rounded-xl"></div>
              <canvas id="categoryChart" class="opacity-0 transition-opacity duration-500 relative z-10"></canvas>
            </div>
          </div>
          <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 class="font-bold text-on-surface mb-4">Monthly Trend</h3>
            <div class="h-64 relative w-full" id="trend-chart-container">
              <div class="absolute inset-0 bg-surface-variant animate-pulse rounded-xl"></div>
              <canvas id="trendChart" class="opacity-0 transition-opacity duration-500 relative z-10"></canvas>
            </div>
          </div>
        </div>
        </div>

        <!-- AI Insights Row -->
        <div id="ai-insights" class="mb-8 hidden">
          <h3 class="font-display-md text-2xl text-on-surface mb-4">✨ Predictive AI Insights</h3>
          <div id="predictions-list" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Populated by JS -->
          </div>
        </div>
        <!-- Weekly Digest Row -->
        <div id="weekly-digest-container" class="mb-8 hidden">
          <div class="bg-[#FFFDF7] border-2 border-[#FFCAD4] rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-6xl opacity-10">🤖</div>
            <h3 class="font-display-md text-2xl text-[#425B46] mb-2 flex items-center gap-2">
              🤖 Weekly Intelligence Report
            </h3>
            <div class="text-sm text-[#888] mb-4 font-bold" id="weekly-digest-date"></div>
            <div id="weekly-digest-content" class="text-[#425B46] font-body-md space-y-4 leading-relaxed whitespace-pre-wrap"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const stats = await api.insights.stats();
    
    // Update KPIs
    // Update KPIs with stagger animation
    document.getElementById('kpi-grid').innerHTML = `
      <div class="kpi-card bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center transform translate-y-8 opacity-0 transition-all duration-700 ease-out">
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Issues</div>
        <div class="text-5xl font-display-xl text-primary">${stats.total_issues}</div>
      </div>
      <div class="kpi-card bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center transform translate-y-8 opacity-0 transition-all duration-700 ease-out delay-100">
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Open Issues</div>
        <div class="text-5xl font-display-xl text-error">${stats.open_issues}</div>
      </div>
      <div class="kpi-card bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center transform translate-y-8 opacity-0 transition-all duration-700 ease-out delay-200">
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Resolved</div>
        <div class="text-5xl font-display-xl text-secondary">${stats.resolved_issues}</div>
      </div>
      <div class="kpi-card bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden transform translate-y-8 opacity-0 transition-all duration-700 ease-out delay-300 hover:scale-105 cursor-default">
        <div class="absolute -right-4 -bottom-4 text-7xl opacity-5">📈</div>
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Resolution Rate</div>
        <div class="text-5xl font-display-xl text-on-surface mb-2">${stats.resolution_rate}%</div>
        <div class="w-full bg-surface-variant rounded-full h-2">
          <div class="bg-secondary h-2 rounded-full" style="width: ${stats.resolution_rate}%"></div>
        </div>
      </div>
    `;

    // Trigger KPI animations
    setTimeout(() => {
      document.querySelectorAll('.kpi-card').forEach(card => {
        card.classList.remove('translate-y-8', 'opacity-0');
      });
    }, 50);

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
              '#FFCAD4', '#B7E4C7', '#FF8FA3', '#7C535C', '#A4D1B4', '#EDB9C3'
            ],
            borderWidth: 2,
            borderColor: '#FFFDF7',
            hoverOffset: 15,
            hoverBorderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          animation: {
            animateScale: true,
            animateRotate: true,
            duration: 2000,
            easing: 'easeOutQuart'
          },
          plugins: {
            legend: { position: 'right', labels: { color: '#64748b', font: { family: 'Corben', size: 14 } } },
            tooltip: {
              backgroundColor: 'rgba(48, 49, 45, 0.95)',
              titleFont: { family: 'Corben', size: 16 },
              bodyFont: { family: 'Corben', size: 14 },
              padding: 12,
              cornerRadius: 12,
              displayColors: true,
              boxPadding: 6
            }
          }
        }
      }));
      ctxCategory.classList.remove('opacity-0');
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
            borderColor: '#7C535C',
            backgroundColor: (context) => {
              const chart = context.chart;
              const {ctx, chartArea} = chart;
              if (!chartArea) return null;
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(124, 83, 92, 0.5)');
              gradient.addColorStop(1, 'rgba(124, 83, 92, 0.0)');
              return gradient;
            },
            borderWidth: 4,
            fill: true,
            tension: 0.5,
            pointBackgroundColor: '#FFFDF7',
            pointBorderColor: '#7C535C',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            y: { duration: 2000, easing: 'easeOutQuart' },
            x: { duration: 2000, easing: 'easeOutQuart' }
          },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(48, 49, 45, 0.95)',
              titleFont: { family: 'Corben', size: 16 },
              bodyFont: { family: 'Corben', size: 14 },
              padding: 12,
              cornerRadius: 12,
              displayColors: false
            }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: '#e2e8f0', borderDash: [5, 5] }, ticks: { color: '#64748b', font: { family: 'Corben' } } },
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Corben' } } }
          }
        }
      }));
      ctxTrend.classList.remove('opacity-0');
    }

    // Load AI Insights
    try {
      const allPredictions = await api.insights.predictions();
      if (allPredictions && allPredictions.length > 0) {
        const predictions = allPredictions.slice(0, 9);
        document.getElementById('ai-insights').classList.remove('hidden');
        document.getElementById('predictions-list').innerHTML = predictions.map((p, index) => `
          <div style="background: #FFCAD4; border: 1px solid #FF8FA3; border-radius: 12px; padding: 16px; color: #425B46;">
            <div style="font-weight: bold; margin-bottom: 8px;">📍 Location: <span id="pred-loc-${index}">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</span></div>
            <div style="margin-bottom: 4px;">Predicted Issues: <strong>${p.predicted_count}</strong></div>
            <div style="font-size: 13px; opacity: 0.8;">Severity Risk: High</div>
          </div>
        `).join('');

        // Reverse geocode sequentially to respect Nominatim rate limits (1 req/sec)
        (async () => {
          for (let i = 0; i < predictions.length; i++) {
            const p = predictions[i];
            const el = document.getElementById(`pred-loc-${i}`);
            if (!el) continue;
            try {
              el.textContent = "Loading location...";
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat}&lon=${p.lng}&zoom=14`);
              if (res.ok) {
                const data = await res.json();
                const locName = data.address?.suburb || data.address?.neighbourhood || data.address?.city_district || data.address?.city || data.name || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
                el.textContent = locName;
              } else {
                el.textContent = `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
              }
            } catch(e) {
              el.textContent = `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
            }
            await new Promise(r => setTimeout(r, 1000));
          }
        })();
      }
    } catch (e) {
      console.warn("Failed to load predictions", e);
    }

    // Load Weekly Digest
    try {
      const digestRes = await fetch(`${API_BASE}/digests/latest`);
      if (digestRes.ok) {
        const digest = await digestRes.json();
        document.getElementById('weekly-digest-container').classList.remove('hidden');
        document.getElementById('weekly-digest-date').textContent = `${new Date(digest.week_start).toLocaleDateString()} — ${new Date(digest.week_end).toLocaleDateString()}`;
        document.getElementById('weekly-digest-content').textContent = digest.content;
      }
    } catch (e) {
      console.warn("Failed to load digest", e);
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
