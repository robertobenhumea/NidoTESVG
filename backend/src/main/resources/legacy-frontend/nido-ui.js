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

    mktCard: `
      <div class="nido-sk-card" style="padding:0;overflow:hidden;border-radius:14px;">
        <div class="nido-skeleton" style="height:180px;border-radius:0;margin-bottom:0;"></div>
        <div style="padding:14px 16px 16px;">
          <div class="nido-skeleton" style="height:13px;width:70%;margin-bottom:8px;"></div>
          <div class="nido-skeleton" style="height:11px;width:45%;margin-bottom:12px;"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div class="nido-skeleton" style="height:18px;width:36%;border-radius:6px;"></div>
            <div class="nido-skeleton" style="height:32px;width:72px;border-radius:20px;"></div>
          </div>
        </div>
      </div>`,

    chatItem: `
      <div class="nido-sk-card" style="display:flex;align-items:center;gap:12px;padding:14px 16px;margin-bottom:2px;border-radius:0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div class="nido-skeleton nido-sk-avatar" style="width:48px;height:48px;flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <div class="nido-skeleton" style="height:13px;width:44%;"></div>
            <div class="nido-skeleton" style="height:10px;width:14%;"></div>
          </div>
          <div class="nido-skeleton" style="height:10px;width:72%;"></div>
        </div>
      </div>`,

    correoItem: `
      <div class="nido-sk-card" style="display:flex;align-items:center;gap:12px;padding:14px 18px;margin-bottom:2px;border-radius:0;">
        <div class="nido-skeleton nido-sk-avatar" style="width:40px;height:40px;flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;margin-bottom:7px;">
            <div class="nido-skeleton" style="height:12px;width:38%;"></div>
            <div class="nido-skeleton" style="height:10px;width:12%;"></div>
          </div>
          <div class="nido-skeleton" style="height:11px;width:80%;margin-bottom:5px;"></div>
          <div class="nido-skeleton" style="height:10px;width:55%;"></div>
        </div>
      </div>`,

    grupoCard: `
      <div class="nido-sk-card" style="padding:0;overflow:hidden;border-radius:14px;">
        <div class="nido-skeleton" style="height:110px;border-radius:0;"></div>
        <div style="padding:14px 16px 16px;">
          <div class="nido-skeleton" style="height:14px;width:55%;margin-bottom:8px;"></div>
          <div class="nido-skeleton" style="height:10px;width:75%;margin-bottom:10px;"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div class="nido-skeleton" style="height:11px;width:30%;"></div>
            <div class="nido-skeleton" style="height:30px;width:80px;border-radius:20px;"></div>
          </div>
        </div>
      </div>`,

    notifItem: `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div class="nido-skeleton" style="width:42px;height:42px;border-radius:50%;flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div class="nido-skeleton" style="height:12px;width:80%;margin-bottom:7px;"></div>
          <div class="nido-skeleton" style="height:10px;width:45%;"></div>
        </div>
      </div>`,

    storyCircle: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">
        <div class="nido-skeleton" style="width:64px;height:64px;border-radius:50%;"></div>
        <div class="nido-skeleton" style="height:9px;width:52px;border-radius:4px;"></div>
      </div>`,

    commentItem: `
      <div style="display:flex;gap:10px;padding:10px 0;">
        <div class="nido-skeleton nido-sk-avatar" style="width:36px;height:36px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="nido-skeleton" style="height:56px;border-radius:12px;margin-bottom:6px;"></div>
          <div style="display:flex;gap:16px;">
            <div class="nido-skeleton" style="height:10px;width:40px;"></div>
            <div class="nido-skeleton" style="height:10px;width:40px;"></div>
          </div>
        </div>
      </div>`,

    repeat(template, n) {
      return template.repeat(n);
    },
  };

  /* ── EMPTY STATES ─────────────────────────────────────── */
  const EMPTY_ICONS = {
    feed:       `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="14" width="48" height="36" rx="6" stroke="currentColor" stroke-width="2.5"/><line x1="16" y1="24" x2="48" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="32" x2="40" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="40" x2="32" y2="40" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    chat:       `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 14h44a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H22l-10 8V18a4 4 0 0 1 4-4z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><line x1="20" y1="26" x2="44" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="34" x2="36" y2="34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    mail:       `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="14" width="48" height="36" rx="5" stroke="currentColor" stroke-width="2.5"/><polyline points="8,14 32,36 56,14" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
    notif:      `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 8a18 18 0 0 1 18 18v10l4 6H10l4-6V26A18 18 0 0 1 32 8z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M27 50a5 5 0 0 0 10 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    market:     `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 20h44l-4 28H14L10 20z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 20V16a10 10 0 0 1 20 0v4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    buscar:     `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="16" stroke="currentColor" stroke-width="2.5"/><line x1="40" y1="40" x2="54" y2="54" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    grupos:     `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="26" r="10" stroke="currentColor" stroke-width="2.5"/><circle cx="42" cy="26" r="10" stroke="currentColor" stroke-width="2.5"/><path d="M8 52c0-8.8 7.2-16 16-16s16 7.2 16 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M42 36c6 0 14 4 14 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    ranking:    `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="34" width="12" height="22" rx="3" stroke="currentColor" stroke-width="2.5"/><rect x="26" y="22" width="12" height="34" rx="3" stroke="currentColor" stroke-width="2.5"/><rect x="44" y="10" width="12" height="46" rx="3" stroke="currentColor" stroke-width="2.5"/></svg>`,
    recursos:   `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 8h24l12 12v36H16V8z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><polyline points="40,8 40,20 52,20" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><line x1="24" y1="34" x2="40" y2="34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="42" x2="36" y2="42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    default:    `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="22" stroke="currentColor" stroke-width="2.5"/><line x1="32" y1="22" x2="32" y2="34" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="32" cy="42" r="2" fill="currentColor"/></svg>`,
  };

  function emptyState(container, opts = {}) {
    const {
      icon  = 'default',
      title = 'Nada por aquí',
      sub   = '',
      cta   = null,    // { label, onClick }
      color = 'var(--gold, #F5A623)',
    } = opts;

    const svg = EMPTY_ICONS[icon] || EMPTY_ICONS.default;
    const ctaHtml = cta
      ? `<button class="btn-primary nido-empty-cta">${cta.label}</button>`
      : '';

    const el = document.createElement('div');
    el.className = 'nido-empty-state';
    el.innerHTML = `
      <div class="nido-empty-icon" style="color:${color}">${svg}</div>
      <div class="nido-empty-title">${title}</div>
      ${sub ? `<div class="nido-empty-sub">${sub}</div>` : ''}
      ${ctaHtml}
    `;

    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (container) {
      container.innerHTML = '';
      container.appendChild(el);
    }

    if (cta?.onClick) {
      el.querySelector('.nido-empty-cta')?.addEventListener('click', cta.onClick);
    }

    return el;
  }

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

  /* ── USER AVATAR MODAL ─────────────────────────────────────── */
  function ensureAvatarModal() {
    if (document.getElementById('nido-avatar-modal')) return;
    const m = document.createElement('div');
    m.id = 'nido-avatar-modal';
    m.className = 'nido-avatar-modal';
    m.innerHTML = `
      <div class="nam-backdrop"></div>
      <div class="nam-content">
        <div class="nam-avatar" id="nam-avatar"></div>
        <div class="nam-name" id="nam-name"></div>
        <a class="nam-btn-perfil" id="nam-btn-perfil" href="#">Ver perfil completo</a>
      </div>
      <button class="nam-close" id="nam-close" aria-label="Cerrar">&times;</button>
    `;
    document.body.appendChild(m);
    m.querySelector('.nam-backdrop').addEventListener('click', cerrarAvatarModal);
    m.querySelector('#nam-close').addEventListener('click', cerrarAvatarModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarAvatarModal(); });
    let startY = 0;
    m.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    m.addEventListener('touchend', e => { if (e.changedTouches[0].clientY - startY > 60) cerrarAvatarModal(); }, { passive: true });
  }

  function abrirAvatarModal(nombre, foto, userId) {
    ensureAvatarModal();
    const avatarEl = document.getElementById('nam-avatar');
    const nameEl   = document.getElementById('nam-name');
    const btnEl    = document.getElementById('nam-btn-perfil');
    nameEl.textContent = nombre || '';
    if (foto) {
      avatarEl.style.cssText = `background: url('${foto}') center/cover no-repeat; font-size:0`;
      avatarEl.textContent = '';
    } else {
      avatarEl.style.cssText = '';
      avatarEl.textContent = nombre ? nombre[0].toUpperCase() : '?';
    }
    if (userId) {
      btnEl.href = `/perfil-publico.html?id=${userId}`;
      btnEl.style.display = 'inline-flex';
    } else {
      btnEl.style.display = 'none';
    }
    document.getElementById('nido-avatar-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function cerrarAvatarModal() {
    const modal = document.getElementById('nido-avatar-modal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.NidoUI = { toast, sk, apiErr, rolBadge, ROL_BADGE, empty: emptyState,
                    abrirAvatarModal, cerrarAvatarModal };
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
