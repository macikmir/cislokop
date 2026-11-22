"use strict";
// Uložený postup: hvězdy za úrovně a nastavení. Vše v localStorage.
MM.store = (function () {
  const KEY = "cislokop_save_v1";
  let data = { stars: {}, mute: false, unlockAll: false };

  function load() {
    // localStorage může být v restriktivním režimu prohlížeče nedostupné
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && typeof raw === "object") {
        data = {
          stars: raw.stars && typeof raw.stars === "object" ? raw.stars : {},
          mute: !!raw.mute,
          unlockAll: !!raw.unlockAll,
        };
      }
    } catch (e) { /* začneme od nuly */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* nevadí */ }
  }
  load();

  return {
    stars: (id) => data.stars[id] || 0,
    done: (id) => (data.stars[id] || 0) > 0,
    // zapíše jen lepší výsledek; vrací true, když se zlepšil
    setStars(id, n) {
      if (n <= (data.stars[id] || 0)) return false;
      data.stars[id] = n; save(); return true;
    },
    totalStars: () => MM.sum(Object.values(data.stars)),
    get mute() { return data.mute; },
    set mute(v) { data.mute = !!v; save(); },
    get unlockAll() { return data.unlockAll; },
    set unlockAll(v) { data.unlockAll = !!v; save(); },
    reset() { data.stars = {}; save(); },
  };
})();
