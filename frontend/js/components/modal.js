/**
 * Nagrik — components/modal.js
 * Generic modal system with open/close, fade+scale animation
 */

let activeModal = null;

/**
 * Show a modal with given content.
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.body - HTML string for modal body
 * @param {Array}  options.actions - [{label, class, handler}]
 * @param {string} [options.size] - 'sm' | 'md' | 'lg'
 * @returns {HTMLElement} overlay element
 */
export function showModal({ title, body, actions = [], size = 'md' }) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';

  const actionsHtml = actions.map((a, i) =>
    `<button class="btn ${a.class || 'btn--outline'}" data-action="${i}">${a.label}</button>`
  ).join('');

  overlay.innerHTML = `
    <div class="modal ${size === 'lg' ? 'modal--lg' : ''}">
      <div class="modal__header">
        <h4 class="modal__title">${title}</h4>
        <button class="modal__close" id="modal-close-btn" aria-label="Close">✕</button>
      </div>
      <div class="modal__body">${body}</div>
      ${actionsHtml ? `<div class="modal__footer">${actionsHtml}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  activeModal = overlay;

  // Trigger open animation on next frame
  requestAnimationFrame(() => overlay.classList.add('open'));

  // Close handlers
  overlay.querySelector('#modal-close-btn').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Action handlers
  overlay.querySelectorAll('[data-action]').forEach((btn) => {
    const idx = parseInt(btn.dataset.action, 10);
    btn.addEventListener('click', () => {
      if (actions[idx]?.handler) actions[idx].handler();
    });
  });

  // ESC key
  const onKeydown = (e) => {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKeydown); }
  };
  document.addEventListener('keydown', onKeydown);

  return overlay;
}

export function closeModal() {
  if (!activeModal) return;
  const m = activeModal;
  m.classList.remove('open');
  m.addEventListener('transitionend', () => m.remove(), { once: true });
  activeModal = null;
}

/** Confirm dialog shorthand */
export function confirmDialog(message, onConfirm, onCancel) {
  return showModal({
    title: 'Confirm Action',
    body: `<p>${message}</p>`,
    actions: [
      { label: 'Cancel', class: 'btn--outline', handler: () => { closeModal(); onCancel?.(); } },
      { label: 'Confirm', class: 'btn--primary', handler: () => { closeModal(); onConfirm?.(); } },
    ],
  });
}

export default { showModal, closeModal, confirmDialog };
