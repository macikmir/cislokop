"use strict";
// Společný jmenný prostor a drobné pomůcky. Žádné moduly ani build —
// hra musí jít otevřít i z disku (file://).
const MM = {
  games: {},      // minihry se sem samy zaregistrují (js/games/*.js)
  scale: 1,       // aktuální zvětšení scény; potřebuje ho tažení prstem
  W: 960,         // logická šířka scény (mění se podle poměru stran)
  H: 540,         // logická výška scény (pevná)
};

// Seedovaný generátor (mulberry32) — stejné zadání jde zopakovat v testech.
MM.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
MM.randInt = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));
MM.pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
MM.shuffle = function (rnd, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};
MM.sum = (arr) => arr.reduce((s, v) => s + v, 0);
MM.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Vytvoří element: MM.el("div", "trida dalsi", rodic, "text")
MM.el = function (tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
};

// Krátce přidá třídu (animace) a zase ji sundá.
MM.flash = function (el, cls, ms) {
  el.classList.remove(cls);
  void el.offsetWidth;            // restart CSS animace
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms || 600);
};

// ---------- ikony ----------
// Vlastní hranaté SVG místo emoji: emoji vypadají na každém systému jinak
// a šipky ▶◀ iOS rád překreslí na barevné obrázky.
const ICONS = {
  arrow: '<polygon points="1,6 8,6 8,2 15,8 8,14 8,10 1,10"/>',
  play: '<polygon points="4,2 14,8 4,14"/>',
  check: '<polygon points="1,8 4,5 7,8 12,2 15,5 7,14"/>',
  reset: '<path d="M8 3a5 5 0 1 0 5 5h-2.4a2.6 2.6 0 1 1-2.6-2.6z"/><polygon points="8,0 13,4 8,8"/>',
  speaker: '<polygon points="1,6 4,6 8,2 8,14 4,10 1,10"/><rect x="10" y="6" width="2" height="4"/><rect x="13" y="4" width="2" height="8"/>',
  gear: '<path d="M6.5 1h3v2.2l1.6.7 1.6-1.6 2.1 2.1-1.6 1.6.7 1.5H16v3h-2.1l-.7 1.6 1.6 1.6-2.1 2.1-1.6-1.6-1.6.7V16h-3v-2.1l-1.6-.7-1.6 1.6-2.1-2.1 1.6-1.6-.7-1.6H0v-3h2.1l.7-1.5-1.6-1.6 2.1-2.1 1.6 1.6 1.6-.7z" transform="scale(.94) translate(.5 .5)"/><circle cx="8" cy="8" r="2.4" fill="var(--hole,#6b4226)"/>',
  back: '<polygon points="15,6 8,6 8,2 1,8 8,14 8,10 15,10"/>',
  del: '<polygon points="5,2 15,2 15,14 5,14 0,8"/><path d="M7 5l6 6M13 5l-6 6" stroke="var(--hole,#b23b3b)" stroke-width="2" fill="none"/>',
  lock: '<path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z"/>',
  updown: '<polygon points="8,0 13,6 3,6"/><polygon points="8,16 13,10 3,10"/><rect x="7" y="5" width="2" height="6"/>',
  next: '<polygon points="2,2 9,8 2,14"/><polygon points="8,2 15,8 8,14"/>',
  map: '<rect x="1" y="9" width="4" height="6"/><rect x="6" y="5" width="4" height="10"/><rect x="11" y="1" width="4" height="14"/>',
};
MM.icon = function (name, cls) {
  return '<svg class="ic ' + (cls || "") + '" viewBox="0 0 16 16" aria-hidden="true">' + ICONS[name] + "</svg>";
};
// Šipka otočená daným směrem (R = doprava, L, U, D).
MM.DIRS = {
  R: { dx: 1, dy: 0, rot: 0, name: "doprava" },
  D: { dx: 0, dy: 1, rot: 90, name: "dolů" },
  L: { dx: -1, dy: 0, rot: 180, name: "doleva" },
  U: { dx: 0, dy: -1, rot: 270, name: "nahoru" },
};
MM.arrow = function (dir) {
  return '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true" style="transform:rotate(' +
    MM.DIRS[dir].rot + 'deg)">' + ICONS.arrow + "</svg>";
};

// ---------- tažení prstem ----------
// Prvek se při tažení jen posouvá přes transform; kam dopadl, si volající
// zjistí z pozice prstu (clientX/Y) proti obdélníkům cílových zón.
// Krátké ťuknutí bez pohybu hlásí zvlášť — jde tak hrát i „vyber a polož“.
MM.draggable = function (el, opts) {
  let st = null;
  el.addEventListener("pointerdown", (e) => {
    if (opts.can && !opts.can()) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* syntetická událost v testu */ }
    st = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  });
  el.addEventListener("pointermove", (e) => {
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.moved && Math.hypot(dx, dy) < 8) return;
    if (!st.moved) { st.moved = true; el.classList.add("dragging"); }
    el.style.transform = "translate(" + dx / MM.scale + "px," + dy / MM.scale + "px) scale(1.08)";
  });
  const end = (e) => {
    if (!st || e.pointerId !== st.id) return;
    const s = st; st = null;
    el.classList.remove("dragging");
    el.style.transform = "";
    if (e.type === "pointercancel") return;
    if (s.moved) opts.onDrop(e.clientX, e.clientY);
    else if (opts.onTap) opts.onTap();
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
};
MM.inRect = function (el, x, y, pad) {
  const r = el.getBoundingClientRect(), p = pad || 0;
  return x >= r.left - p && x <= r.right + p && y >= r.top - p && y <= r.bottom + p;
};

// České skloňování po číslovce: MM.plural(3, "patro", "patra", "pater")
MM.plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
