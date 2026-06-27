import api from '../api.js';
import toast from '../components/toast.js';
import { navigate } from '../app.js';

let mapInstance = null;
let currentMarker = null;

export function renderReport(container) {
  container.innerHTML = `
    <main class="pt-24 pb-32 px-gutter max-w-2xl mx-auto space-y-lg">
      <!-- Intro Section -->
      <section class="space-y-base">
        <h2 class="font-title-md text-title-md text-on-surface">Report a Concern</h2>
        <p class="text-on-surface-variant font-body-md">Your contribution helps keep our community beautiful and safe. Detailed reports are processed 40% faster.</p>
      </section>

      <form class="space-y-lg" id="report-form">
        <!-- 1. Details Section -->
        <div class="glass-card p-md rounded-xl space-y-md shadow-[0_4px_20px_rgba(124,83,92,0.05)]">
          <div class="flex items-center gap-2 text-primary font-bold">
            <span class="material-symbols-outlined">edit_note</span>
            <span class="font-label-sm text-label-sm uppercase tracking-wider">Step 1: Details</span>
          </div>
          <div class="space-y-sm">
            <label class="block font-label-sm text-on-surface-variant px-1">Issue Title</label>
            <input id="report-title" class="w-full bg-surface-container-low border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-3 transition-all duration-300 outline-none" placeholder="e.g., Pothole on Maple Avenue" type="text" required/>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div class="space-y-sm">
              <label class="block font-label-sm text-on-surface-variant px-1">Category</label>
              <select id="report-category" class="w-full bg-surface-container-low border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-3 transition-all outline-none appearance-none cursor-pointer">
                <option value="Infrastructure">Infrastructure</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Public Safety">Public Safety</option>
                <option value="Greenery/Parks">Greenery/Parks</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="space-y-sm">
              <label class="block font-label-sm text-on-surface-variant px-1">Severity</label>
              <select class="w-full bg-surface-container-low border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-3 transition-all outline-none appearance-none cursor-pointer">
                <option>Low (Cosmetic)</option>
                <option>Medium (Nuisance)</option>
                <option>High (Safety Hazard)</option>
                <option>Critical (Emergency)</option>
              </select>
            </div>
          </div>
          <div class="space-y-sm">
            <label class="block font-label-sm text-on-surface-variant px-1">Description</label>
            <textarea id="report-description" class="w-full bg-surface-container-low border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-3 transition-all duration-300 outline-none resize-none" placeholder="Describe the issue in detail. Include landmarks or specific context..." rows="4" required></textarea>
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
          <input type="file" id="report-media" class="hidden" accept="image/*,video/*" />
          
          <!-- Preview Area (Empty State) -->
          <div class="grid grid-cols-3 gap-sm" id="media-preview-container">
            <div class="aspect-square bg-surface-container rounded-lg border border-outline-variant/30 flex items-center justify-center text-outline-variant">
              <span class="material-symbols-outlined">image</span>
            </div>
          </div>
        </div>

        <!-- 3. Location Section -->
        <div class="glass-card p-md rounded-xl space-y-md shadow-[0_4px_20px_rgba(124,83,92,0.05)] overflow-hidden">
          <div class="flex items-center gap-2 text-primary font-bold">
            <span class="material-symbols-outlined">location_on</span>
            <span class="font-label-sm text-label-sm uppercase tracking-wider">Step 3: Location</span>
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
          <input type="hidden" id="report-lat">
          <input type="hidden" id="report-lng">
        </div>

        <!-- Submit Button -->
        <button class="w-full sakura-gradient h-16 rounded-xl text-white font-bold text-title-md shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 relative overflow-hidden group" id="submitBtn" type="submit">
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

  initReportMap();
  setupMediaPreview();
  setupLocationSearch();
  setupSubmit();
}

function initReportMap() {
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

  currentMarker = L.marker([22.5726, 88.3639], { draggable: true, icon: customIcon }).addTo(mapInstance);
  document.getElementById('report-lat').value = 22.5726;
  document.getElementById('report-lng').value = 88.3639;

  currentMarker.on('dragend', function (e) {
    const pos = currentMarker.getLatLng();
    document.getElementById('report-lat').value = pos.lat;
    document.getElementById('report-lng').value = pos.lng;
  });

  mapInstance.on('click', function(e) {
    currentMarker.setLatLng(e.latlng);
    document.getElementById('report-lat').value = e.latlng.lat;
    document.getElementById('report-lng').value = e.latlng.lng;
  });

  // Current location button
  document.getElementById('use-my-location-btn').addEventListener('click', () => {
    if (navigator.geolocation) {
      toast.success('Locating you...', '📍');
      navigator.geolocation.getCurrentPosition(
        (position) => {
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

function setupMediaPreview() {
  const input = document.getElementById('report-media');
  const previewContainer = document.getElementById('media-preview-container');
  const dropzoneInner = document.getElementById('dropzone-inner');

  input.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      
      dropzoneInner.innerHTML = `<p class="text-primary font-bold">1 file selected: ${file.name}</p>`;
      
      if (file.type.startsWith('image/')) {
        previewContainer.innerHTML = `
          <div class="aspect-square bg-surface-container rounded-lg border border-outline-variant/30 flex items-center justify-center overflow-hidden">
            <img src="${url}" class="w-full h-full object-cover">
          </div>
        `;
      } else {
        previewContainer.innerHTML = `
          <div class="aspect-square bg-surface-container rounded-lg border border-outline-variant/30 flex flex-col items-center justify-center text-primary">
            <span class="material-symbols-outlined text-3xl">videocam</span>
            <span class="text-[10px] mt-1 line-clamp-1 px-2">${file.name}</span>
          </div>
        `;
      }
    }
  });
}

function setupSubmit() {
  document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const text = document.getElementById('btnText');
    const loading = document.getElementById('btnLoading');

    // Get auth token first
    const token = localStorage.getItem('Community Hero_token');
    if (!token) {
      toast.error('Please login first to submit a report');
      navigate('login');
      return;
    }

    text.classList.add('hidden');
    loading.classList.remove('hidden');
    btn.disabled = true;

    try {
      const formData = new FormData();
      formData.append('title', document.getElementById('report-title').value);
      formData.append('description', document.getElementById('report-description').value);
      formData.append('category', document.getElementById('report-category').value);
      formData.append('latitude', document.getElementById('report-lat').value);
      formData.append('longitude', document.getElementById('report-lng').value);

      const fileInput = document.getElementById('report-media');
      if (fileInput.files[0]) {
        formData.append('media', fileInput.files[0]);
      }

      const res = await api.issues.create(formData);
      
      toast.success('Report submitted successfully! 🎉');
      navigate('home');
    } catch (err) {
      toast.error(err.message || 'Failed to submit report');
      console.error(err);
      text.classList.remove('hidden');
      loading.classList.add('hidden');
      btn.disabled = false;
    }
  });
}

