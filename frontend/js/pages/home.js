import { navigate, getAuthState } from '../app.js';
import api from '../api.js';

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
    const issues = await api.issues.list({ limit: 3 });
    
    // Update stats counter
    const statsContainer = document.getElementById('home-stats-container');
    if (statsContainer) {
      statsContainer.children[0].querySelector('h3').textContent = issues.length > 0 ? `${issues.length}00+` : '0';
      statsContainer.children[0].querySelector('h3').classList.remove('animate-pulse');
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
      const finalImageUrl = issue.image_url ? `http://127.0.0.1:8000${issue.image_url}` : `assets/categories/${issue.category || 'other'}.jpg`;

      grid.innerHTML += `
        <div onclick="window.location.hash='map?focus=${issue.id}'" class="cursor-pointer bg-surface-container-lowest rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-surface-variant hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
          <div class="h-48 relative bg-surface-container shrink-0">
            <img class="w-full h-full object-cover" src="${finalImageUrl}" />
            <div class="absolute top-4 right-4 backdrop-blur-md px-3 py-1 rounded-full font-label-sm text-label-sm border ${statusColors[issue.status.toUpperCase()] || 'bg-surface/90 text-on-surface'}">
                ${issue.status.toUpperCase()}
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
  // No persistent event listeners
}


