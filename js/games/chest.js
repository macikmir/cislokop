"use strict";
// TRUHLA — zámek s číselným kódem.
//
// Zadání:
//   { type: "eq", max: 10, ops: "+-", blank: "abc" }
//        příklad  a ± b = c  s jedním chybějícím číslem
//        max – největší číslo, minSum – nejmenší součet (pro počítání přes 10)
//        ops – povolené operace, blank – která místa smí chybět (a, b, c)
//   { type: "pyr", rows: 3, max: 10, blanks: 3, where: "upper", input: "pad" }
//        sčítací pyramida: cihla = součet dvou cihel pod ní
//        rows – počet pater (2–4), max – největší číslo nahoře, minTop – nejmenší
//        blanks – kolik cihel chybí
//        where – "upper" (jen sčítání: chybí cihly nad základnou),
//                "base" (aspoň jedna chybí v základně → odčítání), "any"
//        input – "pad" (klávesnice) | "bank" (hotové kartičky k rozmístění)
//
// Uvnitř je všechno jedna věc: buňky a vztahy  levá + pravá = součet.
// Generátor pouští jen zadání, která jdou vyřešit krok po kroku (vždy existuje
// trojice s jediným neznámým číslem) — podle toho umí radit i nápověda.
(function () {
  const el = MM.el;

  // Doplní všechno, co jde odvodit. known = pole hodnot nebo null.
  // Vrací kroky [{ cell, rel }] v pořadí, jak se dají spočítat.
  function propagate(rels, known) {
    const v = known.slice(), steps = [];
    let moved = true;
    while (moved) {
      moved = false;
      for (const r of rels) {
        const un = [r.l, r.r, r.s].filter((c) => v[c] == null);
        if (un.length !== 1) continue;
        const c = un[0];
        v[c] = c === r.s ? v[r.l] + v[r.r] : v[r.s] - v[c === r.l ? r.r : r.l];
        steps.push({ cell: c, rel: r });
        moved = true;
      }
    }
    return { values: v, steps, solved: v.every((x) => x != null) };
  }

  function genEq(spec, rnd) {
    const op = MM.pick(rnd, spec.ops.split(""));
    const lo = Math.max(2, spec.minSum || 2);
    const big = MM.randInt(rnd, lo, spec.max);       // větší z čísel (součet / menšenec)
    const part = MM.randInt(rnd, 1, big - 1);
    const values = op === "+" ? [part, big - part, big] : [big, part, big - part];
    const blank = "abc".indexOf(MM.pick(rnd, spec.blank.split("")));
    return {
      type: "eq", op, values, max: spec.max, input: spec.input || "pad",
      given: values.map((x, i) => i !== blank),
      // a − b = c je totéž co c + b = a
      rels: [op === "+" ? { l: 0, r: 1, s: 2 } : { l: 2, r: 1, s: 0 }],
    };
  }

  const cid = (r, i) => (r * (r + 1)) / 2 + i;    // řada r (0 = vrchol), pozice i
  function genPyr(spec, rnd) {
    const n = spec.rows, cells = (n * (n + 1)) / 2;
    const rels = [];
    for (let r = 0; r < n - 1; r++)
      for (let i = 0; i <= r; i++) rels.push({ s: cid(r, i), l: cid(r + 1, i), r: cid(r + 1, i + 1) });
    const hi = Math.max(2, Math.ceil(spec.max / (n === 2 ? 1.3 : n === 3 ? 2.2 : 4)));
    for (let tries = 0; tries < 2000; tries++) {
      const values = new Array(cells).fill(0);
      for (let i = 0; i < n; i++) values[cid(n - 1, i)] = MM.randInt(rnd, 1, hi);
      for (let r = n - 2; r >= 0; r--)
        for (let i = 0; i <= r; i++) values[cid(r, i)] = values[cid(r + 1, i)] + values[cid(r + 1, i + 1)];
      if (values[0] > spec.max || values[0] < (spec.minTop || 0)) continue;

      const baseFrom = cid(n - 1, 0);
      const all = values.map((x, i) => i);
      const pool = spec.where === "upper" ? all.filter((i) => i < baseFrom) : all;
      if (pool.length < spec.blanks) continue;
      const blanks = MM.shuffle(rnd, pool).slice(0, spec.blanks);
      if (spec.where === "base" && !blanks.some((i) => i >= baseFrom)) continue;
      const given = values.map((x, i) => blanks.indexOf(i) < 0);
      if (!propagate(rels, values.map((x, i) => (given[i] ? x : null))).solved) continue;
      return { type: "pyr", rows: n, values, given, rels, max: spec.max, input: spec.input || "pad" };
    }
    throw new Error("Pyramidu se nepodařilo vygenerovat: " + JSON.stringify(spec));
  }
  const gen = (spec, rnd) => (spec.type === "eq" ? genEq(spec, rnd) : genPyr(spec, rnd));

  // řada kostiček po pěti — názorná pomůcka k počítání
  function cubes(parent, n, cls) {
    for (let i = 0; i < n; i++) el("i", "cube " + cls + (i % 5 === 4 ? " gap" : ""), parent);
  }

  function start(ctx, spec) {
    const P = gen(spec, ctx.rnd);
    const N = P.values.length;
    const vals = P.values.map((x, i) => (P.given[i] ? x : null));   // co je teď vyplněno
    const tileOf = new Array(N).fill(null);      // režim kartiček: která leží v buňce
    let sel = null, fresh = true, done = false, hinted = -1;

    const wrap = el("div", "chest", ctx.root);
    const side = el("div", "chest-side", wrap);
    const box = MM.art.sprite("s-chest", side, "chest-box");
    const panel = el("div", "chest-panel", wrap);
    const board = el("div", "chest-board " + (P.type === "eq" ? "eq" : "pyr rows" + P.rows), panel);
    const help = el("div", "chest-help", panel);
    const keys = el("div", "chest-keys", panel);

    // ---------- buňky ----------
    const cells = [];
    function cell(i, parent) {
      const c = el("button", "cell " + (P.given[i] ? "given" : "blank"), parent);
      cells[i] = c;
      if (!P.given[i]) c.addEventListener("click", () => tapCell(i));
      return c;
    }
    if (P.type === "eq") {
      cell(0, board);
      el("div", "sign", board, P.op === "+" ? "+" : "−");
      cell(1, board);
      el("div", "sign", board, "=");
      cell(2, board);
    } else {
      for (let r = 0; r < P.rows; r++) {
        const row = el("div", "prow", board);
        for (let i = 0; i <= r; i++) cell(cid(r, i), row);
      }
    }

    // ---------- klávesnice / kartičky ----------
    const tiles = [];
    if (P.input === "bank") {
      const want = [];
      P.values.forEach((x, i) => { if (!P.given[i]) want.push(x); });
      MM.shuffle(ctx.rnd, want).forEach((x) => {
        const t = { v: x, used: false, el: el("button", "key tile", keys, String(x)) };
        t.el.addEventListener("click", () => tapTile(t));
        tiles.push(t);
      });
    } else {
      for (let d = 0; d <= 9; d++) {
        const b = el("button", "key", keys, String(d));
        b.addEventListener("click", () => tapDigit(d));
      }
      const del = el("button", "key del", keys);
      del.innerHTML = MM.icon("del");
      del.addEventListener("click", () => { if (!done && sel != null) { setVal(sel, null); fresh = true; MM.audio.play("tap"); } });
    }
    const okBtn = el("button", "btn ok chest-ok", panel);
    okBtn.innerHTML = MM.icon("check");
    okBtn.addEventListener("click", check);

    ctx.prompt(spec.note || (P.type === "eq" ? "Které číslo chybí?" : "Doplň čísla."),
      spec.note || (P.type === "eq"
        ? "Které číslo chybí? Doplň ho a odemkni truhlu."
        : "Každá cihla je součet dvou cihel pod ní. Doplň čísla."));
    render();
    select(firstEmpty());
    ctx.keys((k) => {
      if (P.input === "pad" && k >= "0" && k <= "9") tapDigit(+k);
      else if (P.input === "pad" && k === "Backspace") { if (!done && sel != null) { setVal(sel, null); fresh = true; } }
      else if (k === "Enter") check();
      else return false;
      return true;
    });

    function firstEmpty(from) {
      for (let k = 0; k < N; k++) {
        const i = ((from || 0) + k) % N;
        if (!P.given[i] && vals[i] == null) return i;
      }
      return null;
    }
    function select(i) { sel = i; fresh = true; render(); }
    function render() {
      for (let i = 0; i < N; i++) {
        cells[i].textContent = vals[i] == null ? "" : String(vals[i]);
        cells[i].classList.toggle("sel", i === sel && !done);
        cells[i].classList.toggle("filled", !P.given[i] && vals[i] != null);
      }
      const full = vals.every((x) => x != null);
      okBtn.classList.toggle("ready", full && !done);
      okBtn.disabled = !full || done;
    }
    function setVal(i, x) {
      if (tileOf[i]) { tileOf[i].used = false; tileOf[i].el.classList.remove("used"); tileOf[i] = null; }
      vals[i] = x;
      cells[i].classList.remove("bad");
      clearHelp();
      render();
    }

    function tapCell(i) {
      if (done) return;
      MM.audio.play("tap");
      if (P.input === "bank" && vals[i] != null) setVal(i, null);   // kartička zpátky
      select(i);
    }
    function tapDigit(d) {
      if (done) return;
      if (sel == null) select(firstEmpty());
      if (sel == null) return;
      MM.audio.play("tap");
      const cur = vals[sel];
      // druhá číslice se připojí, jen když dává smysl (do 20 → „1“ a pak „4“)
      const two = !fresh && cur != null && cur > 0 && cur < 10 && cur * 10 + d <= Math.max(P.max, 20);
      const x = two ? cur * 10 + d : d;
      setVal(sel, x);
      fresh = false;
      // skok na další prázdné místo, když už číslo nemůže pokračovat
      if (two || x === 0 || x * 10 > P.max) {
        const nx = firstEmpty(sel + 1);
        if (nx != null) select(nx);
      }
    }
    function tapTile(t) {
      if (done || t.used) return;
      if (sel == null || vals[sel] != null) select(firstEmpty());
      if (sel == null) return;
      MM.audio.play("pop");
      putTile(sel, t);
      const nx = firstEmpty(sel + 1);
      if (nx != null) select(nx); else render();
    }
    function putTile(i, t) {
      setVal(i, t.v);
      tileOf[i] = t; t.used = true; t.el.classList.add("used");
      render();
    }

    function check() {
      if (done || vals.some((x) => x == null)) return;
      const wrong = [];
      vals.forEach((x, i) => { if (x !== P.values[i]) wrong.push(i); });
      if (!wrong.length) return win();
      ctx.mistake();
      MM.audio.play("bad");
      wrong.forEach((i) => { cells[i].classList.add("bad"); MM.flash(cells[i], "shake", 500); });
      ctx.prompt("Oprav červená čísla.", "Něco nesedí. Zkus červená čísla opravit.");
      select(wrong[0]);
    }
    function win() {
      done = true;
      render();
      cells.forEach((c) => c.classList.add("good"));
      box.style.backgroundImage = "var(--s-chestopen)";
      MM.flash(box, "hop", 800);
      MM.art.sprite("s-gem", side, "chest-gem");
      MM.audio.play("gem");
      ctx.prompt("Otevřeno!", "Truhla je otevřená!");
      setTimeout(() => ctx.solved(), 1300);
    }

    // ---------- nápověda ----------
    function clearHelp() {
      help.innerHTML = "";
      cells.forEach((c) => c.classList.remove("hl"));
    }
    // Názorně ukáže trojici: známá čísla jako kostičky, neznámé jako otazník.
    function showHelp(step) {
      clearHelp();
      const r = step.rel, v = P.values;
      [r.l, r.r, r.s].forEach((c) => cells[c].classList.add("hl"));
      const line = el("div", "help-line", help);
      if (step.cell === r.s) {
        cubes(line, v[r.l], "a"); el("b", "", line, "+"); cubes(line, v[r.r], "b"); el("b", "", line, "= ?");
        ctx.prompt(v[r.l] + " + " + v[r.r] + " = ?", "Kolik je " + v[r.l] + " plus " + v[r.r] + "? Spočítej kostičky.");
      } else {
        const known = step.cell === r.l ? v[r.r] : v[r.l];
        cubes(line, known, "a"); cubes(line, v[r.s] - known, "q");
        el("b", "", line, "= " + v[r.s]);
        ctx.prompt(known + " + ? = " + v[r.s], known + " a kolik je " + v[r.s] + "? Spočítej prázdné kostičky.");
      }
    }
    function hint() {
      if (done) return false;
      // nejdřív pryč se špatně vyplněnými čísly
      const wrong = vals.findIndex((x, i) => !P.given[i] && x != null && x !== P.values[i]);
      if (wrong >= 0) {
        MM.flash(cells[wrong], "shake", 500);
        setVal(wrong, null);
        select(wrong);
        hinted = -1;
        ctx.prompt("Zkus jiné číslo.", "Tohle číslo tam nepatří. Zkus jiné.");
        return true;
      }
      const step = propagate(P.rels, vals).steps[0];
      if (!step) return false;
      if (hinted !== step.cell) {       // poprvé: ukázat, jak na to
        hinted = step.cell;
        select(step.cell);
        showHelp(step);
        return true;
      }
      // podruhé: číslo doplnit
      hinted = -1;
      const x = P.values[step.cell];
      if (P.input === "bank") putTile(step.cell, tiles.find((t) => !t.used && t.v === x));
      else setVal(step.cell, x);
      MM.flash(cells[step.cell], "glow", 1200);
      ctx.prompt("Pomohl jsem ti.", "Doplnil jsem ti jedno číslo.");
      const nx = firstEmpty(step.cell + 1);
      select(nx);
      return true;
    }

    return { hint };
  }

  MM.games.chest = { name: "Truhla", icon: "s-chest", start, gen, propagate };
})();
