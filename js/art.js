"use strict";
// Veškerá grafika se kreslí kódem do malých canvasů (16×16 a podobně)
// a do stránky jde jako CSS proměnné:  --t-<textura>, --s-<obrázek>,
// --a-<zvíře>-<nálada>.  Žádné obrázkové soubory, vlastní kostičkový styl.
MM.art = (function () {
  const urls = {};

  function make(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    const R = (x, y, rw, rh, col) => { g.fillStyle = col; g.fillRect(x, y, rw, rh); };
    draw(R, g);
    return c.toDataURL();
  }
  // zrnitá výplň: každý pixel náhodně jedna z barev
  function noise(R, rnd, x0, y0, w, h, cols) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) R(x, y, 1, 1, cols[Math.floor(rnd() * cols.length)]);
  }

  const DIRT = ["#8a5a3a", "#7d5133", "#946240", "#70472c"];
  const GREEN = ["#5fbf3c", "#54ad35", "#6ccc45", "#4c9f30"];
  const STONE = ["#8f9096", "#86878d", "#999aa0", "#7c7d84"];
  const WOOD = ["#b98b52", "#ad8049", "#c4975c"];

  // ---------- textury bloků 16×16 ----------
  const TEX = {
    dirt(R, r) { noise(R, r, 0, 0, 16, 16, DIRT); },
    grass(R, r) {                       // pohled z boku: tráva nahoře, hlína pod ní
      noise(R, r, 0, 0, 16, 16, DIRT);
      noise(R, r, 0, 0, 16, 3, GREEN);
      for (let x = 0; x < 16; x++) {
        if (r() < 0.65) R(x, 3, 1, 1, GREEN[1]);
        if (r() < 0.25) R(x, 4, 1, 1, GREEN[3]);
      }
    },
    meadow(R, r) {                      // pohled shora: louka
      noise(R, r, 0, 0, 16, 16, GREEN);
      for (let i = 0; i < 5; i++) R(Math.floor(r() * 15), Math.floor(r() * 15), 1, 2, "#7fd957");
    },
    moss(R, r) {                        // lesní půda
      noise(R, r, 0, 0, 16, 16, ["#4f8f3a", "#478234", "#579a40", "#3f7530"]);
      for (let i = 0; i < 4; i++) R(Math.floor(r() * 15), Math.floor(r() * 15), 2, 1, "#6b4a2b");
    },
    stone(R, r) {
      noise(R, r, 0, 0, 16, 16, STONE);
      for (let i = 0; i < 4; i++) R(Math.floor(r() * 12), Math.floor(r() * 15), 3 + Math.floor(r() * 3), 1, "#6d6e75");
    },
    floor(R, r) {                       // podlaha štoly
      noise(R, r, 0, 0, 16, 16, ["#6a6672", "#625e6a", "#716d79"]);
      R(0, 0, 16, 1, "#5a5662"); R(0, 0, 1, 16, "#5a5662");
    },
    rock(R, r) {                        // balvan v cestě
      noise(R, r, 0, 0, 16, 16, ["#77787f", "#6d6e75", "#828389"]);
      R(0, 0, 16, 1, "#a9aab0"); R(0, 0, 1, 16, "#a9aab0");
      R(0, 15, 16, 1, "#4b4c53"); R(15, 0, 1, 16, "#4b4c53");
      R(3, 5, 5, 1, "#4b4c53"); R(7, 5, 1, 4, "#4b4c53"); R(9, 11, 4, 1, "#4b4c53"); R(4, 10, 1, 3, "#4b4c53");
    },
    planks(R, r) {
      noise(R, r, 0, 0, 16, 16, WOOD);
      R(0, 7, 16, 1, "#7d5a30"); R(0, 15, 16, 1, "#7d5a30");
    },
    log(R, r) {
      noise(R, r, 0, 0, 16, 16, ["#6b4a2b", "#5e4025", "#775332"]);
      for (let x = 2; x < 16; x += 5) R(x, 0, 1, 16, "#4f351e");
    },
    leaves(R, r) {
      noise(R, r, 0, 0, 16, 16, ["#3f8f34", "#37802d", "#479c3b", "#2f7026"]);
      for (let i = 0; i < 10; i++) R(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#1f5a1b");
    },
    ore(R, r) {                         // kámen s krystaly
      noise(R, r, 0, 0, 16, 16, STONE);
      [[3, 3], [10, 2], [6, 8], [12, 10], [2, 12]].forEach((p) => {
        R(p[0], p[1], 2, 2, "#3fd8e8"); R(p[0], p[1], 1, 1, "#b5f7ff");
      });
    },
    lava(R, r) {
      noise(R, r, 0, 0, 16, 16, ["#f2681d", "#e8551a", "#f98a23"]);
      for (let i = 0; i < 7; i++) R(Math.floor(r() * 14), Math.floor(r() * 15), 2 + Math.floor(r() * 2), 1, "#ffd23f");
      for (let i = 0; i < 4; i++) R(Math.floor(r() * 14), Math.floor(r() * 15), 2, 1, "#b83a14");
    },
    pie(R, r) {                         // koláč shora
      noise(R, r, 0, 0, 16, 16, ["#f6cf5a", "#f2c64e", "#f9d76a"]);
      for (let i = 0; i < 5; i++) R(1 + Math.floor(r() * 13), 1 + Math.floor(r() * 13), 2, 2, "#c0392b");
    },
    brick(R, r) {                       // pískovcová cihla pyramidy
      noise(R, r, 0, 0, 16, 16, ["#e6d08c", "#dfc882", "#ecd896"]);
    },
  };

  // ---------- obrázky ----------
  const SKIN = "#f0c39a", DARK = "#2a2230";
  const SPR = {
    hero: [12, 16, (R) => {             // malý horník s lampou na přilbě
      R(2, 0, 8, 3, "#f2c230"); R(1, 2, 10, 1, "#d9a520"); R(5, 0, 2, 2, "#fff7c2");
      R(2, 3, 8, 5, SKIN); R(2, 3, 1, 2, "#6b4226"); R(9, 3, 1, 2, "#6b4226");
      R(4, 5, 1, 1, DARK); R(7, 5, 1, 1, DARK); R(5, 7, 2, 1, "#b5655a");
      R(2, 8, 8, 5, "#2f9e8f"); R(0, 8, 2, 4, "#27867a"); R(10, 8, 2, 4, "#27867a");
      R(0, 12, 2, 1, SKIN); R(10, 12, 2, 1, SKIN); R(2, 12, 8, 1, "#7a4e31");
      R(2, 13, 3, 3, "#3b4a8c"); R(7, 13, 3, 3, "#3b4a8c"); R(2, 15, 3, 1, "#2b2b3a"); R(7, 15, 3, 1, "#2b2b3a");
    }],
    apple: [8, 8, (R) => {
      R(1, 2, 6, 5, "#e23b3b"); R(0, 3, 1, 3, "#e23b3b"); R(7, 3, 1, 3, "#e23b3b"); R(2, 7, 4, 1, "#c22a2a");
      R(2, 3, 1, 2, "#ff9a90"); R(4, 0, 1, 2, "#6b4226"); R(5, 1, 2, 1, "#52ab33");
    }],
    carrot: [8, 8, (R) => {
      R(5, 0, 2, 2, "#52ab33"); R(6, 1, 2, 1, "#52ab33"); R(4, 0, 1, 1, "#3f8f34");
      R(4, 2, 3, 1, "#f08a24"); R(3, 3, 4, 1, "#f08a24"); R(2, 4, 4, 1, "#f08a24");
      R(1, 5, 3, 1, "#f08a24"); R(1, 6, 2, 1, "#f08a24"); R(0, 7, 1, 1, "#f08a24");
      R(4, 4, 1, 1, "#c96a12"); R(2, 6, 1, 1, "#c96a12");
    }],
    gem: [10, 9, (R) => {
      const B = "#3fd8e8";
      R(3, 0, 4, 1, B); R(2, 1, 6, 1, B); R(1, 2, 8, 1, B); R(0, 3, 10, 2, B);
      R(1, 5, 8, 1, B); R(2, 6, 6, 1, B); R(3, 7, 4, 1, B); R(4, 8, 2, 1, B);
      R(3, 1, 2, 1, "#c4f9ff"); R(2, 2, 2, 2, "#c4f9ff"); R(1, 3, 1, 1, "#c4f9ff");
      R(7, 4, 2, 1, "#1a9db5"); R(6, 5, 2, 1, "#1a9db5"); R(5, 6, 2, 1, "#1a9db5"); R(5, 7, 1, 1, "#1a9db5");
    }],
    star: [9, 9, (R) => {
      const Y = "#ffd23f";
      R(4, 0, 1, 2, Y); R(3, 2, 3, 1, Y); R(0, 3, 9, 1, Y); R(1, 4, 7, 1, Y); R(2, 5, 5, 2, Y);
      R(1, 7, 3, 1, Y); R(5, 7, 3, 1, Y); R(1, 8, 1, 1, Y); R(7, 8, 1, 1, Y);
      R(4, 1, 1, 1, "#fff3b0"); R(3, 3, 2, 1, "#fff3b0"); R(5, 6, 2, 1, "#e0a800"); R(6, 7, 2, 1, "#e0a800");
    }],
    staroff: [9, 9, (R) => {
      const Y = "#5b5b6b";
      R(4, 0, 1, 2, Y); R(3, 2, 3, 1, Y); R(0, 3, 9, 1, Y); R(1, 4, 7, 1, Y); R(2, 5, 5, 2, Y);
      R(1, 7, 3, 1, Y); R(5, 7, 3, 1, Y); R(1, 8, 1, 1, Y); R(7, 8, 1, 1, Y);
    }],
    chest: [16, 14, (R) => {
      R(0, 2, 16, 12, "#b07a3f"); R(1, 3, 14, 1, "#c99558"); R(1, 8, 14, 1, "#c99558");
      R(0, 2, 16, 1, "#5e3d1c"); R(0, 13, 16, 1, "#5e3d1c"); R(0, 2, 1, 12, "#5e3d1c"); R(15, 2, 1, 12, "#5e3d1c");
      R(0, 6, 16, 1, "#5e3d1c"); R(3, 2, 1, 12, "#7d5a30"); R(12, 2, 1, 12, "#7d5a30");
      R(7, 5, 2, 4, "#f2c230"); R(7, 7, 2, 1, "#a07a10");
    }],
    chestopen: [16, 14, (R) => {
      R(0, 0, 16, 3, "#8a5a2b"); R(0, 0, 16, 1, "#5e3d1c"); R(0, 0, 1, 3, "#5e3d1c"); R(15, 0, 1, 3, "#5e3d1c");
      R(1, 3, 14, 3, "#2f1c0e");
      R(3, 3, 2, 2, "#3fd8e8"); R(3, 3, 1, 1, "#c4f9ff"); R(7, 4, 2, 2, "#ffd23f"); R(11, 3, 2, 2, "#3fd8e8"); R(11, 3, 1, 1, "#c4f9ff");
      R(0, 6, 16, 8, "#b07a3f"); R(1, 8, 14, 1, "#c99558");
      R(0, 6, 16, 1, "#5e3d1c"); R(0, 13, 16, 1, "#5e3d1c"); R(0, 6, 1, 8, "#5e3d1c"); R(15, 6, 1, 8, "#5e3d1c");
      R(3, 6, 1, 8, "#7d5a30"); R(12, 6, 1, 8, "#7d5a30");
    }],
    flower: [5, 8, (R) => {
      R(2, 3, 1, 5, "#3f8f34"); R(3, 5, 1, 1, "#3f8f34");
      R(1, 0, 3, 3, "#ff7aa8"); R(0, 1, 5, 1, "#ff7aa8"); R(2, 1, 1, 1, "#ffd23f");
    }],
    torch: [4, 10, (R) => {
      R(1, 0, 2, 1, "#fff3b0"); R(0, 1, 4, 2, "#ffb21f"); R(1, 1, 2, 2, "#ffe36e"); R(1, 3, 2, 7, "#7a4e31");
    }],
    cloud: [16, 7, (R) => {
      R(4, 0, 6, 2, "#fff"); R(2, 2, 12, 2, "#fff"); R(0, 4, 16, 3, "#fff"); R(1, 6, 14, 1, "#dcefff");
    }],
  };

  // ---------- obličeje zvířátek 16×16, čtyři nálady ----------
  const A = {
    pig: { eyes: [3, 5, 11, 5], mouth: [7, 12], base(R) {
      R(1, 0, 3, 3, "#e58fa3"); R(12, 0, 3, 3, "#e58fa3");
      R(1, 2, 14, 13, "#f4a9b8"); R(1, 14, 14, 1, "#e895a8");
      R(5, 7, 6, 3, "#e58fa3"); R(6, 8, 1, 1, "#a8506a"); R(9, 8, 1, 1, "#a8506a");
    } },
    sheep: { eyes: [5, 6, 9, 6], mouth: [7, 12], base(R) {
      R(0, 1, 16, 14, "#f4f1e8"); R(1, 0, 14, 16, "#f4f1e8");
      R(2, 1, 2, 1, "#dedacc"); R(8, 0, 3, 1, "#dedacc"); R(13, 3, 1, 2, "#dedacc"); R(0, 9, 1, 2, "#dedacc");
      R(3, 4, 10, 11, "#e2c4a2"); R(1, 6, 2, 3, "#cfae8a"); R(13, 6, 2, 3, "#cfae8a");
      R(7, 9, 2, 1, "#a8705f");
    } },
    cow: { eyes: [3, 5, 11, 5], mouth: [7, 13], base(R) {
      R(0, 0, 2, 3, "#e8dfc8"); R(14, 0, 2, 3, "#e8dfc8");
      R(1, 2, 14, 13, "#f7f3ea"); R(1, 2, 6, 5, "#5a4636"); R(11, 7, 4, 4, "#5a4636");
      R(3, 9, 10, 6, "#f2b6b0"); R(5, 10, 1, 2, "#a8656a"); R(10, 10, 1, 2, "#a8656a");
    } },
    chick: { eyes: [4, 6, 10, 6], mouth: [7, 13], base(R) {
      R(6, 0, 4, 3, "#e23b3b"); R(2, 2, 12, 13, "#ffd84a"); R(2, 14, 12, 1, "#f0c230");
      R(6, 8, 4, 2, "#f08a24"); R(7, 10, 2, 1, "#d9741a"); R(3, 9, 2, 1, "#ffb347"); R(11, 9, 2, 1, "#ffb347");
    } },
  };
  function face(R, def, mood) {
    def.base(R);
    const e = def.eyes, mx = def.mouth[0], my = def.mouth[1];
    for (let i = 0; i < 2; i++) {
      const ex = e[i * 2], ey = e[i * 2 + 1];
      if (mood === "happy") {           // zavřené oči do obloučku
        R(ex, ey, 2, 1, DARK); R(ex - 1, ey + 1, 1, 1, DARK); R(ex + 2, ey + 1, 1, 1, DARK);
      } else {
        R(ex, ey, 2, 2, DARK); R(ex, ey, 1, 1, "#fff");
        if (mood === "sad") R(ex + (i ? 1 : 0), ey + 2, 1, 2, "#6ec6ff");   // slzička
      }
    }
    if (mood === "happy") { R(mx - 1, my, 4, 1, DARK); R(mx - 2, my - 1, 1, 1, DARK); R(mx + 3, my - 1, 1, 1, DARK); }
    else if (mood === "sad") { R(mx - 1, my, 4, 1, DARK); R(mx - 2, my + 1, 1, 1, DARK); R(mx + 3, my + 1, 1, 1, DARK); }
    else if (mood === "eat") { R(mx - 1, my - 1, 4, 3, "#5a1f2a"); R(mx, my + 1, 2, 1, "#e0566e"); }
    else R(mx, my, 2, 1, DARK);
  }

  function init() {
    const root = document.documentElement.style;
    let seed = 7;
    Object.keys(TEX).forEach((name) => {
      const rnd = MM.rng(seed++ * 7919);
      urls["t-" + name] = make(16, 16, (R) => TEX[name](R, rnd));
    });
    Object.keys(SPR).forEach((name) => {
      const s = SPR[name];
      urls["s-" + name] = make(s[0], s[1], s[2]);
    });
    Object.keys(A).forEach((kind) => {
      ["calm", "happy", "sad", "eat"].forEach((mood) => {
        urls["a-" + kind + "-" + mood] = make(16, 16, (R) => face(R, A[kind], mood));
      });
    });
    Object.keys(urls).forEach((k) => root.setProperty("--" + k, "url(" + urls[k] + ")"));
  }

  return {
    init,
    animals: Object.keys(A),
    url: (key) => urls[key],
    // <div> s pixelovým obrázkem; velikost řeší CSS nebo parametry
    sprite(key, parent, cls) {
      const d = MM.el("div", "px " + (cls || ""), parent);
      d.style.backgroundImage = "var(--" + key + ")";
      return d;
    },
  };
})();
