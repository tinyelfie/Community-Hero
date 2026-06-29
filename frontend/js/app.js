/**
 * Nagrik — app.js
 * Client-side hash router, auth state management, and app initialization
 */

import api from './api.js';
import toast from './components/toast.js';
import { renderNavbar, updateNavAuth, updateActiveLink } from './components/navbar.js';
import { renderHome, cleanupHome } from './pages/home.js';
import { renderMap, cleanupMap } from './pages/map.js';
import { renderReport } from './pages/report.js';
import { renderDashboard, cleanupDashboard } from './pages/dashboard.js';
import { renderProfile } from './pages/profile.js';
import { renderAuthority, cleanupAuthority } from './pages/authority.js';
import { renderArea, cleanupArea } from './pages/area.js';
import { renderDemo } from './pages/demo.js';

let authState = { user: null, token: null };
let currentRoute = null;
let currentCleanup = null;

export function getAuthState() {
  return authState;
}

export function setAuthState(token, user) {
  authState = { token, user };
  if (token) localStorage.setItem('Nagrik_token', token);
  else localStorage.removeItem('Nagrik_token');
  updateNavAuth();
}

export function logout() {
  setAuthState(null, null);
  toast.success('Logged out successfully');
  if (['report', 'dashboard', 'profile', 'authority'].includes(window.location.hash.replace('#', ''))) {
    navigate('home');
  } else {
    handleRoute();
  }
}

export function navigate(path, state = {}) {
  window._routerState = state;
  window.location.hash = path;
}

async function checkAuthOnLoad() {
  const token = localStorage.getItem('Nagrik_token');
  if (!token) return;
  try {
    const user = await api.auth.me();
    setAuthState(token, user);
  } catch (e) {
    console.warn('Invalid token on load, clearing.');
    setAuthState(null, null);
  }
}

/* ── Routing ──────────────────────────────────────────────────── */

export function showFloatingPoints(e, points) {
  const el = document.createElement('div');
  el.textContent = `+${points} pts`;
  el.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    color: #FF8FA3;
    font-weight: bold;
    font-size: 16px;
    pointer-events: none;
    z-index: 10000;
    transition: all 1s ease-out;
  `;
  document.body.appendChild(el);
  
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(-40px) scale(1.2)';
    el.style.opacity = '0';
  });
  
  setTimeout(() => el.remove(), 1000);
}

const routes = {
  home: { render: renderHome, cleanup: cleanupHome },
  map: { render: renderMap, cleanup: cleanupMap },
  report: { render: renderReport, cleanup: null },
  dashboard: { render: renderDashboard, cleanup: cleanupDashboard },
  profile: { render: renderProfile, cleanup: null },
  authority: { render: renderAuthority, cleanup: cleanupAuthority },
  area: { render: renderArea, cleanup: cleanupArea },
  demo: { render: renderDemo, cleanup: null },
  login: { render: renderLogin, cleanup: null },
  register: { render: renderRegister, cleanup: null },
};

async function handleRoute() {
  const hash = window.location.hash.replace('#', '') || 'home';
  const [fullPath, queryString] = hash.split('?');
  
  const pathParts = fullPath.split('/');
  const path = pathParts[0];
  
  const route = routes[path] || routes['home'];

  const params = {};
  if (pathParts.length > 1) {
    params.wardName = pathParts[1];
  }
  if (queryString) {
    const urlParams = new URLSearchParams(queryString);
    for (const [k, v] of urlParams) params[k] = v;
  }
  const state = { ...params, ...(window._routerState || {}) };

  if (currentRoute === path) {
    // Already here, maybe just re-render if state changed
    const appEl = document.getElementById('app');
    route.render(appEl, state);
    window._routerState = null;
    return;
  }

  // Cleanup old route
  if (currentCleanup) currentCleanup();
  currentRoute = path;
  currentCleanup = route.cleanup;

  updateActiveLink();

  const appEl = document.getElementById('app');
  appEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>`;

  await route.render(appEl, state);
  window._routerState = null;
  window.scrollTo(0, 0);
}

/* ── Auth Pages (Rendered inline for simplicity) ──────────────── */

function renderLogin(container) {
  if (authState.user) { navigate('home'); return; }
  container.innerHTML = `
    <div class="min-h-screen pt-24 pb-12 px-gutter flex items-center justify-center">
      <div class="glass-card w-full max-w-md p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/20 rounded-full blur-2xl"></div>
        
        <div class="relative z-10">
          <div class="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-white/10">
            <span class="text-3xl">👋</span>
          </div>
          <h2 class="font-display-xl text-3xl text-center text-on-surface mb-2">Welcome Back</h2>
          <p class="text-center text-on-surface-variant font-body-md mb-8">Log in to Nagrik</p>
          
          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-label-sm font-bold text-on-surface mb-1 uppercase">Email</label>
              <input type="email" id="login-email" class="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface" required value="kapadiavincent@gov.example.net">
            </div>
            <div>
              <label class="block text-label-sm font-bold text-on-surface mb-1 uppercase">Password</label>
              <input type="password" id="login-password" class="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface" required value="password123">
            </div>
            <button type="submit" id="login-submit" class="w-full py-4 mt-6 sakura-gradient text-white rounded-full font-title-md shine-effect shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
              Log In
            </button>
          </form>
          
          <p class="text-center mt-6 text-on-surface-variant font-body-md">
            Don't have an account? <a onclick="window.location.hash='register'" class="text-primary font-bold cursor-pointer hover:underline">Register</a>
          </p>
          
          <div class="mt-8 p-4 bg-surface-container-low rounded-lg border border-outline-variant/30 text-center text-sm text-on-surface-variant">
            <strong>Demo account:</strong><br>
            kapadiavincent@gov.example.net<br>
            Password: password123
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-submit');
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    btn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto"></div>';
    try {
      const res = await api.auth.login(email, pass);
      setAuthState(res.access_token, res.user);
      toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`);
      navigate('home');
    } catch (err) {
      toast.error(err.message || 'Login failed');
      btn.innerHTML = 'Log In';
    }
  });
}

function renderRegister(container) {
  if (authState.user) { navigate('home'); return; }
  container.innerHTML = `
    <div class="min-h-screen pt-24 pb-12 px-gutter flex items-center justify-center">
      <div class="glass-card w-full max-w-md p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-tertiary/20 rounded-full blur-2xl"></div>
        
        <div class="relative z-10">
          <div class="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-white/10">
            <span class="text-3xl">🌟</span>
          </div>
          <h2 class="font-display-xl text-3xl text-center text-on-surface mb-2">Join Nagrik</h2>
          <p class="text-center text-on-surface-variant font-body-md mb-8">Create an account to report issues and earn points.</p>
          
          <form id="register-form" class="space-y-4">
            <div>
              <label class="block text-label-sm font-bold text-on-surface mb-1 uppercase">Full Name</label>
              <input type="text" id="reg-name" class="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface" required>
            </div>
            <div>
              <label class="block text-label-sm font-bold text-on-surface mb-1 uppercase">Email</label>
              <input type="email" id="reg-email" class="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface" required>
            </div>
            <div>
              <label class="block text-label-sm font-bold text-on-surface mb-1 uppercase">Password</label>
              <input type="password" id="reg-password" class="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface" minlength="6" required>
            </div>
            <button type="submit" id="reg-submit" class="w-full py-4 mt-6 sakura-gradient text-white rounded-full font-title-md shine-effect shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
              Create Account
            </button>
          </form>
          
          <p class="text-center mt-6 text-on-surface-variant font-body-md">
            Already have an account? <a onclick="window.location.hash='login'" class="text-primary font-bold cursor-pointer hover:underline">Log In</a>
          </p>
        </div>
      </div>
    </div>`;

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-submit');
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    btn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto"></div>';
    try {
      const res = await api.auth.register(name, email, pass);
      setAuthState(res.access_token, res.user);
      toast.success('Account created successfully!', '🎉');
      navigate('home');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
      btn.innerHTML = 'Create Account';
    }
  });
}

/* ── Init ─────────────────────────────────────────────────────── */

export async function initApp() {
  renderNavbar();
  await checkAuthOnLoad();
  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // initial render
  
  // Offline Banner Logic
  window.addEventListener('offline', () => showOfflineBanner());
  window.addEventListener('online', () => hideOfflineBanner());
  if (!navigator.onLine) showOfflineBanner();

  initLiveCounter();
  initKeyboardShortcuts();
  
  // Global handler for issue cards
  window._viewIssue = (id) => {
    navigate('map', { focusIssue: id });
  };
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in an input or textarea
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }
    
    // Check if modifiers are pressed to prevent overriding native shortcuts
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Escape') {
      closeShortcutsModal();
      return;
    }

    const key = e.key.toLowerCase();
    if (key === 'r') navigate('report');
    else if (key === 'm') navigate('map');
    else if (key === 'd') navigate('dashboard');
    else if (e.key === '?') showShortcutsModal();
  });
}

function showShortcutsModal() {
  if (document.getElementById('shortcuts-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'shortcuts-modal';
  modal.className = 'fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm animate-fade-in';
  modal.innerHTML = `
    <div class="bg-surface p-8 rounded-2xl max-w-md w-full shadow-2xl relative" onclick="event.stopPropagation()">
      <button class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface transition-colors" onclick="this.closest('#shortcuts-modal').remove()">✕</button>
      <h2 class="font-display-xl text-2xl text-on-surface mb-6">Keyboard Shortcuts</h2>
      <div class="space-y-3">
        <div class="flex justify-between items-center py-2 border-b border-outline-variant/30">
          <kbd class="px-3 py-1 bg-surface-variant text-on-surface font-mono rounded shadow-sm font-bold border border-outline-variant">R</kbd>
          <span class="text-on-surface-variant font-medium">New Report</span>
        </div>
        <div class="flex justify-between items-center py-2 border-b border-outline-variant/30">
          <kbd class="px-3 py-1 bg-surface-variant text-on-surface font-mono rounded shadow-sm font-bold border border-outline-variant">M</kbd>
          <span class="text-on-surface-variant font-medium">Map View</span>
        </div>
        <div class="flex justify-between items-center py-2 border-b border-outline-variant/30">
          <kbd class="px-3 py-1 bg-surface-variant text-on-surface font-mono rounded shadow-sm font-bold border border-outline-variant">D</kbd>
          <span class="text-on-surface-variant font-medium">Dashboard</span>
        </div>
        <div class="flex justify-between items-center py-2">
          <kbd class="px-3 py-1 bg-surface-variant text-on-surface font-mono rounded shadow-sm font-bold border border-outline-variant">?</kbd>
          <span class="text-on-surface-variant font-medium">Show Shortcuts</span>
        </div>
      </div>
    </div>
  `;
  modal.onclick = closeShortcutsModal;
  document.body.appendChild(modal);
}

function closeShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  if (modal) modal.remove();
}

let liveCounterInterval = null;

async function updateLiveCounter() {
  if (document.visibilityState !== 'visible') return;
  try {
    const stats = await api.insights.stats();
    document.title = `(${stats.open_issues} open) Nagrik`;
  } catch (err) {
    // Ignore errors for background tasks
  }
}

function initLiveCounter() {
  updateLiveCounter();
  
  const startInterval = () => {
    if (!liveCounterInterval) {
      liveCounterInterval = setInterval(updateLiveCounter, 30000);
    }
  };
  
  const stopInterval = () => {
    if (liveCounterInterval) {
      clearInterval(liveCounterInterval);
      liveCounterInterval = null;
    }
  };

  startInterval();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateLiveCounter();
      startInterval();
    } else {
      stopInterval();
    }
  });
}

function showOfflineBanner() {
  let banner = document.getElementById('offline-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.className = 'fixed bottom-0 left-0 w-full bg-error text-white text-center py-2 text-sm font-bold z-[9999] transition-transform translate-y-full duration-300';
    banner.innerHTML = '⚠️ You are currently offline. Some features may be unavailable.';
    document.body.appendChild(banner);
    // Trigger reflow
    void banner.offsetWidth;
  }
  banner.classList.remove('translate-y-full');
}

function hideOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) {
    banner.classList.add('translate-y-full');
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', initApp);
