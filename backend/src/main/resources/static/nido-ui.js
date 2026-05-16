/* NidoTESVG Design System — nido-ui.js */

/* ── THEME PRELOADER + TOKEN EXPIRY GUARD — runs immediately ── */
(function () {
  try {
    var p = JSON.parse(localStorage.getItem('nido_prefs') || '{}');
    var h = document.documentElement;
    var theme = p.darkMode === false ? 'light' : 'dark';
    h.setAttribute('data-theme', theme);
    if (p.fontSize && p.fontSize !== 'normal') h.setAttribute('data-fontsize', p.fontSize);
    if (p.accentColor && p.accentColor !== 'gold') h.setAttribute('data-accent', p.accentColor);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  /* Clear expired JWT before any page script reads it */
  try {
    var tok = localStorage.getItem('token');
    if (tok) {
      var pl = tok.split('.');
      if (pl.length === 3 && JSON.parse(atob(pl[1])).exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        localStorage.removeItem('nido_session');
      }
    }
  } catch (_) {}
})();

(function () {
  'use strict';

  function loadAaaShell() {
    if (document.querySelector('script[src="/nido-layout.js"]')) return;
    const script = document.createElement('script');
    script.src = '/nido-layout.js';
    script.defer = true;
    document.head.appendChild(script);
  }

  /* ── TOAST ───────────────────────────────────────────── */
  const TOAST_DURATION = 4000;
  const ICONS = { ok: '✓', err: '✕', warn: '!', info: 'i' };
  const TITLES = { ok: 'Listo', err: 'Error', warn: 'Advertencia', info: 'Info' };

  function ensureContainer() {
    let c = document.getElementById('nido-toasts');
    if (!c) {
      c = document.createElement('div');
      c.id = 'nido-toasts';
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(type, msg, opts = {}) {
    const container = ensureContainer();
    const duration  = opts.duration ?? TOAST_DURATION;
    const title     = opts.title   ?? TITLES[type];

    const toast = document.createElement('div');
    toast.className = `nido-toast ${type}`;
    toast.innerHTML = `
      <div class="nido-toast-ico">${ICONS[type]}</div>
      <div class="nido-toast-body">
        <div class="nido-toast-title">${title}</div>
        <div class="nido-toast-msg">${msg}</div>
      </div>
      <button class="nido-toast-x" aria-label="Cerrar">✕</button>
      <div class="nido-toast-bar" style="animation-duration:${duration}ms"></div>
    `;

    container.appendChild(toast);

    const dismiss = () => {
      toast.classList.add('nido-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };

    toast.querySelector('.nido-toast-x').addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
    return toast;
  }

  const toast = {
    show:  (msg, opts) => showToast('info', msg, opts),
    ok:    (msg, opts) => showToast('ok',   msg, opts),
    error: (msg, opts) => showToast('err',  msg, opts),
    warn:  (msg, opts) => showToast('warn', msg, opts),
    info:  (msg, opts) => showToast('info', msg, opts),
  };

  /* ── SKELETON TEMPLATES ───────────────────────────────── */
  const sk = {
    rankCard: `
      <div class="nido-sk-card" style="display:flex;align-items:center;gap:14px;padding:14px 18px;">
        <div class="nido-skeleton" style="width:30px;height:20px;border-radius:4px;flex-shrink:0;"></div>
        <div class="nido-skeleton nido-sk-avatar" style="width:46px;height:46px;flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div class="nido-skeleton" style="height:14px;width:55%;margin-bottom:7px;"></div>
          <div class="nido-skeleton" style="height:11px;width:38%;"></div>
        </div>
        <div class="nido-skeleton" style="width:54px;height:26px;border-radius:20px;flex-shrink:0;"></div>
      </div>`,

    avisoCard: `
      <div class="nido-sk-card">
        <div class="nido-sk-row">
          <div class="nido-skeleton nido-sk-avatar" style="width:38px;height:38px;"></div>
          <div style="flex:1;">
            <div class="nido-skeleton" style="height:13px;width:60%;margin-bottom:7px;"></div>
            <div class="nido-skeleton" style="height:10px;width:35%;"></div>
          </div>
        </div>
        <div class="nido-skeleton" style="height:11px;width:100%;margin-bottom:6px;"></div>
        <div class="nido-skeleton" style="height:11px;width:80%;"></div>
      </div>`,

    recursoCard: `
      <div class="nido-sk-card" style="display:flex;align-items:center;gap:14px;">
        <div class="nido-skeleton" style="width:42px;height:42px;border-radius:8px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="nido-skeleton" style="height:13px;width:65%;margin-bottom:7px;"></div>
          <div class="nido-skeleton" style="height:10px;width:40%;"></div>
        </div>
        <div class="nido-skeleton" style="width:80px;height:32px;border-radius:8px;flex-shrink:0;"></div>
      </div>`,

    feedCard: `
      <div class="nido-sk-card">
        <div class="nido-sk-row">
          <div class="nido-skeleton nido-sk-avatar" style="width:44px;height:44px;"></div>
          <div style="flex:1;">
            <div class="nido-skeleton" style="height:13px;width:50%;margin-bottom:7px;"></div>
            <div class="nido-skeleton" style="height:10px;width:28%;"></div>
          </div>
        </div>
        <div class="nido-skeleton" style="height:11px;width:100%;margin-bottom:6px;"></div>
        <div class="nido-skeleton" style="height:11px;width:90%;margin-bottom:6px;"></div>
        <div class="nido-skeleton" style="height:11px;width:72%;margin-bottom:14px;"></div>
        <div style="display:flex;gap:16px;">
          <div class="nido-skeleton" style="height:28px;width:64px;border-radius:8px;"></div>
          <div class="nido-skeleton" style="height:28px;width:64px;border-radius:8px;"></div>
        </div>
      </div>`,

    userRow: `
      <div class="nido-sk-card" style="display:flex;align-items:center;gap:12px;padding:12px 16px;">
        <div class="nido-skeleton nido-sk-avatar" style="width:42px;height:42px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="nido-skeleton" style="height:12px;width:48%;margin-bottom:7px;"></div>
          <div class="nido-skeleton" style="height:10px;width:30%;"></div>
        </div>
        <div class="nido-skeleton" style="width:88px;height:32px;border-radius:20px;flex-shrink:0;"></div>
      </div>`,

    repeat(template, n) {
      return template.repeat(n);
    },
  };

  /* ── RIPPLE ───────────────────────────────────────────── */
  function addRipple(e) {
    const btn  = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const rip  = document.createElement('span');
    const size = Math.max(rect.width, rect.height) * 2;
    rip.style.cssText = `
      position:absolute;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px;
      width:${size}px;height:${size}px;border-radius:50%;
      background:rgba(255,255,255,.22);pointer-events:none;
      animation:nido-ripple .55s ease-out both;
    `;
    btn.appendChild(rip);
    rip.addEventListener('animationend', () => rip.remove(), { once: true });
  }

  function initRipples() {
    const sel = '.btn-primary,.btn-follow,.btn-compose,.btn-nav,.btn-outline,.btn-search,.btn-topnav,.btn-download,.filter-tab,.filter-chip,.tab-btn';
    document.querySelectorAll(sel).forEach(btn => {
      if (!btn.dataset.ripple) {
        btn.addEventListener('click', addRipple);
        btn.dataset.ripple = '1';
      }
    });
  }

  /* ── OVERRIDE alert/confirm ───────────────────────────── */
  const _alert = window.alert.bind(window);
  window.alert = function (msg) {
    showToast('info', String(msg));
  };

  /* ── SMOOTH FETCH ERROR HELPER ────────────────────────── */
  function apiErr(err) {
    const msg = err?.message || 'Ocurrió un error inesperado';
    showToast('err', msg);
  }

  /* ── INIT ─────────────────────────────────────────────── */
  function init() {
    initRipples();
    /* Re-run ripple init after dynamic content changes */
    const obs = new MutationObserver(() => initRipples());
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  loadAaaShell();

  /* ── ROL BADGE ────────────────────────────────────────── */
  const ROL_BADGE = {
    ESTUDIANTE:     { icon: '🎓', label: 'Estudiante',     color: '#1A1A2E' },
    DOCENTE:        { icon: '👨‍🏫', label: 'Docente',        color: '#1971C2' },
    AUTORIDAD:      { icon: '🏛️', label: 'Autoridad',      color: '#862E9C' },
    ADMINISTRATIVO: { icon: '📋', label: 'Administrativo', color: '#2F9E44' },
    PERSONAL:       { icon: '🔧', label: 'Personal',       color: '#E67700' },
    ADMIN:          { icon: '👑', label: 'Admin',          color: '#C92A2A' },
  };

  function rolBadge(rol, opts = {}) {
    if (!rol || rol === 'ESTUDIANTE') return '';
    const cfg = ROL_BADGE[rol] || { icon: '👤', label: rol, color: '#65676B' };
    const style = [
      'display:inline-flex', 'align-items:center', 'gap:3px',
      'font-size:.68rem', 'font-weight:700',
      'padding:2px 7px', 'border-radius:20px', 'margin-left:6px',
      'white-space:nowrap', 'vertical-align:middle',
      `background:${cfg.color}18`, `color:${cfg.color}`, `border:1px solid ${cfg.color}40`,
      opts.style || ''
    ].join(';');
    return `<span style="${style}">${cfg.icon} ${cfg.label}</span>`;
  }

  window.NidoUI = { toast, sk, apiErr, rolBadge, ROL_BADGE };
})();

/* ── NIDO AUTH — session persistence helper ── */
window.NidoAuth = (function () {
  const T = 'token';
  const S = 'nido_session';

  function isExpired(token) {
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      return p.exp * 1000 < Date.now();
    } catch { return true; }
  }

  function isValid() {
    const t = localStorage.getItem(T);
    return !!t && !isExpired(t);
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(S)); } catch { return null; }
  }

  function save(token, user) {
    localStorage.setItem(T, token.trim());
    if (user) {
      localStorage.setItem(S, JSON.stringify({
        id:       user.id            || null,
        username: user.username      || user.correo || '',
        correo:   user.correo        || '',
        foto:     user.fotoPerfil    || null,
        rol:      user.rol           || 'ESTUDIANTE'
      }));
    }
  }

  function clear() {
    localStorage.removeItem(T);
    localStorage.removeItem(S);
  }

  function logout() {
    clear();
    window.location.replace('/login.html');
  }

  function requireAuth() {
    if (!isValid()) logout();
  }

  return { isExpired, isValid, getSession, save, clear, logout, requireAuth };
})();
