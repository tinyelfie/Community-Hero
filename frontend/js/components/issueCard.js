/**
 * Community Hero — components/issueCard.js
 * Reusable issue card HTML builder
 */

const CATEGORY_ICONS = {
  pothole:     '🕳️',
  streetlight: '💡',
  water_leak:  '💧',
  waste:       '🗑️',
  drainage:    '🌊',
  other:       '📌',
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
  const imageUrl = issue.image_url ? `https://community-hero-api.onrender.com${issue.image_url}` : null;

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
  const finalImageUrl = imageUrl || `assets/categories/${issue.category || 'other'}.jpg`;

  const imageHtml = finalImageUrl
    ? (finalImageUrl.match(/\.(mp4|webm|ogg)$/i)
       ? `<video src="${finalImageUrl}" class="issue-card__image" controls style="background:#000; object-fit:cover;"></video>`
       : `<img src="${finalImageUrl}" alt="${issue.title}" class="issue-card__image" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy">`)
    : '';
  const placeholderHtml = `<div class="issue-card__image" style="${finalImageUrl ? 'display:none' : ''}">${icon}</div>`;

  return `
    <div class="issue-card card" data-status="${issue.status}" data-id="${issue.id}"
         onclick="window._viewIssue?.('${issue.id}')" style="cursor:pointer">
      ${imageHtml}${placeholderHtml}
      <div class="issue-card__body">
        <div class="issue-card__meta">
          <span class="badge badge--${catClass}">${icon} ${(issue.category || 'other').replace('_', ' ')}</span>
          <span class="chip chip--${issue.severity}">${severityLabel}</span>
        </div>
        <h3 class="issue-card__title">${issue.title}</h3>
        <p class="issue-card__summary">${summary}</p>
        <div class="issue-card__address">
          <span>📍</span>
          <span>${address}</span>
        </div>
      </div>
      <div class="issue-card__footer">
        <div class="flex items-center gap-2">
          <span class="status-badge status-badge--${issue.status}">${statusLabel}</span>
          <span class="text-xs text-muted">👍 ${issue.vote_count}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted">${dateStr}</span>
          ${showActions ? `<button class="btn btn--sm btn--sakura" onclick="event.stopPropagation();window._viewIssue?.('${issue.id}')">View</button>` : ''}
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

export default { buildIssueCard, renderIssueList, formatDate, getCategoryClass };
