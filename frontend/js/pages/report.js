import api, { API_BASE } from '../api.js';
import toast from '../components/toast.js';
import { navigate, showFloatingPoints } from '../app.js';

let mapInstance = null;
let currentMarker = null;

export function renderReport(container) {
  window.locationInteracted = false;
  container.innerHTML = `
    <main class="pt-24 pb-32 px-gutter max-w-2xl mx-auto space-y-lg">
      <!-- Intro Section -->
      <section class="space-y-base">
        <h2 class="font-title-md text-title-md text-on-surface">Report a Concern</h2>
        <p class="text-on-surface-variant font-body-md">Your contribution helps keep our community beautiful and safe. Detailed reports are processed 40% faster.</p>
      </section>

      <form class="space-y-lg" id="report-form" novalidate>
        <!-- Draft Banner -->
        <div id="draft-banner" class="hidden glass-card p-4 rounded-xl shadow-lg border border-primary/30 flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-2 text-on-surface-variant font-bold">
            <span class="text-xl">📝</span> You have an unsaved draft — continue where you left off?
          </div>
          <div class="flex gap-2 w-full md:w-auto">
            <button id="btn-restore-draft" class="flex-1 md:flex-none px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors">Restore Draft</button>
            <button id="btn-discard-draft" class="flex-1 md:flex-none px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-bold text-sm hover:bg-surface-variant transition-colors">Start Fresh</button>
          </div>
        </div>

        <!-- 1. Details Section -->
        <div class="glass-card p-md rounded-xl space-y-md shadow-[0_4px_20px_rgba(124,83,92,0.05)]">
          <div class="flex items-center gap-2 text-primary font-bold">
            <span class="material-symbols-outlined">edit_note</span>
            <span class="font-label-sm text-label-sm uppercase tracking-wider">Step 1: Details</span>
          </div>
          <div class="space-y-sm">
            <label class="block font-label-sm text-on-surface-variant px-1">Issue Title <span class="text-error">*</span></label>
            <input id="report-title" class="w-full bg-surface-container-low border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-3 transition-all duration-300 outline-none" placeholder="e.g., Pothole on Maple Avenue" type="text" required/>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div class="space-y-sm">
              <label class="block font-label-sm text-on-surface-variant px-1">Category <span class="text-error">*</span></label>
              <select id="report-category" class="w-full bg-primary text-white focus:ring-2 focus:ring-primary-container rounded-lg p-3 transition-all outline-none appearance-none cursor-pointer shadow-md">
                <option value="" disabled selected>Select a category...</option>
                <option value="pothole">Pothole / Road Repair</option>
                <option value="streetlight">Broken Streetlight</option>
                <option value="water_leak">Water Leak / Flooding</option>
                <option value="waste">Waste / Garbage Dump</option>
                <option value="drainage">Drainage / Sewer Issue</option>
                <option value="fallen_tree">Fallen Tree / Branch</option>
                <option value="broken_sidewalk">Broken Sidewalk</option>
                <option value="stray_animal">Stray Animal Danger</option>
                <option value="illegal_parking">Illegal Parking / Encroachment</option>
                <option value="vandalism">Vandalism</option>
                <option value="custom">Please Specify...</option>
              </select>
              <input id="report-category-custom" class="w-full bg-surface-container-low border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-3 transition-all duration-300 outline-none hidden mt-2" placeholder="Enter your custom category" type="text"/>
            </div>
            <div class="space-y-sm">
              <label class="block font-label-sm text-on-surface-variant px-1">Severity <span class="text-error">*</span></label>
              <select id="report-severity" class="w-full bg-primary text-white focus:ring-2 focus:ring-primary-container rounded-lg p-3 transition-all outline-none appearance-none cursor-pointer shadow-md">
                <option value="" disabled selected>Select severity...</option>
                <option value="low">Low (Cosmetic)</option>
                <option value="medium">Medium (Nuisance)</option>
                <option value="high">High (Safety Hazard)</option>
                <option value="critical">Critical (Emergency)</option>
              </select>
            </div>
          </div>
          <div class="space-y-sm">
            <div class="flex justify-between items-center px-1">
              <label class="block font-label-sm text-on-surface-variant">Description <span class="text-error">*</span></label>
              <button type="button" id="btn-write-ai" class="text-xs text-primary font-bold flex items-center gap-1 hover:bg-primary/10 px-2 py-1 rounded transition-colors" title="Write with AI">
                <span class="material-symbols-outlined" style="font-size: 14px;">auto_awesome</span> Write with AI
              </button>
            </div>
            <textarea id="report-description" class="w-full bg-surface-container-low border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-3 transition-all duration-300 outline-none resize-none" placeholder="Describe the issue in detail. Include landmarks or specific context..." rows="4" required></textarea>
            <div style="text-align:right; font-size:12px; color:#888; margin-top:4px;">
              <span id="desc-counter">0</span>/500
            </div>
          </div>
        </div>

        <!-- 2. Media Section -->
        <div class="glass-card p-md rounded-xl space-y-md shadow-[0_4px_20px_rgba(124,83,92,0.05)]">
          <div class="flex items-center gap-2 text-primary font-bold">
            <span class="material-symbols-outlined">photo_camera</span>
            <span class="font-label-sm text-label-sm uppercase tracking-wider">Step 2: Evidence</span>
          </div>
          <p class="text-xs text-on-surface-variant">Uploading a photo/video is optional but highly recommended.</p>
          <div class="relative group cursor-pointer" id="dropzone" onclick="document.getElementById('report-media').click()">
            <div class="w-full aspect-video border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center space-y-2 bg-primary/5 group-hover:bg-primary/10 transition-all duration-500 overflow-hidden" id="dropzone-inner">
              <span class="material-symbols-outlined text-4xl text-primary/60 group-hover:scale-110 transition-transform duration-500">upload_file</span>
              <p class="font-label-sm text-primary">Drop photos here or <span class="underline">browse</span></p>
              <p class="text-[10px] text-on-surface-variant/60">Maximum 3 files • JPEG, PNG</p>
            </div>
          </div>
          <input type="file" id="report-media" class="hidden" accept="image/*,video/*" multiple />
          
          <!-- Preview Area (Empty State) -->
          <div class="grid grid-cols-3 gap-sm" id="media-preview-container">
            <div class="aspect-square bg-surface-container rounded-lg border border-outline-variant/30 flex items-center justify-center text-outline-variant">
              <span class="material-symbols-outlined">image</span>
            </div>
          </div>
          
          <!-- AI Analysis Container -->
          <div id="ai-analysis-container" class="mt-4 hidden"></div>
        </div>

        <!-- 3. Location Section -->
        <div class="glass-card p-md rounded-xl space-y-md shadow-[0_4px_20px_rgba(124,83,92,0.05)] overflow-hidden">
          <div class="flex items-center gap-2 text-primary font-bold">
            <span class="material-symbols-outlined">location_on</span>
            <span class="font-label-sm text-label-sm uppercase tracking-wider">Step 3: Location <span class="text-error">*</span></span>
          </div>
          <div class="space-y-sm">
            <div class="relative">
              <input id="report-location-input" spellcheck="false" class="w-full bg-surface-container-low border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-4 pr-12 leading-relaxed transition-all outline-none" placeholder="Search for address..." type="text"/>
              <button id="search-location-btn" class="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:bg-surface-variant rounded-full w-8 h-8 flex items-center justify-center" type="button">
                <span class="material-symbols-outlined text-sm">search</span>
              </button>
            </div>
            
            <div id="autocomplete-results" class="hidden bg-surface border border-outline-variant rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto"></div>

            <button id="use-my-location-btn" class="w-full py-3 flex items-center justify-center gap-2 text-primary font-bold text-label-sm bg-primary/10 rounded-lg hover:bg-primary/20 transition-all border border-primary/20" type="button">
              <span class="material-symbols-outlined text-base">my_location</span>
                                  USE MY CURRENT LOCATION
                              </button>
          </div>
          
          <!-- Interactive Map UI -->
          <div class="relative w-full h-48 rounded-xl overflow-hidden border border-outline-variant/30 z-0">
             <div id="report-map" class="w-full h-full z-0"></div>
          </div>
          <div class="text-xs text-on-surface-variant text-center">Drag the marker to pinpoint the exact location.</div>
          <div id="nearby-warning-container"></div>
          <input type="hidden" id="report-lat">
          <input type="hidden" id="report-lng">
        </div>

        <!-- Submit Button -->
        <button class="w-full sakura-gradient h-16 rounded-xl text-white font-bold text-title-md shadow-xl transition-all duration-300 relative overflow-hidden group hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(124,83,92,0.5)]" id="submitBtn" type="submit">
          <span class="relative z-10 flex items-center justify-center gap-2" id="btnText">
            <span class="material-symbols-outlined">send</span> Submit Report
          </span>
          <div class="hidden relative z-10 flex items-center justify-center gap-3" id="btnLoading">
            <div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto"></div>
            <span>Sending Data...</span>
          </div>
        </button>
      </form>
    </main>
  `;

  setupMap();
  setupLocationSearch();
  setupMediaPreview();
  setupDescriptionCounter();
  setupSubmit();
  setupDrafting();
  setupCustomCategory();
  setupAI();
}

function setupCustomCategory() {
  const select = document.getElementById('report-category');
  const customInput = document.getElementById('report-category-custom');
  select.addEventListener('change', () => {
    if (select.value === 'custom') {
      customInput.classList.remove('hidden');
      customInput.required = true;
      customInput.focus();
    } else {
      customInput.classList.add('hidden');
      customInput.required = false;
      customInput.value = '';
    }
  });
}

function setupAI() {
  const btn = document.getElementById('btn-write-ai');
  btn.addEventListener('click', async () => {
    const title = document.getElementById('report-title').value;
    const category = document.getElementById('report-category').value;
    const severity = document.getElementById('report-severity').value;
    
    if (!title || !category || !severity) {
      toast.error('Please enter a title, category, and severity first');
      return;
    }
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size: 14px;">progress_activity</span> Generating...';
    btn.disabled = true;
    
    try {
      const res = await fetch(`${API_BASE}/issues/draft-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('Nagrik_token')}`
        },
        body: JSON.stringify({ title, category, severity })
      });
      const data = await res.json();
      if (data.description) {
        document.getElementById('report-description').value = data.description;
        document.getElementById('desc-counter').textContent = data.description.length;
        saveDraft();
      } else {
        toast.error('Failed to generate description');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate description');
    }
    
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  });
}

function saveDraft() {
  const draft = {
    title: document.getElementById('report-title').value,
    category: document.getElementById('report-category').value,
    customCategory: document.getElementById('report-category-custom') ? document.getElementById('report-category-custom').value : '',
    severity: document.getElementById('report-severity').value,
    description: document.getElementById('report-description').value,
    lat: document.getElementById('report-lat').value,
    lng: document.getElementById('report-lng').value,
    address: document.getElementById('report-location-input').value
  };
  localStorage.setItem('civichero_draft', JSON.stringify(draft));
}

function setupDrafting() {
  const draftStr = localStorage.getItem('civichero_draft');
  if (draftStr) {
    const banner = document.getElementById('draft-banner');
    banner.classList.remove('hidden');
    banner.classList.add('flex');
    
    document.getElementById('btn-restore-draft').addEventListener('click', (e) => {
      e.preventDefault();
      try {
        const draft = JSON.parse(draftStr);
        if (draft.title) document.getElementById('report-title').value = draft.title;
        if (draft.category) {
          document.getElementById('report-category').value = draft.category;
          if (draft.category === 'custom') {
            const customInput = document.getElementById('report-category-custom');
            if (customInput) {
              customInput.classList.remove('hidden');
              customInput.required = true;
              customInput.value = draft.customCategory || '';
            }
          }
        }
        if (draft.severity) document.getElementById('report-severity').value = draft.severity;
        if (draft.description) document.getElementById('report-description').value = draft.description;
        if (draft.lat) document.getElementById('report-lat').value = draft.lat;
        if (draft.lng) document.getElementById('report-lng').value = draft.lng;
        if (draft.address) document.getElementById('report-location-input').value = draft.address;
        
        // Move map marker
        if (draft.lat && draft.lng && currentMarker && mapInstance) {
           window.locationInteracted = true;
           const lat = parseFloat(draft.lat);
           const lng = parseFloat(draft.lng);
           currentMarker.setLatLng([lat, lng]);
           mapInstance.setView([lat, lng], 15);
           checkNearbyIssues(lat, lng);
        }
        document.getElementById('desc-counter').textContent = document.getElementById('report-description').value.length;
      } catch (err) {
        console.error('Failed to parse draft', err);
      }
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    });
    
    document.getElementById('btn-discard-draft').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('civichero_draft');
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    });
  }

  document.getElementById('report-form').addEventListener('input', saveDraft);
}

function setupDescriptionCounter() {
  const desc = document.getElementById('report-description');
  const counter = document.getElementById('desc-counter');
  desc.setAttribute('maxlength', '500');
  desc.addEventListener('input', () => {
    const len = desc.value.length;
    counter.textContent = len;
    counter.style.color = len > 450 ? '#FF8FA3' : '#888';
  });
}

function setupMap() {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const indiaBounds = L.latLngBounds([8.4, 68.1], [37.6, 97.4]);
  mapInstance = L.map('report-map', {
    center: [22.5726, 88.3639],
    zoom: 13,
    minZoom: 5,
    maxBounds: indiaBounds,
    maxBoundsViscosity: 1.0,
  });
  
  L.tileLayer(
    isDarkMode ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', 
    { attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxZoom: 19 }
  ).addTo(mapInstance);

  const iconHtml = `
    <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-primary">
      <span class="material-symbols-outlined text-primary text-sm">location_on</span>
    </div>
  `;
  
  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 40]
  });

  const prefillLat = sessionStorage.getItem('prefill_lat');
  const prefillLng = sessionStorage.getItem('prefill_lng');
  const initialLat = prefillLat ? parseFloat(prefillLat) : 22.5726;
  const initialLng = prefillLng ? parseFloat(prefillLng) : 88.3639;

  currentMarker = L.marker([initialLat, initialLng], { draggable: true, icon: customIcon }).addTo(mapInstance);
  document.getElementById('report-lat').value = initialLat;
  document.getElementById('report-lng').value = initialLng;
  
  if (prefillLat && prefillLng) {
    window.locationInteracted = true;
    mapInstance.setView([initialLat, initialLng], 15);
    sessionStorage.removeItem('prefill_lat');
    sessionStorage.removeItem('prefill_lng');
    setTimeout(() => checkNearbyIssues(initialLat, initialLng), 500);
  }

  currentMarker.on('dragend', function (e) {
    window.locationInteracted = true;
    const pos = currentMarker.getLatLng();
    document.getElementById('report-lat').value = pos.lat;
    document.getElementById('report-lng').value = pos.lng;
    checkNearbyIssues(pos.lat, pos.lng);
    saveDraft();
  });

  mapInstance.on('click', function(e) {
    window.locationInteracted = true;
    currentMarker.setLatLng(e.latlng);
    document.getElementById('report-lat').value = e.latlng.lat;
    document.getElementById('report-lng').value = e.latlng.lng;
    checkNearbyIssues(e.latlng.lat, e.latlng.lng);
    saveDraft();
  });

  // Current location button
  document.getElementById('use-my-location-btn').addEventListener('click', () => {
    if (navigator.geolocation) {
      toast.success('Locating you...', '📍');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          window.locationInteracted = true;
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          updateMapLocation(lat, lng);
        },
        () => toast.error('Could not get your location.')
      );
    } else {
      toast.error('Geolocation not supported.');
    }
  });

  // Fix leaflet rendering bug inside hidden/styled containers
  setTimeout(() => mapInstance.invalidateSize(), 200);
}

function updateMapLocation(lat, lng) {
  if (mapInstance && currentMarker) {
    mapInstance.setView([lat, lng], 15);
    currentMarker.setLatLng([lat, lng]);
    document.getElementById('report-lat').value = lat;
    document.getElementById('report-lng').value = lng;
    checkNearbyIssues(lat, lng);
    saveDraft();
  }
}

async function checkNearbyIssues(lat, lng) {
  try {
    const res = await fetch(`${API_BASE}/issues?lat=${lat}&lng=${lng}&radius_km=0.5&status=open&limit=3`);
    const issues = await res.json();
    const container = document.getElementById('nearby-warning-container');
    
    if (issues && issues.length > 0) {
      container.innerHTML = `
        <div id="nearby-warning" style="
          background: #FFF8E1;
          border: 1.5px solid #FFD166;
          border-radius: 10px;
          padding: 14px 16px;
          margin-top: 12px;
          font-size: 14px;
          color: #425B46;
        ">
          <div style="font-weight:600; margin-bottom:8px;">
            ⚠️ ${issues.length} similar issue(s) already reported within 500m
          </div>
          <div style="font-size:13px; color:#666; margin-bottom:10px;">
            Are you reporting a new issue or the same one?
          </div>
          ${issues.slice(0,2).map(issue => `
            <div style="display:flex; justify-content:space-between; 
              align-items:center; padding:8px 0; 
              border-top:1px solid #F0EDE8;">
              <span>${issue.title} — ${issue.vote_count} votes</span>
              <a href="#/issue/${issue.id}" target="_blank" style="color:#FF8FA3; 
                font-size:12px; font-weight:600;">View →</a>
            </div>
          `).join('')}
          <div style="margin-top:10px; font-size:12px; color:#888;">
            If it's the same issue, consider upvoting instead of reporting again.
          </div>
        </div>
      `;
    } else {
      container.innerHTML = '';
    }
  } catch (err) {
    console.error('Error checking nearby issues:', err);
  }
}

function setupLocationSearch() {
  const input = document.getElementById('report-location-input');
  const btn = document.getElementById('search-location-btn');
  const resultsDiv = document.getElementById('autocomplete-results');
  let debounceTimer;

  const doSearch = async () => {
    const val = input.value.trim();
    if (!val) {
      resultsDiv.classList.add('hidden');
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(val)}`);
      const data = await res.json();
      
      resultsDiv.innerHTML = '';
      if (data.length > 0) {
        resultsDiv.classList.remove('hidden');
        data.forEach(place => {
          const div = document.createElement('div');
          div.className = "p-4 hover:bg-surface-variant cursor-pointer border-b border-outline-variant/30 text-body-md text-on-surface";
          div.textContent = place.display_name;
          div.onclick = () => {
            window.locationInteracted = true;
            input.value = place.display_name;
            resultsDiv.classList.add('hidden');
            updateMapLocation(parseFloat(place.lat), parseFloat(place.lon));
          };
          resultsDiv.appendChild(div);
        });
      } else {
         resultsDiv.classList.add('hidden');
      }
    } catch(e) {
      console.error(e);
    }
  };

  btn.addEventListener('click', doSearch);
  
  // Autocomplete as user types
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, 600);
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceTimer);
      doSearch();
    }
  });

  // Hide results when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !resultsDiv.contains(e.target)) {
      resultsDiv.classList.add('hidden');
    }
  });
}

window.selectedFiles = [];

function setupMediaPreview() {
  const input = document.getElementById('report-media');
  const previewContainer = document.getElementById('media-preview-container');
  const dropzoneInner = document.getElementById('dropzone-inner');
  const aiContainer = document.getElementById('ai-analysis-container');

  window.removeFile = (index) => {
    window.selectedFiles.splice(index, 1);
    renderPreviews();
  };

  function renderPreviews() {
    if (window.selectedFiles.length === 0) {
      dropzoneInner.innerHTML = `
        <span class="material-symbols-outlined text-4xl text-primary/60 group-hover:scale-110 transition-transform duration-500">upload_file</span>
        <p class="font-label-sm text-primary">Drop photos here or <span class="underline">browse</span></p>
        <p class="text-[10px] text-on-surface-variant/60">Maximum 3 files • JPEG, PNG</p>
      `;
      previewContainer.innerHTML = `
        <div class="aspect-square bg-surface-container rounded-lg border border-outline-variant/30 flex items-center justify-center text-outline-variant">
          <span class="material-symbols-outlined">image</span>
        </div>
      `;
      return;
    }

    dropzoneInner.innerHTML = `<p class="text-primary font-bold">${window.selectedFiles.length} file(s) selected</p>`;
    
    let html = '';
    window.selectedFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith('image/')) {
        html += `
          <div class="relative aspect-square bg-surface-container rounded-lg border border-outline-variant/30 overflow-hidden">
            <img src="${url}" class="w-full h-full object-cover">
            <button type="button" onclick="event.stopPropagation(); window.removeFile(${index})" class="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors">✕</button>
          </div>
        `;
      } else {
        html += `
          <div class="relative aspect-square bg-surface-container rounded-lg border border-outline-variant/30 flex flex-col items-center justify-center text-primary">
            <span class="material-symbols-outlined text-3xl">videocam</span>
            <span class="text-[10px] mt-1 line-clamp-1 px-2">${file.name}</span>
            <button type="button" onclick="event.stopPropagation(); window.removeFile(${index})" class="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors">✕</button>
          </div>
        `;
      }
    });
    previewContainer.innerHTML = html;
  }

  input.addEventListener('change', (e) => {
    if (e.target.files) {
      for (const file of e.target.files) {
        if (window.selectedFiles.length < 3) {
          window.selectedFiles.push(file);
        }
      }
      renderPreviews();
    }
  });
}

let forceSubmit = false;
let duplicateIssueId = null;

function setupSubmit() {
  document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const text = document.getElementById('btnText');
    const loading = document.getElementById('btnLoading');

    // Get auth token first
    const token = localStorage.getItem('Nagrik_token');
    if (!token) {
      toast.error('Please login first to submit a report');
      navigate('login');
      return;
    }

    // Hide any previous duplicate banner
    const existingBanner = document.getElementById('duplicate-banner');
    if (existingBanner) existingBanner.remove();

    text.classList.add('hidden');
    loading.classList.remove('hidden');
    btn.disabled = true;

    try {
      const title = document.getElementById('report-title').value;
      const description = document.getElementById('report-description').value;
      const catSelect = document.getElementById('report-category');
      let finalCategory = catSelect.value;
      if (finalCategory === 'custom') {
        const customVal = document.getElementById('report-category-custom').value;
        if (customVal) finalCategory = customVal;
      }
      const severity = document.getElementById('report-severity').value;

      if (!title || !finalCategory || !severity || !description) {
        toast.error('Fill everything in step 1');
        text.classList.remove('hidden');
        loading.classList.add('hidden');
        btn.disabled = false;
        return;
      }

      if (!window.locationInteracted) {
        toast.error('Please pinpoint the exact location in Step 3');
        text.classList.remove('hidden');
        loading.classList.add('hidden');
        btn.disabled = false;
        return;
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', finalCategory);
      formData.append('severity', severity);
      formData.append('latitude', document.getElementById('report-lat').value);
      formData.append('longitude', document.getElementById('report-lng').value);

      if (forceSubmit) {
        formData.append('force_submit', 'true');
        if (duplicateIssueId) {
          formData.append('duplicate_issue_id', duplicateIssueId);
        }
      }

      if (window.selectedFiles[0]) formData.append('image', window.selectedFiles[0]);
      if (window.selectedFiles[1]) formData.append('image2', window.selectedFiles[1]);
      if (window.selectedFiles[2]) formData.append('image3', window.selectedFiles[2]);

      const res = await api.issues.create(formData);
      
      if (res && res.duplicate_detected) {
        // Show warning banner
        text.classList.remove('hidden');
        loading.classList.add('hidden');
        btn.disabled = false;
        
        const banner = document.createElement('div');
        banner.id = 'duplicate-banner';
        banner.className = 'mb-4 p-4 bg-[#FFE8CC] text-[#7A3F00] rounded-xl border border-[#FFB84D]';
        banner.innerHTML = `
          <h4 class="font-bold mb-2 text-lg">⚠️ Potential Duplicate Detected</h4>
          <p class="text-sm mb-3">Your report looks very similar to an existing issue:</p>
          <div class="bg-surface p-3 rounded-lg mb-3 shadow-sm border border-outline-variant">
            <div class="font-bold text-sm text-on-surface">${res.matching_issue.title}</div>
            <div class="text-xs text-on-surface-variant mt-1">${res.matching_issue.distance}km away • ${res.matching_issue.vote_count} votes</div>
          </div>
          <div class="flex gap-3">
            <button type="button" id="btn-view-duplicate" class="flex-1 bg-surface border border-primary font-bold text-sm py-2 rounded-lg text-primary hover:bg-surface-variant transition-colors">View Existing Report</button>
            <button type="button" id="btn-submit-anyway" class="flex-1 bg-[#FFB84D] text-[#7A3F00] font-bold text-sm py-2 rounded-lg hover:bg-[#FFA31A] transition-colors">Submit Anyway</button>
          </div>
        `;
        
        btn.parentElement.insertBefore(banner, btn);
        
        document.getElementById('btn-view-duplicate').addEventListener('click', () => {
          navigate('map', { focus: res.matching_issue.id });
        });
        
        document.getElementById('btn-submit-anyway').addEventListener('click', () => {
          forceSubmit = true;
          duplicateIssueId = res.matching_issue.id;
          document.getElementById('report-form').dispatchEvent(new Event('submit'));
        });
        
        return;
      } else {
        toast.success('Report submitted successfully! 🎉');
        showFloatingPoints(e, 10);
        
        forceSubmit = false;
        duplicateIssueId = null;
        document.getElementById('report-form').reset();
        localStorage.removeItem('civichero_draft');
        
        setTimeout(() => navigate('home'), 1500);
      }
      
    } catch (err) {
      toast.error(err.message || 'Failed to submit report');
      console.error(err);
      text.classList.remove('hidden');
      loading.classList.add('hidden');
      btn.disabled = false;
    }
  });
}

