import api, { API_BASE } from '../api.js';

let chartInstances = [];

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="min-h-screen pt-24 pb-12 px-gutter">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-2">
          <h1 class="font-display-xl text-3xl text-on-surface">City Analytics Dashboard</h1>
          <button id="export-csv-btn" onclick="window.print()" class="bg-primary text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-primary/90 flex items-center gap-2">
            Export Data
          </button>
        </div>
        <p class="text-on-surface-variant font-body-md mb-8">Live metrics and insights on community reports.</p>

        <!-- Community Pulse -->
        <div id="community-pulse-container" class="mb-8 hidden">
          <div class="rounded-2xl p-6 shadow-sm border" id="community-pulse-card">
            <h3 class="font-bold text-on-surface mb-2">Community Pulse</h3>
            <div class="flex items-center gap-4">
              <div id="pulse-emoji" class="text-5xl"></div>
              <div>
                <div id="pulse-state" class="font-display-md text-xl"></div>
                <div id="pulse-label" class="text-sm"></div>
                <div id="pulse-score" class="text-xs mt-1 font-mono"></div>
              </div>
            </div>
          </div>
        </div>

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

        <!-- Volume Forecast Row -->
        <div id="volume-forecast-container" class="mb-8 hidden">
          <h3 class="font-display-md text-2xl text-on-surface mb-4">📈 Volume Forecast</h3>
          <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm mb-4">
            <h4 class="font-bold text-on-surface mb-4">City-Wide Issue Trend (Linear Regression)</h4>
            <div class="h-64 relative w-full">
              <canvas id="forecastChart" class="relative z-10"></canvas>
            </div>
          </div>
          <div id="area-forecast-cards" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Populated by JS -->
          </div>
        </div>

        <!-- Feature Importances Row -->
        <div id="feature-importance-container" class="mb-8 hidden">
          <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 class="font-bold text-on-surface mb-2">What drives severity predictions</h3>
            <p class="text-sm text-on-surface-variant mb-4">Random Forest feature importances from our ML model.</p>
            <div class="h-64 relative w-full">
              <canvas id="importanceChart" class="relative z-10"></canvas>
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
      <div class="kpi-card bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden transform translate-y-8 opacity-0 transition-all duration-700 ease-out hover:scale-105 cursor-default">
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Issues</div>
        <div class="text-5xl font-display-xl text-primary animate-number" data-target="${stats.total_issues}">0</div>
      </div>
      <div class="kpi-card bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden transform translate-y-8 opacity-0 transition-all duration-700 ease-out delay-100 hover:scale-105 cursor-default">
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Open Issues</div>
        <div class="text-5xl font-display-xl text-error animate-number" data-target="${stats.open_issues}">0</div>
      </div>
      <div class="kpi-card bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden transform translate-y-8 opacity-0 transition-all duration-700 ease-out delay-200 hover:scale-105 cursor-default">
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Resolved</div>
        <div class="text-5xl font-display-xl text-secondary animate-number" data-target="${stats.resolved_issues}">0</div>
      </div>
      <div class="kpi-card bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden transform translate-y-8 opacity-0 transition-all duration-700 ease-out delay-300 hover:scale-105 cursor-default">
        <div class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Resolution Rate</div>
        <div class="text-5xl font-display-xl text-on-surface mb-2"><span class="animate-number" data-target="${stats.resolution_rate}">0</span>%</div>
        <div class="w-full bg-surface-variant rounded-full h-2">
          <div class="bg-secondary h-2 rounded-full transition-all duration-1000 ease-out" style="width: 0%" id="resolution-progress"></div>
        </div>
      </div>
    `;

    function animateValue(obj, start, end, duration, isDecimal) {
      if (isNaN(end)) return;
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = progress * (end - start) + start;
        obj.innerHTML = isDecimal ? val.toFixed(1) : Math.floor(val);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          obj.innerHTML = end;
        }
      };
      window.requestAnimationFrame(step);
    }

    // Trigger KPI animations
    setTimeout(() => {
      document.querySelectorAll('.kpi-card').forEach(card => {
        card.classList.remove('translate-y-8', 'opacity-0');
      });
      document.querySelectorAll('.animate-number').forEach(el => {
        const targetStr = el.getAttribute('data-target');
        const target = parseFloat(targetStr);
        const isDecimal = targetStr.includes('.');
        animateValue(el, 0, target, 2000, isDecimal);
      });
      const progressBar = document.getElementById('resolution-progress');
      if (progressBar) {
        progressBar.style.width = `${stats.resolution_rate}%`;
      }
    }, 100);

    // Render Community Pulse
    if (stats.community_pulse) {
      const p = stats.community_pulse;
      document.getElementById('community-pulse-container').classList.remove('hidden');
      const pCard = document.getElementById('community-pulse-card');
      if (p.color === 'red') { pCard.classList.add('bg-red-50', 'border-red-200', 'text-red-900'); }
      else if (p.color === 'orange') { pCard.classList.add('bg-orange-50', 'border-orange-200', 'text-orange-900'); }
      else if (p.color === 'amber') { pCard.classList.add('bg-yellow-50', 'border-yellow-200', 'text-yellow-900'); }
      else { pCard.classList.add('bg-green-50', 'border-green-200', 'text-green-900'); }
      
      document.getElementById('pulse-emoji').textContent = p.emoji;
      document.getElementById('pulse-state').textContent = p.state;
      document.getElementById('pulse-label').textContent = p.label;
      document.getElementById('pulse-score').textContent = `Sentiment index: ${p.score}`;
    }

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

    // Load Model Insights (Feature Importances)
    try {
      const insightsRes = await fetch(`${API_BASE}/api/analytics/insights/model-insights`);
      if (insightsRes.ok) {
        const importances = await insightsRes.json();
        if (importances && importances.length > 0) {
          document.getElementById('feature-importance-container').classList.remove('hidden');
          const ctxImportance = document.getElementById('importanceChart');
          if (ctxImportance && window.Chart) {
             const labels = importances.map(i => i.feature.replace(/_/g, ' ').toUpperCase());
             const data = importances.map(i => (i.importance * 100).toFixed(1));
             chartInstances.push(new Chart(ctxImportance, {
               type: 'bar',
               data: {
                 labels,
                 datasets: [{
                   label: 'Importance (%)',
                   data,
                   backgroundColor: '#FFCAD4',
                   borderColor: '#FF8FA3',
                   borderWidth: 1,
                   borderRadius: 4
                 }]
               },
               options: {
                 indexAxis: 'y',
                 responsive: true,
                 maintainAspectRatio: false,
                 plugins: { legend: { display: false } },
                 scales: { x: { max: 100, beginAtZero: true } }
               }
             }));
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load model insights", e);
    }

    // Load Volume Forecast
    try {
      const forecastRes = await fetch(`${API_BASE}/api/insights/forecast`);
      if (forecastRes.ok) {
        const data = await forecastRes.json();
        if (data.areas && data.areas.length > 0) {
          document.getElementById('volume-forecast-container').classList.remove('hidden');
          
          // Build chart data
          // We will sum the historical and predicted counts across all areas for the city-wide chart
          const numHistory = 12; // weeks 15-26
          const numFuture = 2; // weeks 27-28
          let cityHistory = new Array(numHistory).fill(0);
          let cityFuturePred = new Array(numFuture).fill(0);
          let cityFutureLow = new Array(numFuture).fill(0);
          let cityFutureHigh = new Array(numFuture).fill(0);
          
          data.areas.forEach(area => {
            for (let i = 0; i < numHistory; i++) {
              cityHistory[i] += area.historical_weekly_counts[i] || 0;
            }
            area.predictions.forEach((p, i) => {
              if (i < numFuture) {
                cityFuturePred[i] += p.predicted_count;
                cityFutureLow[i] += p.confidence_low;
                cityFutureHigh[i] += p.confidence_high;
              }
            });
          });
          
          const labels = [];
          for (let i = 1; i <= numHistory; i++) labels.push(`W-${numHistory - i + 1}`);
          labels.push("Today");
          labels.push("Next W");
          labels.push("W+2");
          
          // To make the line continuous, we need the 'Today' point (which is the last historical point)
          const lastHistorical = cityHistory[numHistory - 1];
          
          const historyData = [...cityHistory, lastHistorical, null, null];
          const futurePredData = [...new Array(numHistory).fill(null), lastHistorical, ...cityFuturePred];
          const futureLowData = [...new Array(numHistory).fill(null), lastHistorical, ...cityFutureLow];
          const futureHighData = [...new Array(numHistory).fill(null), lastHistorical, ...cityFutureHigh];
          
          const ctxForecast = document.getElementById('forecastChart');
          if (ctxForecast && window.Chart) {
            chartInstances.push(new Chart(ctxForecast, {
              type: 'line',
              data: {
                labels,
                datasets: [
                  {
                    label: 'Historical',
                    data: historyData,
                    borderColor: '#425B46',
                    borderWidth: 3,
                    tension: 0.1
                  },
                  {
                    label: 'Forecast',
                    data: futurePredData,
                    borderColor: '#425B46',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    tension: 0.1
                  },
                  {
                    label: 'High Confidence Bound',
                    data: futureHighData,
                    borderColor: 'rgba(66, 91, 70, 0)',
                    backgroundColor: 'rgba(66, 91, 70, 0.1)',
                    fill: '+1', // fill to the next dataset (which is low bound)
                    pointRadius: 0,
                    tension: 0.1
                  },
                  {
                    label: 'Low Confidence Bound',
                    data: futureLowData,
                    borderColor: 'rgba(66, 91, 70, 0)',
                    fill: false,
                    pointRadius: 0,
                    tension: 0.1
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }
            }));
          }
          
          // Render Area cards
          data.areas.sort((a, b) => b.predictions[0].predicted_count - a.predictions[0].predicted_count);
          document.getElementById('area-forecast-cards').innerHTML = data.areas.map(area => {
            const pred = area.predictions[0];
            let arrow = '→', trendColor = 'text-green-600';
            if (pred.trend === 'rising') { arrow = '↑'; trendColor = 'text-red-600'; }
            else if (pred.trend === 'increasing') { arrow = '↗'; trendColor = 'text-orange-500'; }
            else if (pred.trend === 'declining') { arrow = '↘'; trendColor = 'text-blue-500'; }
            
            let r2Text = '🔀 Irregular pattern', r2Color = 'text-gray-500';
            if (area.r_squared >= 0.7) { r2Text = '📈 Strong trend detected'; r2Color = 'text-green-600'; }
            else if (area.r_squared >= 0.4) { r2Text = '〰️ Moderate trend'; r2Color = 'text-orange-500'; }
            
            const warningBadge = (pred.trend === 'rising' && pred.predicted_count > 8) 
              ? '<span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full absolute top-2 right-2">⚠️ Attention needed</span>'
              : '';

            return `
              <div class="bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm relative">
                ${warningBadge}
                <div class="font-bold text-lg mb-1">${area.area_name}</div>
                <div class="text-3xl font-display-md mb-1">${pred.predicted_count} <span class="text-sm ${trendColor}">${arrow}</span></div>
                <div class="text-xs text-on-surface-variant mb-2">Range: ${pred.confidence_low} - ${pred.confidence_high} issues</div>
                <div class="text-xs font-semibold ${r2Color}">${r2Text} (R² = ${area.r_squared.toFixed(2)})</div>
              </div>
            `;
          }).join('');
        }
      }
    } catch (e) {
      console.warn("Failed to load volume forecast", e);
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
