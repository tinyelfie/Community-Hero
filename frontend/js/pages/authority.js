import api from '../api.js';
import toast from '../components/toast.js';

let mapInstance = null;
let routingLayer = null;

export async function renderAuthority(container) {
  const { user } = await import('../app.js').then(m => m.getAuthState());
  if (!user || !['moderator', 'admin'].includes(user.role)) {
    import('../app.js').then(m => m.navigate('home'));
    return;
  }

  container.innerHTML = `
    <div class="pt-24 pb-12 px-gutter min-h-screen">
      <h2 class="font-display-xl text-3xl text-on-surface mb-6">Authority Portal</h2>
      <p class="text-on-surface-variant mb-6">Optimize repair routes for City Maintenance Crews.</p>
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[70vh] min-h-[600px] lg:min-h-0">
        
        <!-- Controls & List -->
        <div class="glass-card rounded-2xl p-6 flex flex-col h-full overflow-hidden">
          <div class="mb-4">
            <label class="block text-label-sm font-bold text-on-surface mb-2 uppercase">Issue Category</label>
            <select id="auth-category" class="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface">
                <option value="">All Categories</option>
                <option value="pothole" selected>Pothole</option>
                <option value="streetlight">Streetlight</option>
                <option value="waste">Waste</option>
                <option value="water_leak">Water Leak</option>
                <option value="drainage">Drainage</option>
            </select>
          </div>
          
          <button id="btn-optimize" class="w-full py-3 mb-4 sakura-gradient text-white rounded-full font-title-md shine-effect shadow-md hover:scale-[1.02] active:scale-95 transition-all">
            Generate Optimal Route
          </button>
          
          <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar" id="route-list">
            <div class="text-on-surface-variant text-center mt-10">
                Select a category and generate a route.
            </div>
          </div>
        </div>

        <!-- Map Area -->
        <div class="lg:col-span-2 glass-card rounded-2xl overflow-hidden relative">
          <div id="auth-map" class="w-full h-full z-0"></div>
          
          <!-- Depot Legend -->
          <div class="absolute bottom-6 left-6 z-10 glass-card p-3 rounded-xl flex items-center gap-2">
            <div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-md"></div>
            <span class="text-label-sm font-bold text-on-surface">City Depot (Start)</span>
          </div>
        </div>

      </div>
    </div>
  `;

  initMap();
  
  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 300);
  
  document.getElementById('btn-optimize').addEventListener('click', handleOptimize);
}

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

function initMap() {
  if (mapInstance) {
    mapInstance.remove();
  }
  
  const indiaBounds = L.latLngBounds(
    [6.0, 68.1], // Southwest (Kerala / Gujarat)
    [37.6, 97.4] // Northeast (Kashmir / Arunachal)
  );

  const depot = [21.1458, 79.0882]; // Nagpur

  mapInstance = L.map('auth-map', {
    center: [INDIA_CENTER.lat, INDIA_CENTER.lng],
    zoom: 4,
    minZoom: 4,
    maxBounds: indiaBounds,
    maxBoundsViscosity: 1.0,
    zoomControl: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(mapInstance);
  
  // Add Depot Marker
  L.circleMarker(depot, {
      radius: 8,
      fillColor: '#FF6B6B',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 1
  }).addTo(mapInstance).bindPopup("<b>City Depot</b><br>Start Location");
}

async function handleOptimize() {
    const btn = document.getElementById('btn-optimize');
    const category = document.getElementById('auth-category').value;
    const listEl = document.getElementById('route-list');
    
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Optimizing...';
    btn.disabled = true;
    
    try {
        const depotLat = 21.1458;
        const depotLng = 79.0882;
        
        const res = await api.authority.optimizeRoute(depotLat, depotLng, category || null);
        
        let optimizedRoute = res.route || [];
        if (optimizedRoute.length > 15) {
            optimizedRoute = optimizedRoute.slice(0, 15);
        }
        
        if (optimizedRoute.length === 0) {
            toast.info("No open issues found for this category.");
            listEl.innerHTML = '<div class="text-on-surface-variant text-center mt-10">No issues to route.</div>';
            if (routingLayer) routingLayer.remove();
            return;
        }
        
        drawRoute(optimizedRoute, [depotLat, depotLng]);
        renderList(optimizedRoute);
        toast.success(`Route optimized for ${optimizedRoute.length} stops!`);
        
    } catch (e) {
        toast.error("Failed to optimize route.");
        console.error(e);
    } finally {
        btn.innerHTML = 'Generate Optimal Route';
        btn.disabled = false;
    }
}

function drawRoute(route, depot) {
    if (routingLayer) {
        mapInstance.removeLayer(routingLayer);
    }
    
    routingLayer = L.layerGroup().addTo(mapInstance);
    
    const latlngs = [depot];
    
    route.forEach((stop, index) => {
        const pt = [stop.latitude, stop.longitude];
        latlngs.push(pt);
        
        // Custom numbered marker
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:#4ECDC4;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        L.marker(pt, { icon }).addTo(routingLayer)
         .bindPopup(`<b>Stop ${index + 1}</b><br>${stop.title}<br>Distance: ${stop.distance_km}km`);
    });
    
    // Draw Polyline connecting them
    const polyline = L.polyline(latlngs, {
        color: '#4ECDC4',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 10'
    }).addTo(routingLayer);
    
    mapInstance.fitBounds(polyline.getBounds(), { padding: [50, 50] });
}

function renderList(route) {
    const listEl = document.getElementById('route-list');
    listEl.innerHTML = '';
    
    route.forEach((stop, idx) => {
        const item = document.createElement('div');
        item.className = 'bg-surface-container-low p-4 rounded-xl mb-3 border border-outline-variant/30 flex gap-4 items-center cursor-pointer hover:bg-surface-variant transition-colors';
        item.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                ${idx + 1}
            </div>
            <div>
                <h4 class="font-bold text-on-surface text-sm truncate">${stop.title}</h4>
                <p class="text-xs text-on-surface-variant">${stop.address || 'Location unknown'}</p>
            </div>
        `;
        
        item.addEventListener('click', () => {
            if (mapInstance) {
                mapInstance.flyTo([stop.latitude, stop.longitude], 16, { duration: 1.5 });
            }
        });
        
        listEl.appendChild(item);
    });
}

export function cleanupAuthority() {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
}
