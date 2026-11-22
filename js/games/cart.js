"use strict";
// CESTA — doveď horníka k truhle a cestou posbírej krystaly.
//
// Zadání:  { mode, grid: ["S..g", ".#.C"], … }
//   grid – řádky mapy:  S start, C truhla (cíl), g krystal, # balvan, L láva, . volno
//   mode: "direct" – šipky hýbou horníkem hned, krok po kroku
//         "given"  – program se skládá z daných kartiček; tiles: ["R3", "D1", …]
//                    (směr R/L/U/D + počet kroků). Všechny použít nemusíš.
//         "free"   – program z libovolných šipek; slots = kolik kartiček se vejde.
//                    Stejné šipky za sebou se sčítají do jedné kartičky (→ 3).
//   note – vlastní text zadání
(function () {
  const el = MM.el, DIRS = MM.DIRS;
  const MAXRUN = 5;                    // nejvíc kroků na jedné kartičce ve volném režimu

  function parse(grid) {
    const G = { w: grid[0].length, h: grid.length, cell: [], gems: [], start: null, goal: null };
    grid.forEach((row, y) => {
      if (row.length !== G.w) throw new Error("Nestejně dlouhé řádky mapy: " + grid.join("/"));
      G.cell.push(row.split(""));
      row.split("").forEach((ch, x) => {
        if (ch === "S") G.start = { x, y };
        if (ch === "C") G.goal = { x, y };
        if (ch === "g") G.gems.push({ x, y });
      });
    });
    G.all = (1 << G.gems.length) - 1;
    G.gemAt = (x, y) => G.gems.findIndex((g) => g.x === x && g.y === y);
    return G;
  }
  const tile = (s) => ({ d: s[0], n: +s.slice(1) });

  // Jeden krok. Vrací nový stav, nebo { fail: "rock" | "lava" }.
  function step(G, st, d) {
    const x = st.x + DIRS[d].dx, y = st.y + DIRS[d].dy;
    if (x < 0 || y < 0 || x >= G.w || y >= G.h || G.cell[y][x] === "#") return { fail: "rock", x: st.x, y: st.y };
    if (G.cell[y][x] === "L") return { fail: "lava", x, y };
    const gi = G.gemAt(x, y);
    return { x, y, mask: gi >= 0 ? st.mask | (1 << gi) : st.mask };
  }
  const startState = (G) => ({ x: G.start.x, y: G.start.y, mask: 0 });
  const atGoal = (G, st) => st.x === G.goal.x && st.y === G.goal.y && st.mask === G.all;

  // Projde program; vrací cestu po krocích a výsledek.
  function run(G, prog, from) {
    let st = from || startState(G);
    const path = [];
    for (let i = 0; i < prog.length; i++) {
      for (let k = 0; k < prog[i].n; k++) {
        const nx = step(G, st, prog[i].d);
        path.push({ x: nx.x, y: nx.y, tile: i, fail: nx.fail });
        if (nx.fail) return { ok: false, fail: nx.fail, path, state: st };
        st = nx;
      }
    }
    return { ok: atGoal(G, st), fail: atGoal(G, st) ? null : (st.x === G.goal.x && st.y === G.goal.y ? "gems" : "far"), path, state: st };
  }

  // Dané kartičky: najde pořadí (části) kartiček, které vede do cíle.
  // prefix = indexy kartiček, které už v programu leží. Vrací indexy, nebo null.
  function solveGiven(G, tiles, prefix) {
    const used = tiles.map(() => false);
    let st = startState(G);
    for (const i of prefix || []) {
      used[i] = true;
      const r = run(G, [tiles[i]], st);
      if (r.fail === "rock" || r.fail === "lava") return null;
      st = r.state;
    }
    const out = (prefix || []).slice();
    function rec(s) {
      if (atGoal(G, s)) return true;
      const tried = {};
      for (let i = 0; i < tiles.length; i++) {
        const key = tiles[i].d + tiles[i].n;
        if (used[i] || tried[key]) continue;
        tried[key] = true;
        const r = run(G, [tiles[i]], s);
        if (r.fail === "rock" || r.fail === "lava") continue;
        used[i] = true; out.push(i);
        if (rec(r.state)) return true;
        used[i] = false; out.pop();
      }
      return false;
    }
    return rec(st) ? out : null;
  }

  // Nejkratší cesta po jednotlivých krocích (BFS). Vrací pole směrů, nebo null.
  function solveSteps(G, from) {
    const s0 = from || startState(G);
    const key = (s) => s.x + "," + s.y + "," + s.mask;
    const prev = {}; prev[key(s0)] = null;
    const queue = [s0];
    while (queue.length) {
      const s = queue.shift();
      if (atGoal(G, s)) {
        const dirs = [];
        for (let k = key(s); prev[k]; k = prev[k].from) dirs.unshift(prev[k].d);
        return dirs;
      }
      for (const d of "RDLU") {
        const nx = step(G, s, d);
        if (nx.fail || key(nx) in prev) continue;
        prev[key(nx)] = { from: key(s), d };
        queue.push(nx);
      }
    }
    return null;
  }
  // kroky → kartičky (stejné směry za sebou se sloučí)
  function merge(dirs) {
    const prog = [];
    dirs.forEach((d) => {
      const last = prog[prog.length - 1];
      if (last && last.d === d && last.n < MAXRUN) last.n++;
      else prog.push({ d, n: 1 });
    });
    return prog;
  }

  function start(ctx, spec) {
    const G = parse(spec.grid);
    const mode = spec.mode;
    const bank = (spec.tiles || []).map(tile);
    let st = startState(G);
    let busy = false, done = false, hints = 0;
    let prog = [];                      // given: indexy do bank; free: [{d, n}]

    const wrap = el("div", "cart " + mode, ctx.root);
    const field = el("div", "cart-field", wrap);
    const bar = el("div", "cart-bar", wrap);

    // ---------- mapa ----------
    const availW = ctx.W - (mode === "direct" ? 300 : 60);
    const availH = ctx.H - (mode === "direct" ? 60 : 212);
    const S = Math.max(40, Math.min(mode === "direct" ? 104 : 80, Math.floor(availH / G.h), Math.floor(availW / G.w)));
    const grid = el("div", "cart-grid", field);
    grid.style.width = G.w * S + "px";
    grid.style.height = G.h * S + "px";
    const gemEls = [];
    let goalEl = null;
    for (let y = 0; y < G.h; y++) {
      for (let x = 0; x < G.w; x++) {
        const ch = G.cell[y][x];
        const c = el("div", "gc " + (ch === "#" ? "rock" : ch === "L" ? "lava" : "floor"), grid);
        c.style.cssText = "left:" + x * S + "px;top:" + y * S + "px;width:" + S + "px;height:" + S + "px";
        if (ch === "g") gemEls[G.gemAt(x, y)] = MM.art.sprite("s-gem", c, "gem");
        if (ch === "C") goalEl = MM.art.sprite("s-chest", c, "goal");
      }
    }
    const ghost = el("div", "cart-ghost", grid);
    const hero = MM.art.sprite("s-hero", grid, "hero");
    hero.style.width = S * 0.6 + "px";
    hero.style.height = S * 0.8 + "px";
    function drawHero(s) {
      hero.style.left = s.x * S + S * 0.2 + "px";
      hero.style.top = s.y * S + S * 0.1 + "px";
    }
    function drawGems(mask) {
      gemEls.forEach((g, i) => g.classList.toggle("taken", !!(mask & (1 << i))));
    }
    drawHero(st);

    // ---------- ovládání ----------
    let playBtn = null, progRow = null, bankRow = null;
    const padBtns = {};
    if (mode === "direct") {
      const pad = el("div", "dpad", bar);
      "ULDR".split("").forEach((d) => {
        const b = el("button", "btn key dir" + d, pad);
        b.innerHTML = MM.arrow(d);
        b.addEventListener("click", () => move(d));
        padBtns[d] = b;
      });
      ctx.prompt(spec.note || "Dojdi k truhle.", spec.note || "Seber krystaly a dojdi k truhle.");
    } else {
      playBtn = el("button", "btn ok cart-play", bar);
      playBtn.innerHTML = MM.icon("play");
      playBtn.addEventListener("click", play);
      progRow = el("div", "cart-row prog", bar);
      const clr = el("button", "btn no cart-clear", bar);
      clr.innerHTML = MM.icon("reset");
      clr.addEventListener("click", () => { if (!busy && !done) { prog = []; MM.audio.play("tap"); renderProg(); } });
      bankRow = el("div", "cart-row bank", bar);
      ctx.prompt(spec.note || (mode === "given" ? "Seřaď šipky." : "Naplánuj cestu."),
        (spec.note ? spec.note + " " : "") + (mode === "given"
          ? "Seřaď šipky a pusť je zeleným tlačítkem."
          : "Naplánuj cestu ze šipek a pusť ji zeleným tlačítkem. Lávě se vyhni."));
      renderProg();
    }

    const KEYDIR = { ArrowRight: "R", ArrowLeft: "L", ArrowUp: "U", ArrowDown: "D" };
    ctx.keys((k) => {
      if (KEYDIR[k] && mode === "direct") move(KEYDIR[k]);
      else if (KEYDIR[k] && mode === "free") edit(() => addStep(KEYDIR[k]));
      else if (k === "Enter" && mode !== "direct") play();
      else return false;
      return true;
    });

    function tileEl(t, parent, cls) {
      const b = el("button", "ptile " + (cls || ""), parent);
      b.innerHTML = MM.arrow(t.d) + "<b>" + t.n + "</b>";
      return b;
    }
    function program() { return mode === "given" ? prog.map((i) => bank[i]) : prog; }
    function renderProg() {
      progRow.innerHTML = "";
      bankRow.innerHTML = "";
      if (mode === "given") {
        prog.forEach((bi, pi) => {
          tileEl(bank[bi], progRow).addEventListener("click", () => edit(() => prog.splice(pi, 1)));
        });
        bank.forEach((t, bi) => {
          const used = prog.indexOf(bi) >= 0;
          const b = tileEl(t, bankRow, used ? "used" : "");
          if (!used) b.addEventListener("click", () => edit(() => prog.push(bi)));
        });
      } else {
        prog.forEach((t, pi) => {
          tileEl(t, progRow).addEventListener("click", () => edit(() => {
            if (t.n > 1) t.n--; else prog.splice(pi, 1);
          }));
        });
        for (let i = prog.length; i < spec.slots; i++) el("div", "ptile slot", progRow);
        "RDLU".split("").forEach((d) => {
          const b = el("button", "ptile add", bankRow);
          b.innerHTML = MM.arrow(d);
          b.addEventListener("click", () => edit(() => addStep(d)));
        });
      }
      playBtn.classList.toggle("ready", prog.length > 0);
    }
    function addStep(d) {
      const last = prog[prog.length - 1];
      if (last && last.d === d && last.n < MAXRUN) { last.n++; return; }
      if (prog.length >= spec.slots) { MM.flash(progRow, "shake", 400); MM.audio.play("bad"); return; }
      prog.push({ d, n: 1 });
    }
    function edit(fn) {
      if (busy || done) return;
      MM.audio.play("tap");
      fn();
      ghost.innerHTML = "";
      renderProg();
    }

    const FAIL = {
      rock: ["Au! Tudy ne.", "Au! Tudy cesta nevede."],
      lava: ["Pozor, láva!", "Pozor, láva! Zkus to jinudy."],
      gems: ["Chybí krystal.", "Ještě ti chybí krystal."],
      far: ["Nejsi u truhly.", "Ještě nejsi u truhly."],
    };

    async function walkTo(p) {
      hero.style.left = p.x * S + S * 0.2 + "px";
      hero.style.top = p.y * S + S * 0.1 + "px";
      MM.audio.play("step");
      await MM.sleep(230);
    }
    function collect() {
      const before = gemEls.filter((g) => g.classList.contains("taken")).length;
      drawGems(st.mask);
      if (gemEls.filter((g) => g.classList.contains("taken")).length > before) MM.audio.play("gem");
    }
    function win() {
      done = true;
      goalEl.style.backgroundImage = "var(--s-chestopen)";
      MM.flash(hero, "hop", 800);
      MM.audio.play("good");
      ctx.prompt("Výborně!", "Výborně! Jsi u truhly.");
      setTimeout(() => ctx.solved(), 1200);
    }

    // přímé ovládání: jeden krok na jedno ťuknutí
    async function move(d) {
      if (busy || done) return;
      const nx = step(G, st, d);
      ghost.innerHTML = "";
      if (nx.fail) { MM.flash(hero, "shake", 400); MM.audio.play("bad"); return; }
      busy = true;
      st = nx;
      await walkTo(st);
      if (!ctx.alive()) return;
      collect();
      busy = false;
      if (atGoal(G, st)) win();
      else if (st.x === G.goal.x && st.y === G.goal.y) ctx.prompt("Seber krystaly.", "Truhla je zamčená. Seber nejdřív krystaly.");
    }

    // spuštění programu
    async function play() {
      if (busy || done || !prog.length) return;
      busy = true;
      ghost.innerHTML = "";
      MM.audio.play("tap");
      const res = run(G, program());
      const tilesEls = progRow.querySelectorAll(".ptile:not(.slot)");
      let s = startState(G);
      for (const p of res.path) {
        tilesEls.forEach((t, i) => t.classList.toggle("active", i === p.tile));
        if (p.fail === "rock") { MM.flash(hero, "shake", 400); break; }
        await walkTo(p);
        if (!ctx.alive()) return;
        if (p.fail) break;
        const gi = G.gemAt(p.x, p.y);
        s = { x: p.x, y: p.y, mask: gi >= 0 ? s.mask | (1 << gi) : s.mask };
        st = s; collect();
      }
      tilesEls.forEach((t) => t.classList.remove("active"));
      if (res.ok) { busy = false; return win(); }
      ctx.mistake();
      MM.audio.play("bad");
      ctx.prompt(FAIL[res.fail][0], FAIL[res.fail][1]);
      if (res.fail === "lava") hero.classList.add("burn");
      await MM.sleep(1100);
      if (!ctx.alive()) return;
      hero.classList.remove("burn");
      st = startState(G);
      drawHero(st); drawGems(0);
      busy = false;
    }

    // ---------- nápověda ----------
    function showPath(from, path) {
      ghost.innerHTML = "";
      let px = from.x, py = from.y;
      path.forEach((p) => {
        const d = el("i", "", ghost);
        d.style.left = (px + p.x) / 2 * S + S / 2 + "px";
        d.style.top = (py + p.y) / 2 * S + S / 2 + "px";
        const e = el("i", "", ghost);
        e.style.left = p.x * S + S / 2 + "px";
        e.style.top = p.y * S + S / 2 + "px";
        px = p.x; py = p.y;
      });
    }
    function hint() {
      if (busy || done) return false;
      hints++;
      if (mode === "direct") {
        const dirs = solveSteps(G, st);
        if (!dirs || !dirs.length) return false;
        showPath(st, run(G, merge(dirs), st).path);
        MM.flash(padBtns[dirs[0]], "glow", 1500);
        ctx.prompt("Jdi " + DIRS[dirs[0]].name + ".", "Zkus jít " + DIRS[dirs[0]].name + ". Tečky ti ukážou cestu.");
        return true;
      }
      // celé správné řešení od startu
      const full = mode === "given"
        ? (solveGiven(G, bank, []) || []).map((i) => bank[i])
        : merge(solveSteps(G) || []);
      if (hints === 1) {                // poprvé jen ukáže cestu tečkami
        showPath(G.start, run(G, full).path);
        ctx.prompt("Jdi po tečkách.", "Tečky ti ukazují cestu. Poskládej podle nich šipky.");
        return true;
      }
      // potom opravuje program: špatnou kartičku vrátí, správnou přidá
      if (run(G, program()).ok) {
        MM.flash(playBtn, "glow", 1500);
        ctx.prompt("Zmáčkni zelené tlačítko.", "Šipky jsou správně. Zmáčkni zelené tlačítko.");
        return true;
      }
      if (mode === "given") {
        const sol = solveGiven(G, bank, prog);
        if (!sol) {
          if (!prog.length) return false;
          prog.pop();
          ctx.prompt("Tahle šipka ne.", "Tahle šipka sem nepatří. Vracím ji.");
        } else {
          prog.push(sol[prog.length]);
          ctx.prompt("Přidal jsem šipku.", "Přidal jsem ti další šipku.");
        }
      } else {
        const r = run(G, prog);
        const rest = r.fail === "rock" || r.fail === "lava" ? null : solveSteps(G, r.state);
        // zbytek cesty se musí vejít do volných kartiček
        const fits = rest && merge(prog.reduce((a, t) => a.concat(new Array(t.n).fill(t.d)), []).concat(rest)).length <= spec.slots;
        if (!fits) {
          if (!prog.length) return false;
          prog.pop();
          ctx.prompt("Tahle šipka ne.", "Tahle šipka sem nepatří. Mažu ji.");
        } else {
          addStep(rest[0]);
          ctx.prompt("Přidal jsem krok.", "Přidal jsem ti další krok.");
        }
      }
      showPath(G.start, run(G, full).path);
      renderProg();
      MM.flash(progRow, "glow", 1200);
      return true;
    }

    return { hint };
  }

  MM.games.cart = { name: "Cesta", icon: "s-hero", start, parse, run, solveGiven, solveSteps, merge, tile };
})();
