"use strict";
// Všechny světy a úrovně. Hra se rozšiřuje TADY: přidej úroveň do světa,
// nebo celý nový svět na konec pole. Postup se ukládá podle `id`, takže
// už vydaná id neměň (pořadí a obsah klidně ano).
//
// Úroveň:  { id, game, rounds: [zadání, zadání, …] }
//   game   – název minihry z js/games/ (feed | cart | lift | chest)
//   rounds – jednotlivá kola; hvězdy se počítají za celou úroveň
//
// Zadání jsou buď pevná, nebo popis pro generátor (pak je každé hraní jiné).
// Co která minihra umí, je popsané v hlavičce jejího souboru.
MM.worlds = [
  // ============================================================
  {
    id: "louka", name: "Louka", theme: "louka",
    levels: [
      { id: "l1", game: "feed", rounds: [
        { animals: 2, kind: "carrot", pieces: [1, 1, 1, 1] },
        { animals: 2, kind: "apple", pieces: [1, 1, 1, 1, 1, 1] },
        { animals: 3, kind: "carrot", pieces: [1, 1, 1, 1, 1, 1] },
      ] },
      { id: "l2", game: "cart", rounds: [
        { mode: "direct", grid: ["S...", ".#g.", "...C"] },
        { mode: "direct", grid: ["S.#C", ".g#.", "...."] },
        { mode: "direct", grid: ["g.#.C", ".S#g.", "....."] },
      ] },
      { id: "l3", game: "chest", rounds: [
        { type: "eq", max: 5, ops: "+", blank: "c" },
        { type: "eq", max: 5, ops: "+", blank: "c" },
        { type: "eq", max: 6, ops: "+", blank: "ab" },
        { type: "eq", max: 6, ops: "+", blank: "ab" },
      ] },
      { id: "l4", game: "feed", rounds: [
        { animals: 2, kind: "apple", each: [2, 3], parts: [1, 2] },
        { animals: 2, kind: "carrot", each: [3, 4], parts: [1, 2, 3] },
        { animals: 2, kind: "apple", each: [4, 5], parts: [1, 2, 3] },
      ] },
      { id: "l5", game: "lift", rounds: [
        { mode: "go", max: 6, start: 0, buttons: [1, 2], targets: [3, 5] },
        { mode: "go", max: 6, start: 6, buttons: [1, -1, -2], targets: [2, 4] },
        { mode: "go", max: 8, start: 0, buttons: [2, -1], targets: [5, 3] },
      ] },
      { id: "l6", game: "chest", rounds: [
        { type: "pyr", rows: 2, max: 6, blanks: 1, where: "upper", input: "pad" },
        { type: "pyr", rows: 2, max: 6, blanks: 1, where: "upper", input: "pad" },
        { type: "pyr", rows: 2, max: 8, blanks: 1, where: "base", input: "pad" },
        { type: "pyr", rows: 2, max: 8, blanks: 1, where: "base", input: "pad" },
      ] },
      { id: "l7", game: "feed", rounds: [
        { animals: 3, kind: "carrot", each: [2, 3], parts: [1, 2] },
        { animals: 3, kind: "apple", each: [3, 4], parts: [1, 2, 3] },
        { animals: 3, kind: "carrot", each: [4, 5], parts: [1, 2, 3] },
      ] },
      { id: "l8", game: "cart", rounds: [
        { mode: "given", grid: ["S..g.", "....C"], tiles: ["D1", "R3", "R1"] },
        { mode: "given", grid: ["S.#..", "..#.C", ".g..."], tiles: ["R1", "U1", "D2", "R2", "R1"] },
        { mode: "given", grid: ["S.#g.", "..#.C", "....."], tiles: ["R3", "D1", "U2", "D2", "R1"] },
      ] },
      { id: "l9", game: "chest", rounds: [
        { type: "pyr", rows: 3, max: 8, blanks: 2, where: "upper", input: "bank" },
        { type: "pyr", rows: 3, max: 8, blanks: 2, where: "upper", input: "bank" },
        { type: "pyr", rows: 3, max: 10, blanks: 3, where: "upper", input: "bank" },
      ] },
    ],
  },
  // ============================================================
  {
    id: "les", name: "Les", theme: "les",
    levels: [
      // koláče: hodnoty jsou ve čtvrtkách (celý = 4, půlka = 2, čtvrtka = 1)
      { id: "s1", game: "feed", rounds: [
        { animals: 2, kind: "pie", each: [4], parts: [4, 2] },
        { animals: 2, kind: "pie", each: [6], parts: [4, 2] },
        { animals: 3, kind: "pie", each: [4], parts: [4, 2] },
      ] },
      { id: "s2", game: "cart", rounds: [
        { mode: "given", grid: ["S#..C", ".#.#.", "...#g"], tiles: ["R2", "U2", "D2", "R2", "D2", "U2"] },
        { mode: "given", grid: [".g.#.", "S.#.C", "...g."], tiles: ["R2", "U1", "D2", "R1", "U1", "R1"] },
        { mode: "given", grid: ["S..#..", ".#.#.g", ".#...#", "...#.C"],
          tiles: ["D2", "R1", "R2", "U1", "L1", "R2", "D2", "R1"] },
      ] },
      { id: "s3", game: "chest", rounds: [
        { type: "pyr", rows: 3, max: 10, blanks: 3, where: "upper", input: "pad" },
        { type: "pyr", rows: 3, max: 10, blanks: 3, where: "upper", input: "pad" },
        { type: "pyr", rows: 3, max: 10, blanks: 3, where: "any", input: "bank" },
      ] },
      { id: "s4", game: "feed", rounds: [
        { animals: 2, kind: "apple", each: [5, 6, 7], parts: [1, 2, 3, 4] },
        { animals: 3, kind: "carrot", each: [4, 5, 6], parts: [1, 2, 3] },
        { animals: 2, kind: "apple", each: [8, 9, 10], parts: [2, 3, 4, 5] },
      ] },
      { id: "s5", game: "lift", rounds: [
        { mode: "go", max: 10, start: 0, buttons: [3, -1], n: 2 },
        { mode: "go", max: 10, start: 0, buttons: [5, 2, -1], n: 2 },
        { mode: "go", max: 10, start: 10, buttons: [-4, 3], n: 2 },
      ] },
      { id: "s6", game: "chest", rounds: [
        { type: "eq", max: 10, ops: "+", blank: "ab" },
        { type: "eq", max: 10, ops: "-", blank: "c" },
        { type: "eq", max: 10, ops: "-", blank: "abc" },
        { type: "eq", max: 10, ops: "+-", blank: "abc" },
      ] },
      { id: "s7", game: "feed", rounds: [
        { animals: 2, kind: "pie", each: [4, 6], parts: [4, 2, 1] },
        { animals: 3, kind: "pie", each: [3, 4], parts: [2, 1] },
        { animals: 4, kind: "pie", each: [2, 3], parts: [2, 1] },
      ] },
      { id: "s8", game: "lift", rounds: [
        { mode: "predict", max: 10, len: 2, steps: [1, 2, 3, 4] },
        { mode: "predict", max: 10, len: 2, steps: [2, 3, 4, 5] },
        { mode: "predict", max: 10, len: 3, steps: [1, 2, 3, 4] },
      ] },
      { id: "s9", game: "chest", rounds: [
        { type: "pyr", rows: 3, max: 10, blanks: 3, where: "base", input: "pad" },
        { type: "pyr", rows: 3, max: 10, blanks: 3, where: "base", input: "pad" },
        { type: "pyr", rows: 3, max: 10, blanks: 3, where: "base", input: "bank" },
      ] },
    ],
  },
  // ============================================================
  {
    id: "dul", name: "Důl", theme: "dul",
    levels: [
      { id: "d1", game: "feed", rounds: [
        { animals: 2, kind: "apple", each: [8, 9, 10], parts: [2, 3, 4, 5, 6] },
        { animals: 3, kind: "carrot", each: [5, 6], parts: [1, 2, 3, 4] },
        { animals: 2, kind: "apple", each: [10], parts: [3, 4, 5, 6, 7], maxPieces: 6 },
      ] },
      { id: "d2", game: "cart", rounds: [
        { mode: "free", grid: ["S.L.C", "..L..", "..g.."], slots: 4 },
        { mode: "free", grid: ["S.L.g", "..L..", ".....", "g.#.C"], slots: 6 },
        { mode: "free", grid: ["S....g", ".LLLL.", "......", "g.#..C"], slots: 6 },
      ] },
      { id: "d3", game: "chest", rounds: [
        { type: "pyr", rows: 3, max: 20, minTop: 11, blanks: 3, where: "upper", input: "pad" },
        { type: "pyr", rows: 3, max: 20, minTop: 11, blanks: 3, where: "any", input: "pad" },
        { type: "pyr", rows: 3, max: 20, minTop: 11, blanks: 3, where: "base", input: "pad" },
      ] },
      { id: "d4", game: "feed", rounds: [
        { animals: 3, kind: "pie", each: [5, 6], parts: [4, 2, 1] },
        { animals: 4, kind: "pie", each: [3, 4], parts: [4, 2, 1] },
        { animals: 3, kind: "pie", each: [6, 8], parts: [4, 2, 1], maxPieces: 10 },
      ] },
      { id: "d5", game: "lift", rounds: [
        { mode: "go", max: 20, start: 0, buttons: [10, 5, -1], n: 2 },
        { mode: "go", max: 20, start: 0, buttons: [10, 1, -2], n: 2 },
        { mode: "go", max: 20, start: 20, buttons: [-7, 3], n: 2 },
      ] },
      { id: "d6", game: "chest", rounds: [
        { type: "eq", max: 20, minSum: 11, ops: "+", blank: "abc" },
        { type: "eq", max: 20, minSum: 11, ops: "-", blank: "c" },
        { type: "eq", max: 20, minSum: 11, ops: "+-", blank: "abc" },
        { type: "eq", max: 20, minSum: 11, ops: "+-", blank: "abc" },
      ] },
      { id: "d7", game: "feed", rounds: [
        { animals: 4, kind: "apple", each: [3, 4], parts: [1, 2, 3] },
        { animals: 4, kind: "carrot", each: [4, 5], parts: [1, 2, 3], maxPieces: 10 },
        { animals: 3, kind: "apple", each: [6, 7], parts: [2, 3, 4, 5] },
      ] },
      { id: "d8", game: "cart", rounds: [
        { mode: "given", grid: ["g...g", ".#.#.", "S#C#.", "....."], tiles: ["R4", "D3", "U2", "L2", "R2", "D2"],
          note: "Některé šipky jsou navíc." },
        { mode: "given", grid: ["S.#g..", "..#.#.", ".L...C", "...#.."],
          tiles: ["R2", "U2", "D3", "R1", "D2", "U1", "R2"] },
        { mode: "given", grid: ["S..L.g", ".#.L..", ".#...#", "...#.C"],
          tiles: ["D2", "R2", "L1", "R2", "U2", "R1", "D3", "R1"] },
      ] },
      { id: "d9", game: "chest", rounds: [
        { type: "pyr", rows: 4, max: 20, blanks: 4, where: "upper", input: "pad" },
        { type: "pyr", rows: 4, max: 20, blanks: 5, where: "upper", input: "pad" },
        { type: "pyr", rows: 4, max: 20, blanks: 5, where: "any", input: "pad" },
      ] },
    ],
  },
];

// Plochý seznam úrovní v pořadí, jak jdou po mapě.
MM.levels = [];
MM.worlds.forEach((w) => w.levels.forEach((l) => {
  l.world = w;
  l.index = MM.levels.length;
  MM.levels.push(l);
}));
