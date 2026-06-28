import api from '../api.js';

let chartInstance = null;

export async function renderArea(container, state = {}) {
  const wardName = state.wardName;
  if (!wardName) {
    container.innerHTML = '<div class="text-center mt-20 font-bold text-error">No area specified.</div>';
    return;
  }

  container.innerHTML = `
    <div class="min-h-screen pt-24 pb-12 px-gutter">
      <div class="max-w-4xl mx-auto">
        <button onclick="window.history.back()" class="text-on-surface-variant font-bold mb-6 flex items-center gap-2 hover:text-primary transition-colors">
          <span>←</span> Back
        </button>

        <div id="area-loading" class="flex flex-col items-center justify-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p class="text-on-surface-variant font-bold">Fetching civic data for ${decodeURIComponent(wardName)}...</p>
        </div>

        <div id="area-content" class="hidden">
          <div class="bg-surface border-2 border-primary/20 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <!-- Decorative background blob -->
            <div class="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
            
            <div class="relative z-10 flex flex-col md:flex-row gap-8">
              <!-- Left side: Grade -->
              <div class="flex-shrink-0 flex flex-col items-center justify-center md:border-r border-outline-variant md:pr-8">
                <div class="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-2">Civic Health Grade</div>
                <div id="area-grade" class="text-9xl font-display-xl text-primary" style="line-height: 1;">A</div>
                <div id="area-name" class="mt-4 text-xl font-bold text-on-surface text-center capitalize">Area Name</div>
              </div>

              <!-- Right side: Stats & Chart -->
              <div class="flex-1">
                <div class="grid grid-cols-2 gap-4 mb-8">
                  <div class="bg-surface-variant/50 p-4 rounded-xl border border-outline-variant">
                    <div class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Total Issues</div>
                    <div id="area-total" class="text-2xl font-bold text-on-surface">0</div>
                  </div>
                  <div class="bg-surface-variant/50 p-4 rounded-xl border border-outline-variant">
                    <div class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Resolution Rate</div>
                    <div id="area-rate" class="text-2xl font-bold text-secondary">0%</div>
                  </div>
                  <div class="col-span-2 bg-surface-variant/50 p-4 rounded-xl border border-outline-variant">
                    <div class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Top Concern</div>
                    <div id="area-top-category" class="text-xl font-bold text-error">None</div>
                  </div>
                </div>

                <div class="mb-6">
                  <div class="text-sm font-bold text-on-surface-variant mb-4">6-Month Trend</div>
                  <div class="h-40 w-full relative">
                    <canvas id="areaTrendChart"></canvas>
                  </div>
                </div>

                <button id="share-report-btn" class="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined">share</span> Share this report
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  try {
    const data = await api.analytics.area(decodeURIComponent(wardName));
    
    document.getElementById('area-loading').classList.add('hidden');
    document.getElementById('area-content').classList.remove('hidden');

    document.getElementById('area-name').textContent = data.name;
    
    const gradeEl = document.getElementById('area-grade');
    gradeEl.textContent = data.grade;
    if (data.grade === 'A') gradeEl.className = 'text-9xl font-display-xl text-[#B7E4C7]';
    else if (data.grade === 'B') gradeEl.className = 'text-9xl font-display-xl text-primary';
    else if (data.grade === 'C') gradeEl.className = 'text-9xl font-display-xl text-[#FFD166]';
    else gradeEl.className = 'text-9xl font-display-xl text-error';

    document.getElementById('area-total').textContent = data.total_issues;
    document.getElementById('area-rate').textContent = data.resolution_rate + '%';
    document.getElementById('area-top-category').textContent = data.most_common_category;

    // Render Chart
    const ctx = document.getElementById('areaTrendChart');
    if (ctx && window.Chart && data.monthly_trend.length > 0) {
      const labels = data.monthly_trend.map(t => t.month);
      const dataset = data.monthly_trend.map(t => t.count);

      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Issues',
            data: dataset,
            backgroundColor: '#FFCAD4',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { precision: 0 } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // Share button
    document.getElementById('share-report-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        window.toast.success('Report URL copied to clipboard!');
      });
    });

  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="text-center mt-20 font-bold text-error">Failed to load area report.</div>';
  }
}

export function cleanupArea() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}
