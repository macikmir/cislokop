"use strict";
// Zvuky skládané z pípnutí (WebAudio) — žádné zvukové soubory.
// Předčítání zadání přes hlas systému, pokud nějaký český má.
MM.audio = (function () {
  let ac = null;

  function ctx() {
    if (MM.store.mute) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
    } catch (e) { return null; }
    return ac;
  }

  // jeden tón: frekvence, začátek a délka v sekundách
  function tone(freq, t0, dur, type, vol, slideTo) {
    const a = ctx();
    if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    const t = a.currentTime + t0;
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  const SFX = {
    tap() { tone(520, 0, 0.06, "square", 0.05); },
    pop() { tone(330, 0, 0.09, "triangle", 0.12, 660); },
    step() { tone(240, 0, 0.05, "square", 0.05); },
    gem() { tone(880, 0, 0.08, "triangle", 0.1); tone(1320, 0.07, 0.14, "triangle", 0.1); },
    bad() { tone(200, 0, 0.16, "sawtooth", 0.06, 130); },
    good() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.14, "triangle", 0.11)); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.2, "triangle", 0.12)); },
    star() { tone(988, 0, 0.1, "triangle", 0.1); tone(1480, 0.08, 0.22, "triangle", 0.1); },
    hint() { tone(660, 0, 0.1, "sine", 0.1); tone(880, 0.1, 0.16, "sine", 0.1); },
  };

  // ---------- předčítání ----------
  function czVoice() {
    try {
      const vs = window.speechSynthesis.getVoices();
      return vs.find((v) => /^cs/i.test(v.lang)) || null;
    } catch (e) { return null; }
  }

  return {
    play(name) { if (SFX[name]) SFX[name](); },
    // odemkne zvuk prvním dotykem (iOS jinak mlčí)
    unlock() { ctx(); },
    canSpeak() { return "speechSynthesis" in window; },
    speak(text) {
      if (MM.store.mute || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = czVoice();
        if (v) u.voice = v;
        u.lang = "cs-CZ";
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      } catch (e) { /* bez hlasu to půjde taky */ }
    },
    hush() { try { window.speechSynthesis.cancel(); } catch (e) { /* nic */ } },
  };
})();
