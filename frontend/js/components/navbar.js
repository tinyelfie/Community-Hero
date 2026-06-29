/**
 * Nagrik — components/navbar.js
 * Sticky navigation bar rendering and state management
 */

import { getAuthState, logout, navigate } from '../app.js';

export function renderNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return;
  
  container.innerHTML = `
    <header class="fixed top-0 w-full z-50 bg-surface/70 dark:bg-inverse-surface/70 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-[0_4px_30px_rgba(124,83,92,0.1)]">
      <div class="flex justify-between items-center h-20 px-gutter max-w-container-max mx-auto">
        <div class="flex items-center gap-sm cursor-pointer" onclick="window.location.hash='home'">
          <span class="material-symbols-outlined text-primary text-headline-lg" data-icon="account_balance">account_balance</span>
          <h1 class="font-brand text-title-md md:text-headline-lg text-primary hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-primary hover:to-tertiary transition-all duration-500 pt-2 pb-1 leading-normal whitespace-nowrap">Nagrik</h1>
        </div>
        <div class="flex items-center gap-md">
          <button id="dark-mode-toggle" class="hover:scale-105 hover:opacity-80 transition-all duration-300 text-on-surface-variant">
            <span class="material-symbols-outlined" data-icon="light_mode">light_mode</span>
          </button>
          <div class="hidden md:flex gap-md" id="navbar-desktop-links">
            <a class="navbar-link text-on-surface-variant font-medium hover:text-primary transition-all duration-300 py-2 inline-block hover:-translate-y-1 hover:font-brand hover:text-lg" href="#home">Home</a>
            <a class="navbar-link text-on-surface-variant font-medium hover:text-primary transition-all duration-300 py-2 inline-block hover:-translate-y-1 hover:font-brand hover:text-lg" href="#map">Map</a>
            <a class="navbar-link text-on-surface-variant font-medium hover:text-primary transition-all duration-300 py-2 inline-block hover:-translate-y-1 hover:font-brand hover:text-lg" href="#report">Report</a>
            <a class="navbar-link text-on-surface-variant font-medium hover:text-primary transition-all duration-300 py-2 inline-block hover:-translate-y-1 hover:font-brand hover:text-lg" href="#dashboard">Dashboard</a>
          </div>
          <div id="navbar-right-auth" class="hidden md:flex items-center gap-sm">
          </div>
        </div>
      </div>
    </header>

    <!-- Navigation Shell Logic for Mobile -->
    <nav class="md:hidden fixed bottom-0 w-full bg-surface/80 dark:bg-inverse-surface/80 backdrop-blur-lg border-t border-white/20 dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
      <div class="flex justify-around items-center h-16 px-4 pb-safe" id="navbar-mobile-links">
        <a class="navbar-mobile-link flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 duration-200" href="#home">
          <span class="material-symbols-outlined" data-icon="home">home</span>
          <span class="font-label-sm text-label-sm">Home</span>
        </a>
        <a class="navbar-mobile-link flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 duration-200" href="#map">
          <span class="material-symbols-outlined" data-icon="map">map</span>
          <span class="font-label-sm text-label-sm">Map</span>
        </a>
        <a class="navbar-mobile-link flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 duration-200" href="#report">
          <span class="material-symbols-outlined" data-icon="add_circle">add_circle</span>
          <span class="font-label-sm text-label-sm">Report</span>
        </a>
        <a class="navbar-mobile-link flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 duration-200" href="#dashboard">
          <span class="material-symbols-outlined" data-icon="dashboard">dashboard</span>
          <span class="font-label-sm text-label-sm">Dashboard</span>
        </a>
      </div>
    </nav>
  `;

  // Dark Mode Toggle Logic
  const toggleBtn = document.getElementById('dark-mode-toggle');
  
  // Load saved preference
  if (localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }

  const updateIcon = () => {
    const isDark = document.documentElement.classList.contains('dark');
    toggleBtn.querySelector('span').textContent = isDark ? 'dark_mode' : 'light_mode';
  };
  
  updateIcon();

  toggleBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateIcon();
  });

  updateNavAuth();
  updateActiveLink();
}

export function updateNavAuth() {
  const { user } = getAuthState();
  const authContainer = document.getElementById('navbar-right-auth');
  const mobileContainer = document.getElementById('navbar-mobile-links');
  
  if (!authContainer || !mobileContainer) return;

  if (user) {
    const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    
    // Check if user is authority
    const isAuthority = ['moderator', 'admin'].includes(user.role);
    const authorityLink = isAuthority ? `<a href="#authority" class="text-primary font-bold hover:underline mr-4">Authority Portal</a>` : '';

    authContainer.innerHTML = `
      ${authorityLink}
      <div class="relative cursor-pointer mr-4" id="nav-notification-bell">
        <span class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors text-2xl">notifications</span>
        <span id="nav-notification-badge" class="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full hidden">0</span>
      </div>
      <a href="#profile" class="flex items-center gap-2 mr-2 hover:bg-surface-variant p-1 rounded-full pr-3 transition-colors">
        <div class="nav-user-points" title="Your Reputation Points">
          <div id="user-points" style="font-weight:bold; color:#FF8FA3; font-size:14px;">🌟 ${user.points || 0}</div>
        </div>
        <div class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">${initials}</div>
      </a>
      <button class="border border-outline text-on-surface-variant px-4 py-2 rounded-full font-label-sm text-label-sm transition-all hover:bg-surface-variant hover:scale-105 active:scale-95 hover:shadow-[0_0_15px_rgba(124,83,92,0.2)]" id="nav-logout-btn">Logout</button>
    `;
    document.getElementById('nav-logout-btn')?.addEventListener('click', () => logout());
    
    // Fetch notifications
    import('../api.js').then(({ default: api }) => {
      api.notifications.list().then(notifs => {
        if (notifs && notifs.length > 0) {
            const badge = document.getElementById('nav-notification-badge');
            if(badge) {
                badge.textContent = notifs.length;
                badge.classList.remove('hidden');
            }
            
            // Simple click handler to show them as toast and mark read
            document.getElementById('nav-notification-bell').onclick = () => {
                import('./toast.js').then(({ default: toast }) => {
                    notifs.forEach(n => {
                        toast.info(n.message);
                        api.notifications.markRead(n.id);
                    });
                    if(badge) badge.classList.add('hidden');
                });
            };
        }
      });
    }).catch(e => console.error("Error loading notifications", e));

    // Make sure profile mobile link exists
    if (!document.getElementById('mobile-nav-profile')) {
       mobileContainer.insertAdjacentHTML('beforeend', `
        <a id="mobile-nav-profile" class="navbar-mobile-link flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 duration-200" href="#profile">
          <span class="material-symbols-outlined" data-icon="person">person</span>
          <span class="font-label-sm text-label-sm">Profile</span>
        </a>
       `);
    }
    // Remove login/register mobile links if present
    document.getElementById('mobile-nav-login')?.remove();
  } else {
    authContainer.innerHTML = `
      <a href="#login" class="text-primary font-bold text-label-sm px-4 py-2 transition-all hover:scale-105 active:scale-95 inline-block hover:shadow-[0_0_15px_rgba(124,83,92,0.2)] rounded-full">Log in</a>
      <a href="#register" class="sakura-gradient text-white px-6 py-2 rounded-full font-label-sm text-label-sm shine-effect shadow-md transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(124,83,92,0.5)]">Sign Up</a>
    `;
    
    // Make sure login mobile link exists
    document.getElementById('mobile-nav-profile')?.remove();
    if (!document.getElementById('mobile-nav-login')) {
       mobileContainer.insertAdjacentHTML('beforeend', `
        <a id="mobile-nav-login" class="navbar-mobile-link flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 duration-200" href="#login">
          <span class="material-symbols-outlined" data-icon="login">login</span>
          <span class="font-label-sm text-label-sm">Login</span>
        </a>
       `);
    }
  }
}

export function updateActiveLink() {
  const hash = window.location.hash.replace('#', '') || 'home';
  
  // Desktop
  document.querySelectorAll('.navbar-link').forEach(link => {
    const page = link.getAttribute('href').replace('#', '');
    const isActive = page === hash || (hash === 'login' && page === 'home') || (hash === 'register' && page === 'home');
    
    if (isActive) {
      link.className = "navbar-link text-primary font-bold border-b-2 border-primary py-2 transition-all";
    } else {
      link.className = "navbar-link text-on-surface-variant font-medium hover:text-primary transition-all py-2";
    }
  });

  // Mobile
  document.querySelectorAll('.navbar-mobile-link').forEach(link => {
    const page = link.getAttribute('href').replace('#', '');
    const isActive = page === hash || (hash === 'login' && page === 'home') || (hash === 'register' && page === 'home');
    
    if (isActive) {
      link.className = "navbar-mobile-link flex flex-col items-center justify-center text-primary font-bold scale-110 active:scale-90 duration-200";
      link.querySelector('span[data-icon]').style.fontVariationSettings = "'FILL' 1";
    } else {
      link.className = "navbar-mobile-link flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90 duration-200";
      link.querySelector('span[data-icon]').style.fontVariationSettings = "'FILL' 0";
    }
  });
}

export default { renderNavbar, updateNavAuth, updateActiveLink };
