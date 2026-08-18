const VALID_STATUSES = new Set(['done', 'in-progress', 'not-started']);

export const REFRESH_INTERVAL_MS = 60_000;

export function validateRouteProgress(routes) {
  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error('Route progress must contain at least one route');
  }

  const paths = new Set();
  for (const route of routes) {
    if (!route || typeof route.path !== 'string' || !route.path.startsWith('/')) {
      throw new Error('Every route must have an absolute path');
    }
    if (paths.has(route.path)) {
      throw new Error(`Duplicate route path: ${route.path}`);
    }
    if (!VALID_STATUSES.has(route.status)) {
      throw new Error(`Invalid status for ${route.path}: ${route.status}`);
    }
    paths.add(route.path);
  }
}

export function summarizeRoutes(routes) {
  validateRouteProgress(routes);

  const summary = {
    total: routes.length,
    done: 0,
    inProgress: 0,
    notStarted: 0,
    percentDone: 0
  };

  for (const route of routes) {
    if (route.status === 'done') summary.done += 1;
    if (route.status === 'in-progress') summary.inProgress += 1;
    if (route.status === 'not-started') summary.notStarted += 1;
  }

  summary.percentDone = Number(((summary.done / summary.total) * 100).toFixed(1));
  return summary;
}

const STATUS_LABELS = {
  done: 'Done',
  'in-progress': 'In progress',
  'not-started': 'Not yet started'
};

function setWidth(document, id, count, total) {
  document.getElementById(id).style.width = `${(count / total) * 100}%`;
}

export function renderDashboard(data, document) {
  validateRouteProgress(data.routes);
  const summary = summarizeRoutes(data.routes);

  document.getElementById('completion').textContent = `${summary.done} / ${summary.total}`;
  document.getElementById('percentage').textContent = `${summary.percentDone}% complete`;
  document.getElementById('done-count').textContent = String(summary.done);
  document.getElementById('in-progress-count').textContent = String(summary.inProgress);
  document.getElementById('not-started-count').textContent = String(summary.notStarted);
  document.getElementById('progress-bar').setAttribute('aria-label', `${summary.done} of ${summary.total} routes done, ${summary.inProgress} in progress, ${summary.notStarted} not yet started`);

  setWidth(document, 'done-segment', summary.done, summary.total);
  setWidth(document, 'in-progress-segment', summary.inProgress, summary.total);
  setWidth(document, 'not-started-segment', summary.notStarted, summary.total);

  const query = document.getElementById('route-search').value.trim().toLowerCase();
  const status = document.getElementById('status-filter').value;
  const visibleRoutes = data.routes.filter((route) => {
    const matchesQuery = route.path.toLowerCase().includes(query) || route.family.toLowerCase().includes(query);
    return matchesQuery && (status === 'all' || route.status === status);
  });

  const list = document.getElementById('route-list');
  list.replaceChildren();
  for (const route of visibleRoutes) {
    const item = document.createElement('li');
    item.className = `route route--${route.status}`;

    const path = document.createElement('code');
    path.textContent = route.path;

    const family = document.createElement('span');
    family.className = 'route__family';
    family.textContent = route.family.replaceAll('-', ' ');

    const badge = document.createElement('span');
    badge.className = 'route__status';
    badge.textContent = STATUS_LABELS[route.status];

    item.append(path, family, badge);
    list.append(item);
  }

  document.getElementById('visible-count').textContent = `${visibleRoutes.length} routes shown`;
  document.getElementById('updated-at').textContent = `Updated ${new Date().toLocaleTimeString()}`;
}

export async function loadDashboard(document) {
  const response = await fetch(`/routes.json?time=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load route progress (${response.status})`);
  const data = await response.json();
  renderDashboard(data, document);
  return data;
}

if (typeof document !== 'undefined') {
  let currentData;
  const refresh = async () => {
    try {
      currentData = await loadDashboard(document);
      document.getElementById('error').hidden = true;
    } catch (error) {
      const message = document.getElementById('error');
      message.textContent = error instanceof Error ? error.message : String(error);
      message.hidden = false;
    }
  };

  document.getElementById('route-search').addEventListener('input', () => {
    if (currentData) renderDashboard(currentData, document);
  });
  document.getElementById('status-filter').addEventListener('change', () => {
    if (currentData) renderDashboard(currentData, document);
  });

  refresh();
  window.setInterval(refresh, REFRESH_INTERVAL_MS);
}
