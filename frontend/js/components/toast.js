/**
 * Community Hero — components/toast.js
 * Toast notification system: success, error, info, warning
 */

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

const ICONS = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
};

/**
 * Show a toast notification.
 * @param {string} message - Main message text
 * @param {string} type - 'success' | 'error' | 'info' | 'warning'
 * @param {string} [title] - Optional bold title
 * @param {number} [duration=4000] - Auto-dismiss after ms (0 = never)
 */
export function showToast(message, type = 'info', title = '', duration = 4000) {
  const cnt = getContainer();

  // Limit to 3 toasts
  while (cnt.children.length >= 3) {
    cnt.firstChild.remove();
  }

  const typeColors = {
    success: 'bg-secondary text-white',
    error: 'bg-error text-white',
    info: 'bg-surface-container-high text-on-surface',
    warning: 'bg-primary text-white',
  };

  const toast = document.createElement('div');
  toast.className = `toast flex items-start gap-3 p-4 rounded-lg shadow-lg pointer-events-auto transition-all duration-300 transform translate-x-full opacity-0 ${typeColors[type] || typeColors.info}`;
  toast.innerHTML = `
    <span class="text-xl">${ICONS[type] || 'ℹ️'}</span>
    <div class="flex-1">
      ${title ? `<div class="font-bold text-sm mb-1">${title}</div>` : ''}
      <div class="toast-message text-sm opacity-90">${message}</div>
    </div>
    <button class="ml-2 opacity-70 hover:opacity-100 text-lg focus:outline-none" aria-label="Dismiss">✕</button>
  `;

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  });

  const dismiss = () => {
    toast.classList.add('translate-x-full', 'opacity-0');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  toast.querySelector('button[aria-label="Dismiss"]').addEventListener('click', dismiss);
  toast.addEventListener('click', dismiss);

  cnt.appendChild(toast);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return toast;
}

export const toast = {
  success: (msg, title) => showToast(msg, 'success', title || 'Success'),
  error:   (msg, title) => showToast(msg, 'error',   title || 'Error', 6000),
  info:    (msg, title) => showToast(msg, 'info',    title),
  warning: (msg, title) => showToast(msg, 'warning', title || 'Warning'),
};

export default toast;
