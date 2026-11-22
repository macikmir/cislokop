"use strict";
// VÝTAH — počítání po patrech (číselná osa nastojato).
//
// Zadání:
//   { mode: "go", max: 10, start: 0, buttons: [3, -1], targets: [5, 8] }
//        dojeď pro krystaly; k dispozici jsou jen daná tlačítka (+3 = o 3 nahoru)
//        místo targets jde dát n: 2 → patra se vylosují tak, aby šla dosáhnout
//   { mode: "predict", max: 10, len: 3, steps: [1, 2, 3] }
//        výtah má naplánovanou cestu; dítě ťukne na patro, kde skončí
//        len – počet kroků programu, steps – možné délky kroků
//        (pevně: start: 2, program: [3, 2, -1])
(function () {
  const el = MM.el;

  // Nejkratší posloupnost tlačítek z patra a do patra b (BFS), nebo null.
  function route(max, buttons, a, b) {
    const prev = {}; prev[a] = null;
    const queue = [a];
    while (queue.length) {
      const f = queue.shift();
      if (f === b) {
        const out = [];
        for (let k = f; prev[k]; k = prev[k].from) out.unshift(prev[k].b);
        return out;
      }
      for (const s of buttons) {
        const nx = f + s;
        if (nx < 0 || nx > max || nx in prev) continue;
        prev[nx] = { from: f, b: s };
        queue.push(nx);
      }
    }
    return null;
  }

  function gen(spec, rnd) {
    if (spec.mode === "predict") {
      if (spec.program) return { mode: "predict", max: spec.max, start: spec.start, program: spec.program.slice() };
      for (let tries = 0; tries < 500; tries++) {
        const start = MM.randInt(rnd, 0, spec.max);
        const program = [];
        let f = start, ups = 0;
        for (let i = 0; i < spec.len; i++) {
          const s = MM.pick(rnd, spec.steps) * (rnd() < 0.6 ? 1 : -1);
          if (f + s < 0 || f + s > spec.max) break;
          f += s; ups += s > 0 ? 1 : 0;
          program.push(s);
        }
        // zajímavé je to, až když se jede oběma směry (od tří kroků výš)
        if (program.length < spec.len || f === start) continue;
        if (spec.len >= 3 && (ups === 0 || ups === spec.len)) continue;
        return { mode: "predict", max: spec.max, start, program };
      }
      throw new Error("Výtah: nepodařilo se vylosovat program " + JSON.stringify(spec));
    }
    const start = spec.start || 0;
    if (spec.targets) return { mode: "go", max: spec.max, start, buttons: spec.buttons, targets: spec.targets.slice() };
    const targets = [];
    let from = start;
    for (let i = 0; i < spec.n; i++) {
      const cand = [];
      for (let f = 0; f <= spec.max; f++) {
        if (f === from || f === start || targets.indexOf(f) >= 0) continue;
        const r = route(spec.max, spec.buttons, from, f);
        if (r && r.length >= 2 && r.length <= 5) cand.push(f);
      }
      if (!cand.length) break;
      from = MM.pick(rnd, cand);
      targets.push(from);
    }
    if (!targets.length) throw new Error("Výtah: žádné dosažitelné patro " + JSON.stringify(spec));
    return { mode: "go", max: spec.max, start, buttons: spec.buttons, targets };
  }

  const label = (s) => (s > 0 ? "+" : "−") + Math.abs(s);

  function start(ctx, spec) {
    const P = gen(spec, ctx.rnd);
    const floors = P.max + 1;
    const FH = Math.min(54, Math.floor((ctx.H - 40) / floors));    // výška patra
    let floor = P.start, busy = false, done = false;
    const left = P.mode === "go" ? P.targets.slice() : [];
    let progAt = 0;                                                // predict: kolik kroků už odjel

    const wrap = el("div", "lift " + P.mode + (FH < 30 ? " dense" : ""), ctx.root);
    const tower = el("div", "lift-tower", wrap);
    tower.style.height = floors * FH + "px";
    const side = el("div", "lift-side", wrap);

    // ---------- věž ----------
    const rows = [];
    for (let f = P.max; f >= 0; f--) {
      const row = el("div", "lrow" + (f % 5 === 0 ? " five" : ""), tower);
      row.style.height = FH + "px";
      el("div", "lnum", row, String(f));
      el("div", "lshaft", row);
      const ledge = el("div", "lledge", row);
      rows[f] = { el: row, ledge, gem: null };
      if (P.mode === "predict") row.addEventListener("click", () => guess(f));
    }
    left.forEach((f) => { rows[f].gem = MM.art.sprite("s-gem", rows[f].ledge, "gem"); });
    const cabin = el("div", "lcabin", tower);
    cabin.style.height = FH + "px";
    const heroH = Math.max(18, Math.min(FH - 6, 44));
    const hero = MM.art.sprite("s-hero", cabin, "hero");
    hero.style.height = heroH + "px";
    hero.style.width = heroH * 0.75 + "px";
    const count = el("div", "lcount hidden", cabin);
    function drawCabin() { cabin.style.bottom = floor * FH + "px"; }
    drawCabin();

    // ---------- ovládání ----------
    const btns = {};
    let progEls = [];
    if (P.mode === "go") {
      const grid = el("div", "lift-btns", side);
      P.buttons.slice().sort((a, b) => b - a).forEach((s) => {
        const b = el("button", "btn lbtn " + (s > 0 ? "up" : "down"), grid);
        b.innerHTML = MM.arrow(s > 0 ? "U" : "D") + "<b>" + Math.abs(s) + "</b>";
        b.addEventListener("click", () => press(s));
        btns[s] = b;
      });
      ctx.prompt(spec.note || "Dojeď pro krystal.",
        spec.note || "Dojeď výtahem pro krystaly. Číslo na tlačítku říká, o kolik pater výtah pojede.");
    } else {
      const row = el("div", "lift-prog", side);
      progEls = P.program.map((s) => {
        const t = el("div", "ptile " + (s > 0 ? "up" : "down"), row);
        t.innerHTML = MM.arrow(s > 0 ? "U" : "D") + "<b>" + Math.abs(s) + "</b>";
        return t;
      });
      el("div", "lift-tip kid", side, "Ťukni na patro.");
      ctx.prompt(spec.note || "Kde výtah zastaví?",
        spec.note || "Výtah pojede podle šipek. Na kterém patře zastaví? Ťukni na něj.");
    }

    // odjede o s pater a nahlas (číslem v bublině) počítá kroky
    async function ride(s) {
      const dir = s > 0 ? 1 : -1;
      count.classList.remove("hidden");
      for (let i = 1; i <= Math.abs(s); i++) {
        floor += dir;
        drawCabin();
        count.textContent = String(i);
        MM.audio.play("step");
        await MM.sleep(300);
        if (!ctx.alive()) return false;
      }
      await MM.sleep(200);
      count.classList.add("hidden");
      return ctx.alive();
    }

    async function press(s) {
      if (busy || done) return;
      if (floor + s < 0 || floor + s > P.max) {      // tam už věž nevede
        ctx.mistake();
        MM.flash(cabin, "shake", 400);
        MM.audio.play("bad");
        ctx.prompt(s > 0 ? "Výš to nejde!" : "Níž to nejde!");
        return;
      }
      busy = true;
      MM.audio.play("tap");
      if (!(await ride(s))) return;
      busy = false;
      const i = left.indexOf(floor);
      if (i >= 0) {
        left.splice(i, 1);
        rows[floor].gem.classList.add("taken");
        MM.audio.play("gem");
      }
      if (!left.length) {
        done = true;
        MM.flash(hero, "hop", 800);
        MM.audio.play("good");
        ctx.prompt("Výborně!", "Výborně! Máš všechny krystaly.");
        setTimeout(() => ctx.solved(), 1100);
      } else {
        ctx.prompt("Dojeď pro krystal.", "Jsi v patře " + floor + ". Krystal je v patře " + nearest() + ".");
      }
    }
    function nearest() {
      return left.slice().sort((a, b) => Math.abs(a - floor) - Math.abs(b - floor))[0];
    }

    // ---------- předpověď ----------
    const answer = P.mode === "predict" ? P.start + MM.sum(P.program) : 0;
    async function guess(f) {
      if (busy || done) return;
      if (f !== answer) {
        ctx.mistake();
        MM.flash(rows[f].el, "wrong", 700);
        MM.audio.play("bad");
        ctx.prompt("Tam ne. Počítej patra.", "Tam ne. Zkus si cestu odpočítat po patrech.");
        return;
      }
      busy = true;
      rows[f].el.classList.add("right");
      MM.audio.play("tap");
      while (progAt < P.program.length) {            // pro kontrolu to výtah odjede
        progEls[progAt].classList.add("active");
        if (!(await ride(P.program[progAt]))) return;
        progEls[progAt].classList.remove("active");
        progEls[progAt].classList.add("used");
        progAt++;
      }
      done = true;
      MM.flash(hero, "hop", 800);
      MM.audio.play("good");
      ctx.prompt("Správně! Patro " + answer + ".", "Správně! Výtah zastavil v patře " + answer + ".");
      setTimeout(() => ctx.solved(), 1100);
    }

    // ---------- nápověda ----------
    function hint() {
      if (busy || done) return false;
      if (P.mode === "go") {
        // nejbližší krystal podle počtu stisků
        let best = null;
        left.forEach((t) => {
          const r = route(P.max, P.buttons, floor, t);
          if (r && r.length && (!best || r.length < best.r.length)) best = { t, r };
        });
        if (!best) return false;
        MM.flash(btns[best.r[0]], "glow", 1800);
        MM.flash(rows[best.t].el, "target", 1800);
        const n = Math.abs(best.t - floor);
        const how = "o " + n + " " + MM.plural(n, "patro", "patra", "pater") + (best.t > floor ? " výš" : " níž");
        ctx.prompt("O" + how.slice(1) + ".", "Krystal je " + how + ". Zkus svítící tlačítko.");
        return true;
      }
      // předpověď: výtah odjede další krok, zbytek je kratší
      if (progAt >= P.program.length) {
        MM.flash(rows[floor].el, "target", 1800);
        ctx.prompt("Ťukni, kde stojí.", "Výtah už dojel. Ťukni na patro, kde stojí.");
        return true;
      }
      busy = true;
      const i = progAt++;
      progEls[i].classList.add("active");
      ctx.prompt("Kde zastaví teď?", "Jeden krok jsem odjel za tebe. Kde zastaví teď?");
      ride(P.program[i]).then((ok) => {
        if (!ok) return;
        progEls[i].classList.remove("active");
        progEls[i].classList.add("used");
        busy = false;
      });
      return true;
    }

    return { hint };
  }

  MM.games.lift = { name: "Výtah", icon: "updown", start, gen, route };
})();
