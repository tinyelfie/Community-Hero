import api from '../api.js';
import { getAuthState } from '../app.js';

export async function renderProfile(container) {
  const auth = getAuthState();
  if (!auth || !auth.user) {
    container.innerHTML = `<div class="min-h-screen pt-24 pb-12 flex items-center justify-center text-on-surface-variant font-bold">Please log in to view your profile.</div>`;
    return;
  }

  const { user } = auth;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  container.innerHTML = `
    <div class="min-h-screen pt-24 pb-12 px-gutter">
      <div class="max-w-4xl mx-auto">
        <div class="glass-card rounded-3xl p-8 mb-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-sm border border-outline-variant">
          <div class="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10"></div>
          
          <div class="w-32 h-32 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-display-xl text-5xl shadow-lg border-4 border-surface shrink-0">
            ${initials}
          </div>
          
          <div class="text-center md:text-left flex-1">
            <h1 class="font-display-xl text-4xl text-on-surface mb-2">${user.name}</h1>
            <p class="text-on-surface-variant font-body-md mb-4">${user.email}</p>
            <div class="flex flex-wrap gap-4 justify-center md:justify-start">
              <div class="bg-surface-variant/50 px-4 py-2 rounded-xl border border-outline-variant">
                <div class="text-xs text-on-surface-variant uppercase font-bold tracking-wider mb-1">Total Reported</div>
                <div class="text-xl font-bold text-on-surface" id="stat-reported">--</div>
              </div>
              <div class="bg-surface-variant/50 px-4 py-2 rounded-xl border border-outline-variant">
                <div class="text-xs text-on-surface-variant uppercase font-bold tracking-wider mb-1">Verifications</div>
                <div class="text-xl font-bold text-on-surface" id="stat-verified">--</div>
              </div>
              <div class="bg-surface-variant/50 px-4 py-2 rounded-xl border border-outline-variant">
                <div class="text-xs text-on-surface-variant uppercase font-bold tracking-wider mb-1">Resolved</div>
                <div class="text-xl font-bold text-primary" id="stat-resolved">--</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="md:col-span-1">
            <h3 class="font-display-md text-2xl text-on-surface mb-4">Badges</h3>
            <div id="badges-container" class="space-y-3">
              <div class="h-16 bg-surface border border-outline-variant rounded-xl animate-pulse"></div>
              <div class="h-16 bg-surface border border-outline-variant rounded-xl animate-pulse"></div>
            </div>
          </div>
          
          <div class="md:col-span-2">
            <h3 class="font-display-md text-2xl text-on-surface mb-4">Recent Reports</h3>
            <div id="reports-container" class="space-y-4">
              <div class="h-32 bg-surface border border-outline-variant rounded-2xl animate-pulse"></div>
              <div class="h-32 bg-surface border border-outline-variant rounded-2xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const profile = await api.users.profile(user.id);
    
    // Update stats
    document.getElementById('stat-reported').textContent = profile.total_reported;
    document.getElementById('stat-verified').textContent = profile.verify_votes;
    document.getElementById('stat-resolved').textContent = profile.resolved_by_user;

    // Render badges
    const badgesHtml = profile.badges.map(b => `
      <div class="p-3 rounded-xl border transition-all ${b.earned ? 'bg-secondary-container/30 border-secondary border-opacity-50 shadow-sm' : 'bg-surface-container border-outline-variant opacity-60 grayscale'} flex items-center gap-3">
        <div class="text-3xl">${b.icon}</div>
        <div>
          <div class="font-bold text-sm ${b.earned ? 'text-on-surface' : 'text-on-surface-variant'}">${b.name}</div>
          <div class="text-xs text-on-surface-variant">${b.description}</div>
        </div>
      </div>
    `).join('');
    document.getElementById('badges-container').innerHTML = badgesHtml || '<div class="text-on-surface-variant text-sm">No badges available.</div>';

    // Render reports
    const reportsHtml = profile.reported_issues.slice(0, 10).map(issue => `
      <div class="bg-surface border border-outline-variant rounded-2xl p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer flex gap-4" onclick="window.location.hash='map?focus=${issue.id}'">
        <div class="w-24 h-24 rounded-xl bg-surface-variant shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant/50">
          <img src="${issue.image_url ? `http://localhost:8000${issue.image_url}` : `https://picsum.photos/seed/${issue.id}/400/300`}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 flex flex-col justify-center">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-variant text-on-surface">${(issue.category || 'other').replace('_', ' ')}</span>
            <span class="px-2 py-0.5 rounded-full border border-outline-variant capitalize text-[10px] text-on-surface-variant">${issue.status.replace('_', ' ')}</span>
          </div>
          <h4 class="font-bold text-on-surface mb-1 line-clamp-1">${issue.title}</h4>
          <p class="text-xs text-on-surface-variant line-clamp-2">${issue.description || 'No description provided.'}</p>
        </div>
      </div>
    `).join('');
    document.getElementById('reports-container').innerHTML = reportsHtml || '<div class="p-8 text-center text-on-surface-variant bg-surface border border-outline-variant rounded-2xl">You have not reported any issues yet.</div>';

  } catch (err) {
    console.error('Failed to load profile', err);
    document.getElementById('badges-container').innerHTML = `<div class="text-error text-sm">Error loading badges.</div>`;
    document.getElementById('reports-container').innerHTML = `<div class="text-error text-sm">Error loading reports.</div>`;
  }
}

export function cleanupProfile() {
  // Any cleanup needed
}
