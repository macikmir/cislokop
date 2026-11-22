"use strict";
// Řízení hry: obrazovky (úvod, mapa, úroveň), kola, hvězdy, nápověda, nastavení.
(function () {
  const VERSION = "2";                // jen pro zobrazení; cache se čísluje v sw.js
  const $ = (id) => document.getElementById(id);
  const el = MM.el;
  const stage = $("stage");
  const params = new URLSearchParams(location.search);

  MM.art.init();
  const applyCaps = () => document.body.classList.toggle("caps", MM.store.caps);
  applyCaps();

  // ---------- zvětšení scény podle okna ----------
  // Výška je vždy 540 logických px; šířka se natáhne podle poměru stran
  // (960 = 16:9, až 1180 pro dlouhé telefony). Okraje kolem výřezu displeje
  // zůstanou volné, pozadí je ale přesahuje.
  function fit() {
    const cs = getComputedStyle($("safearea"));
    const inL = parseFloat(cs.paddingLeft) || 0, inR = parseFloat(cs.paddingRight) || 0;
    const inT = parseFloat(cs.paddingTop) || 0, inB = parseFloat(cs.paddingBottom) || 0;
    const vw = window.innerWidth, vh = window.innerHeight;
    const aw = Math.max(100, vw - inL - inR), ah = Math.max(100, vh - inT - inB);
    const W = Math.round(Math.max(960, Math.min(1180, (MM.H * aw) / ah)));
    const s = Math.min(aw / W, ah / MM.H);
    MM.W = W; MM.scale = s;
    stage.style.width = W + "px";
    stage.style.transform = "translate(" + (inL + (aw - W * s) / 2) + "px," +
      (inT + (ah - MM.H * s) / 2) + "px) scale(" + s + ")";
    $("rotate").classList.toggle("hidden", !(vh > vw * 1.15));
  }
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", () => setTimeout(fit, 250));
  fit();

  // ---------- obrazovky ----------
  let screen = "title";
  function show(name) {
    screen = name;
    ["title", "map", "level"].forEach((n) => $("scr-" + n).classList.toggle("hidden", n !== name));
    $("ov-result").classList.add("hidden");
    $("ov-settings").classList.add("hidden");
    MM.audio.hush();
  }

  // ikony do tlačítek
  $("btnSettings").innerHTML = MM.icon("gear");
  $("btnBack").innerHTML = MM.icon("back");
  $("btnSpeak").innerHTML = MM.icon("speaker");
  $("btnResMap").innerHTML = MM.icon("map");
  $("btnResAgain").innerHTML = MM.icon("reset");
  if (!MM.audio.canSpeak()) $("btnSpeak").classList.add("hidden");

  // úvodní obrazovka: horník a zvířátka
  (function () {
    const crew = $("titleCrew");
    MM.art.sprite("a-pig-happy", crew, "crew-face");
    MM.art.sprite("a-sheep-calm", crew, "crew-face");
    MM.art.sprite("s-hero", crew, "crew-hero");
    MM.art.sprite("a-cow-calm", crew, "crew-face");
    MM.art.sprite("a-chick-happy", crew, "crew-face");
  })();
  $("btnPlay").addEventListener("click", () => { MM.audio.unlock(); MM.audio.play("good"); showMap(); });

  // ---------- postup ----------
  const L = MM.levels;
  function unlocked(i) {
    if (MM.store.unlockAll || i === 0 || MM.store.done(L[i].id)) return true;
    // stačí mít hotovou jednu ze dvou předchozích — jedna zapeklitá úroveň hru nezastaví
    return MM.store.done(L[i - 1].id) || (i >= 2 && MM.store.done(L[i - 2].id));
  }
  function currentIndex() {
    for (let i = 0; i < L.length; i++) if (unlocked(i) && !MM.store.done(L[i].id)) return i;
    return L.length - 1;
  }

  // ---------- mapa ----------
  const B = 40, CW = 150;             // velikost bloku a šířka sloupce jedné úrovně
  const HEIGHTS = [2, 3, 2, 3, 4, 3, 4, 5, 4, 3, 2, 3];
  function gameIcon(game, parent) {
    const ic = MM.games[game].icon;
    if (ic.indexOf("-") > 0) return MM.art.sprite(ic, parent, "node-ic");
    const d = el("div", "node-ic svg", parent);
    d.innerHTML = MM.icon(ic);
    return d;
  }
  function showMap() {
    show("map");
    const inner = $("mapInner");
    inner.innerHTML = "";
    const cur = currentIndex();
    const rnd = MM.rng(4242);
    let x = 0, curX = 0, n = 0;

    function column(theme, w, h) {
      const c = el("div", "mcol t-" + theme, inner);
      c.style.cssText = "left:" + x + "px;width:" + w + "px;height:" + h * B + "px";
      return c;
    }
    MM.worlds.forEach((w) => {
      const x0 = x;
      const wEl = el("div", "mworld t-" + w.theme, inner);    // pozadí světa
      // úvodní plošina světa s cedulí
      const h0 = HEIGHTS[n % HEIGHTS.length];
      const gate = column(w.theme, 130, h0);
      el("div", "wsign kid", gate, w.name);
      x += 130;
      w.levels.forEach((lv) => {
        const i = lv.index, h = HEIGHTS[n++ % HEIGHTS.length];
        const col = column(w.theme, CW, h);
        decorate(col, w.theme, rnd);
        const stars = MM.store.stars(lv.id), open = unlocked(i);
        const node = el("button", "node" + (stars ? " done" : "") + (open ? "" : " locked") +
          (i === cur && !stars ? " current" : ""), inner);
        node.style.left = x + (CW - 80) / 2 + "px";
        node.style.bottom = h * B + 16 + "px";
        if (open) gameIcon(lv.game, node);
        else { const lk = el("div", "node-ic svg", node); lk.innerHTML = MM.icon("lock"); }
        el("span", "node-num", node, String(i + 1));
        const st = el("div", "node-stars", node);
        for (let s = 0; s < 3; s++) MM.art.sprite(s < stars ? "s-star" : "s-staroff", st);
        node.addEventListener("click", () => {
          if (!open) { MM.flash(node, "shake", 400); MM.audio.play("bad"); return; }
          MM.audio.unlock(); MM.audio.play("tap");
          startLevel(i);
        });
        if (i === cur) {
          curX = x + CW / 2;
          const hero = MM.art.sprite("s-hero", inner, "map-hero");
          hero.style.left = x + 2 + "px";
          hero.style.bottom = h * B + "px";
        }
        x += CW;
      });
      wEl.style.left = x0 + "px";
      wEl.style.width = x - x0 + "px";
    });
    inner.style.width = x + "px";
    $("mapStars").textContent = MM.store.totalStars() + " / " + L.length * 3;
    $("mapScroll").scrollLeft = Math.max(0, curX - MM.W / 2);
  }
  // stromy, kytky a pochodně — jen na ozdobu
  function decorate(col, theme, rnd) {
    if (theme === "dul") {
      if (rnd() < 0.7) el("div", "deco torch px", col).style.left = 8 + Math.floor(rnd() * 20) + "px";
      const ore = el("div", "deco ore", col);
      ore.style.left = Math.floor(rnd() * 3) * B + "px";
      ore.style.top = (1 + Math.floor(rnd() * 2)) * B + "px";
      return;
    }
    const trees = theme === "les" ? 1 : rnd() < 0.4 ? 1 : 0;
    if (trees) {
      const t = el("div", "deco tree" + (theme === "les" && rnd() < 0.5 ? " tall" : ""), col);
      t.style.left = (rnd() < 0.5 ? -34 : 112) + "px";
      el("div", "crown", t); el("div", "trunk", t);
    }
    if (theme === "louka") {
      for (let i = 0; i < 2; i++) {
        if (rnd() < 0.6) el("div", "deco flower px", col).style.left = 6 + Math.floor(rnd() * 130) + "px";
      }
    }
  }
  $("btnSettings").addEventListener("click", openSettings);

  // ---------- úroveň ----------
  const play = $("play");
  let cur = null;                     // { level, round, hints, mistakes, token, game, … }

  function startLevel(i, round) {
    const level = L[i];
    if (cur) cur.token.alive = false;
    cur = { level, round: round || 0, hints: 0, mistakes: 0, token: { alive: true }, game: null,
      lastHint: 0, sinceHint: 0, idle: 0, text: "" };
    show("level");
    $("scr-level").className = "screen theme-" + level.world.theme + " game-" + level.game;
    const lights = $("lights");
    lights.innerHTML = "";
    level.rounds.forEach(() => el("i", "", lights));
    startRound();
  }

  function startRound() {
    const level = cur.level, me = cur;
    me.token.alive = false;
    const token = me.token = { alive: true };
    play.innerHTML = "";
    Array.prototype.forEach.call($("lights").children, (li, k) => {
      li.className = k < me.round ? "on" : k === me.round ? "cur" : "";
    });
    nudge(false);
    clearTimeout(me.idle);
    me.idle = setTimeout(() => nudge(true), 45000);   // dlouho nic → připomenout nápovědu
    me.sinceHint = 0;
    me.onKey = null;
    const seed = params.has("seed") ? +params.get("seed") + me.round : (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    const ctx = {
      root: play, W: MM.W, H: MM.H - 68, rnd: MM.rng(seed), theme: level.world.theme,
      alive: () => token.alive,
      // klávesnice na počítači: minihra si řekne, co chce slyšet
      keys(fn) { me.onKey = fn; },
      // text = pár slov na obrazovku; spoken = delší věta, kterou přečte reproduktor
      prompt(text, spoken) {
        if (!token.alive) return;
        me.text = spoken || text;
        $("prompt").textContent = text;
        $("prompt").classList.toggle("long", text.length > 22);
      },
      mistake() {
        if (!token.alive) return;
        me.mistakes++;
        if (++me.sinceHint >= 2) nudge(true);
      },
      solved() {
        if (!token.alive) return;
        token.alive = false;
        clearTimeout(me.idle);
        roundSolved();
      },
    };
    me.game = MM.games[level.game].start(ctx, level.rounds[me.round]);
  }

  function roundSolved() {
    const me = cur;
    $("lights").children[me.round].className = "on";
    me.round++;
    if (me.round < me.level.rounds.length) {
      MM.audio.play("star");
      setTimeout(() => { if (cur === me && screen === "level") startRound(); }, 450);
    } else finishLevel();
  }

  function nudge(on) { $("btnHint").classList.toggle("nudge", on); }

  function useHint(force) {
    if (!cur || !cur.token.alive || !cur.game) return false;
    const now = Date.now();
    if (!force && now - cur.lastHint < 1200) return false;      // ne dvojklikem všechno prozradit
    if (!cur.game.hint()) return false;
    cur.lastHint = now;
    cur.hints++;
    cur.sinceHint = 0;
    nudge(false);
    MM.audio.play("hint");
    MM.flash($("promptBox"), "glow", 1200);
    return true;
  }
  $("btnHint").addEventListener("click", () => useHint(false));
  document.addEventListener("keydown", (e) => {
    if (screen !== "level" || !cur || !cur.token.alive || !cur.onKey) return;
    if (!$("ov-result").classList.contains("hidden")) return;
    if (cur.onKey(e.key)) e.preventDefault();
  });
  $("btnSpeak").addEventListener("click", () => { if (cur) MM.audio.speak(cur.text); });
  $("btnBack").addEventListener("click", () => {
    if (cur) { cur.token.alive = false; clearTimeout(cur.idle); }
    MM.audio.play("tap");
    showMap();
  });

  // ---------- konec úrovně ----------
  // Hvězdy: nápověda stojí víc než chyba. Bez nápovědy a skoro bez chyb = 3.
  function starsFor(hints, mistakes) {
    const p = hints * 3 + mistakes;
    return p <= 2 ? 3 : p <= 7 ? 2 : 1;
  }
  function finishLevel() {
    const me = cur;
    const stars = starsFor(me.hints, me.mistakes);
    MM.store.setStars(me.level.id, stars);
    const last = me.level.index === L.length - 1;
    $("resTitle").textContent = stars === 3 ? "Paráda!" : stars === 2 ? "Výborně!" : "Hotovo!";
    $("resText").textContent = last ? "Jsi mistr Číslokop!"
      : stars === 3 ? "Tři hvězdy!" : "Bez nápovědy bude víc hvězd.";
    $("btnResNext").classList.toggle("hidden", last);
    const box = $("resStars");
    box.innerHTML = "";
    for (let s = 0; s < 3; s++) {
      const st = MM.art.sprite("s-staroff", box, "res-star");
      if (s < stars) setTimeout(() => {
        if (cur !== me) return;
        st.style.backgroundImage = "var(--s-star)";
        MM.flash(st, "pop", 400);
        MM.audio.play("star");
      }, 500 + s * 350);
    }
    $("ov-result").classList.remove("hidden");
    MM.audio.play("win");
    confetti();
  }
  $("btnResMap").addEventListener("click", () => { MM.audio.play("tap"); showMap(); });
  $("btnResAgain").addEventListener("click", () => { MM.audio.play("tap"); startLevel(cur.level.index); });
  $("btnResNext").addEventListener("click", () => {
    MM.audio.play("tap");
    const nx = cur.level.index + 1;
    if (nx < L.length) startLevel(nx); else showMap();
  });

  function confetti() {
    const box = $("confetti");
    const cols = ["#ffd23f", "#3fd8e8", "#5fbf3c", "#e23b3b", "#f08a24", "#ffffff"];
    for (let i = 0; i < 46; i++) {
      const c = el("i", "", box);
      c.style.left = Math.random() * 100 + "%";
      c.style.background = cols[i % cols.length];
      c.style.animationDelay = Math.random() * 0.5 + "s";
      c.style.animationDuration = 1.3 + Math.random() * 0.9 + "s";
      setTimeout(() => c.remove(), 3000);
    }
  }

  // ---------- nastavení ----------
  let resetArmed = false;
  function drawSettings() {
    $("setSound").textContent = "Zvuk: " + (MM.store.mute ? "vypnutý" : "zapnutý");
    $("setCaps").textContent = "Písmo pro dítě: " + (MM.store.caps ? "VELKÁ PÍSMENA" : "malá písmena");
    $("setUnlock").textContent = "Všechny úrovně: " + (MM.store.unlockAll ? "odemčené" : "postupně");
    $("setReset").textContent = resetArmed ? "Opravdu smazat? Ťukni znovu" : "Smazat postup";
    $("ver").textContent = "Číslokop, verze " + VERSION;
  }
  function openSettings() {
    resetArmed = false;
    drawSettings();
    $("ov-settings").classList.remove("hidden");
  }
  $("setSound").addEventListener("click", () => { MM.store.mute = !MM.store.mute; MM.audio.play("tap"); drawSettings(); });
  $("setCaps").addEventListener("click", () => { MM.store.caps = !MM.store.caps; applyCaps(); drawSettings(); });
  $("setUnlock").addEventListener("click", () => { MM.store.unlockAll = !MM.store.unlockAll; drawSettings(); });
  $("setReset").addEventListener("click", () => {
    if (resetArmed) MM.store.reset();
    resetArmed = !resetArmed;
    drawSettings();
  });
  $("setClose").addEventListener("click", () => { $("ov-settings").classList.add("hidden"); showMap(); });

  // drobnosti, které na dotykovém zařízení překážejí
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("gesturestart", (e) => e.preventDefault());

  // ---------- service worker ----------
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    // sw.js se aktivuje sám (skipWaiting + clients.claim), jenže stránka má
    // v paměti starý kód — po převzetí se jednou přenačte. Rozehranou úroveň
    // nepřerušujeme; nová verze se pak ukáže při návratu na mapu.
    // Při úplně první registraci se controller mění taky; tam reload nechceme.
    const hadController = !!navigator.serviceWorker.controller;
    let pending = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || pending) return;
      pending = true;
      const tryReload = () => { if (screen !== "level") location.reload(); else setTimeout(tryReload, 3000); };
      tryReload();
    });
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  // ---------- ladění přes adresu ----------
  //   ?l=5         rovnou úroveň č. 5        &r=2   až druhé kolo
  //   &h=3         použít tři nápovědy       &auto=1  nechat nápovědu dohrát celou úroveň
  //   &seed=7      stejná čísla při každém načtení
  //   ?map=1       rovnou mapa               &demo=12  jako by bylo 12 úrovní hotových (neukládá se)
  MM.debug = { useHint, startLevel, showMap, get cur() { return cur; } };
  if (params.has("demo")) {
    const n = +params.get("demo");
    const fake = {};
    L.forEach((lv, i) => { if (i < n) fake[lv.id] = 1 + ((i * 7) % 3); });
    MM.store.stars = (id) => fake[id] || 0;
    MM.store.done = (id) => !!fake[id];
    MM.store.totalStars = () => MM.sum(Object.values(fake));
    MM.store.setStars = () => false;
  }
  if (params.has("l")) {
    startLevel(Math.max(0, Math.min(L.length - 1, +params.get("l") - 1)), Math.max(0, (+params.get("r") || 1) - 1));
    const SEL = ".lbtn.glow, .dpad .glow, .lrow.target, .cart-play.glow, .chest-ok.ready";
    let left = params.has("auto") ? 400 : +params.get("h") || 0;
    const tick = () => {
      if (left <= 0 || screen !== "level" || !$("ov-result").classList.contains("hidden")) return;
      if (useHint(true)) left--;
      setTimeout(() => {
        if (params.has("auto")) {
          document.querySelectorAll(SEL).forEach((b) => { b.click(); b.classList.remove("glow", "target"); });
        }
        setTimeout(tick, 150);
      }, 150);
    };
    if (left) setTimeout(tick, 300);
  } else if (params.has("map") || params.has("demo")) showMap();
  else show("title");
})();
