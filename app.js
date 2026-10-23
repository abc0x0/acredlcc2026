'use strict';
(() => {
  const views = [...document.querySelectorAll('.view')];
  const routes = new Set(views.map(view => view.id));
  const routeLinks = [...document.querySelectorAll('[data-route]')];
  const selector = document.getElementById('view-select');
  const search = document.getElementById('search');
  const tools = document.getElementById('directory-tools');
  const boxes = [...document.querySelectorAll('input[data-key]')];
  const storageKey = 'ujat-directorio-26-6-20-334-asistencia-v1';
  const storageNote = document.getElementById('storage-note');
  let active = 'agenda';
  let saved = {};
  function storageUnavailable() {
    storageNote.textContent = 'Guardado no disponible. Las marcas se conservan solo mientras esta página esté abierta.';
  }
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) saved = value;
    localStorage.setItem(`${storageKey}-check`, '1');
    localStorage.removeItem(`${storageKey}-check`);
  } catch (_) { storageUnavailable(); }

  function updateCounts() {
    let total = 0;
    document.querySelectorAll('.participants-view').forEach(view => {
      const inputs = [...view.querySelectorAll('input[data-key]')];
      const present = inputs.filter(input => input.checked).length;
      total += present;
      view.querySelector('.presence-count').textContent = `${present} de ${inputs.length} presentes`;
    });
    const count = document.getElementById('global-count');
    const number = document.createElement('strong');
    number.textContent = total;
    count.replaceChildren(number, ' presentes');
  }
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function filter() {
    if (active === 'agenda') return;
    const view = document.getElementById(active);
    const cards = [...view.querySelectorAll('[data-person]')];
    const query = normalize(search.value.trim());
    let visible = 0;
    cards.forEach(card => {
      card.hidden = !normalize(card.textContent).includes(query);
      if (!card.hidden) visible++;
    });
    view.querySelector('.empty').hidden = visible > 0;
    view.querySelector('.results-count').textContent = `${visible} de ${cards.length} registros`;
  }
  function renderRoute(focus = false) {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); }
    catch (_) { hash = ''; }
    const day = /^dia-(25|26|27|28|29)$/.test(hash) ? hash : null;
    active = routes.has(hash) ? hash : 'agenda';
    views.forEach(view => { view.hidden = view.id !== active; });
    routeLinks.forEach(link => {
      if (link.dataset.route === active && link.closest('nav')) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    selector.value = active;
    tools.hidden = active === 'agenda';
    search.value = '';
    if (active !== 'agenda') {
      search.setAttribute('aria-label', `Buscar en ${document.getElementById(`heading-${active}`).textContent}`);
    }
    filter();
    if (focus) {
      const heading = document.getElementById(`heading-${active}`);
      heading.focus({ preventScroll: true });
      (day ? document.getElementById(day) : document.getElementById('main-content')).scrollIntoView({ block: 'start' });
    }
  }
  boxes.forEach(box => {
    box.checked = saved[box.dataset.key] === true;
    box.closest('[data-person]').classList.toggle('is-present', box.checked);
    box.addEventListener('change', () => {
      saved[box.dataset.key] = box.checked;
      box.closest('[data-person]').classList.toggle('is-present', box.checked);
      try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
      catch (_) { storageUnavailable(); }
      updateCounts();
    });
  });
  selector.addEventListener('change', () => {
    if (location.hash === `#${selector.value}`) renderRoute(true);
    else location.hash = selector.value;
  });
  search.addEventListener('input', filter);
  window.addEventListener('hashchange', () => renderRoute(true));
  updateCounts();
  renderRoute();

  const installButton = document.getElementById('install-button');
  const installNote = document.getElementById('install-note');
  const offlineStatus = document.getElementById('offline-status');
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
    installNote.textContent = 'La aplicación está disponible para instalarse en este dispositivo.';
  });
  installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    installButton.hidden = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      installNote.textContent = choice.outcome === 'accepted'
        ? 'Solicitud de instalación aceptada.'
        : 'Puedes instalarla más tarde desde el menú del navegador.';
    } catch (_) {
      installNote.textContent = 'Usa el menú del navegador para instalar la aplicación.';
    }
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton.hidden = true;
    installNote.textContent = 'Aplicación instalada en este dispositivo.';
  });
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
    installNote.textContent = 'La aplicación ya se está usando desde la pantalla de inicio.';
  }
  const installOrigin = location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (location.protocol === 'file:') {
    installNote.textContent = 'Esta copia local permite consultar la agenda y el directorio. Para instalarla, abre la aplicación desde una dirección HTTPS.';
    offlineStatus.textContent = 'Consulta local disponible. La instalación requiere una dirección HTTPS.';
  } else if (!installOrigin) {
    installNote.textContent = 'La instalación requiere que esta aplicación se abra desde una dirección HTTPS.';
    offlineStatus.textContent = 'La preparación sin conexión requiere una dirección HTTPS.';
  } else if ('serviceWorker' in navigator) {
    offlineStatus.textContent = 'Preparando la agenda y el directorio para consultarlos sin conexión…';
    navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
      offlineStatus.textContent = 'Lista para usarse sin conexión: agenda, directorio y PDF original guardados en este dispositivo.';
    }).catch(() => {
      offlineStatus.textContent = 'No se pudo preparar el uso sin conexión. Revisa la conexión y vuelve a abrir la aplicación.';
    });
  } else {
    offlineStatus.textContent = 'Este navegador permite consultar la aplicación, pero no preparar su uso sin conexión.';
  }
})();
