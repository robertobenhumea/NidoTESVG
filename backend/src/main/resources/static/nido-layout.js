/* NidoTESVG AAA App Shell */
(function () {
  "use strict";

  /* ── THEME ── */
  const MOON_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const SUN_ICO  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function themeIcon(theme) {
    return theme === 'dark' ? SUN_ICO : MOON_ICO;
  }

  function themeTitle(theme) {
    return theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  }

  function syncThemeBtns() {
    const t = getTheme();
    document.querySelectorAll('.nido-theme-btn').forEach(btn => {
      btn.innerHTML = themeIcon(t);
      btn.title = themeTitle(t);
    });
  }

  window.toggleTheme = function () {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
    try {
      const prefs = JSON.parse(localStorage.getItem('nido_prefs') || '{}');
      prefs.darkMode = (next === 'dark');
      localStorage.setItem('nido_prefs', JSON.stringify(prefs));
    } catch(e) {}
    syncThemeBtns();
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.content = next === 'dark' ? '#09090d' : '#F6F5F1';
  };

  const path = window.location.pathname;
  const isLogin = /\/login\.html$/.test(path) || path === "/";
  const isChat  = /\/chat\.html$/.test(path);

  /* Inject PWA meta tags (manifest, theme-color, Apple metas) */
  (function injectPWAMeta() {
    if (document.querySelector('link[rel="manifest"]')) return;
    const head = document.head;
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = '/manifest.json';
    head.appendChild(manifest);

    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = getTheme() === 'light' ? '#F6F5F1' : '#09090d';
    head.appendChild(themeColor);

    const appleCapable = document.createElement('meta');
    appleCapable.name = 'apple-mobile-web-app-capable';
    appleCapable.content = 'yes';
    head.appendChild(appleCapable);

    const appleStatus = document.createElement('meta');
    appleStatus.name = 'apple-mobile-web-app-status-bar-style';
    appleStatus.content = 'black-translucent';
    head.appendChild(appleStatus);

    const appleTitle = document.createElement('meta');
    appleTitle.name = 'apple-mobile-web-app-title';
    appleTitle.content = 'NidoTESVG';
    head.appendChild(appleTitle);

    const touchIcon = document.createElement('link');
    touchIcon.rel = 'apple-touch-icon';
    touchIcon.href = '/icons/icon-180.png';
    head.appendChild(touchIcon);

    if (!document.querySelector('link[rel~="icon"]')) {
      const favicon = document.createElement('link');
      favicon.rel  = 'icon';
      favicon.type = 'image/x-icon';
      favicon.href = '/favicon.ico';
      head.appendChild(favicon);
      const faviconSvg = document.createElement('link');
      faviconSvg.rel  = 'icon';
      faviconSvg.type = 'image/svg+xml';
      faviconSvg.href = '/icons/icon.svg';
      head.appendChild(faviconSvg);
    }
  })();

  /* Inject shared nav CSS immediately (before DOM callbacks) */
  (function injectNavCss() {
    if (document.querySelector('link[href="/nido-nav.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/nido-nav.css';
    document.head.appendChild(link);
  })();

  /* Override --nav-h to 60px immediately so body padding-top is correct */
  document.documentElement.style.setProperty('--nav-h', '60px');

  document.body.classList.add("nido-aaa");
  if (isLogin) {
    document.body.classList.add("nido-login-page");
    return;
  }
  if (isChat) {
    document.body.classList.add("nido-chat-page");
  }

  /* ── ICONS ── */
  const icons = {
    home:    '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h5v-5h4v5h5v-9.5"/></svg>',
    search:  '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>',
    create:  '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    chat:    '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.4-5A8 8 0 1 1 21 12Z"/></svg>',
    more:    '<svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>',
    profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
  };

  /* ── BOTTOM NAV items ── */
  const navItems = [
    { key: "home",   label: "Inicio", href: "/home.html",   match: ["home.html"],              icon: icons.home },
    { key: "search", label: "Buscar", href: "/buscar.html", match: ["buscar.html"],             icon: icons.search },
    { key: "create", label: "Crear",  href: "#crear",       match: [],                          icon: icons.create, create: true },
    { key: "chat",   label: "Chat",   href: "/chat.html",   match: ["chat.html","correo.html"], icon: icons.chat },
    { key: "profile", label: "Perfil", href: "/perfil.html", match: ["perfil.html","perfil-publico.html"], icon: icons.profile }
  ];

  /* ── MORE SHEET links ── */
  const moreLinks = [
    { href: '/grupos.html',       label: 'Grupos',
      icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
    { href: '/marketplace.html',  label: 'Market',
      icon: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
    { href: '/calendario.html',   label: 'Eventos',
      icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
    { href: '/avisos.html',       label: 'Avisos',
      icon: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>' },
    { href: '/ranking.html',      label: 'Ranking',
      icon: '<path d="M6 9H4.5a2.5 2.5 0 0 0 0 5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18"/><path d="M6 9v3a6 6 0 0 0 12 0V9"/><path d="M4 22h16M12 17v5M8 22v-3M16 22v-3"/>' },
    { href: '/recursos.html',     label: 'Apuntes',
      icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
    { href: '/insignias.html',    label: 'Insignias',
      icon: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>' },
    { href: '/configuracion.html', label: 'Config',
      icon: '<circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>' },
  ];

  function activeFor(item) {
    return item.match.some(m => path.endsWith(m));
  }

  function createPostAction(e) {
    e.preventDefault();
    if (path.endsWith("/home.html")) {
      const composer = document.querySelector(".compose textarea, textarea#contenido, textarea[id*='contenido'], textarea");
      if (composer) {
        composer.focus();
        composer.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    window.location.href = "/home.html#crear";
  }

  /* ── DESKTOP NAV INJECTION ── */
  function injectDesktopNav() {
    const existingNav = document.querySelector('body > nav:not(.nido-bottom-nav)');
    if (!existingNav) return;
    if (existingNav.querySelector('.nav-shortcuts')) return; // already built (home.html)

    const shortcuts = [
      { href: '/home.html',       label: 'Inicio',  match: ['home.html'],
        icon: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
      { href: '/marketplace.html', label: 'Market',  match: ['marketplace.html'],
        icon: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
      { href: '/grupos.html',     label: 'Grupos',  match: ['grupos.html'],
        icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
      { href: '/calendario.html', label: 'Eventos', match: ['calendario.html'],
        icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
      { href: '/avisos.html',     label: 'Avisos',  match: ['avisos.html'],
        icon: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>' },
      { href: '/ranking.html',    label: 'Ranking', match: ['ranking.html'],
        icon: '<path d="M6 9H4.5a2.5 2.5 0 0 0 0 5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18"/><path d="M6 9v3a6 6 0 0 0 12 0V9"/><path d="M4 22h16M12 17v5M8 22v-3M16 22v-3"/>' },
      { href: '/recursos.html',   label: 'Apuntes', match: ['recursos.html'],
        icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
    ];

    function sc(matches) {
      return matches.some(m => path.endsWith(m)) ? ' active' : '';
    }

    existingNav.classList.add('nido-desktop-nav');
    existingNav.innerHTML = `
      <div class="nav-left">
        <a class="nav-logo" href="/home.html">Nido<span>TESVG</span></a>
        <div class="nav-search-wrap">
          <input class="nav-search-input" type="text" placeholder="Buscar…"
                 onkeydown="if(event.key==='Enter'&&this.value.trim())window.location.href='/buscar.html?q='+encodeURIComponent(this.value.trim())">
          <span class="nav-search-icon">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
          </span>
        </div>
      </div>

      <div class="nav-shortcuts" role="navigation" aria-label="Secciones">
        ${shortcuts.map(s => `
          <a class="nav-shortcut${sc(s.match)}" href="${s.href}" title="${s.label}">
            <svg viewBox="0 0 24 24">${s.icon}</svg>
            <span>${s.label}</span>
          </a>`).join('')}
      </div>

      <div class="nav-actions">
        <div style="position:relative">
          <button class="notif-btn" id="notif-btn" title="Notificaciones"
                  onclick="if(typeof toggleNotifPanel==='function')toggleNotifPanel()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span class="notif-badge" id="notif-badge"></span>
          </button>
          <div class="notif-panel" id="notif-panel"></div>
        </div>
        <a href="/correo.html" class="nav-icon-link" title="PlumasMail">
          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </a>
        <a href="/chat.html" class="nav-icon-link" title="Chat">
          <svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.4-5A8 8 0 1 1 21 12Z"/></svg>
        </a>
        <button class="nav-icon-link nido-theme-btn" onclick="toggleTheme()" title="${themeTitle(getTheme())}">
          ${themeIcon(getTheme())}
        </button>
        <a href="/configuracion.html" class="nav-icon-link${sc(['configuracion.html'])}" title="Configuración">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
        </a>
        <a href="/perfil.html" style="text-decoration:none">
          <div class="nav-avatar" id="nav-avatar">?</div>
        </a>
      </div>
    `;
  }

  /* ── MOBILE TOP ── */
  function injectMobileTop() {
    if (isChat) return;
    if (document.querySelector(".nido-mobile-top")) return;
    const top = document.createElement("header");
    top.className = "nido-mobile-top";
    top.innerHTML = `
      <div class="nido-mobile-top-inner">
        <a class="nido-mobile-brand" href="/home.html">Nido<span>TESVG</span></a>
        <div class="nido-mobile-actions">
          <button class="nido-mobile-action" id="nido-mob-notif-btn" aria-label="Notificaciones"
                  onclick="if(typeof toggleNotifPanel==='function')toggleNotifPanel()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span class="nido-mob-badge" id="nido-mob-notif-badge"></span>
          </button>
          <a href="/correo.html" class="nido-mobile-action" aria-label="Correo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </a>
          <button class="nido-mobile-action" aria-label="Más opciones" onclick="openMoreMenu()">
            <svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none">
              <rect x="3" y="3" width="7.5" height="7.5" rx="2"/>
              <rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/>
              <rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/>
              <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.insertBefore(top, document.body.firstChild);
  }

  /* ── MORE SHEET ── */
  function buildMoreSheet() {
    const backdrop = document.createElement('div');
    backdrop.id = 'nido-more-backdrop';
    backdrop.addEventListener('click', closeMoreMenu);
    document.body.appendChild(backdrop);

    const sheet = document.createElement('div');
    sheet.id = 'nido-more-sheet';
    sheet.innerHTML =
      '<div class="nido-more-handle"></div>' +
      '<div class="nido-more-header">' +
        '<span class="nido-more-header-title">Más opciones</span>' +
        '<button class="nido-mobile-action nido-theme-btn" onclick="toggleTheme()" aria-label="Cambiar tema">' +
          themeIcon(getTheme()) +
        '</button>' +
      '</div>' +
      '<div class="nido-more-grid">' +
      moreLinks.map(function (link) {
        const active = path === link.href || path.endsWith(link.href.slice(1)) ? ' active' : '';
        return '<a class="nido-more-item' + active + '" href="' + link.href + '">' +
          '<div class="nido-more-ico">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">' + link.icon + '</svg>' +
          '</div>' +
          '<span>' + link.label + '</span>' +
        '</a>';
      }).join('') +
      '</div>';
    document.body.appendChild(sheet);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMoreMenu();
    });
  }

  function openMoreMenu() {
    if (!document.getElementById('nido-more-sheet')) buildMoreSheet();
    const backdrop = document.getElementById('nido-more-backdrop');
    const sheet    = document.getElementById('nido-more-sheet');
    backdrop.classList.add('open');
    sheet.classList.add('open');
    // Mark the "Más" button as active while sheet is open
    const btn = document.querySelector('[data-nido-nav="more"]');
    if (btn) btn.classList.add('active');
  }

  function closeMoreMenu() {
    const backdrop = document.getElementById('nido-more-backdrop');
    const sheet    = document.getElementById('nido-more-sheet');
    if (!backdrop || !sheet) return;
    backdrop.classList.remove('open');
    sheet.classList.remove('open');
    // Restore "Más" active state only if current page is a secondary page
    const btn = document.querySelector('[data-nido-nav="more"]');
    if (btn) {
      const isSecondary = navItems.find(function (i) { return i.key === 'more'; });
      if (!isSecondary || !activeFor(isSecondary)) btn.classList.remove('active');
    }
  }

  window.openMoreMenu = openMoreMenu;
  window.closeMoreMenu = closeMoreMenu;

  /* ── SCROLL HIDE: bottom nav hides on scroll-down, shows on scroll-up ── */
  function setupScrollHide(nav) {
    var lastY = window.scrollY;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.max(0, window.scrollY);
        if (y < 60) {
          nav.classList.remove('nido-nav-hidden');
        } else if (y > lastY + 6) {
          nav.classList.add('nido-nav-hidden');
        } else if (y < lastY - 6) {
          nav.classList.remove('nido-nav-hidden');
        }
        lastY = y;
        ticking = false;
      });
    }, { passive: true });
  }

  /* ── MOBILE BOTTOM NAV ── */
  function injectBottomNav() {
    if (isChat) return;
    if (document.querySelector(".nido-bottom-nav")) return;
    const nav = document.createElement("nav");
    nav.className = "nido-bottom-nav";
    nav.setAttribute("aria-label", "Navegación principal móvil");
    nav.innerHTML = navItems.map(item => {
      const cls = [
        "nido-bottom-link",
        item.create ? "nido-bottom-create" : "",
        activeFor(item) ? "active" : ""
      ].filter(Boolean).join(" ");
      return `<a class="${cls}" href="${item.href}" data-nido-nav="${item.key}" aria-label="${item.label}">
        ${item.icon}<span>${item.label}</span>
      </a>`;
    }).join("");
    document.body.appendChild(nav);
    const create = nav.querySelector('[data-nido-nav="create"]');
    if (create) create.addEventListener("click", createPostAction);
    setupScrollHide(nav);
  }

  function addWatermark() {
    if (document.querySelector(".nido-falcon-watermark")) return;
    const mark = document.createElement("div");
    mark.className = "nido-falcon-watermark";
    mark.setAttribute("aria-hidden", "true");
    document.body.appendChild(mark);
  }

  function enhanceDynamicCards() {
    const selectors = [
      ".post-card", ".my-post", ".aviso-card", ".recurso-card", ".rank-card",
      ".user-card", ".grupo-card", ".badge-card", ".event-item", ".mail-item",
      ".contact-item", ".stat-card", ".report-card"
    ].join(",");
    document.querySelectorAll(selectors).forEach((el, i) => {
      if (!el.dataset.nidoMotion) {
        el.dataset.nidoMotion = "1";
        el.style.animationDelay = Math.min(i * 18, 180) + "ms";
        el.classList.add("nido-animate-in");
      }
    });
  }

  /* Populate nav avatar instantly from cached session — no API round-trip */
  function hydrateNavAvatar() {
    try {
      var s = JSON.parse(localStorage.getItem('nido_session'));
      if (!s) return;
      var el = document.getElementById('nav-avatar');
      if (!el) return;
      var nombre = s.username || s.correo || '?';
      el.textContent = nombre.charAt(0).toUpperCase();
      el.style.position = 'relative';
      el.style.overflow = 'hidden';
      if (s.foto) {
        var img = document.createElement('img');
        img.className = 'avatar-photo-img';
        img.src = s.foto;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function() { img.remove(); };
        el.appendChild(img);
      }
    } catch (_) {}
  }

  /* Mirror desktop notif badge count → mobile topbar badge */
  function syncNotifBadge() {
    var src = document.getElementById('notif-badge');
    var dst = document.getElementById('nido-mob-notif-badge');
    if (!src || !dst) return;
    function sync() {
      var text = src.textContent.trim();
      dst.textContent = text;
      dst.style.display = text ? '' : 'none';
    }
    sync();
    new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true, attributes: true });
  }

  function injectNotifScript() {
    if (document.querySelector('script[src="/nido-notif.js"]')) return;
    const s = document.createElement('script');
    s.src = '/nido-notif.js';
    s.defer = true;
    document.head.appendChild(s);
  }

  function injectPWAScript() {
    if (document.querySelector('script[src="/nido-pwa.js"]')) return;
    const s = document.createElement('script');
    s.src = '/nido-pwa.js';
    s.defer = true;
    document.head.appendChild(s);
  }

  function init() {
    /* Override any page-level logout() with the canonical NidoAuth version */
    window.logout = function () {
      if (window.NidoAuth) { window.NidoAuth.logout(); return; }
      localStorage.removeItem('token');
      localStorage.removeItem('nido_session');
      window.location.replace('/login.html');
    };
    injectDesktopNav();
    hydrateNavAvatar();
    injectMobileTop();
    injectBottomNav();
    syncNotifBadge();
    addWatermark();
    enhanceDynamicCards();
    syncThemeBtns();
    injectNotifScript();
    injectPWAScript();
    const obs = new MutationObserver(enhanceDynamicCards);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
