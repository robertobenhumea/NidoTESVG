(function () {
  'use strict';

  // ── Service Worker registration ──────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(function (reg) {
          setInterval(function () { reg.update(); }, 1800000);
        })
        .catch(function () {});
    });
  }

  // ── Install prompt ───────────────────────────────────────────────────────
  // Skip if already running as installed PWA
  if (window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true) {
    return;
  }

  var deferredPrompt = null;
  var DISMISS_KEY = 'nido_pwa_dismiss';

  function wasDismissed() {
    try { return !!sessionStorage.getItem(DISMISS_KEY); } catch (e) { return false; }
  }
  function markDismissed() {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (!wasDismissed()) {
      setTimeout(showBanner, 8000);
    }
  });

  window.addEventListener('appinstalled', function () {
    hideBanner();
    deferredPrompt = null;
    if (typeof showToast === 'function') {
      showToast('ok', 'NidoTESVG instalado correctamente');
    }
  });

  // ── Banner DOM ───────────────────────────────────────────────────────────
  var banner = null;

  function buildBanner() {
    injectStyles();

    banner = document.createElement('div');
    banner.id = 'nido-install-banner';
    banner.innerHTML =
      '<div class="nido-pwa-icon">' +
        '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">' +
          '<defs>' +
            '<linearGradient id="pig" x1="0" y1="0" x2="1" y2="1">' +
              '<stop offset="0%" stop-color="#ffe0a0"/>' +
              '<stop offset="48%" stop-color="#F5A623"/>' +
              '<stop offset="100%" stop-color="#b8720a"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<rect width="512" height="512" rx="110" fill="#09090d"/>' +
          '<polyline points="152,364 152,148 360,364 360,148"' +
            ' fill="none" stroke="url(#pig)" stroke-width="56"' +
            ' stroke-linejoin="round" stroke-linecap="round"/>' +
        '</svg>' +
      '</div>' +
      '<div class="nido-pwa-text">' +
        '<strong>Instala NidoTESVG</strong>' +
        '<span>Accede rápido desde tu pantalla de inicio</span>' +
      '</div>' +
      '<button class="nido-pwa-btn" id="nido-pwa-install">Instalar</button>' +
      '<button class="nido-pwa-close" id="nido-pwa-close" aria-label="Cerrar">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"' +
          ' stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/>' +
          '<line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>';

    document.body.appendChild(banner);

    document.getElementById('nido-pwa-install').addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (r) {
        if (r.outcome === 'accepted') hideBanner();
        deferredPrompt = null;
      });
    });

    document.getElementById('nido-pwa-close').addEventListener('click', function () {
      hideBanner();
      markDismissed();
    });

    // animate in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.classList.add('nido-pwa-visible');
      });
    });
  }

  function showBanner() {
    if (wasDismissed() || !deferredPrompt) return;
    if (!banner) buildBanner();
    else banner.classList.add('nido-pwa-visible');
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('nido-pwa-visible');
    setTimeout(function () {
      if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
      banner = null;
    }, 320);
  }

  // ── Styles ───────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('nido-pwa-styles')) return;
    var s = document.createElement('style');
    s.id = 'nido-pwa-styles';
    s.textContent = [
      '#nido-install-banner {',
        'position: fixed;',
        'bottom: calc(86px + env(safe-area-inset-bottom, 0px));',
        'left: 12px; right: 12px;',
        'z-index: 99999;',
        'display: flex;',
        'align-items: center;',
        'gap: 10px;',
        'padding: 12px 14px;',
        'border-radius: 20px;',
        'border: 1px solid rgba(245,166,35,0.22);',
        'background: rgba(12,11,16,0.92);',
        'backdrop-filter: blur(24px) saturate(160%);',
        '-webkit-backdrop-filter: blur(24px) saturate(160%);',
        'box-shadow: 0 20px 60px rgba(0,0,0,0.56), 0 0 36px rgba(245,166,35,0.12);',
        'transform: translateY(24px);',
        'opacity: 0;',
        'transition: transform .32s cubic-bezier(.2,.9,.2,1), opacity .28s ease;',
        'max-width: 480px;',
        'margin: 0 auto;',
      '}',
      '@media (min-width: 761px) {',
        '#nido-install-banner {',
          'bottom: 24px;',
          'left: auto;',
          'right: 24px;',
          'width: 340px;',
          'max-width: 340px;',
        '}',
      '}',
      '#nido-install-banner.nido-pwa-visible {',
        'transform: translateY(0);',
        'opacity: 1;',
      '}',
      '.nido-pwa-icon {',
        'flex-shrink: 0;',
        'width: 44px; height: 44px;',
        'border-radius: 13px;',
        'overflow: hidden;',
      '}',
      '.nido-pwa-icon svg { width: 44px; height: 44px; display: block; }',
      '.nido-pwa-text {',
        'flex: 1;',
        'min-width: 0;',
        'display: flex;',
        'flex-direction: column;',
        'gap: 2px;',
      '}',
      '.nido-pwa-text strong {',
        'font-size: 13px;',
        'font-weight: 800;',
        'color: #eeede9;',
        'letter-spacing: -0.01em;',
      '}',
      '.nido-pwa-text span {',
        'font-size: 11px;',
        'color: rgba(238,237,233,0.50);',
        'white-space: nowrap;',
        'overflow: hidden;',
        'text-overflow: ellipsis;',
      '}',
      '.nido-pwa-btn {',
        'flex-shrink: 0;',
        'padding: 0 14px;',
        'height: 36px;',
        'border-radius: 10px;',
        'border: none;',
        'background: linear-gradient(135deg, #ffe0a0, #F5A623 48%, #b8720a);',
        'color: #08080b;',
        'font-size: 12px;',
        'font-weight: 800;',
        'cursor: pointer;',
        'box-shadow: 0 4px 16px rgba(245,166,35,0.28);',
        'transition: transform .16s ease;',
      '}',
      '.nido-pwa-btn:active { transform: scale(.95); }',
      '.nido-pwa-close {',
        'flex-shrink: 0;',
        'width: 32px; height: 32px;',
        'border-radius: 8px;',
        'border: 1px solid rgba(255,255,255,0.08);',
        'background: rgba(255,255,255,0.04);',
        'color: rgba(238,237,233,0.45);',
        'cursor: pointer;',
        'display: flex; align-items: center; justify-content: center;',
        'transition: background .16s ease, color .16s ease;',
      '}',
      '.nido-pwa-close svg { width: 16px; height: 16px; }',
      '.nido-pwa-close:hover { background: rgba(255,255,255,0.09); color: #eeede9; }',
      // Light mode overrides
      'html[data-theme="light"] #nido-install-banner {',
        'background: rgba(246,245,241,0.96) !important;',
        'border: 1px solid rgba(0,0,0,0.09) !important;',
        'box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06) !important;',
      '}',
      'html[data-theme="light"] .nido-pwa-text strong { color: #1C1B17 !important; }',
      'html[data-theme="light"] .nido-pwa-text span { color: rgba(28,27,23,0.48) !important; }',
      'html[data-theme="light"] .nido-pwa-close {',
        'border-color: rgba(0,0,0,0.10) !important;',
        'background: rgba(0,0,0,0.04) !important;',
        'color: rgba(28,27,23,0.40) !important;',
      '}',
      'html[data-theme="light"] .nido-pwa-close:hover {',
        'background: rgba(0,0,0,0.08) !important;',
        'color: #1C1B17 !important;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

})();
