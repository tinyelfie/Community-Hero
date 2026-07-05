/**
 * Nagrik — pages/map.js
 * Full-screen interactive map with markers, heatmap, hotspots, sidebar, info drawer
 */

import api, { API_BASE } from '../api.js';
import { buildIssueCard, getCategoryClass, formatDate } from '../components/issueCard.js';
import toast from '../components/toast.js';
import { getAuthState, showFloatingPoints } from '../app.js';

let mapInstance = null;
let allIssues = [];
let markers = [];
let markerClusterGroup = null;
let heatmapLayer = null;
let hotspotCircles = [];
let selectedIssueId = null;
let heatmapActive = false;
let hotspotsActive = false;
let activeFilters = { category: 'NONE', status: '', sort: 'votes' };
let timelineMin = 0;
let timelineMax = 0;
let timelineInterval = null;

const WARDS = [
  { name: "Salt Lake", bounds: [[22.56, 88.40], [22.60, 88.44]] },
  { name: "Ballygunge", bounds: [[22.51, 88.35], [22.54, 88.38]] },
  { name: "Behala", bounds: [[22.48, 88.29], [22.51, 88.32]] },
  { name: "Tollygunge", bounds: [[22.49, 88.33], [22.51, 88.35]] },
  { name: "Shyambazar", bounds: [[22.59, 88.36], [22.61, 88.38]] },
  { name: "Park Street", bounds: [[22.54, 88.34], [22.56, 88.36]] }
];

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

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
            <button class="px-3 py-1 rounded-full text-xs font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors filter-pill" data-cat="">All</button>
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
    [6.0, 68.1], // Southwest (Kerala / Gujarat)
    [37.6, 97.4] // Northeast (Kashmir / Arunachal)
  );
  mapInstance = L.map('google-map', {
    center: [INDIA_CENTER.lat, INDIA_CENTER.lng],
    zoom: 4,
    minZoom: 4,
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

  mapInstance.on('contextmenu', (event) => {
    document.getElementById('rightclick-popup')?.remove();
    
    const popup = document.createElement('div');
    popup.id = 'rightclick-popup';
    popup.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #E8E4D9;
      border-radius: 10px;
      padding: 12px 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      font-size: 14px;
      color: #425B46;
      z-index: 9999;
      min-width: 200px;
      left: ${event.originalEvent.clientX + 10}px;
      top: ${event.originalEvent.clientY - 20}px;
    `;
    popup.innerHTML = `
      <div style="font-weight:600; margin-bottom:8px;">📍 Report an issue here?</div>
      <div style="font-size:12px; color:#888; margin-bottom:12px;">
        ${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}
      </div>
      <button id="report-here-btn" style="
        background: #FFCAD4; color: #425B46; border: none;
        border-radius: 8px; padding: 8px 16px; font-weight: 600;
        font-size: 13px; cursor: pointer; width: 100%;
      ">Report Issue Here</button>
    `;
    document.body.appendChild(popup);
    
    document.getElementById('report-here-btn').addEventListener('click', () => {
      sessionStorage.setItem('prefill_lat', event.latlng.lat);
      sessionStorage.setItem('prefill_lng', event.latlng.lng);
      window.location.hash = '#/report';
      popup.remove();
    });
  });

  mapInstance.on('click', () => {
    document.getElementById('rightclick-popup')?.remove();
  });
}

async function loadIssues() {
  try {
    const rawIssues = await api.issues.list({ limit: 1000 });
    
    // Geofencing disabled - user requested to see all 500 incidents nationwide
    allIssues = rawIssues;

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

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function showGeofenceBanner() {
  const sidebar = document.getElementById('map-sidebar');
  if (!sidebar) return;
  const existing = document.getElementById('geofence-banner');
  if (existing) return;
  
  const banner = document.createElement('div');
  banner.id = 'geofence-banner';
  banner.className = 'bg-primary-container text-on-primary-container p-3 text-sm flex items-center justify-between shadow-sm z-50';
  banner.innerHTML = `
    <div class="flex items-center gap-2">📍 Showing issues near your usual location</div>
    <button id="clear-geofence-btn" class="font-bold underline hover:text-primary transition-colors text-xs">Change</button>
  `;
  sidebar.insertBefore(banner, sidebar.firstChild);
  
  document.getElementById('clear-geofence-btn').addEventListener('click', () => {
    localStorage.removeItem('civichero_last_location');
    banner.remove();
    loadIssues();
  });
}

function updateGeolocationCache() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      localStorage.setItem('civichero_last_location', JSON.stringify({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: Date.now()
      }));
    }, () => {});
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
        <span onclick="window._upvoteIssue(event, '${i.id}')" class="flex items-center gap-1 font-medium hover:bg-surface-variant hover:text-primary px-2 py-1 -mx-2 -my-1 rounded-full transition-colors cursor-pointer" title="Upvote">👍 <span id="vote-count-${i.id}">${i.vote_count}</span></span>
      </div>
    </div>
  `}).join('');
}

window._upvoteIssue = async (e, issueId) => {
  e.stopPropagation();
  const auth = getAuthState();
  if (!auth.token) {
    toast.error('Please log in to upvote issues');
    return;
  }
  
  try {
    await api.votes.cast(issueId, 'upvote');
    toast.success('Upvoted!', 'Success');
    
    // Update local state
    const issue = allIssues.find(i => i.id === issueId);
    if (issue) {
      issue.vote_count += 1;
      const counter = document.getElementById(`vote-count-${issueId}`);
      if (counter) counter.textContent = issue.vote_count;
      
      // Update markers to reflect new sizes based on votes
      renderMarkers();
    }
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('already')) {
      toast.info('You have already upvoted this issue', 'Info');
    } else {
      toast.error(err.message || 'Failed to upvote', 'Error');
    }
  }
};

function renderMarkers() {
  if (markerClusterGroup) {
    mapInstance.removeLayer(markerClusterGroup);
  }
  markers = [];

  markerClusterGroup = L.layerGroup();

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
    });

    marker.on('click', () => selectIssue(issue.id));
    // Save to array for filter matching later
    marker.issueId = issue.id;
    marker.issueCategory = issue.category;
    marker.createdAt = new Date(issue.created_at).getTime();
    markers.push(marker);
    
    markerClusterGroup.addLayer(marker);
  });

  mapInstance.addLayer(markerClusterGroup);
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

    // Fetch and render community assessment
    try {
      const assessment = await api.issues.communityAssessment(issueId);
      const container = document.getElementById(`community-assessment-container-${issueId}`);
      if (container) {
        if (assessment.total_assessments === 0) {
          container.innerHTML = `<div class="text-xs text-on-surface-variant p-2 italic text-center bg-surface rounded-lg">No community assessments yet. Be the first to verify!</div>`;
        } else {
          container.innerHTML = `
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-on-surface-variant">Total Verifications:</span>
                <span class="font-bold text-on-surface px-2 py-0.5 bg-primary/10 text-primary rounded">${assessment.total_assessments}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-on-surface-variant">Photo Matches Reality:</span>
                <span class="font-bold text-on-surface">${assessment.photo_visible_percent.toFixed(0)}%</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-on-surface-variant">Location Accurate:</span>
                <span class="font-bold text-on-surface">${assessment.location_accurate_percent.toFixed(0)}%</span>
              </div>
              ${assessment.most_common_severity ? `
              <div class="flex items-center justify-between text-xs">
                <span class="text-on-surface-variant">Community Consensus Severity:</span>
                <span class="font-bold text-on-surface px-2 py-0.5 bg-surface-variant rounded uppercase tracking-wider">${assessment.most_common_severity}</span>
              </div>` : ''}
            </div>
          `;
        }
      }
    } catch (e) {
      const container = document.getElementById(`community-assessment-container-${issueId}`);
      if (container) {
        container.innerHTML = `<div class="text-xs text-error p-2 italic text-center">Failed to load assessments.</div>`;
      }
    }
  } catch (e) {
    drawerContent.innerHTML = `<div class="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center h-full"><div class="text-4xl mb-2">⚠️</div><div class="font-bold">Error loading issue</div></div>`;
  }
}

function renderDrawerContent(issue) {
  const { user } = getAuthState();
  const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');
  const HOST = API_BASE.replace('/api', '');
  const imageUrl = issue.image_url ? `${HOST}${issue.image_url}` : null;
  const dateStr = formatDate(issue.created_at);
  const icon = CATEGORY_ICONS[issue.category] || '📌';

  const keyword = (issue.category || 'city').replace('_', ' ');
  const lockId = parseInt(issue.id.substring(0,8), 16) % 1000 || 1;
  const resImageUrl = issue.resolution_image_url ? `${HOST}${issue.resolution_image_url}` : null;
  const finalImageUrl = imageUrl || `assets/categories/${issue.category || 'other'}.jpg`;

  let heroImageHTML = '';
  if (issue.status === 'resolved' && resImageUrl && imageUrl) {
    heroImageHTML = `
      <div class="h-48 w-full relative shrink-0 select-none overflow-hidden" id="before-after-slider">
        <img src="${resImageUrl}" class="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="After" onerror="this.src='${finalImageUrl}'">
        <div class="absolute inset-y-0 left-0 w-1/2 overflow-hidden border-r-2 border-white pointer-events-none z-10" id="slider-before-container">
          <img src="${imageUrl}" class="absolute inset-0 h-full object-cover pointer-events-none max-w-none" id="slider-before-img" alt="Before">
        </div>
        <div class="absolute inset-y-0 left-1/2 flex items-center justify-center -ml-4 w-8 cursor-ew-resize z-20" id="slider-handle">
          <div class="w-8 h-8 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.3)] flex items-center justify-center pointer-events-none">
            <span class="material-symbols-outlined text-primary text-sm font-bold">swap_horiz</span>
          </div>
        </div>
        <div class="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[10px] font-bold rounded pointer-events-none z-30">BEFORE</div>
        <div class="absolute bottom-2 right-2 px-2 py-0.5 bg-black/50 text-white text-[10px] font-bold rounded pointer-events-none z-30">AFTER</div>
      </div>
    `;
  } else {
    heroImageHTML = `<img src="${finalImageUrl}" alt="${issue.title}" class="h-48 w-full object-cover shrink-0" onerror="this.outerHTML='<div class=\\'h-48 bg-surface-variant flex items-center justify-center text-6xl\\'>${icon}</div>'">`;
  }

    const SLA_DAYS = { water_leak: 2, streetlight: 3, pothole: 7, waste: 5, drainage: 4, other: 7 };
    let slaHtml = '';
    if (issue.status === 'in_progress' && issue.status_changed_at) {
      const sla = SLA_DAYS[issue.category] || SLA_DAYS.other;
      const statusDate = new Date(issue.status_changed_at);
      const deadline = new Date(statusDate.getTime() + sla * 86400000);
      const now = new Date();
      const daysRemaining = Math.ceil((deadline - now) / 86400000);
      if (daysRemaining > 0) {
        const formattedDeadline = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        slaHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#B7E4C7]/30 text-[#425B46] border border-[#B7E4C7]">⏱️ ${daysRemaining} days remaining · Due ${formattedDeadline}</span>`;
      } else {
        slaHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 border border-red-300">🚨 Overdue</span>`;
      }
    }
    let costHtml = '';
    if (isAdmin && issue.estimated_cost_min != null && issue.estimated_cost_max != null) {
      const minCost = issue.estimated_cost_min.toLocaleString('en-IN');
      const maxCost = issue.estimated_cost_max.toLocaleString('en-IN');
      costHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-green-100 text-green-800 border border-green-300 shadow-sm mt-1">💰 ₹${minCost} – ₹${maxCost} estimated.</span>`;
    }

    let urgencyChip = '';
    if (issue.urgency_level === 'critical') {
      urgencyChip = `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">🔥 Urgent</span>`;
    } else if (issue.urgency_level === 'high') {
      urgencyChip = `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">⚠️ High Concern</span>`;
    }

    document.getElementById('drawer-content').innerHTML = `
    ${heroImageHTML}

    <div class="p-6 flex flex-col flex-1">
        <div class="flex items-center justify-between mb-4">
        <div class="flex gap-2 flex-wrap">
          ${issue.is_escalated ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-error text-on-error border border-error-container shadow-sm">🚨 ESCALATED</span>` : ''}
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-variant text-on-surface">${icon} ${(issue.category || 'other').replace('_', ' ')}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${issue.severity === 'high' ? 'bg-error-container text-on-error-container' : issue.severity === 'medium' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-variant text-on-surface'}">${issue.severity}</span>
          ${urgencyChip}
          ${slaHtml}
          ${costHtml}
        </div>
        <div class="flex items-center gap-2">
          <button class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-variant hover:bg-outline-variant text-on-surface-variant transition-colors" id="drawer-print-btn" aria-label="Print" onclick="window._printIssue('${issue.id}')" title="Print Report">
            <span class="material-symbols-outlined text-[16px]">print</span>
          </button>
          <button class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-variant hover:bg-outline-variant text-on-surface-variant transition-colors" id="drawer-share-btn" aria-label="Share">
            <span class="material-symbols-outlined text-[16px]">share</span>
          </button>
          <button class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-variant hover:bg-outline-variant text-on-surface-variant transition-colors" id="drawer-close-btn" aria-label="Close">✕</button>
        </div>
      </div>

      <h3 class="font-display-md text-xl text-on-surface mb-4">${issue.title}</h3>
      
      ${renderStepper(issue.status)}

      ${(issue.rf_prediction && issue.gemini_prediction) ? `
      <div class="mb-4 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest font-mono text-xs text-on-surface-variant">
        <div class="flex justify-between mb-1">
          <span>Gemini Vision</span>
          <span class="font-bold">${issue.gemini_prediction.toUpperCase()}</span>
        </div>
        <div class="flex justify-between mb-1">
          <span>ML Model (RF)</span>
          <span class="font-bold">${issue.rf_prediction.toUpperCase()} <span class="font-normal opacity-70">(${(issue.rf_confidence * 100).toFixed(0)}%)</span></span>
        </div>
        <div class="h-px bg-outline-variant my-2"></div>
        <div class="flex justify-between font-bold text-primary">
          <span>Consensus</span>
          <span>${issue.severity.toUpperCase()}</span>
        </div>
        ${issue.prediction_method === 'disagreement_flagged' ? '<div class="text-error mt-2 text-[10px]">⚠️ Models disagreed significantly — human review recommended.</div>' : ''}
      </div>
      ` : ''}

      ${issue.ai_summary
        ? `<p class="text-on-surface-variant font-body-md bg-surface-variant/50 p-4 rounded-xl border border-outline-variant mb-4">✨ ${issue.ai_summary}</p>`
        : issue.description
        ? `<p class="text-on-surface-variant font-body-md mb-4">${issue.description}</p>`
        : ''}

      <div class="flex gap-2 items-center mb-3 text-sm text-on-surface-variant">
        <span>📍 ${issue.address || 'Location pinned'}</span>
      </div>

      <div class="flex gap-2 items-center mb-6 text-sm text-on-surface-variant">
        <span>👤 ${issue.reporter?.name || 'Citizen'} ${issue.reporter?.is_verified_reporter ? '<span title="Verified Reporter — 3+ issues successfully resolved." class="text-blue-500 font-bold cursor-help ml-1">✓</span>' : ''} · ${dateStr}</span>
        <span class="px-2 py-0.5 rounded-full border border-outline-variant capitalize text-xs">${issue.status.replace('_', ' ')}</span>
      </div>

      ${issue.status === 'resolved' && issue.assignee ? `
      <div class="flex items-center gap-2 mb-6 p-3 bg-success-container/30 border border-success/30 rounded-lg text-success font-bold text-sm">
        <span>✅ Resolved by ${issue.assignee.name} on ${formatDate(issue.updated_at)}</span>
      </div>
      ` : ''}

      ${isAdmin && issue.status !== 'resolved' ? `
        <div class="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div class="flex items-center justify-between cursor-pointer" id="admin-resolve-toggle">
            <h5 class="font-bold text-sm text-primary flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">admin_panel_settings</span>
              Admin Actions: Update Status
            </h5>
            <span class="material-symbols-outlined text-sm" id="admin-resolve-icon">expand_more</span>
          </div>
          <div id="admin-resolve-content" class="hidden mt-4 pt-4 border-t border-primary/10">
            <div id="ai-suggestion-container" class="mb-4">
               <div class="text-sm text-primary flex items-center gap-2 mb-2">
                 <span class="animate-pulse">✨ Generating AI Suggestion...</span>
               </div>
            </div>
            <div class="flex flex-col gap-2 mb-2">
              <select id="admin-status-select" class="w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant text-sm outline-none">
                <option value="verified" ${issue.status === 'verified' ? 'selected' : ''}>Verified</option>
                <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>Resolved</option>
              </select>
              <div id="resolution-photo-container" class="hidden flex-col gap-1 mt-2">
                <label class="text-xs font-bold text-on-surface-variant">Resolution Photo (Optional)</label>
                <input type="file" id="resolution-image-input" accept="image/*" class="text-sm">
              </div>
            </div>
            <button class="w-full bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 transition-colors" id="admin-status-submit">Update</button>
          </div>
        </div>
      ` : ''}

      <!-- Community Assessment Section -->
      <div class="mb-6 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
        <h5 class="font-bold text-sm text-on-surface mb-3 flex items-center justify-between">
          <span>Community Assessment</span>
          ${user ? `<button class="text-xs bg-primary text-white px-3 py-1 rounded-full font-bold hover:bg-primary/90 transition-colors" onclick="window._openVerifyModal('${issue.id}')">Verify</button>` : ''}
        </h5>
        <div id="community-assessment-container-${issue.id}" class="space-y-3">
          <div class="animate-pulse flex flex-col gap-2">
            <div class="h-2 bg-surface-variant rounded w-full"></div>
            <div class="h-2 bg-surface-variant rounded w-full"></div>
            <div class="h-2 bg-surface-variant rounded w-full"></div>
          </div>
        </div>
      </div>

      ${issue.ai_tags ? `
        <div class="mb-6 flex flex-wrap gap-1">
          ${issue.ai_tags.split(',').map(t => `<span class="px-2 py-1 rounded bg-surface-variant text-on-surface text-[10px] uppercase font-bold tracking-wider">${t.trim()}</span>`).join('')}
        </div>` : ''}

      <!-- Activity Timeline -->
      <div class="mt-4 pt-4 border-t border-outline-variant">
        <h5 class="font-bold text-sm text-on-surface mb-4">Activity Timeline</h5>
        <div class="relative pl-4 border-l-2 border-primary-container space-y-4">
          <div class="relative">
            <div class="absolute -left-[21px] w-3 h-3 rounded-full bg-primary mt-1 border-2 border-surface"></div>
            <div class="text-xs text-on-surface-variant font-medium">${formatDate(issue.created_at)}</div>
            <div class="text-sm text-on-surface">Issue Reported</div>
          </div>
          ${(issue.status === 'verified' || issue.status === 'in_progress' || issue.status === 'resolved') ? `
          <div class="relative">
            <div class="absolute -left-[21px] w-3 h-3 rounded-full bg-secondary mt-1 border-2 border-surface"></div>
            <div class="text-xs text-on-surface-variant font-medium">${formatDate(new Date(new Date(issue.created_at).getTime() + 60*60*1000))}</div>
            <div class="text-sm text-on-surface">Community Verified</div>
          </div>` : ''}
          ${(issue.status === 'in_progress' || issue.status === 'resolved') ? `
          <div class="relative">
            <div class="absolute -left-[21px] w-3 h-3 rounded-full bg-tertiary mt-1 border-2 border-surface"></div>
            <div class="text-xs text-on-surface-variant font-medium">${formatDate(new Date(new Date(issue.created_at).getTime() + 2*60*60*1000))}</div>
            <div class="text-sm text-on-surface">Marked as In Progress</div>
          </div>` : ''}
          ${(issue.status === 'resolved') ? `
          <div class="relative">
            <div class="absolute -left-[21px] w-3 h-3 rounded-full bg-[#B7E4C7] mt-1 border-2 border-surface"></div>
            <div class="text-xs text-on-surface-variant font-medium">${formatDate(issue.updated_at)}</div>
            <div class="text-sm text-on-surface font-bold">Issue Resolved 🎉</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Comments -->
      <div class="mt-auto pt-6 border-t border-outline-variant">
        <h5 class="font-bold text-sm text-on-surface mb-4">Comments</h5>
        <div id="comments-list" class="space-y-4 mb-4">
          ${issue.comments?.length
            ? issue.comments.map(c => {
                let sentIcon = '';
                if (c.sentiment_score !== undefined && c.sentiment_score !== null) {
                  if (c.sentiment_score <= -0.5) sentIcon = '<span title="Very Negative" class="ml-1">😡</span>';
                  else if (c.sentiment_score <= -0.1) sentIcon = '<span title="Negative" class="ml-1">😞</span>';
                  else if (c.sentiment_score >= 0.5) sentIcon = '<span title="Very Positive" class="ml-1">🤩</span>';
                  else if (c.sentiment_score >= 0.1) sentIcon = '<span title="Positive" class="ml-1">🙂</span>';
                }
                return `
                <div class="p-3 rounded-lg ${c.is_authority_update ? 'bg-primary/10 border border-primary/20' : 'bg-surface-container-lowest border border-outline-variant'}">
                  <div class="text-xs text-on-surface-variant mb-1 font-medium">
                    ${c.is_authority_update ? '🏛️ ' : ''}${c.user?.name || 'User'} ${c.user?.is_verified_reporter ? '<span title="Verified Reporter — 3+ issues successfully resolved." class="text-blue-500 font-bold cursor-help ml-1">✓</span>' : ''} · ${formatDate(c.created_at)} ${sentIcon}
                  </div>
                  <div class="text-sm text-on-surface">${c.body}</div>
                </div>`
              }).join('')
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

  // Event: share drawer
  document.getElementById('drawer-share-btn').addEventListener('click', () => {
    const link = window.location.origin + window.location.pathname + '#map?focusIssue=' + issue.id;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  });

  // Events: vote buttons
  document.getElementById('upvote-btn')?.addEventListener('click', (e) => castVote(issue.id, 'upvote', e));
  document.getElementById('verify-btn')?.addEventListener('click', (e) => castVote(issue.id, 'verify', e));

  // Event: comment submit
  document.getElementById('comment-submit-btn')?.addEventListener('click', () => postComment(issue.id));
  document.getElementById('comment-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') postComment(issue.id);
  });

  // Event: admin toggle
  const toggleBtn = document.getElementById('admin-resolve-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      const content = document.getElementById('admin-resolve-content');
      const icon = document.getElementById('admin-resolve-icon');
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.textContent = 'expand_less';
        
        // Fetch AI suggestion
        try {
          const res = await fetch(`${API_BASE}/issues/${issue.id}/resolution-suggestion`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await res.json();
          const container = document.getElementById('ai-suggestion-container');
          container.innerHTML = `
            <div class="bg-white border border-primary/30 p-3 rounded-lg shadow-sm">
              <div class="font-bold text-xs text-primary mb-1 flex items-center gap-1">🤖 AI Suggested Resolution</div>
              <div class="text-sm text-on-surface-variant whitespace-pre-wrap">${data.suggestion}</div>
            </div>
          `;
        } catch (e) {
          document.getElementById('ai-suggestion-container').innerHTML = '';
        }
      } else {
        content.classList.add('hidden');
        icon.textContent = 'expand_more';
      }
    });
  }

  // Event: toggle resolution photo upload
  const statusSelect = document.getElementById('admin-status-select');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      const container = document.getElementById('resolution-photo-container');
      if (e.target.value === 'resolved') {
        container.classList.remove('hidden');
        container.classList.add('flex');
      } else {
        container.classList.add('hidden');
        container.classList.remove('flex');
      }
    });
    // Trigger change event to set initial state
    statusSelect.dispatchEvent(new Event('change'));
  }

  // Event: admin submit status
  const submitStatusBtn = document.getElementById('admin-status-submit');
  if (submitStatusBtn) {
    submitStatusBtn.addEventListener('click', async () => {
      const status = document.getElementById('admin-status-select').value;
      const fileInput = document.getElementById('resolution-image-input');
      
      const formData = new FormData();
      formData.append('status', status);
      if (status === 'resolved' && fileInput && fileInput.files[0]) {
        formData.append('resolution_image', fileInput.files[0]);
      }

      try {
        const res = await fetch(`${API_BASE}/issues/${issue.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
        if (!res.ok) throw new Error();
        toast.success('Status updated successfully');
        loadIssueDetails(issue.id);
        if (typeof renderMarkers === 'function') renderMarkers();
      } catch (e) {
        toast.error('Failed to update status');
      }
    });
  }

  // Event: slider logic
  setTimeout(() => {
    const slider = document.getElementById('before-after-slider');
    if (slider) {
      const beforeImg = document.getElementById('slider-before-img');
      const beforeContainer = document.getElementById('slider-before-container');
      const handle = document.getElementById('slider-handle');
      
      const updateWidths = () => {
        beforeImg.style.width = `${slider.offsetWidth}px`;
      };
      
      updateWidths();
      window.addEventListener('resize', updateWidths);

      let isDragging = false;
      
      const onMove = (e) => {
        if (!isDragging) return;
        const rect = slider.getBoundingClientRect();
        let clientX = e.clientX;
        if (e.touches && e.touches.length > 0) clientX = e.touches[0].clientX;
        let x = clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        const pct = (x / rect.width) * 100;
        beforeContainer.style.width = `${pct}%`;
        handle.style.left = `${pct}%`;
      };

      const startDrag = () => { isDragging = true; };
      const stopDrag = () => { isDragging = false; };

      slider.addEventListener('mousedown', startDrag);
      slider.addEventListener('touchstart', startDrag, {passive: true});
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, {passive: true});
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('touchend', stopDrag);
      
      document.getElementById('drawer-close-btn').addEventListener('click', () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', stopDrag);
        window.removeEventListener('touchend', stopDrag);
        window.removeEventListener('resize', updateWidths);
      }, {once: true});
    }
  }, 50);
}

async function castVote(issueId, type, e) {
  try {
    const result = await api.votes.cast(issueId, type);
    const countEl = document.getElementById('vote-count');
    if (countEl) countEl.textContent = result.vote_count;
    // Update in allIssues
    const issue = allIssues.find(i => i.id === issueId);
    if (issue) issue.vote_count = result.vote_count;
    document.getElementById('upvote-btn')?.classList.add('voted');
    toast.success(`+5 points earned! ${type === 'verify' ? 'Issue verified!' : 'Upvoted!'}`, '🎉');
    if (e) showFloatingPoints(e, 5);
  } catch (err) {
    toast.error(err.message || 'Could not cast vote');
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

window._printIssue = async (issueId) => {
  try {
    const issue = await api.issues.get(issueId);
    
    // Open a new tab
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print the report.");
      return;
    }
    
    const dateStr = formatDate(issue.created_at);
    const HOST = API_BASE.replace('/api', '');
    const imageUrl = issue.image_url ? `${HOST}${issue.image_url}` : '';
    const resolutionUrl = issue.resolution_image_url ? `${HOST}${issue.resolution_image_url}` : '';
    const nowStr = new Date().toLocaleString('en-IN');
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nagrik Report - ${issue.id}</title>
        <style>
          body { font-family: 'Corbel', serif; color: #333; line-height: 1.6; margin: 0; padding: 40px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 24px; color: #7c535c; }
          .header .subtitle { font-size: 14px; color: #666; font-weight: bold; }
          .photo-container { width: 100%; height: 300px; background: #f0f0f0; margin-bottom: 30px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
          .photo-container img { width: 100%; height: 100%; object-fit: cover; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .field { margin-bottom: 15px; }
          .field-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: bold; margin-bottom: 4px; }
          .field-value { font-size: 16px; color: #111; font-weight: 500; }
          .summary-box { background: #fbf9f3; border: 1px solid #e4e2dd; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 12px; color: #888; display: flex; justify-content: space-between; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; background: #eee; color: #333; }
          
          @media print {
            body { padding: 0; }
            button { display: none !important; }
            .summary-box { border-color: #ccc; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Nagrik</h1>
            <div style="font-size: 12px; color: #888;">Empower Your Neighborhood</div>
          </div>
          <div class="subtitle">Official Issue Report</div>
        </div>
        
        ${imageUrl ? `<div class="photo-container"><img src="${imageUrl}" /></div>` : '<div class="photo-container" style="color:#aaa;">No Photo Provided</div>'}
        
        <div class="grid">
          <div>
            <div class="field">
              <div class="field-label">Report ID</div>
              <div class="field-value">${issue.id}</div>
            </div>
            <div class="field">
              <div class="field-label">Date Reported</div>
              <div class="field-value">${dateStr}</div>
            </div>
            <div class="field">
              <div class="field-label">Category</div>
              <div class="field-value" style="text-transform: capitalize;">${issue.category.replace('_', ' ')}</div>
            </div>
            <div class="field">
              <div class="field-label">Severity</div>
              <div class="field-value" style="text-transform: capitalize;">${issue.severity}</div>
            </div>
          </div>
          <div>
            <div class="field">
              <div class="field-label">Location Address</div>
              <div class="field-value">${issue.address || 'Address not available'}</div>
            </div>
            <div class="field">
              <div class="field-label">Current Status</div>
              <div class="field-value"><span class="status-badge">${issue.status.replace('_', ' ')}</span></div>
            </div>
            <div class="field">
              <div class="field-label">Reporter</div>
              <div class="field-value">${issue.reporter?.name || 'Citizen'}</div>
            </div>
            <div class="field">
              <div class="field-label">Community Support</div>
              <div class="field-value">👍 ${issue.vote_count} Votes</div>
            </div>
          </div>
        </div>
        
        <div class="summary-box">
          <div class="field-label">Issue Description & AI Summary</div>
          <div class="field-value" style="margin-top: 8px;">
            ${issue.ai_summary ? `<strong>AI Summary:</strong> ${issue.ai_summary}<br><br>` : ''}
            <strong>Original Description:</strong> ${issue.description || 'No description provided.'}
          </div>
        </div>
        
        ${issue.status === 'resolved' && resolutionUrl ? `
          <div class="field-label" style="margin-bottom: 10px;">Resolution Proof</div>
          <div class="photo-container" style="height: 200px;">
            <img src="${resolutionUrl}" />
          </div>
        ` : ''}
        
        <div class="footer">
          <div>Generated by Nagrik Platform</div>
          <div>Printed on: ${nowStr}</div>
        </div>
        
        <script>
          setTimeout(() => { window.print(); }, 300);
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
  } catch (err) {
    console.error('Failed to generate print report:', err);
    alert('Failed to generate print report.');
  }
};

/* ── Cleanup ──────────────────────────────────────────────────── */
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
    const heatData = data.map(p => [p.lat, p.lng, Math.min(p.weight, 10)]);
    heatmapLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 20,
      maxZoom: 12,
      max: 3
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
      const icon = L.divIcon({
        className: 'custom-hotspot',
        html: `<div class="hotspot-glow"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      return L.marker([p.lat, p.lng], { icon }).addTo(mapInstance).bindPopup(`Predicted hotspot: ${p.predicted_count} issues`);
    });
    hotspotsActive = true;
    btn.classList.add('bg-primary-container', 'border-primary', 'shadow-inner');
    btn.classList.remove('bg-surface', 'border-outline-variant');
  } catch (e) {
    toast.error('Could not load hotspot predictions');
  }
}

export function cleanupMap() {
  if (markerClusterGroup && mapInstance) mapInstance.removeLayer(markerClusterGroup);
  markerClusterGroup = null;
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

async function loadCommunityAssessment(issueId) {
  const container = document.getElementById(`community-assessment-container-${issueId}`);
  if (!container) return;
  try {
    const res = await api.issues.communityAssessment(issueId);
    if (res.total_assessments === 0) {
      container.innerHTML = `<div class="text-xs text-on-surface-variant">No assessments yet. Be the first to verify!</div>`;
      return;
    }
    
    container.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs font-bold text-on-surface">
          <span>Photo clearly shows issue</span>
          <span>${res.photo_visible_percent.toFixed(0)}%</span>
        </div>
        <div class="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
          <div class="h-full bg-primary" style="width: ${res.photo_visible_percent}%"></div>
        </div>
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs font-bold text-on-surface">
          <span>Location seems accurate</span>
          <span>${res.location_accurate_percent.toFixed(0)}%</span>
        </div>
        <div class="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
          <div class="h-full bg-secondary" style="width: ${res.location_accurate_percent}%"></div>
        </div>
      </div>
      <div class="flex items-center justify-between text-xs mt-2 border-t border-outline-variant pt-2">
        <span class="font-bold text-on-surface-variant">Perceived Severity</span>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-variant text-on-surface">${res.most_common_severity || 'Unknown'}</span>
      </div>
      <div class="text-[10px] text-on-surface-variant text-right mt-1">${res.total_assessments} total assessments</div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="text-xs text-error">Failed to load assessment.</div>`;
  }
}

window._openVerifyModal = (issueId) => {
  const existing = document.getElementById('verify-modal-overlay');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'verify-modal-overlay';
  modal.className = 'fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4 opacity-0 transition-opacity';
  
  modal.innerHTML = `
    <div class="bg-surface rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden transform scale-95 transition-transform" id="verify-modal-content">
      <div class="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
        <h3 class="font-display-md text-lg text-on-surface">Community Verification</h3>
        <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant" onclick="document.getElementById('verify-modal-overlay').remove()">✕</button>
      </div>
      <div class="p-6 space-y-6">
        
        <div class="space-y-3">
          <p class="text-sm font-bold text-on-surface">1. Is this issue clearly visible in the photo?</p>
          <div class="flex gap-2">
            <button class="verify-opt flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm text-on-surface hover:bg-error/10 hover:border-error transition-colors" data-group="photo" data-val="true">Yes</button>
            <button class="verify-opt flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm text-on-surface hover:bg-error/10 hover:border-error transition-colors" data-group="photo" data-val="false">No</button>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-sm font-bold text-on-surface">2. Does the location seem accurate?</p>
          <div class="flex gap-2">
            <button class="verify-opt flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm text-on-surface hover:bg-error/10 hover:border-error transition-colors" data-group="location" data-val="true">Yes</button>
            <button class="verify-opt flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm text-on-surface hover:bg-error/10 hover:border-error transition-colors" data-group="location" data-val="false">No</button>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-sm font-bold text-on-surface">3. How severe does this look?</p>
          <div class="flex gap-2">
            <button class="verify-opt flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm text-on-surface hover:bg-error/10 hover:border-error transition-colors" data-group="severity" data-val="mild">Mild</button>
            <button class="verify-opt flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm text-on-surface hover:bg-error/10 hover:border-error transition-colors" data-group="severity" data-val="moderate">Moderate</button>
            <button class="verify-opt flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm text-on-surface hover:bg-error/10 hover:border-error transition-colors" data-group="severity" data-val="severe">Severe</button>
          </div>
        </div>
        
      </div>
      <div class="p-4 border-t border-outline-variant bg-surface-container-lowest">
        <button id="submit-verification-btn" class="w-full bg-primary text-white py-3 rounded-xl font-bold opacity-50 cursor-not-allowed transition-opacity" disabled>Submit Verification</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Animate in
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    document.getElementById('verify-modal-content').classList.remove('scale-95');
  });

  const answers = { photo: null, location: null, severity: null };
  const submitBtn = document.getElementById('submit-verification-btn');

  // Handle button selections
  const opts = modal.querySelectorAll('.verify-opt');
  opts.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const group = btn.dataset.group;
      const val = btn.dataset.val;
      answers[group] = val;
      
      // Update UI
      modal.querySelectorAll(`.verify-opt[data-group="${group}"]`).forEach(b => {
        b.classList.remove('bg-primary', 'bg-error', 'bg-secondary', 'text-white', 'bg-surface');
        b.classList.add('text-on-surface');
      });
      
      btn.classList.remove('text-on-surface');
      btn.classList.add('bg-error', 'text-white');

      // Check if all answered
      if (answers.photo !== null && answers.location !== null && answers.severity !== null) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    });
  });

  submitBtn.addEventListener('click', async (e) => {
    const payload = {
      photo_visible: answers.photo === 'true',
      location_accurate: answers.location === 'true',
      perceived_severity: answers.severity
    };
    
    submitBtn.innerHTML = '<span class="animate-pulse">Submitting...</span>';
    try {
      const res = await api.issues.microVerify(issueId, payload);
      
      if (res.success) {
        toast.success(`Thank you! You earned ${res.points_earned} points.`, 'Success');
        showFloatingPoints(e, res.points_earned);
        modal.remove();
        loadCommunityAssessment(issueId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit verification', 'Error');
      submitBtn.textContent = 'Submit Verification';
    }
  });
};

function renderStepper(status) {
  const steps = ['open', 'verified', 'in_progress', 'resolved'];
  const labels = ['Reported', 'Verified', 'Working', 'Resolved'];
  const currentIndex = steps.indexOf(status) !== -1 ? steps.indexOf(status) : 0;
  
  let html = `<div class="status-stepper">`;
  
  for (let i = 0; i < steps.length; i++) {
    let classes = 'step';
    if (i <= currentIndex) classes += ' completed';
    if (i === currentIndex) classes += ' active';

    html += `
      <div class="${classes}">
        <div class="step-dot"></div>
        <div class="step-label">${labels[i]}</div>
      </div>
    `;
    
    if (i < steps.length - 1) {
      const lineClass = i < currentIndex ? 'step-line completed' : 'step-line';
      html += `<div class="${lineClass}"></div>`;
    }
  }
  
  html += `</div>`;
  return html;
}
