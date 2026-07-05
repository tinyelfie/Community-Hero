import api, { API_BASE } from '../api.js';
/**
 * Nagrik — components/issueCard.js
 * Reusable issue card HTML builder
 */

import { getAuthState } from '../app.js';

const CATEGORY_ICONS = {
  pothole:     '🕳️',
  streetlight: '💡',
  water_leak:  '💧',
  waste:       '🗑️',
  drainage:    '🌊',
  other:       '📌',
};

const SLA_DAYS = {
  water_leak: 2,
  streetlight: 3,
  pothole: 7,
  waste: 5,
  drainage: 4,
  other: 7
};

const STATUS_LABELS = {
  open:        'Open',
  verified:    'Verified',
  in_progress: 'In Progress',
  resolved:    'Resolved',
  rejected:    'Rejected',
};

const SEVERITY_LABELS = {
  low:      'Low',
  medium:   'Medium',
  high:     'High',
  critical: 'Critical',
};

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function getCategoryClass(category) {
  return (category || 'other').replace('_', '-');
}

/**
 * Build an issue card HTML string.
 * @param {object} issue - Issue object from API
 * @param {object} [opts]
 * @param {boolean} [opts.compact=false] - Compact card for sidebar
 * @param {boolean} [opts.showActions=true]
 */
export function buildIssueCard(issue, opts = {}) {
  const { compact = false, showActions = true } = opts;
  const icon = CATEGORY_ICONS[issue.category] || '📌';
  const catClass = getCategoryClass(issue.category);
  const statusLabel = STATUS_LABELS[issue.status] || issue.status;
  const severityLabel = SEVERITY_LABELS[issue.severity] || issue.severity;
  const dateStr = formatDate(issue.created_at);
  const address = issue.address || 'Location unknown';
  const summary = issue.ai_summary || issue.description || 'No description available.';
  const imageUrls = issue.image_url ? issue.image_url.split(',') : [];
  const primaryImageUrl = imageUrls[0] || null;
  const imageUrl = primaryImageUrl 
    ? (primaryImageUrl.startsWith('http') ? primaryImageUrl : `${API_BASE.replace('/api', '')}${primaryImageUrl}`) 
    : null;

  if (compact) {
    return `
      <div class="map-issue-item" data-id="${issue.id}" onclick="window._selectIssue?.('${issue.id}')">
        <div class="flex-between mb-2">
          <span class="badge badge--${catClass}">${icon} ${(issue.category || 'other').replace('_', ' ')}</span>
          <span class="chip chip--${issue.severity}">${severityLabel}</span>
        </div>
        <div class="map-issue-item__title">${issue.title}</div>
        <div class="map-issue-item__meta">
          <span class="status-badge status-badge--${issue.status}">${statusLabel}</span>
          <span class="text-xs text-muted">👍 ${issue.vote_count}</span>
        </div>
      </div>
    `;
  }

  const keyword = (issue.category || 'city').replace('_', ' ');
  const lockId = parseInt(issue.id.substring(0,8), 16) % 1000 || 1;
  const finalImageUrl = imageUrl || `https://loremflickr.com/800/600/${keyword},india,street?lock=${lockId}`;

  const imageHtml = finalImageUrl
    ? (finalImageUrl.match(/\.(mp4|webm|ogg)$/i)
       ? `<video src="${finalImageUrl}" class="issue-card__image" controls style="background:#000; object-fit:cover;"></video>`
       : `<img src="${finalImageUrl}" alt="${issue.title}" class="issue-card__image" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy">`)
    : '';
  const placeholderHtml = `<div class="issue-card__image" style="${finalImageUrl ? 'display:none' : ''}">${icon}</div>`;

  const { user } = getAuthState();
  const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');
  
  let costHtml = '';
  if (isAdmin && issue.estimated_cost_min != null && issue.estimated_cost_max != null) {
    const minCost = issue.estimated_cost_min.toLocaleString('en-IN');
    const maxCost = issue.estimated_cost_max.toLocaleString('en-IN');
    costHtml = `<div class="px-2 py-1 bg-green-100 text-green-800 border border-green-300 rounded-md text-[10px] font-bold mt-2 inline-flex items-center gap-1">💰 ₹${minCost} – ₹${maxCost} estimated.</div>`;
  }
  
  // VADER Urgency Chip
  let urgencyChip = '';
  if (issue.urgency_level === 'critical') {
    urgencyChip = `<span class="bg-rose-100 text-rose-800 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-rose-200">🔥 Urgent</span>`;
  } else if (issue.urgency_level === 'high') {
    urgencyChip = `<span class="bg-orange-100 text-orange-800 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-orange-200">⚠️ High Concern</span>`;
  }

  let slaHtml = '';
  let borderStyle = '';
  if (issue.status === 'in_progress' && issue.status_changed_at) {
    const sla = SLA_DAYS[issue.category] || SLA_DAYS.other;
    const statusDate = new Date(issue.status_changed_at);
    const deadline = new Date(statusDate.getTime() + sla * 86400000);
    const now = new Date();
    const daysRemaining = Math.ceil((deadline - now) / 86400000);
    
    if (daysRemaining > 0) {
      const formattedDeadline = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      slaHtml = `<div class="px-2 py-1 bg-[#B7E4C7]/30 text-[#425B46] border border-[#B7E4C7] rounded-md text-xs font-bold mb-2 inline-flex items-center gap-1">⏱️ ${daysRemaining} days remaining · Due ${formattedDeadline}</div>`;
    } else {
      slaHtml = `<div class="px-2 py-1 bg-red-100 text-red-600 border border-red-300 rounded-md text-xs font-bold mb-2 inline-flex items-center gap-1">🚨 Overdue</div>`;
      borderStyle = 'border-left: 4px solid #ef4444 !important;';
    }
  }

  const reporterHtml = issue.reporter ? 
    `🌟 ${issue.reporter.points || 0} ${issue.reporter.is_verified_reporter ? '<span title="Verified Reporter — 3+ issues successfully resolved." class="text-blue-500 font-bold cursor-help ml-1">✓</span>' : ''}` 
    : '🌟 0';

  return `
    <div class="issue-card card" data-status="${issue.status}" data-id="${issue.id}"
         onclick="window._viewIssue?.('${issue.id}')" style="cursor:pointer; ${borderStyle}">
      ${imageHtml}${placeholderHtml}
      <div class="issue-card__body">
        <div class="flex flex-wrap gap-2 mb-3">
          <span class="chip chip--${issue.severity}">${severityLabel}</span>
          <span class="bg-surface-variant text-on-surface-variant text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-outline-variant">
            ${(issue.category || 'other').replace('_', ' ')}
          </span>
          ${urgencyChip}
        </div>
        ${slaHtml}
        ${costHtml}
        <h3 class="issue-card__title">${issue.title}</h3>
        <p class="issue-card__summary">${summary}</p>
        <div class="issue-card__address">
          <span>📍</span>
          <span>${address}</span>
        </div>
        <div class="flex items-center justify-between mb-3">
          <div class="text-xs text-on-surface-variant flex items-center gap-1">
            👤 <span>${reporterHtml}</span>
          </div>
        </div>
      </div>
      <div class="issue-card__footer">
        <div class="flex items-center gap-2">
          <span class="status-badge status-badge--${issue.status}">${statusLabel}</span>
          <span class="text-xs text-muted">👍 ${issue.vote_count}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted">${dateStr}</span>
          <button class="btn btn--sm bg-surface-variant transition-all hover:bg-outline-variant hover:scale-105 active:scale-95 hover:shadow-[0_0_15px_rgba(124,83,92,0.2)]" onclick="event.stopPropagation();window._shareIssue?.('${issue.title.replace(/'/g, "\\'")}', event.target.closest('.issue-card'))">📤 Share</button>
          ${showActions ? `<button class="btn btn--sm btn--sakura transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(124,83,92,0.5)]" onclick="event.stopPropagation();window._viewIssue?.('${issue.id}')">View</button>` : ''}
        </div>
      </div>
      ${issue.status === 'resolved' && issue.assignee ? `
      <div class="issue-card__footer bg-success-container/30 border-t border-success/20 py-2">
        <span class="text-xs font-bold text-success w-full text-center">✅ Resolved by ${issue.assignee.name} on ${formatDate(issue.updated_at)}</span>
      </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render a list of issues into a container element.
 */
export function renderIssueList(container, issues, opts = {}) {
  if (!issues || issues.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🏙️</div>
        <div class="empty-state__title">No issues found</div>
        <div class="empty-state__text">No civic issues match your current filters.</div>
      </div>`;
    return;
  }
  container.innerHTML = issues.map(i => buildIssueCard(i, opts)).join('');
}

window._shareIssue = async (title, cardEl) => {
  if (!window.html2canvas) {
    window.toast?.error('Sharing not ready yet. Please try again.');
    return;
  }
  
  // Add branding footer
  const branding = document.createElement('div');
  branding.className = 'w-full text-center text-white text-xs font-bold py-2 mt-2 bg-[#FF8FA3] rounded-b-lg';
  branding.textContent = 'Reported on Nagrik — your city, your voice';
  cardEl.appendChild(branding);
  
  try {
    const canvas = await window.html2canvas(cardEl, { scale: 2, useCORS: true });
    cardEl.removeChild(branding);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'nagrik-issue.png', { type: 'image/png' });
      
      if (navigator.share) {
        navigator.share({
          title: title,
          text: 'Check out this civic issue on Nagrik',
          files: [file]
        }).catch(err => console.error('Share failed:', err));
      } else {
        // Fallback for desktop
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nagrik-issue.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  } catch (e) {
    console.error('Failed to capture card', e);
    if (branding.parentNode === cardEl) cardEl.removeChild(branding);
    window.toast?.error('Failed to capture image for sharing.');
  }
};

export default { buildIssueCard, renderIssueList, formatDate, getCategoryClass };
