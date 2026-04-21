/**
 * Panel de Notificaciones — Minera Pataz
 * Se auto-inyecta en cualquier página que tenga .topbar
 */
(function () {
  'use strict';

  var API = window.BACKEND_URL || 'http://localhost:8000';
  var _interval = null;
  var _open = false;
  var _notifs = [];

  function tok() { return localStorage.getItem('token') || ''; }

  // ── CSS ──────────────────────────────────────────────────────────────
  var CSS = [
    /* botón campana */
    '.notif-btn{position:relative;display:flex;align-items:center;justify-content:center;',
    'width:34px;height:34px;border-radius:6px;border:1px solid var(--border,#DDE0E8);',
    'background:transparent;cursor:pointer;color:var(--text-secondary,#4A5568);',
    'transition:all .15s;flex-shrink:0;padding:0;}',
    '.notif-btn:hover{border-color:var(--orange,#C9960C);color:var(--orange,#C9960C);}',
    '.notif-btn svg{width:16px;height:16px;pointer-events:none;}',

    /* badge rojo */
    '.notif-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;',
    'background:var(--red,#B83232);color:#fff;font-size:9px;font-weight:700;',
    'font-family:"JetBrains Mono",monospace;border-radius:8px;padding:0 4px;',
    'align-items:center;justify-content:center;',
    'border:1.5px solid var(--bg-panel,#fff);display:none;}',

    /* dropdown panel */
    '.notif-panel{position:fixed;top:53px;right:16px;width:340px;max-height:420px;',
    'background:var(--bg-panel,#fff);border:1px solid var(--border,#DDE0E8);',
    'border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.18);',
    'z-index:9999;display:none;flex-direction:column;overflow:hidden;',
    'animation:notifFadeIn .15s ease;}',
    '.notif-panel.open{display:flex;}',
    '@keyframes notifFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}',

    /* header del panel */
    '.notif-panel-head{display:flex;align-items:center;justify-content:space-between;',
    'padding:12px 14px;border-bottom:1px solid var(--border,#DDE0E8);flex-shrink:0;}',
    '.notif-panel-title{font-family:"Barlow Condensed",sans-serif;font-size:13px;',
    'font-weight:700;letter-spacing:.06em;text-transform:uppercase;',
    'color:var(--text-primary,#1A2035);}',
    '.notif-read-all{font-size:10px;font-weight:700;color:var(--orange,#C9960C);',
    'cursor:pointer;background:none;border:none;padding:0;letter-spacing:.05em;',
    'text-transform:uppercase;transition:opacity .15s;font-family:inherit;}',
    '.notif-read-all:hover{opacity:.7;}',

    /* lista de notificaciones */
    '.notif-list{overflow-y:auto;flex:1;}',
    '.notif-list::-webkit-scrollbar{width:3px;}',
    '.notif-list::-webkit-scrollbar-thumb{background:var(--border-bright,#C8CDD8);border-radius:2px;}',

    /* item */
    '.notif-item{display:flex;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border,#DDE0E8);',
    'cursor:pointer;transition:background .1s;position:relative;}',
    '.notif-item:last-child{border-bottom:none;}',
    '.notif-item:hover{background:var(--bg-hover,#ECEEF2);}',
    '.notif-item.unread{background:var(--orange-glow,rgba(201,150,12,.07));}',
    '.notif-item.unread:hover{background:var(--orange-glow,rgba(201,150,12,.12));}',
    '.notif-dot{width:7px;height:7px;border-radius:50%;background:var(--orange,#C9960C);',
    'flex-shrink:0;margin-top:5px;}',
    '.notif-dot.read{background:var(--border-bright,#C8CDD8);}',
    '.notif-content{flex:1;min-width:0;}',
    '.notif-titulo{font-size:12px;font-weight:600;color:var(--text-primary,#1A2035);',
    'margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.notif-mensaje{font-size:11px;color:var(--text-secondary,#4A5568);line-height:1.4;',
    'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '.notif-fecha{font-size:9px;font-family:"JetBrains Mono",monospace;',
    'color:var(--text-muted,#8A95A8);margin-top:4px;}',

    /* empty state */
    '.notif-empty{padding:36px 20px;text-align:center;color:var(--text-muted,#8A95A8);}',
    '.notif-empty svg{width:28px;height:28px;margin-bottom:10px;opacity:.3;}',
    '.notif-empty p{font-size:12px;}',
  ].join('');

  function injectCSS() {
    if (document.getElementById('notif-style')) return;
    var s = document.createElement('style');
    s.id = 'notif-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── DETECTAR SI BELL NECESITA margin-left:auto ───────────────────────
  function bellNeedsAutoMargin(topbar) {
    var autoClasses = /\b(ml-auto|topbar-date|topbar-right|clock-dev)\b/;
    for (var i = 0; i < topbar.children.length; i++) {
      var ch = topbar.children[i];
      if (ch.style.marginLeft === 'auto') return false;
      if (autoClasses.test(ch.className || '')) return false;
    }
    return true;
  }

  // ── CREAR ELEMENTOS ──────────────────────────────────────────────────
  function buildBell() {
    var btn = document.createElement('button');
    btn.className = 'notif-btn';
    btn.id = 'notif-btn';
    btn.title = 'Notificaciones';
    btn.setAttribute('aria-label', 'Notificaciones');
    btn.innerHTML = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>',
      '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      '</svg>',
      '<span class="notif-badge" id="notif-badge">0</span>',
    ].join('');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePanel();
    });
    return btn;
  }

  function buildPanel() {
    var div = document.createElement('div');
    div.className = 'notif-panel';
    div.id = 'notif-panel';
    div.innerHTML = [
      '<div class="notif-panel-head">',
      '  <span class="notif-panel-title">Notificaciones</span>',
      '  <button class="notif-read-all" id="notif-read-all">Marcar todas leídas</button>',
      '</div>',
      '<div class="notif-list" id="notif-list">',
      '  <div class="notif-empty">',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
      '      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>',
      '      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      '    </svg>',
      '    <p>Cargando...</p>',
      '  </div>',
      '</div>',
    ].join('');
    div.querySelector('#notif-read-all').addEventListener('click', function (e) {
      e.stopPropagation();
      markAllRead();
    });
    return div;
  }

  // ── API ──────────────────────────────────────────────────────────────
  async function apiFetch(path, opts) {
    opts = opts || {};
    try {
      var r = await fetch(API + path, {
        headers: Object.assign(
          { 'Authorization': 'Bearer ' + tok(), 'Content-Type': 'application/json' },
          opts.headers || {}
        ),
        method: opts.method || 'GET',
        body: opts.body || undefined,
      });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  async function loadNotifications() {
    if (!tok()) return;
    var data = await apiFetch('/notificaciones/');
    if (!data) return;
    _notifs = data;
    render(_notifs);
  }

  async function markRead(id) {
    await apiFetch('/notificaciones/' + id + '/leer', { method: 'PATCH' });
    var n = _notifs.find(function (x) { return x.id === id; });
    if (n) n.leida = true;
    render(_notifs);
  }

  async function markAllRead() {
    await apiFetch('/notificaciones/leer-todas', { method: 'PATCH' });
    _notifs.forEach(function (n) { n.leida = true; });
    render(_notifs);
  }

  // ── RENDER ───────────────────────────────────────────────────────────
  function render(notifs) {
    var list   = document.getElementById('notif-list');
    var badge  = document.getElementById('notif-badge');
    if (!list || !badge) return;

    var unread = notifs.filter(function (n) { return !n.leida; }).length;

    /* badge */
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }

    /* lista */
    if (notifs.length === 0) {
      list.innerHTML = [
        '<div class="notif-empty">',
        '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
        '    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>',
        '    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
        '  </svg>',
        '  <p>Sin notificaciones</p>',
        '</div>',
      ].join('');
      return;
    }

    list.innerHTML = notifs.map(function (n) {
      var fecha = fmtFecha(n.fecha);
      return [
        '<div class="notif-item ' + (n.leida ? '' : 'unread') + '"',
        '     data-id="' + n.id + '">',
        '  <div class="notif-dot ' + (n.leida ? 'read' : '') + '"></div>',
        '  <div class="notif-content">',
        '    <div class="notif-titulo">' + escHtml(n.titulo) + '</div>',
        '    <div class="notif-mensaje">' + escHtml(n.mensaje) + '</div>',
        '    <div class="notif-fecha">' + fecha + '</div>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('');

    /* click en item → marcar leída */
    list.querySelectorAll('.notif-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = parseInt(el.dataset.id, 10);
        if (!isNaN(id)) markRead(id);
      });
    });
  }

  // ── HELPERS ──────────────────────────────────────────────────────────
  function fmtFecha(iso) {
    try {
      var d = new Date(iso);
      var ahora = new Date();
      var diff = Math.floor((ahora - d) / 1000); // segundos
      if (diff < 60)   return 'Hace ' + diff + 's';
      if (diff < 3600) return 'Hace ' + Math.floor(diff / 60) + 'min';
      if (diff < 86400) return 'Hace ' + Math.floor(diff / 3600) + 'h';
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    } catch (e) { return ''; }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── PANEL TOGGLE ─────────────────────────────────────────────────────
  function togglePanel() {
    var panel = document.getElementById('notif-panel');
    if (!panel) return;
    _open = !_open;
    if (_open) {
      panel.classList.add('open');
      /* reposicionar bajo el botón */
      var btn = document.getElementById('notif-btn');
      if (btn) {
        var rect = btn.getBoundingClientRect();
        panel.style.top  = (rect.bottom + 6) + 'px';
        panel.style.right = (window.innerWidth - rect.right) + 'px';
        panel.style.left  = 'auto';
      }
      loadNotifications(); /* refresca al abrir */
    } else {
      panel.classList.remove('open');
    }
  }

  function closePanel() {
    if (!_open) return;
    _open = false;
    var panel = document.getElementById('notif-panel');
    if (panel) panel.classList.remove('open');
  }

  // ── INIT ─────────────────────────────────────────────────────────────
  function init() {
    var topbar = document.querySelector('.topbar');
    if (!topbar) return; /* login u otras páginas sin topbar */
    if (document.getElementById('notif-btn')) return; /* ya inyectado */

    injectCSS();

    var bell   = buildBell();
    var panel  = buildPanel();

    if (bellNeedsAutoMargin(topbar)) {
      bell.style.marginLeft = 'auto';
    }

    topbar.appendChild(bell);
    document.body.appendChild(panel);

    /* cerrar al hacer clic fuera */
    document.addEventListener('click', function (e) {
      if (!document.getElementById('notif-panel')) return;
      if (!document.getElementById('notif-panel').contains(e.target) &&
          !document.getElementById('notif-btn').contains(e.target)) {
        closePanel();
      }
    });

    /* carga inicial */
    loadNotifications();

    /* auto-refresco cada 30 segundos */
    if (_interval) clearInterval(_interval);
    _interval = setInterval(loadNotifications, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
