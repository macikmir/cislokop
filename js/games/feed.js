"use strict";
// KRMENÍ — rozděl jídlo tak, aby všechna zvířátka dostala stejně.
//
// Zadání:
//   { animals: 2, kind: "apple", pieces: [1, 1, 2] }            pevné kousky
//   { animals: 2, kind: "apple", each: [3, 4], parts: [1, 2] }  generované:
//        each  – kolik má dostat každé zvíře (vybere se náhodně jedno číslo)
//        parts – jak velké kousky se smí objevit
//        maxPieces – strop počtu kousků (výchozí 9)
//   kind: "apple" | "carrot"  = bedýnky s kusy ovoce (hodnota = počet kusů)
//         "pie"               = koláč; hodnoty ve čtvrtkách (4 celý, 2 půlka, 1 čtvrtka)
(function () {
  const el = MM.el;

  // jde číslo n složit z povolených kousků?
  function canMake(n, parts) {
    const ok = [true];
    for (let i = 1; i <= n; i++) ok[i] = parts.some((p) => p <= i && ok[i - p]);
    return ok[n];
  }
  function compose(rnd, T, parts) {
    const out = [];
    let rest = T;
    while (rest > 0) {
      const ok = parts.filter((p) => p <= rest && canMake(rest - p, parts));
      if (!ok.length) return null;
      const p = MM.pick(rnd, ok);
      out.push(p); rest -= p;
    }
    return out;
  }

  function gen(spec, rnd) {
    if (spec.pieces) {
      return { animals: spec.animals, kind: spec.kind, pieces: spec.pieces.slice(),
        target: MM.sum(spec.pieces) / spec.animals };
    }
    const maxPieces = spec.maxPieces || 9;
    let best = null;
    for (let tries = 0; tries < 300; tries++) {
      const T = MM.pick(rnd, spec.each);
      const groups = [];
      for (let a = 0; a < spec.animals; a++) groups.push(compose(rnd, T, spec.parts));
      if (groups.some((g) => !g)) continue;
      const pieces = [].concat.apply([], groups);
      const P = { animals: spec.animals, kind: spec.kind, pieces, target: T };
      if (pieces.length > maxPieces) continue;
      best = best || P;
      // nezajímavé: každý má jen jeden kousek, nebo všichni totéž
      if (pieces.length <= spec.animals) continue;
      const keys = groups.map((g) => g.slice().sort().join(","));
      if (new Set(keys).size === 1 && tries < 200) continue;
      return P;
    }
    return best;
  }

  // Rozdělí kousky mezi k zvířat na stejné součty. fixed[i] = zvíře, které už
  // kousek i má (nebo -1). Vrací pole přiřazení, nebo null, když to nejde.
  function solve(vals, k, T, fixed) {
    const sums = new Array(k).fill(0);
    const res = fixed ? fixed.slice() : vals.map(() => -1);
    res.forEach((a, i) => { if (a >= 0) sums[a] += vals[i]; });
    if (sums.some((s) => s > T)) return null;
    const free = [];
    res.forEach((a, i) => { if (a < 0) free.push(i); });
    free.sort((a, b) => vals[b] - vals[a]);
    function rec(n) {
      if (n === free.length) return sums.every((s) => s === T);
      const i = free[n], seen = {};
      for (let a = 0; a < k; a++) {
        if (sums[a] + vals[i] > T || seen[sums[a]]) continue;
        seen[sums[a]] = true;           // stejně plná zvířata jsou zaměnitelná
        sums[a] += vals[i]; res[i] = a;
        if (rec(n + 1)) return true;
        sums[a] -= vals[i]; res[i] = -1;
      }
      return false;
    }
    return rec(0) ? res : null;
  }

  // size = velikost jednoho kusu ovoce v px (malá čísla → velké obrázky)
  function pieceEl(kind, v, size) {
    if (kind === "pie") return el("div", "piece pie p" + v);
    const d = el("div", "piece crate");
    d.style.gridTemplateColumns = "repeat(" + Math.min(v, 5) + ", " + size + "px)";
    for (let i = 0; i < v; i++) {
      const it = MM.art.sprite("s-" + kind, d, "item");
      it.style.width = it.style.height = size + "px";
    }
    return d;
  }

  function start(ctx, spec) {
    const P = gen(spec, ctx.rnd);
    const k = P.animals, T = P.target;
    const wrap = el("div", "feed", ctx.root);
    const pensEl = el("div", "feed-pens", wrap);
    const table = el("div", "feed-table", wrap);
    el("div", "feed-table-label kid", table, "Jídlo");
    const tableIn = el("div", "feed-table-in", table);

    const kinds = MM.shuffle(ctx.rnd, MM.art.animals);
    const penW = Math.min(176, Math.floor((ctx.W - 32 - 16 - 290 - (k - 1) * 10) / k));
    const pens = [];
    for (let a = 0; a < k; a++) {
      const pen = el("div", "pen", pensEl);
      pen.style.width = penW + "px";
      const face = el("div", "px face", pen);
      const trough = el("div", "trough", pen);
      const meter = el("div", "meter hidden", pen);
      pens.push({ el: pen, face, trough, meter, kind: kinds[a % kinds.length], mood: "" });
      setMood(pens[a], "calm");
      trough.addEventListener("click", (e) => zoneClick(e, a));
      face.addEventListener("click", (e) => zoneClick(e, a));
    }
    tableIn.addEventListener("click", (e) => zoneClick(e, -1));

    const maxV = Math.max.apply(null, P.pieces);
    const size = Math.min(maxV <= 3 ? 34 : maxV <= 5 ? 27 : 22,
      Math.floor((penW - 36) / Math.min(maxV, 5)) - 2);
    const order = MM.shuffle(ctx.rnd, P.pieces.map((v, i) => i));
    const pieces = order.map((i) => {
      const v = P.pieces[i];
      const p = { v, where: -1, el: pieceEl(P.kind, v, size) };
      tableIn.appendChild(p.el);
      MM.draggable(p.el, {
        can: () => !state.done,
        onTap: () => select(selected === p ? null : p),
        onDrop: (x, y) => {
          let to = null;
          if (MM.inRect(tableIn, x, y, 10)) to = -1;
          pens.forEach((pen, a) => { if (MM.inRect(pen.el, x, y, 4)) to = a; });
          if (to !== null && to !== p.where) place(p, to);
        },
      });
      // ťuknutí na kousek nesmí propadnout do zóny pod ním
      p.el.addEventListener("click", (e) => e.stopPropagation());
      return p;
    });

    const state = { done: false, judged: false, meters: false, timer: 0 };
    let selected = null;

    ctx.prompt(spec.note || "Dej všem stejně.", spec.note || "Rozděl jídlo. Všichni musí dostat stejně.");

    function setMood(pen, mood) {
      if (pen.mood === mood) return;
      pen.mood = mood;
      pen.face.style.backgroundImage = "var(--a-" + pen.kind + "-" + mood + ")";
    }
    function select(p) {
      if (selected) selected.el.classList.remove("sel");
      selected = p;
      if (p) { p.el.classList.add("sel"); MM.audio.play("tap"); }
    }
    function zoneClick(e, a) {
      if (state.done || !selected) return;
      const p = selected;
      select(null);
      if (p.where !== a) place(p, a);
    }
    function sums() {
      const s = new Array(k).fill(0);
      pieces.forEach((p) => { if (p.where >= 0) s[p.where] += p.v; });
      return s;
    }

    function place(p, to) {
      if (selected === p) select(null);
      p.where = to;
      (to < 0 ? tableIn : pens[to].trough).appendChild(p.el);
      MM.flash(p.el, "pop", 300);
      MM.audio.play("pop");
      if (to >= 0) {                    // zvíře si kousne
        const pen = pens[to];
        setMood(pen, "eat");
        setTimeout(() => { if (ctx.alive() && pen.mood === "eat") setMood(pen, "calm"); }, 450);
      }
      afterMove();
    }

    function afterMove() {
      drawMeters();
      clearTimeout(state.timer);
      if (pieces.some((p) => p.where < 0)) {
        state.judged = false;
        pens.forEach((pen) => { if (pen.mood !== "eat") setMood(pen, "calm"); });
        return;
      }
      state.timer = setTimeout(judge, 650);
    }

    function judge() {
      if (!ctx.alive() || state.done) return;
      const s = sums();
      if (s.every((v) => v === T)) {
        state.done = true;
        select(null);
        pens.forEach((pen) => { setMood(pen, "happy"); pen.face.classList.add("hop"); });
        ctx.prompt("Výborně!", "Výborně! Všichni mají stejně.");
        MM.audio.play("good");
        setTimeout(() => ctx.solved(), 1300);
        return;
      }
      // kdo má míň než ostatní, je smutný; kdo má navíc, směje se
      pens.forEach((pen, a) => setMood(pen, s[a] < T ? "sad" : s[a] > T ? "happy" : "calm"));
      ctx.prompt("Někdo má míň.", "To není spravedlivé. Někdo má míň.");
      if (!state.judged) { state.judged = true; ctx.mistake(); MM.audio.play("bad"); }
    }

    // Nápověda 1: okénka ukážou, kolik má každý dostat.
    function drawMeters() {
      if (!state.meters) return;
      const s = sums();
      pens.forEach((pen, a) => {
        pen.meter.classList.remove("hidden");
        pen.meter.innerHTML = "";
        const n = Math.max(T, s[a]);
        for (let i = 0; i < n; i++) {
          el("i", i >= T ? "over" : i < s[a] ? "on" : "", pen.meter);
        }
      });
    }

    function hint() {
      if (state.done) return false;
      if (!state.meters) {
        state.meters = true;
        drawMeters();
        if (P.kind === "pie") ctx.prompt("Naplň okénka.", "Okénka ukazují, kolik koláče má každý dostat.");
        else ctx.prompt("Každý má mít " + T + ".", "Každý má dostat " + T + ". Okénka ti to ukážou.");
        return true;
      }
      // Nápověda 2+: jeden kousek položí správně. Když současné rozložení
      // nikam nevede, vrátí kousek od toho, kdo má nejvíc.
      const vals = pieces.map((p) => p.v);
      const sol = solve(vals, k, T, pieces.map((p) => p.where));
      if (sol) {
        let best = -1;
        pieces.forEach((p, i) => { if (p.where < 0 && (best < 0 || p.v > pieces[best].v)) best = i; });
        if (best < 0) return false;
        place(pieces[best], sol[best]);
        MM.flash(pieces[best].el, "glow", 1200);
        ctx.prompt("Tohle patří sem.", "Tenhle kousek patří sem.");
        return true;
      }
      const s = sums();
      const top = s.indexOf(Math.max.apply(null, s));
      const mine = pieces.filter((p) => p.where === top).sort((a, b) => a.v - b.v);
      // přednost má kousek, po jehož vrácení už to znovu půjde dorovnat
      const pick = mine.find((p) => {
        const fixed = pieces.map((q) => (q === p ? -1 : q.where));
        return solve(vals, k, T, fixed);
      }) || mine[0];
      place(pick, -1);
      MM.flash(pick.el, "glow", 1200);
      ctx.prompt("Tady je moc.", "Tady toho bylo moc. Vracím kousek zpátky.");
      return true;
    }

    return { hint };
  }

  MM.games.feed = { name: "Krmení", icon: "a-pig-calm", start, gen, solve };
})();
