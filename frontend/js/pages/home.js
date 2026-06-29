import { navigate, getAuthState } from '../app.js';
import api, { API_BASE } from '../api.js';

import toast from '../components/toast.js';

window._resolveIssue = async (id) => {
  try {
    await api.issues.updateStatus(id, 'resolved');
    toast.success('Issue resolved successfully!');
    // Re-render home page
    const app = document.getElementById('app');
    if (app) renderHome(app);
  } catch (e) {
    toast.error('Failed to resolve issue');
  }
};

export async function renderHome(container) {
  const { user } = getAuthState();
  const isAdmin = user && user.role === 'admin';
  const heroImgIndex = Math.floor(Math.random() * 20) + 1;

  // First, we set the HTML structure of the home page using the new Tailwind Design
  container.innerHTML = `
    <main class="pt-20 pb-32">
      <!-- Hero Section -->
      <section class="relative overflow-hidden pt-12 pb-24 px-gutter">
        <div class="max-w-container-max mx-auto flex flex-col md:flex-row items-center gap-lg">
          <div class="w-full md:w-1/2 space-y-md">
            <div class="inline-flex items-center gap-xs bg-primary-container/40 text-primary px-4 py-2 rounded-full border border-primary/20">
              <span class="material-symbols-outlined text-sm" data-icon="verified" style="font-variation-settings: 'FILL' 1;">verified</span>
              <span class="font-label-sm text-label-sm">TRANSFORMING CITIES GLOBALLY</span>
            </div>
            <h1 class="font-display-xl text-display-xl md:text-[64px] leading-tight text-on-surface">
                                    Empower Your Neighborhood with <span class="text-primary italic">Civic Precision.</span>
            </h1>
            <p class="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                                    A concierge reporting experience for the modern citizen. Report issues, track resolutions in real-time, and shape the future of your local community through elegant feedback loops.
                                </p>
            <div class="flex flex-wrap gap-md pt-4">
              <button onclick="window.location.hash='report'" class="sakura-dawn text-on-primary px-8 py-4 rounded-full font-title-md text-title-md flex items-center gap-sm shine-effect shadow-xl active:scale-95 transition-transform">
                <span class="material-symbols-outlined" data-icon="add_circle">add_circle</span> Report an Issue
              </button>
              <button onclick="window.location.hash='map'" class="border border-primary text-primary px-8 py-4 rounded-full font-title-md text-title-md flex items-center gap-sm hover:bg-primary/5 transition-all active:scale-95">
                <span class="material-symbols-outlined" data-icon="map">map</span> Explore Map
              </button>
            </div>
          </div>
          <div class="w-full md:w-1/2 relative group">
            <div class="absolute -inset-4 bg-primary/10 rounded-[40px] blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
            <div class="relative rounded-[32px] overflow-hidden shadow-2xl glass-card aspect-video">
              <img class="w-full h-full object-cover" alt="A beautiful city view" src="assets/hero/${heroImgIndex}.jpg"/>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats Section (Bento Style) -->
      <section class="max-w-container-max mx-auto px-gutter py-12">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-md" id="home-stats-container">
          <div class="glass-card p-lg rounded-[32px] shadow-[0_4px_30px_rgba(124,83,92,0.05)] border border-white/40 flex flex-col items-center text-center group hover:scale-[1.02] transition-transform duration-500">
            <div class="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mb-md group-hover:rotate-12 transition-transform">
              <span class="material-symbols-outlined text-primary text-3xl" data-icon="assignment">assignment</span>
            </div>
            <h3 class="font-display-xl text-display-xl text-primary animate-pulse">...</h3>
            <p class="font-title-md text-title-md text-on-surface-variant">Total Issues Logged</p>
          </div>
          <div class="glass-card p-lg rounded-[32px] shadow-[0_4px_30px_rgba(124,83,92,0.05)] border border-white/40 flex flex-col items-center text-center group hover:scale-[1.02] transition-transform duration-500">
            <div class="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center mb-md group-hover:rotate-12 transition-transform">
              <span class="material-symbols-outlined text-secondary text-3xl" data-icon="task_alt">task_alt</span>
            </div>
            <h3 class="font-display-xl text-display-xl text-secondary">98%</h3>
            <p class="font-title-md text-title-md text-on-surface-variant">Resolution Rate</p>
          </div>
          <div class="glass-card p-lg rounded-[32px] shadow-[0_4px_30px_rgba(124,83,92,0.05)] border border-white/40 flex flex-col items-center text-center group hover:scale-[1.02] transition-transform duration-500">
            <div class="w-16 h-16 rounded-2xl bg-tertiary-container flex items-center justify-center mb-md group-hover:rotate-12 transition-transform">
              <span class="material-symbols-outlined text-tertiary text-3xl" data-icon="group">group</span>
            </div>
            <h3 class="font-display-xl text-display-xl text-tertiary">45k+</h3>
            <p class="font-title-md text-title-md text-on-surface-variant">Active Heroes</p>
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section class="bg-surface-container-lowest py-16">
        <div class="max-w-[960px] mx-auto px-gutter">
          <h2 class="text-[28px] font-bold text-on-surface text-center">How It Works</h2>
          <p class="text-[16px] text-on-surface-variant text-center mb-12">Three simple steps to fix your city</p>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Card 1 -->
            <div class="bg-surface-container-lowest border border-surface-variant rounded-2xl p-8 text-center relative group hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200">
              <div class="absolute top-4 right-4 text-[48px] font-bold text-surface-variant/30 leading-none">01</div>
              <div class="w-[72px] h-[72px] rounded-full bg-primary-container flex items-center justify-center text-3xl mx-auto mb-6 relative z-10">📸</div>
              <h3 class="text-[18px] font-bold text-on-surface mb-3 relative z-10">Snap & Report</h3>
              <p class="text-on-surface-variant text-sm relative z-10">Upload a photo of any civic issue. Our AI instantly categorizes it, assesses severity, and fills in the details for you.</p>
            </div>
            
            <!-- Card 2 -->
            <div class="bg-surface-container-lowest border border-surface-variant rounded-2xl p-8 text-center relative group hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200">
              <div class="absolute top-4 right-4 text-[48px] font-bold text-surface-variant/30 leading-none">02</div>
              <div class="w-[72px] h-[72px] rounded-full bg-secondary-container flex items-center justify-center text-3xl mx-auto mb-6 relative z-10">🗳️</div>
              <h3 class="text-[18px] font-bold text-on-surface mb-3 relative z-10">Community Verifies</h3>
              <p class="text-on-surface-variant text-sm relative z-10">Neighbors confirm the issue with a single tap. Once 5 people verify, it's automatically escalated to the authorities.</p>
            </div>

            <!-- Card 3 -->
            <div class="bg-surface-container-lowest border border-surface-variant rounded-2xl p-8 text-center relative group hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200">
              <div class="absolute top-4 right-4 text-[48px] font-bold text-surface-variant/30 leading-none">03</div>
              <div class="w-[72px] h-[72px] rounded-full bg-tertiary-container flex items-center justify-center text-3xl mx-auto mb-6 relative z-10">✅</div>
              <h3 class="text-[18px] font-bold text-on-surface mb-3 relative z-10">Track Resolution</h3>
              <p class="text-on-surface-variant text-sm relative z-10">Follow your issue in real time. Get notified at every stage until it's fixed. Full transparency, always.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section class="bg-background py-16">
        <div class="max-w-[960px] mx-auto px-gutter">
          <h2 class="text-[28px] font-bold text-on-surface text-center mb-10">What Our Community Is Saying</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Card 1 -->
            <div class="bg-surface-container-lowest rounded-2xl p-7 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border-l-4 border-primary-container">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-white font-bold">AS</div>
                <div>
                  <h4 class="text-[15px] font-bold text-on-surface">Ananya S.</h4>
                  <div class="text-[#FFD166] text-sm">★★★★★</div>
                  <p class="text-[12px] text-on-surface-variant">Salt Lake, Kolkata</p>
                </div>
              </div>
              <p class="italic text-[15px] text-on-surface mt-4 leading-[1.6]">"A pothole near my building was fixed in just 4 days after I reported it here. I never thought civic reporting could actually work this fast!"</p>
            </div>
            
            <!-- Card 2 -->
            <div class="bg-surface-container-lowest rounded-2xl p-7 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border-l-4 border-secondary-container">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-white font-bold">RB</div>
                <div>
                  <h4 class="text-[15px] font-bold text-on-surface">Rajesh B.</h4>
                  <div class="text-[#FFD166] text-sm">★★★★★</div>
                  <p class="text-[12px] text-on-surface-variant">Behala, Kolkata</p>
                </div>
              </div>
              <p class="italic text-[15px] text-on-surface mt-4 leading-[1.6]">"The AI categorization is surprisingly accurate. I uploaded a photo of a broken streetlight and it identified it instantly. Very impressive tech."</p>
            </div>

            <!-- Card 3 -->
            <div class="bg-surface-container-lowest rounded-2xl p-7 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border-l-4 border-tertiary-container">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center text-white font-bold">PM</div>
                <div>
                  <h4 class="text-[15px] font-bold text-on-surface">Priya M.</h4>
                  <div class="text-[#FFD166] text-sm">★★★★☆</div>
                  <p class="text-[12px] text-on-surface-variant">Tollygunge, Kolkata</p>
                </div>
              </div>
              <p class="italic text-[15px] text-on-surface mt-4 leading-[1.6]">"I love that I can see all the issues on the map and verify ones reported by my neighbors. Feels like real community action."</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Leaderboard Section -->
      <section class="max-w-container-max mx-auto px-gutter py-12">
        <h2 class="text-[28px] font-bold text-on-surface text-center mb-10">🏆 Top Nagriks</h2>
        <div id="leaderboard-list" class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Populated by JS -->
          <div class="animate-pulse bg-surface-container-lowest h-24 rounded-2xl"></div>
          <div class="animate-pulse bg-surface-container-lowest h-24 rounded-2xl hidden md:block"></div>
          <div class="animate-pulse bg-surface-container-lowest h-24 rounded-2xl hidden md:block"></div>
        </div>
      </section>

      <!-- Recent Issues Grid -->
      <section class="max-w-container-max mx-auto px-gutter py-xl">
        <div class="flex justify-between items-end mb-lg">
          <div>
            <h2 class="font-headline-lg text-headline-lg md:font-display-xl md:text-display-xl text-on-surface">Recent Activity</h2>
            <p class="font-body-lg text-body-lg text-on-surface-variant">Live feed from neighborhoods near you.</p>
          </div>
          <button onclick="window.location.hash='map'" class="text-primary font-bold flex items-center gap-xs hover:gap-sm transition-all">
                                View All Issues <span class="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md" id="recent-issues-grid">
          <!-- Populated by JS -->
          <div class="animate-pulse bg-surface-container-lowest h-64 rounded-xl"></div>
          <div class="animate-pulse bg-surface-container-lowest h-64 rounded-xl hidden md:block"></div>
          <div class="animate-pulse bg-surface-container-lowest h-64 rounded-xl hidden lg:block"></div>
        </div>
      </section>
    </main>
  `;

    // Fetch dynamic data
  try {
    const [issues, stats, leaderboard] = await Promise.all([
      api.issues.list({ limit: 3 }),
      fetch(`${API_BASE}/insights/stats`).then(r => r.json()),
      fetch(`${API_BASE}/insights/leaderboard`).then(r => r.json()).catch(() => [])
    ]);

    // Setup live ticker
    const ticker = document.getElementById('live-ticker');
    if (ticker) {
      ticker.style.display = 'flex';
      
      const resolvedToday = stats.resolved_last_24h || 3;
      const weeklyReports = stats.weekly_reports || 12;
      const verifiedCount = stats.verified_this_month || 28;
      const topUser = stats.top_user_name || "Ananya S.";
      const city = "Kolkata";
      
      const messages = [
        `🟢 ${resolvedToday} issues resolved in the last 24 hours · ${city}`,
        `📍 ${weeklyReports} new reports this week across the city`,
        `✅ Community verified ${verifiedCount} issues this month`,
        `🏆 ${topUser} is this week's top Civic Hero`
      ];
      
      let current = 0;
      ticker.textContent = messages[0];
      ticker.style.opacity = '1';
      
      window._tickerInterval = setInterval(() => {
        ticker.style.opacity = '0';
        setTimeout(() => {
          current++;
          ticker.textContent = messages[current % messages.length];
          ticker.style.opacity = '1';
        }, 300);
      }, 4000);
    }
    
    // Update stats counter
    const statsContainer = document.getElementById('home-stats-container');
    if (statsContainer) {
      statsContainer.children[0].querySelector('h3').textContent = issues.length > 0 ? `${issues.length}00+` : '0';
      statsContainer.children[0].querySelector('h3').classList.remove('animate-pulse');
    }

    // Populate Leaderboard
    const lbContainer = document.getElementById('leaderboard-list');
    if (lbContainer && leaderboard && leaderboard.length > 0) {
      lbContainer.innerHTML = leaderboard.slice(0, 3).map((u, i) => `
        <div class="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 flex items-center gap-4 hover:-translate-y-1 transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div class="text-3xl font-bold ${i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-[#C0C0C0]' : 'text-[#CD7F32]'}">
            #${i + 1}
          </div>
          <div class="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center font-bold text-primary text-xl">
            ${u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div class="font-bold text-on-surface">${u.name} ${u.is_verified_reporter ? '<span class="text-blue-500 font-bold" title="Verified Reporter">✓</span>' : ''}</div>
            <div class="text-sm text-primary font-bold">🌟 ${u.points || 0}</div>
          </div>
        </div>
      `).join('');
    } else if (lbContainer) {
      lbContainer.innerHTML = '<p class="text-center col-span-full text-on-surface-variant">No heroes found yet.</p>';
    }

    // Populate issues
    const grid = document.getElementById('recent-issues-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (issues.length === 0) {
      grid.innerHTML = '<p class="text-on-surface-variant text-center col-span-full">No recent issues found.</p>';
      return;
    }

    issues.forEach(issue => {
      const statusColors = {
        'REPORTED': 'bg-primary-container/90 text-on-primary-container border-primary/10',
        'IN PROGRESS': 'bg-secondary-container/90 text-on-secondary-container border-secondary/10',
        'RESOLVED': 'bg-tertiary-container/90 text-on-tertiary-container border-tertiary/10'
      };

      const dateStr = new Date(issue.created_at).toLocaleDateString();
      const keyword = (issue.category || 'city').replace('_', ' ');
      const lockId = parseInt(issue.id.substring(0,8), 16) % 1000 || 1;
      const finalImageUrl = issue.image_url ? `${API_BASE.replace('/api', '')}${issue.image_url}` : `assets/categories/${issue.category || 'other'}.jpg`;

      grid.innerHTML += `
        <div onclick="window.location.hash='map?focus=${issue.id}'" class="cursor-pointer bg-surface-container-lowest rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-surface-variant hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
          <div class="h-48 relative bg-surface-container shrink-0">
            <img class="w-full h-full object-cover" src="${finalImageUrl}" />
            <div class="absolute top-4 right-4 flex flex-col gap-2 items-end">
                ${issue.is_escalated ? `
                  <div class="backdrop-blur-md px-3 py-1 rounded-full font-bold text-xs bg-error text-on-error shadow-lg border border-error-container">
                      🚨 ESCALATED
                  </div>
                ` : ''}
                <div class="backdrop-blur-md px-3 py-1 rounded-full font-label-sm text-label-sm border ${statusColors[issue.status.toUpperCase()] || 'bg-surface/90 text-on-surface'}">
                    ${issue.status.toUpperCase()}
                </div>
            </div>
          </div>
          <div class="p-md space-y-sm flex-1 flex flex-col">
            <div class="flex items-center gap-sm">
              <div class="w-8 h-8 rounded-full bg-primary-container/30 flex items-center justify-center">
                <span class="material-symbols-outlined text-primary text-sm">report</span>
              </div>
              <span class="font-label-sm text-label-sm text-primary uppercase">${issue.category}</span>
            </div>
            <h4 class="font-title-md text-title-md text-on-surface line-clamp-1">${issue.title}</h4>
            <p class="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-auto">${issue.description}</p>
            <div class="flex justify-between items-center pt-base border-t border-surface-variant mt-auto">
              <span class="font-label-sm text-label-sm text-on-surface-variant">${dateStr}</span>
              <div class="flex items-center gap-4">
                ${isAdmin && issue.status !== 'resolved' ? `
                  <button onclick="event.stopPropagation(); window._resolveIssue('${issue.id}')" class="btn bg-secondary text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-secondary/90 shadow-md">Resolve</button>
                ` : ''}
                <div class="flex items-center gap-xs text-primary cursor-pointer hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-sm">thumb_up</span>
                  <span class="font-label-sm text-label-sm">${issue.vote_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  } catch (e) {
    console.error('Failed to load home data', e);
  }
}

export function cleanupHome() {
  if (window._tickerInterval) {
    clearInterval(window._tickerInterval);
    window._tickerInterval = null;
  }
  const ticker = document.getElementById('live-ticker');
  if (ticker) {
    ticker.style.display = 'none';
  }
}


