/* NidoTESVG — Sistema de Notificaciones AAA */
(function NidoNotif() {
  'use strict';

  /* ── SVG ICONS ──────────────────────────────────────────────────── */
  var ICO = {
    heart:    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    comment:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    follow:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
    share:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    cart:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    announce: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    mail:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    bell:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    inbox:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  };

  /* ── TIPO CONFIG ─────────────────────────────────────────────────── */
  var TIPO = {
    like:        { label:'Social',  color:'#F87171', bg:'rgba(248,113,113,.15)', icon:ICO.heart,    cat:'social'              },
    comentario:  { label:'Social',  color:'#60A5FA', bg:'rgba(96,165,250,.15)',  icon:ICO.comment,  cat:'social'              },
    seguidor:    { label:'Social',  color:'#A78BFA', bg:'rgba(167,139,250,.15)', icon:ICO.follow,   cat:'social'              },
    compartir:   { label:'Social',  color:'#34D399', bg:'rgba(52,211,153,.15)',  icon:ICO.share,    cat:'social'              },
    COMPRA:      { label:'Mercado', color:'#FB923C', bg:'rgba(251,146,60,.15)',  icon:ICO.cart,     cat:'mercado', prio:'orange'},
    comunicado:  { label:'Oficial', color:'#F5A623', bg:'rgba(245,166,35,.15)',  icon:ICO.announce, cat:'inst',    prio:'gold'  },
    aviso:       { label:'Aviso',   color:'#F5A623', bg:'rgba(245,166,35,.15)',  icon:ICO.bell,     cat:'inst',    prio:'gold'  },
    mensaje_doc: { label:'Docente', color:'#60A5FA', bg:'rgba(96,165,250,.15)',  icon:ICO.mail,     cat:'inst'                },
    evento:      { label:'Evento',  color:'#A78BFA', bg:'rgba(167,139,250,.15)', icon:ICO.calendar, cat:'eventos'             },
  };

  var NAV_MAP = {
    like:'/home.html', comentario:'/home.html', compartir:'/home.html',
    seguidor:'/perfil.html',
    COMPRA:'/marketplace.html',
    comunicado:'/avisos.html', aviso:'/avisos.html',
    mensaje_doc:'/correo.html',
    evento:'/calendario.html',
  };

  /* ── STATE ───────────────────────────────────────────────────────── */
  var _isOpen  = false;
  var _built   = false;
  var _filter  = 'all';
  var _notifs  = [];

  /* ── HELPERS ─────────────────────────────────────────────────────── */
  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function timeAgo(d) {
    if (!d) return '';
    var ms = Date.now() - new Date(d).getTime();
    if (isNaN(ms) || ms < 0) return '';
    var s = ms / 1000;
    if (s < 60)     return 'Ahora';
    if (s < 3600)   return Math.floor(s / 60) + ' min';
    if (s < 86400)  return Math.floor(s / 3600) + 'h';
    if (s < 604800) return Math.floor(s / 86400) + 'd';
    var dt = new Date(d);
    return dt.toLocaleDateString('es-MX', { day:'numeric', month:'short' });
  }

  function groupByDay(arr) {
    var now   = Date.now();
    var today = +new Date(new Date().toDateString());
    var yest  = today - 86400000;
    var week  = today - 7 * 86400000;
    var gs    = [
      { label:'Hoy',         items:[] },
      { label:'Ayer',        items:[] },
      { label:'Esta semana', items:[] },
      { label:'Antes',       items:[] },
    ];
    arr.forEach(function(n) {
      var d = n.fecha ? +new Date(new Date(n.fecha).toDateString()) : now;
      if      (d >= today) gs[0].items.push(n);
      else if (d >= yest)  gs[1].items.push(n);
      else if (d >= week)  gs[2].items.push(n);
      else                 gs[3].items.push(n);
    });
    return gs.filter(function(g) { return g.items.length; });
  }

  function tok()  { return localStorage.getItem('token') || ''; }
  function authH(){ return { Authorization:'Bearer ' + tok() }; }

  /* ── API ─────────────────────────────────────────────────────────── */
  async function fetchCount() {
    try {
      var r = await fetch('/notificaciones/no-leidas', { headers: authH() });
      return r.ok ? ((await r.json()).count || 0) : 0;
    } catch(e) { return 0; }
  }

  async function fetchAll() {
    try {
      var r = await fetch('/notificaciones', { headers: authH() });
      return r.ok ? (await r.json()) : [];
    } catch(e) { return []; }
  }

  async function markAllRead() {
    try { await fetch('/notificaciones/leer-todas', { method:'PUT', headers: authH() }); } catch(e){}
    _notifs.forEach(function(n){ n.leida = true; });
    updateBadge(0);
    document.querySelectorAll('.nf-item').forEach(function(el){
      el.classList.remove('nf-unread');
      var dot = el.querySelector('.nf-dot');
      if (dot) dot.remove();
    });
  }

  async function markOneRead(id) {
    try { await fetch('/notificaciones/' + id + '/leer', { method:'PUT', headers: authH() }); } catch(e){}
    var n = _notifs.find(function(x){ return x.id === id; });
    if (n) n.leida = true;
    updateBadge(Math.max(0, badgeCount() - 1));
  }

  /* ── BADGE ───────────────────────────────────────────────────────── */
  function badgeCount() {
    var el = document.getElementById('notif-badge');
    var n  = parseInt(el ? el.textContent : '');
    return isNaN(n) ? 0 : n;
  }

  function updateBadge(n) {
    ['notif-badge','nido-mob-notif-badge'].forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      if (n > 0) { el.textContent = n > 99 ? '99+' : n; el.style.display = 'flex'; }
      else       { el.textContent = '';                   el.style.display = 'none'; }
    });
  }

  /* ── RENDER ──────────────────────────────────────────────────────── */
  function renderItem(n) {
    var cfg     = TIPO[n.tipo] || { label:'', color:'#9CA3AF', bg:'rgba(156,163,175,.15)', icon:ICO.bell };
    var unread  = !n.leida;
    var pCls    = cfg.prio ? (' nf-prio-' + cfg.prio) : '';
    var catHtml = cfg.label
      ? '<span class="nf-cat nf-cat--' + (cfg.cat||'') + '">' + cfg.label + '</span>'
      : '';
    return '<div class="nf-item' + (unread ? ' nf-unread' : '') + pCls + '"'
         + ' data-id="' + n.id + '" data-tipo="' + esc(n.tipo) + '" data-ref="' + (n.referenciaId||'') + '">'
         + '<div class="nf-icon-wrap" style="--nf-c:' + cfg.color + ';--nf-bg:' + cfg.bg + '">'
           + cfg.icon
         + '</div>'
         + '<div class="nf-body">'
           + '<div class="nf-text">' + esc(n.mensaje) + '</div>'
           + '<div class="nf-meta">'
             + '<span class="nf-time">' + timeAgo(n.fecha) + '</span>'
             + catHtml
           + '</div>'
         + '</div>'
         + (unread ? '<div class="nf-dot"></div>' : '')
         + '</div>';
  }

  function renderList() {
    var list = document.getElementById('nf-list');
    if (!list) return;

    var items = _filter === 'all'
      ? _notifs
      : _notifs.filter(function(n){ return (TIPO[n.tipo] || {}).cat === _filter; });

    if (!items.length) {
      if (window.NidoUI?.empty) {
        window.NidoUI.empty(list, {
          icon: 'notif',
          title: 'Sin notificaciones',
          sub: _filter !== 'all' ? 'No hay nada en esta categoría' : 'Estás al día con todo',
          color: 'var(--gold, #F5A623)',
        });
      } else {
        list.innerHTML = '<div class="nf-empty">' + ICO.inbox
          + '<span>Sin notificaciones' + (_filter !== 'all' ? ' en esta categoría' : '') + '</span>'
          + '</div>';
      }
      return;
    }

    var html = '';
    groupByDay(items).forEach(function(g){
      html += '<div class="nf-day-label">' + g.label + '</div>';
      g.items.forEach(function(n){ html += renderItem(n); });
    });
    list.innerHTML = html;

    list.querySelectorAll('.nf-item').forEach(function(el){
      el.addEventListener('click', function(){
        var id   = parseInt(el.dataset.id, 10);
        var tipo = el.dataset.tipo;
        if (el.classList.contains('nf-unread')) markOneRead(id);
        closePanel();
        var url = NAV_MAP[tipo];
        if (url) window.location.href = url;
      });
    });
  }

  /* ── PANEL BUILD ─────────────────────────────────────────────────── */
  function buildPanel() {
    var panel = document.getElementById('notif-panel');
    if (!panel || _built) return;
    panel.innerHTML =
      '<div class="nf-header">'
        + '<span class="nf-title">Notificaciones</span>'
        + '<button class="nf-mark-all" id="nf-mark-all">Marcar leídas</button>'
      + '</div>'
      + '<div class="nf-tabs" id="nf-tabs">'
        + '<button class="nf-tab nf-tab-active" data-f="all">Todas</button>'
        + '<button class="nf-tab" data-f="social">Social</button>'
        + '<button class="nf-tab" data-f="mercado">Mercado</button>'
        + '<button class="nf-tab" data-f="inst">Inst.</button>'
      + '</div>'
      + '<div class="nf-list" id="nf-list">'
        + '<div class="nf-loading">Cargando...</div>'
      + '</div>';

    var markBtn = document.getElementById('nf-mark-all');
    if (markBtn) markBtn.addEventListener('click', function(e){ e.stopPropagation(); markAllRead(); });

    var tabsEl = document.getElementById('nf-tabs');
    if (tabsEl) {
      tabsEl.addEventListener('click', function(e){
        var tab = e.target.closest('.nf-tab');
        if (!tab) return;
        tabsEl.querySelectorAll('.nf-tab').forEach(function(t){ t.classList.remove('nf-tab-active'); });
        tab.classList.add('nf-tab-active');
        _filter = tab.dataset.f || 'all';
        renderList();
      });
    }
    _built = true;
  }

  /* ── OPEN / CLOSE ────────────────────────────────────────────────── */
  function openPanel() {
    var panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.style.display = 'flex';
    panel.classList.add('nf-open');
    _isOpen = true;
  }

  function closePanel() {
    var panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.style.display = 'none';
    panel.classList.remove('nf-open');
    _isOpen = false;
  }

  /* ── PUBLIC API ──────────────────────────────────────────────────── */
  window.toggleNotifPanel = async function() {
    if (_isOpen) { closePanel(); return; }
    openPanel();
    buildPanel();
    var list = document.getElementById('nf-list');
    if (list) list.innerHTML = (window.NidoUI?.sk?.notifItem || '<div class="nf-loading">Cargando...</div>').repeat(window.NidoUI?.sk?.notifItem ? 5 : 1);
    _notifs = await fetchAll();
    renderList();
  };

  window.cargarContadorNotif = async function() {
    if (!tok()) return;
    updateBadge(await fetchCount());
  };

  window.recibirNotifWebSocket = function(notif) {
    updateBadge(badgeCount() + 1);
    var btn = document.getElementById('notif-btn');
    if (btn) { btn.classList.add('ring'); setTimeout(function(){ btn.classList.remove('ring'); }, 600); }
    if (_isOpen) { _notifs.unshift(notif); renderList(); }
  };

  window.renderNotifPanel = function(notifs) { _notifs = notifs; if (_isOpen) renderList(); };

  /* ── INIT ────────────────────────────────────────────────────────── */
  function init() {
    document.addEventListener('click', function(e){
      if (!_isOpen) return;
      var panel = document.getElementById('notif-panel');
      var b1    = document.getElementById('notif-btn');
      var b2    = document.getElementById('nido-mob-notif-btn');
      if (!panel) return;
      if (!panel.contains(e.target)
        && !(b1 && b1.contains(e.target))
        && !(b2 && b2.contains(e.target))) closePanel();
    });

    if (tok()) {
      window.cargarContadorNotif();
      setInterval(window.cargarContadorNotif, 30000);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
