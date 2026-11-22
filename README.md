# Číslokop — kostičková matematika

Hra pro prvňáky (cca 7 let) do prohlížeče, na telefon i tablet. Malý horník
prochází kostičkovým světem a na každé zastávce řeší matematickou úlohu.
Mechaniky úloh jsou inspirované hrou Matemág, obtížnost je posunutá na
1. třídu (počítání do 10, později do 20). Grafika, postavy, název i úrovně
jsou vlastní — celé se to kreslí kódem, ve hře není jediný obrázkový soubor
(kromě ikony aplikace).

## Co ve hře je

Tři světy (Louka → Les → Důl), 27 úrovní, každá má 3–4 kola. Čtyři minihry:

| Minihra | Co se procvičuje | Varianty |
|---|---|---|
| **Krmení** | spravedlivé dělení, rozklad čísla, půlky a čtvrtky | kusy ovoce v bedýnkách; koláče (celý / půlka / čtvrtka); 2–4 zvířátka |
| **Cesta** | plánování, počítání kroků, orientace | přímé ovládání šipkami; skládání programu z daných kartiček; volný program se sčítáním kroků |
| **Výtah** | sčítání a odčítání jako pohyb po číselné ose | dojeď pro krystal jen danými tlačítky (+3, −1…); předpověz, kde výtah skončí |
| **Truhla** | sčítání, odčítání, dopočítávání | příklad s chybějícím číslem; sčítací pyramidy o 2–4 patrech; klávesnice nebo kartičky |

Většina zadání se **losuje**, takže při návratu do úrovně jsou čísla jiná.
Za úroveň jsou 1–3 hvězdy (nápověda stojí víc než chyba), lepší výsledek
přepíše horší. Další úroveň se odemkne, když je hotová jedna ze dvou
předchozích — jedna zapeklitá úloha hru nezastaví.

**Nápověda** (tlačítko `?`) funguje po krocích a nikdy nenechá dítě zaseknuté:
nejdřív úlohu znázorní (kostičky k počítání, okénka „kolik má kdo dostat“,
tečky ukazující cestu), při dalším stisku udělá jeden krok za hráče.
Opakovanou nápovědou jde dohrát každé kolo. Po dvou chybách nebo delší
nečinnosti se tlačítko samo rozkýve.

**Texty pro začínajícího čtenáře.** Na obrazovce jsou jen dvě až čtyři slova
(„DEJ VŠEM STEJNĚ.“, „3 + 1 = ?“), písmem Andika navrženým pro první čtení
a ve výchozím stavu VELKÝMI písmeny. Reproduktor u zadání přečte nahlas delší,
vysvětlující větu (pokud má zařízení český hlas).

Nastavení (ozubené kolo na mapě): zvuk, velká / malá písmena, odemčení všech
úrovní, smazání postupu.

## Spuštění

Bez buildu, bez závislostí — stačí otevřít `index.html` v prohlížeči
(funguje i z disku). Na počítači jde psát čísla klávesnicí a chodit šipkami.

## GitHub Pages

Hra je statická stránka, takže ji Pages umí rovnou:

1. Na GitHubu založ prázdný repozitář (název bez diakritiky, třeba `cislokop`).
2. V téhle složce:
   ```
   git init -b main
   git add .
   git commit -m "Číslokop: první verze"
   git remote add origin https://github.com/<účet>/cislokop.git
   git push -u origin main
   ```
3. V repozitáři *Settings → Pages → Deploy from a branch → `main` / `(root)`*.
   Hra pak běží na `https://<účet>.github.io/cislokop/`.

Složka `inspirace/` (screenshoty cizí hry) je v `.gitignore` a na web nepatří.

### Na telefon jako aplikace

Hra je **PWA**: v Safari *Sdílet → Přidat na plochu* (Android: *Nainstalovat
aplikaci*). Poběží celoobrazovkově na šířku, offline, s vlastní ikonou.

**Při každé změně souborů zvyš verzi cache v `sw.js`** (`cislokop-v2` → `v3`),
jinak telefon podrží starou verzi. Nový soubor přidej i do seznamu `ASSETS`.
Novou verzi si hra načte sama, jakmile je hráč na mapě. Na iPhonu se nová
verze hledá jen při skutečném spuštění — aplikaci nejdřív zavři v přepínači.

## Jak přidat úrovně

Všechno je v `js/levels.js`. Úroveň je jeden řádek dat:

```js
{ id: "l10", game: "chest", rounds: [
  { type: "eq", max: 10, ops: "+-", blank: "abc" },
  { type: "pyr", rows: 3, max: 10, blanks: 3, where: "upper", input: "pad" },
] },
```

- `id` musí být jedinečné a už vydané se nemá měnit (podle něj se ukládají hvězdy).
- Nový svět = další objekt na konci pole `MM.worlds` (`theme`: `louka`, `les`, `dul`).
- Co která minihra v zadání umí, je popsané v hlavičce jejího souboru v `js/games/`.

Po úpravě otevři **`tests.html`** — projde všechna zadání (generovaná na
200 losováních) a řekne, která nemají řešení.

### Nová minihra

Soubor v `js/games/`, který se zaregistruje:

```js
MM.games.nazev = {
  name: "Název", icon: "s-gem",      // obrázek z art.js nebo ikona z util.js
  start(ctx, zadani) {
    // ctx.root   – prázdný <div>, kam se hra vykreslí (ctx.W × ctx.H)
    // ctx.rnd    – seedovaný generátor náhodných čísel
    // ctx.prompt(text, spoken) – pár slov na obrazovku + delší věta pro reproduktor
    // ctx.mistake(), ctx.solved(), ctx.alive(), ctx.keys(fn)
    return { hint() { /* poradí; vrátí true, když poradila */ } };
  },
};
```

Pak ji přidej do `index.html`, do `ASSETS` v `sw.js` a kontrolu do `tests.html`.

## Ladění přes adresu

| Parametr | Co udělá |
|---|---|
| `?l=5` | rovnou spustí úroveň č. 5 (`&r=2` až druhé kolo) |
| `&seed=7` | stejná vylosovaná čísla při každém načtení |
| `&h=3` | hned použije tři nápovědy |
| `&auto=1` | nechá nápovědu dohrát celou úroveň (test, že se nikde nezasekne) |
| `?demo=12` | mapa, jako by bylo 12 úrovní hotových (nic se neuloží) |

## Struktura kódu

```
index.html        – kostra obrazovek (úvod, mapa, úroveň, výsledek, nastavení)
css/style.css     – veškerý vzhled
js/util.js        – jmenný prostor MM, náhoda, ikony, tažení prstem
js/store.js       – uložený postup (localStorage)
js/audio.js       – zvuky z pípnutí (WebAudio), předčítání
js/art.js         – grafika kreslená kódem → CSS proměnné
js/levels.js      – světy a úrovně (tady se hra rozšiřuje)
js/games/feed.js  – Krmení        js/games/cart.js  – Cesta
js/games/lift.js  – Výtah         js/games/chest.js – Truhla
js/main.js        – mapa, průchod úrovní, hvězdy, nápověda, nastavení
fonts/            – písmo Andika (SIL Open Font License, viz fonts/OFL.txt)
sw.js             – offline cache
tests.html        – kontrola, že všechna zadání mají řešení
tools/icon.html   – předloha ikony (vyfotit v okně 512×512 → icons/)
```

Scéna má pevnou logickou výšku 540 px a celá se zvětšuje podle okna; šířka se
natahuje od 960 px (16:9) do 1180 px pro dlouhé telefony.
