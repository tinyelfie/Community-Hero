/**
 * Community Hero — pages/map.js
 * Full-screen interactive map with markers, heatmap, hotspots, sidebar, info drawer
 */

import api from '../api.js';
import { buildIssueCard, getCategoryClass, formatDate } from '../components/issueCard.js';
import toast from '../components/toast.js';
import { getAuthState } from '../app.js';

let mapInstance = null;
let allIssues = [];
let markers = [];
let heatmapLayer = null;
let hotspotCircles = [];
let selectedIssueId = null;
let heatmapActive = false;
let hotspotsActive = false;
let activeFilters = { category: '', status: '', sort: 'votes' };

const KOLKATA_CENTER = { lat: 22.5726, lng: 88.3639 };

const CATEGORY_COLORS = {
  pothole:     '#FFD166',
  streetlight: '#FFC107',
  water_leak:  '#74B9FF',
  waste:       '#55EFC4',
  drainage:    '#81ECEC',
  other:       '#DFE6E9',
};

const CATEGORY_ICONS = {
  pothole: '🕳️', streetlight: '💡', water_leak: '💧',
  waste: '🗑️', drainage: '🌊', other: '📌',
};

export async function renderMap(container, opts = {}) {
  container.innerHTML = `
    <div class="flex flex-col md:flex-row h-screen pt-20 w-full" id="page-map">
      <!-- Sidebar -->
      <aside class="w-full md:w-80 lg:w-96 bg-surface border-r border-outline-variant flex flex-col h-[40vh] md:h-full shrink-0 z-10 shadow-lg relative" id="map-sidebar">
        <div class="p-4 border-b border-outline-variant bg-surface-container-low shrink-0">
          <div class="font-display-xl text-2xl text-on-surface mb-4">Issues Map</div>

          <!-- Category filters -->
          <div class="flex flex-wrap gap-2 mb-3" id="category-filters">
            <button class="px-3 py-1 rounded-full text-xs font-bold border transition-colors bg-primary text-white border-primary filter-pill active" data-cat="">All</button>
            <button class="px-3 py-1 rounded-full text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors filter-pill" data-cat="pothole">🕳️ Pothole</button>
            <button class="px-3 py-1 rounded-full text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors filter-pill" data-cat="streetlight">💡 Light</button>
            <button class="px-3 py-1 rounded-full text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors filter-pill" data-cat="water_leak">💧 Water</button>
            <button class="px-3 py-1 rounded-full text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors filter-pill" data-cat="waste">🗑️ Waste</button>
            <button class="px-3 py-1 rounded-full text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors filter-pill" data-cat="drainage">🌊 Drain</button>
          </div>

          <!-- Status filters -->
          <div class="flex flex-wrap gap-2" id="status-filters">
            <button class="px-3 py-1 rounded-full text-xs font-bold border transition-colors bg-primary text-white border-primary filter-pill active" data-status="">All Status</button>
            <button class="px-3 py-1 rounded-full text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors filter-pill" data-status="open">Open</button>
            <button class="px-3 py-1 rounded-full text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors filter-pill" data-status="verified">Verified</button>
            <button class="px-3 py-1 rounded-full text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors filter-pill" data-status="in_progress">In Progress</button>
            <button class="px-3 py-1 rounded-full text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors filter-pill" data-status="resolved">Resolved</button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll" id="sidebar-issues-list">
          ${[1,2,3,4,5].map(() => `
            <div class="p-3 border border-outline-variant rounded-lg bg-surface-container-lowest animate-pulse">
              <div class="h-3 bg-surface-variant rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-surface-variant rounded w-11/12"></div>
            </div>
          `).join('')}
        </div>
      </aside>

      <!-- Map Area -->
      <div class="flex-1 relative h-[60vh] md:h-full bg-surface-dim overflow-hidden">
        <div id="google-map" class="w-full h-full z-0 relative"></div>

        <!-- Map Controls -->
        <div class="absolute bottom-6 right-6 z-[400] flex flex-col gap-2">
          <!-- Zoom Controls -->
          <div class="bg-surface border border-outline-variant rounded-xl shadow-md flex flex-col overflow-hidden mb-2">
            <div class="flex items-center justify-between px-2 py-1 border-b border-outline-variant/30">
              <button id="zoom-out-btn" class="w-8 h-8 flex items-center justify-center hover:bg-surface-variant text-on-surface transition-colors rounded-lg"><span class="material-symbols-outlined text-sm">remove</span></button>
              <select id="zoom-select" class="bg-surface text-label-sm font-bold text-on-surface outline-none cursor-pointer text-center mx-1 py-1 appearance-none">
                <option value="50" class="bg-surface text-on-surface">50%</option>
                <option value="75" class="bg-surface text-on-surface">75%</option>
                <option value="100" class="bg-surface text-on-surface">100%</option>
                <option value="fit" class="bg-surface text-on-surface">Fit India</option>
              </select>
              <button id="zoom-in-btn" class="w-8 h-8 flex items-center justify-center hover:bg-surface-variant text-on-surface transition-colors rounded-lg"><span class="material-symbols-outlined text-sm">add</span></button>
            </div>
          </div>
          <button class="bg-surface border border-outline-variant px-4 py-2 rounded-full font-label-sm text-sm text-on-surface shadow-md hover:bg-surface-variant transition-colors flex items-center justify-center gap-2" id="heatmap-toggle-btn">
            🔥 Heatmap
          </button>
          <button class="bg-surface border border-outline-variant px-4 py-2 rounded-full font-label-sm text-sm text-on-surface shadow-md hover:bg-surface-variant transition-colors flex items-center justify-center gap-2" id="hotspot-toggle-btn">
            ⚠️ Hotspots
          </button>
        </div>

        <!-- Issue count badge -->
        <div class="absolute top-4 left-4 bg-surface px-4 py-2 rounded-full font-label-sm text-sm shadow-md text-on-surface z-[400]" id="issue-count-badge">
          Loading...
        </div>

        <!-- Info Drawer -->
        <div class="absolute inset-y-0 right-0 w-full md:w-96 bg-surface shadow-2xl z-[500] transform transition-transform duration-300 translate-x-full overflow-y-auto flex flex-col" id="issue-drawer">
          <div id="drawer-content" class="pb-safe flex flex-col h-full"></div>
        </div>
      </div>
    </div>
  `;

  // Remove hidden class for map page specifically (uses flex not display:block)
  const pg = document.getElementById('page-map');
  pg.style.display = 'flex';
  pg.classList.remove('page--hidden');

  attachSidebarFilters();
  attachMapControls();

  window._selectIssue = selectIssue;

  // Init map
  if (window.L) {
    initMap();
    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 300);
    loadIssues().then(() => {
      if (opts.focusIssue) selectIssue(opts.focusIssue);
    });
  } else {
    document.getElementById('google-map').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:var(--sp-4);padding:var(--sp-8)">
        <div style="font-size:3rem">🗺️</div>
        <h3>Map Could Not Load</h3>
        <p style="text-align:center;max-width:300px">Leaflet failed to load.</p>
      </div>`;
    loadIssues();
  }
}

function initMap() {
  const indiaBounds = L.latLngBounds(
    [8.4, 68.1], // Southwest (Kerala / Gujarat)
    [37.6, 97.4] // Northeast (Kashmir / Arunachal)
  );
  mapInstance = L.map('google-map', {
    center: [KOLKATA_CENTER.lat, KOLKATA_CENTER.lng],
    zoom: 12,
    minZoom: 5,
    maxBounds: indiaBounds,
    maxBoundsViscosity: 1.0,
    zoomControl: false,
  });

  mapInstance.on('zoomend', () => {
    const zoom = mapInstance.getZoom();
    const select = document.getElementById('zoom-select');
    if (!select) return;
    if (zoom <= 7) select.value = "fit";
    else if (zoom <= 10) select.value = "50";
    else if (zoom <= 14) select.value = "75";
    else select.value = "100";
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(mapInstance);
}

async function loadIssues() {
  try {
    allIssues = await api.issues.list({ limit: 200 });
    renderSidebarList();
    if (mapInstance) renderMarkers();
    updateIssueBadge();
  } catch (e) {
    console.warn('Failed to load issues for map:', e.message);
    document.getElementById('sidebar-issues-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <div class="empty-state__title">Backend Offline</div>
        <div class="empty-state__text">Start the FastAPI server on port 8000.</div>
      </div>`;
  }
}

function getFilteredIssues() {
  return allIssues.filter(issue => {
    if (activeFilters.category && issue.category !== activeFilters.category) return false;
    if (activeFilters.status && issue.status !== activeFilters.status) return false;
    return true;
  });
}

function renderSidebarList() {
  const list = document.getElementById('sidebar-issues-list');
  const filtered = getFilteredIssues();

  if (!filtered.length) {
    list.innerHTML = `<div class="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center h-full"><div class="text-4xl mb-2">🔍</div><div class="font-bold">No issues match</div></div>`;
    return;
  }

  list.innerHTML = filtered.map(i => {
    const isActive = selectedIssueId === i.id;
    return `
    <div class="cursor-pointer p-4 rounded-xl border transition-all duration-200 ${isActive ? 'bg-primary-container border-primary shadow-sm' : 'bg-surface border-outline-variant hover:bg-surface-variant'} map-issue-item" data-id="${i.id}" onclick="window._selectIssue?.('${i.id}')">
      <div class="flex items-center justify-between gap-1 mb-2">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-variant text-on-surface">
          ${CATEGORY_ICONS[i.category] || '📌'} ${(i.category || 'other').replace('_', ' ')}
        </span>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${i.severity === 'high' ? 'bg-error-container text-on-error-container' : i.severity === 'medium' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-variant text-on-surface'}">${i.severity}</span>
      </div>
      <div class="font-bold text-on-surface text-sm mb-2 line-clamp-2">${i.title}</div>
      <div class="flex items-center justify-between text-xs text-on-surface-variant">
        <span class="px-2 py-0.5 rounded-full border border-outline-variant capitalize">${i.status.replace('_', ' ')}</span>
        <span class="flex items-center gap-1 font-medium">👍 ${i.vote_count}</span>
      </div>
    </div>
  `}).join('');
}

function renderMarkers() {
  // Clear existing markers
  markers.forEach(m => m.remove());
  markers = [];

  const filtered = getFilteredIssues();

  filtered.forEach(issue => {
    if (!issue.latitude || !issue.longitude) return;

    const color = CATEGORY_COLORS[issue.category] || '#DFE6E9';
    const size = Math.min(24, 12 + Math.floor(issue.vote_count / 5) * 2);

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2 + 8}" viewBox="0 0 ${size * 2} ${size * 2 + 8}">
        <circle cx="${size}" cy="${size}" r="${size - 2}" fill="${color}" stroke="${darkenColor(color)}" stroke-width="2"/>
        <path d="M${size} ${size * 2} L${size - 5} ${size * 2 + 8} L${size + 5} ${size * 2 + 8} Z" fill="${color}"/>
      </svg>
    `;

    const icon = L.divIcon({
      html: svgString,
      className: 'custom-leaflet-icon',
      iconSize: [size * 2, size * 2 + 8],
      iconAnchor: [size, size * 2 + 8],
    });

    const marker = L.marker([issue.latitude, issue.longitude], {
      icon: icon,
      title: issue.title,
      zIndexOffset: issue.vote_count,
    }).addTo(mapInstance);

    marker.on('click', () => selectIssue(issue.id));
    markers.push(marker);
  });

  updateIssueBadge();
}

function updateIssueBadge() {
  const badge = document.getElementById('issue-count-badge');
  if (badge) {
    const n = getFilteredIssues().length;
    badge.textContent = `📍 ${n} issue${n !== 1 ? 's' : ''}`;
  }
}

function darkenColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)})`;
}

/* ── Issue Selection ──────────────────────────────────────────── */
async function selectIssue(issueId) {
  selectedIssueId = issueId;
  renderSidebarList();

  // Pan map to issue
  const issue = allIssues.find(i => i.id === issueId);
  if (issue && mapInstance) {
    mapInstance.flyTo([issue.latitude, issue.longitude], 16, { animate: true, duration: 1.5 });
  }

  // Open drawer
  const drawer = document.getElementById('issue-drawer');
  const drawerContent = document.getElementById('drawer-content');
  drawer.classList.remove('translate-x-full');

  // Show skeleton
  drawerContent.innerHTML = `
    <div class="h-48 bg-surface-variant relative">
      <div class="absolute inset-0 animate-pulse bg-surface-container-high"></div>
    </div>
    <div class="p-6">
      <div class="h-6 bg-surface-variant rounded w-3/4 mb-4 animate-pulse"></div>
      <div class="h-4 bg-surface-variant rounded w-full mb-2 animate-pulse"></div>
      <div class="h-4 bg-surface-variant rounded w-5/6 animate-pulse"></div>
    </div>`;

  try {
    const full = await api.issues.get(issueId);
    renderDrawerContent(full);
  } catch (e) {
    drawerContent.innerHTML = `<div class="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center h-full"><div class="text-4xl mb-2">⚠️</div><div class="font-bold">Error loading issue</div></div>`;
  }
}

function renderDrawerContent(issue) {
  const { user } = getAuthState();
  const imageUrl = issue.image_url ? `https://community-hero-api.onrender.com${issue.image_url}` : null;
  const dateStr = formatDate(issue.created_at);
  const icon = CATEGORY_ICONS[issue.category] || '📌';

  const keyword = (issue.category || 'city').replace('_', ' ');
  const lockId = parseInt(issue.id.substring(0,8), 16) % 1000 || 1;
  const finalImageUrl = imageUrl || `assets/categories/${issue.category || 'other'}.jpg`;

  document.getElementById('drawer-content').innerHTML = `
    <img src="${finalImageUrl}" alt="${issue.title}" class="h-48 w-full object-cover shrink-0" onerror="this.outerHTML='<div class=\\'h-48 bg-surface-variant flex items-center justify-center text-6xl\\'>${icon}</div>'">

    <div class="p-6 flex flex-col flex-1">
      <div class="flex items-center justify-between mb-4">
        <div class="flex gap-2 flex-wrap">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-variant text-on-surface">${icon} ${(issue.category || 'other').replace('_', ' ')}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${issue.severity === 'high' ? 'bg-error-container text-on-error-container' : issue.severity === 'medium' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-variant text-on-surface'}">${issue.severity}</span>
        </div>
        <button class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-variant hover:bg-outline-variant text-on-surface-variant transition-colors" id="drawer-close-btn" aria-label="Close">✕</button>
      </div>

      <h3 class="font-display-md text-xl text-on-surface mb-4">${issue.title}</h3>

      ${issue.ai_summary
        ? `<p class="text-on-surface-variant font-body-md bg-surface-variant/50 p-4 rounded-xl border border-outline-variant mb-4">✨ ${issue.ai_summary}</p>`
        : issue.description
        ? `<p class="text-on-surface-variant font-body-md mb-4">${issue.description}</p>`
        : ''}

      <div class="flex gap-2 items-center mb-3 text-sm text-on-surface-variant">
        <span>📍 ${issue.address || 'Location pinned'}</span>
      </div>

      <div class="flex gap-2 items-center mb-6 text-sm text-on-surface-variant">
        <span>👤 ${issue.reporter?.name || 'Citizen'} · ${dateStr}</span>
        <span class="px-2 py-0.5 rounded-full border border-outline-variant capitalize text-xs">${issue.status.replace('_', ' ')}</span>
      </div>

      ${issue.status === 'resolved' && issue.assignee ? `
      <div class="flex items-center gap-2 mb-6 p-3 bg-success-container/30 border border-success/30 rounded-lg text-success font-bold text-sm">
        <span>✅ Resolved by ${issue.assignee.name} on ${formatDate(issue.updated_at)}</span>
      </div>
      ` : ''}

      <div class="flex gap-3 mb-6">
        ${user
          ? `<button class="flex-1 py-2 rounded-full border transition-all ${document.getElementById('upvote-btn')?.classList.contains('voted') ? 'bg-primary text-white border-primary' : 'bg-surface border-outline-variant text-on-surface hover:bg-surface-variant'}" id="upvote-btn" data-issue-id="${issue.id}" data-type="upvote">
              👍 Upvote <span id="vote-count">${issue.vote_count}</span>
            </button>
            <button class="flex-1 py-2 rounded-full border border-outline-variant bg-surface text-on-surface hover:bg-surface-variant transition-all" id="verify-btn" data-issue-id="${issue.id}" data-type="verify">
              ✅ Verify
            </button>`
          : `<span class="text-sm text-on-surface-variant">Login to vote or comment</span>
             <span class="text-sm text-on-surface ml-auto font-bold">👍 ${issue.vote_count} votes</span>`
        }
      </div>

      ${issue.ai_tags ? `
        <div class="mb-6 flex flex-wrap gap-1">
          ${issue.ai_tags.split(',').map(t => `<span class="px-2 py-1 rounded bg-surface-variant text-on-surface text-[10px] uppercase font-bold tracking-wider">${t.trim()}</span>`).join('')}
        </div>` : ''}

      <!-- Comments -->
      <div class="mt-auto pt-6 border-t border-outline-variant">
        <h5 class="font-bold text-sm text-on-surface mb-4">Comments</h5>
        <div id="comments-list" class="space-y-4 mb-4">
          ${issue.comments?.length
            ? issue.comments.map(c => `
                <div class="p-3 rounded-lg ${c.is_authority_update ? 'bg-primary/10 border border-primary/20' : 'bg-surface-container-lowest border border-outline-variant'}">
                  <div class="text-xs text-on-surface-variant mb-1 font-medium">
                    ${c.is_authority_update ? '🏛️ ' : ''}${c.user?.name || 'User'} · ${formatDate(c.created_at)}
                  </div>
                  <div class="text-sm text-on-surface">${c.body}</div>
                </div>`).join('')
            : '<div class="text-xs text-on-surface-variant p-3 text-center">No comments yet.</div>'
          }
        </div>
        ${user ? `
          <div class="flex gap-2">
            <input class="flex-1 px-3 py-2 rounded-lg bg-surface border border-outline-variant focus:border-primary outline-none text-sm" id="comment-input" placeholder="Add a comment..." maxlength="500">
            <button class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 transition-colors" id="comment-submit-btn">Post</button>
          </div>` : ''}
      </div>
    </div>
  `;

  // Event: close drawer
  document.getElementById('drawer-close-btn').addEventListener('click', () => {
    document.getElementById('issue-drawer').classList.add('translate-x-full');
    selectedIssueId = null;
    renderSidebarList();
  });

  // Events: vote buttons
  document.getElementById('upvote-btn')?.addEventListener('click', () => castVote(issue.id, 'upvote'));
  document.getElementById('verify-btn')?.addEventListener('click', () => castVote(issue.id, 'verify'));

  // Event: comment submit
  document.getElementById('comment-submit-btn')?.addEventListener('click', () => postComment(issue.id));
  document.getElementById('comment-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') postComment(issue.id);
  });
}

async function castVote(issueId, type) {
  try {
    const result = await api.votes.cast(issueId, type);
    const countEl = document.getElementById('vote-count');
    if (countEl) countEl.textContent = result.vote_count;
    // Update in allIssues
    const issue = allIssues.find(i => i.id === issueId);
    if (issue) issue.vote_count = result.vote_count;
    document.getElementById('upvote-btn')?.classList.add('voted');
    toast.success(`+5 points earned! ${type === 'verify' ? 'Issue verified!' : 'Upvoted!'}`, '🎉');
  } catch (e) {
    toast.error(e.message || 'Could not cast vote');
  }
}

async function postComment(issueId) {
  const input = document.getElementById('comment-input');
  const body = input?.value?.trim();
  if (!body) return;

  try {
    const comment = await api.comments.post(issueId, body);
    const list = document.getElementById('comments-list');
    const el = document.createElement('div');
    el.className = 'p-3 rounded-lg bg-surface-container-lowest border border-outline-variant';
    el.innerHTML = `
      <div class="text-xs text-on-surface-variant mb-1 font-medium">${comment.user?.name || 'You'} · Just now</div>
      <div class="text-sm text-on-surface">${comment.body}</div>`;
    if (list.querySelector('.text-center')) list.innerHTML = '';
    list.prepend(el);
    input.value = '';
  } catch (e) {
    toast.error(e.message || 'Failed to post comment');
  }
}

/* ── Sidebar Filters ──────────────────────────────────────────── */
function attachSidebarFilters() {
  document.getElementById('category-filters').addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    document.querySelectorAll('#category-filters .filter-pill').forEach(p => {
      p.classList.remove('active', 'bg-primary', 'text-white', 'border-primary');
      p.classList.add('border-outline-variant', 'text-on-surface-variant', 'hover:bg-surface-variant');
    });
    pill.classList.add('active', 'bg-primary', 'text-white', 'border-primary');
    pill.classList.remove('border-outline-variant', 'text-on-surface-variant', 'hover:bg-surface-variant');
    activeFilters.category = pill.dataset.cat;
    renderSidebarList();
    if (mapInstance) renderMarkers();
  });

  document.getElementById('status-filters').addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    document.querySelectorAll('#status-filters .filter-pill').forEach(p => {
      p.classList.remove('active', 'bg-primary', 'text-white', 'border-primary');
      p.classList.add('border-outline-variant', 'text-on-surface-variant', 'hover:bg-surface-variant');
    });
    pill.classList.add('active', 'bg-primary', 'text-white', 'border-primary');
    pill.classList.remove('border-outline-variant', 'text-on-surface-variant', 'hover:bg-surface-variant');
    activeFilters.status = pill.dataset.status;
    renderSidebarList();
    if (mapInstance) renderMarkers();
  });
}

/* ── Map Controls ─────────────────────────────────────────────── */
function attachMapControls() {
  document.getElementById('heatmap-toggle-btn').addEventListener('click', toggleHeatmap);
  document.getElementById('hotspot-toggle-btn').addEventListener('click', toggleHotspots);
  
  const zoomIn = document.getElementById('zoom-in-btn');
  const zoomOut = document.getElementById('zoom-out-btn');
  const zoomSelect = document.getElementById('zoom-select');
  
  if (zoomIn) {
    zoomIn.addEventListener('click', () => {
      if (mapInstance) mapInstance.zoomIn();
    });
  }
  
  if (zoomOut) {
    zoomOut.addEventListener('click', () => {
      if (mapInstance) mapInstance.zoomOut();
    });
  }
  
  if (zoomSelect) {
    zoomSelect.addEventListener('change', (e) => {
      if (!mapInstance) return;
      const val = e.target.value;
      if (val === 'fit') {
        const indiaBounds = L.latLngBounds([8.4, 68.1], [37.6, 97.4]);
        mapInstance.fitBounds(indiaBounds);
      } else if (val === '50') {
        mapInstance.setZoom(8);
      } else if (val === '75') {
        mapInstance.setZoom(12);
      } else if (val === '100') {
        mapInstance.setZoom(16);
      }
    });
  }
}

async function toggleHeatmap() {
  const btn = document.getElementById('heatmap-toggle-btn');
  if (!mapInstance) { toast.info('Map not initialized'); return; }

  if (heatmapActive) {
    if (heatmapLayer) mapInstance.removeLayer(heatmapLayer);
    heatmapLayer = null;
    heatmapActive = false;
    btn.classList.remove('bg-primary-container', 'border-primary', 'shadow-inner');
    btn.classList.add('bg-surface', 'border-outline-variant');
    return;
  }

  try {
    const data = await api.insights.heatmap();
    if (!window.L || !L.heatLayer) {
      toast.error('Heatmap plugin not loaded');
      return;
    }
    const heatData = data.map(p => [p.lat, p.lng, p.weight]);
    heatmapLayer = L.heatLayer(heatData, {
      radius: 30,
      blur: 20,
      maxZoom: 16
    }).addTo(mapInstance);
    heatmapActive = true;
    btn.classList.add('bg-primary-container', 'border-primary', 'shadow-inner');
    btn.classList.remove('bg-surface', 'border-outline-variant');
  } catch (e) {
    toast.error('Could not load heatmap data');
  }
}

async function toggleHotspots() {
  const btn = document.getElementById('hotspot-toggle-btn');
  if (!mapInstance) { toast.info('Map not initialized'); return; }

  if (hotspotsActive) {
    hotspotCircles.forEach(c => c.remove());
    hotspotCircles = [];
    hotspotsActive = false;
    btn.classList.remove('bg-primary-container', 'border-primary', 'shadow-inner');
    btn.classList.add('bg-surface', 'border-outline-variant');
    return;
  }

  try {
    const predictions = await api.insights.predictions();
    hotspotCircles = predictions.map(p => {
      return L.circleMarker([p.lat, p.lng], {
        color: '#ba1a1a',
        fillColor: '#ba1a1a',
        fillOpacity: 0.2,
        radius: 20, // 20 pixels radius
        weight: 2
      }).addTo(mapInstance).bindPopup(`Predicted hotspot: ${p.predicted_count} issues`);
    });
    hotspotsActive = true;
    btn.classList.add('bg-primary-container', 'border-primary', 'shadow-inner');
    btn.classList.remove('bg-surface', 'border-outline-variant');
  } catch (e) {
    toast.error('Could not load hotspot predictions');
  }
}

export function cleanupMap() {
  markers.forEach(m => m.remove());
  markers = [];
  if (heatmapLayer && mapInstance) mapInstance.removeLayer(heatmapLayer);
  heatmapLayer = null;
  hotspotCircles.forEach(c => c.remove());
  hotspotCircles = [];
  heatmapActive = false;
  hotspotsActive = false;
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
}
