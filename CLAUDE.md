# Steentjes – 3D-bouwspel voor de gsm

## Wat dit is
Een mobiel bouwspel in de browser, gemaakt als cadeau voor mijn vriendin. Je bouwt sets
steentje voor steentje na door ze uit de onderdelenbak op de groene mat te slepen, verdient
fictieve munten en speelt daarmee nieuwe sets vrij. Daarnaast is er vrij bouwen en een vitrine.
Alles zit in één bestand: `steentjes.html` (HTML + CSS + JS, geen build-stap).

Communiceer met mij in het Nederlands (Vlaams). Alle tekst in het spel is Nederlands.

## Belangrijke randvoorwaarden
- **Eén zelfstandig HTML-bestand.** Geen bundler, geen npm, geen aparte JS/CSS-bestanden.
  (`tools/` bevat enkel testscripts, die worden niet door het spel geladen.)
- **Externe scripts alleen van toegelaten CDN's** (cdnjs.cloudflare.com, cdn.jsdelivr.net/npm,
  unpkg.com), altijd vastgepind op een exacte versie. Fonts alleen via Google Fonts.
- **Huidige libs:** three.js `r128` (cdnjs, globale `THREE`), en van jsdelivr
  `three@0.128.0/examples/js/controls/OrbitControls.js` en
  `three@0.128.0/examples/js/environments/RoomEnvironment.js`. Niet upgraden naar een
  versie zonder `examples/js` (vanaf r148 alleen ES-modules) zonder de laadwijze aan te passen.
- **Mobiel eerst.** Moet werken op ~380 px breed, met touch (draaien met één vinger,
  zoomen/schuiven met twee). Geen horizontaal scrollen van de pagina.
- **Geen merknamen of officiële content.** Niet de merknaam noemen, geen logo's op de noppen,
  geen nagemaakte officiële sets of beschermde personages (ook geen minifiguren).
- **Geen `alert()`, `confirm()` of `prompt()`** – bevestigingen gebeuren in de UI zelf
  (tweemaal tikken bij kopen en bij "voortgang wissen").
- **localStorage altijd in try/catch** – het spel moet ook werken als opslag faalt.

## Architectuur (in volgorde in het bestand)
Het eerste `<script>`-blok staat tussen `// ==== SETS-BEGIN ====` en `// ==== SETS-END ====`
en gebruikt geen DOM of three.js, zodat node het kan testen. Het tweede blok is de spelmotor.

**Setsblok**
1. **`COL`** – kleurenpalet (echte steentjeskleuren). `COLN` = Nederlandse namen, `TRANS` = doorschijnend.
2. **`HGT`** – hoogte per type in plaathoogtes (zie tabel hieronder); `hOf()` leest het uit.
3. **`P(raw,i)`** maakt van een raw-rij een onderdeel-object met wereldvoetafdruk `X`/`Z` en hoogte `h`.
   `studCells()` = cellen met noppen bovenop, `cellsOf()` = bezette cellen.
4. **Bouwhulp `Bld()`** – `add()`, `region()` (vlak opdelen in standaardstenen), `art()` (ASCII-laag).
   `decomp()` kiest zo groot mogelijke standaardstenen, wisselt de richting per laag (verspringende
   naden) en zoekt met terugkeren een opdeling waarin elke steen op een nop rust.
   Verder: `ringA/ringB` (holle 4×4), `P1/P2` (massieve 4×4), `wallLayer` (muur met verspringende
   stenen en openingen), `wall2` (muur van 2 dik), `stone` (grijze steenmix), `OCT6`.
5. **`setXxx()`-functies** genereren de raw-lijsten, **`SETS`** bevat de metadata.

**Spelmotor**
6. **Opslag `S`** onder key `steentjes-v1`:
   `{coins, owned:[id], built:{id:aantal}, prog:{id:stapindex}, gift:'YYYY-M-D', mute, tut, seenCam}`.
   Vrij bouwen bewaart apart onder `steentjes-vrij-v1` (lijst raw-rijen).
   Bij een wijziging in het formaat: key ophogen of migreren, zodat bestaande voortgang niet breekt.
   Sets met prijs 0 zijn altijd in bezit (niet in `owned` opgeslagen).
7. **Stappen en zakjes** – `makeSteps()` groepeert opeenvolgende onderdelen op dezelfde hoogte
   (max 4 stuks, max 2 soorten, dicht bij elkaar; grote platen/bedrukte stenen/deuren apart).
   `makeBags()` verdeelt in genummerde zakjes van ~40 onderdelen, liefst bij een laagwissel.
   `prog` is de index van de eerste onvoltooide stap (half gelegde stappen worden niet bewaard).
8. **Geometrie** – `partData(b)` geeft per type/maat (gecachet) de body-delen + nop-posities in
   canonieke oriëntatie; `partObject()` maakt één los onderdeel, `rotOf()` de draaiing.
   `mergeParts()` voegt veel onderdelen samen tot één mesh per materiaal en laat noppen weg die
   onder een ander onderdeel zitten. Gebruikt voor thumbnails, bekijken, vitrine en om tijdens het
   bouwen bij elk nieuw zakje alles samen te voegen (`freeze()`), zodat grote sets vlot blijven.
9. **Materialen** – `mat(kleur)` (MeshPhysicalMaterial met clearcoat, `ENVI` = omgevingslicht),
   `gmat(kleur)` voor de doorschijnende "ghost", `decalMat()` tekent bedrukkingen op een canvas
   (`oog`, `snuit`, `txt:TEKST`). Geen tonemapping: zo blijven de speelgoedkleuren verzadigd.
10. **Offscreen renderer `TR`** – `thumb(set)` en `icon(sig)` geven gecachete dataURL's.
11. **Geluid** – gesynthetiseerd met WebAudio (`sfx('snap'|'pick'|'wrong'|'step'|'rip'|'done'|'coin')`).
12. **Home** – `renderHome()`; klikken via event delegation op `data-a` (`gift`, `buy`, `build`,
    `view`, `free`, `shelf`).
13. **Bouwscherm** – `openBuild(id, 'build'|'view')`, `showBag()` (zakje openscheuren),
    `startStep()` (ghosts + pijlen + kadertje), `renderTray()`, slepen (`startDrag/moveDrag/endDrag`),
    `placePart()`, `nextStep()`, `finish()`. De camera volgt de bouwhoogte en draait het model
    vanzelf als de volgende stap aan de achterkant ligt.
14. **Slepen** – een steentje volgt de vinger (72 px erboven bij touch) over de hoogtekaart
    (`surfaceAt()` loopt langs de kijkstraal). Binnen een straal rond een passende ghost klikt het
    magnetisch vast; loslaten = `placePart()`. Fout steentje: schudden + uitleg.
15. **Vrij bouwen** (`openFree`) – palet (`FREEPARTS`), kleuren (basis + kleuren van gebouwde sets),
    draaien, ongedaan maken, weghalen (enkel als er niets bovenop staat).
16. **Vitrine** (`openShelf`) – alle gebouwde sets op eigen groene matjes.
17. `loop()` – animaties, ghost-pulsen, camera; `resize()` schuift het beeld (`setViewOffset`)
    zodat het model tussen de bovenbalk en de onderdelenbak valt.

Debug: `steentjes.html?view=castle` of `?build=cat`; `window.__steentjes` geeft toegang tot de staat.

## Setformaat
```js
{ id:'house', name:'Huisje', no:1006, age:'9+', box:'#f3dca4', price:560, blurb:'…', raw:setHouse() }
// raw = [[type, x, z, y, w, d, kleur, dir, label?], …]
```
- Eenheden: `x`/`z` in noppen, `y` in **plaathoogtes** (een steen is 3 hoog).
- `w` = breedte langs x, `d` = diepte langs z. Volgorde van `raw` = bouwvolgorde.
- Sets worden automatisch gecentreerd op de mat van 32×32.

| type | wat | hoogte | noppen |
|---|---|---|---|
| `b` | steen | 3 | ja |
| `p` | plaat | 1 | ja |
| `t` | tegel | 1 | nee |
| `s` | schuine steen | 3 | enkel achterste rij (als `d >= 2`) |
| `c` / `cp` | ronde steen / rond plaatje | 3 / 1 | ja |
| `k` | kegel 1×1 | 3 | één klein nopje |
| `d` | koepel 2×2 | 3 | nee (geen ondersteuning) |
| `a` | boog `L×1` (opening `L-2`) | 3, of 6 vanaf lengte 6 | ja |
| `v` | raam `L×1`, kleur = kozijn | 6 | ja |
| `dr` | deur `L×1`, kleur = deur, wit kader | 9 | ja |
| `e` | bedrukte steen `L×1`, `label` = `oog`, `snuit` of `txt:TEKST` | 3 | ja |
| `w` | wiel, voetafdruk 2×1, as langs z | 4 | nee |
| `fl` / `bu` | bloemetje / struikje | 1 / 4 | nee |
| `fg` / `st` | vlag / ster (2×2) | 10 / 4 | nee |

- **Schuine stenen (`s`):** `w` = breedte, `d` = diepte inclusief helling (`d=1` = wig zonder nop).
  `dir` = kant waar de helling naar beneden gaat: `0` = +z, `1` = +x, `2` = −z, `3` = −x.
  Bij `dir` 1 of 3 wisselen breedte en diepte in de wereld.
- **`e`:** `dir` = kant waar de bedrukking naar kijkt (zelfde nummering).
- Beloning wordt automatisch berekend: eerste keer `onderdelen × 6`, daarna `× 2`.

Bij een nieuwe set:
- Draai **`node tools/check-sets.js`**: controleert overlap, ondersteuning (elk onderdeel rust op een
  nop, hangt eronder of zit als wiel opzij vast), standaardmaten, kleuren en of het op de mat past.
- Rechthoekige stenen kunnen niet elke overhangende vorm dragen; leg dan één grote plaat (zoals
  onder de kop van Marcel).
- Sets staan op de homepagina gesorteerd op prijs. Houd de progressie haalbaar met de beloningen
  plus het dagelijkse cadeau (40 munten). Huidige lijn: na elke set kan je (bijna) de volgende kopen;
  voor de koffiebar en het kasteel moet je wat sparen.

## Huidige sets
| id | naam | onderdelen | zakjes | prijs |
|---|---|---|---|---|
| pot | Bloempot | 34 | 1 | 0 |
| tree | Appelboom | 71 | 2 | 150 |
| car | Rode cabrio | 38 | 1 | 250 |
| cat | Marcel de kat (onze kat, grijze British Shorthair) | 82 | 2 | 400 |
| rocket | Raket | 83 | 2 | 480 |
| house | Huisje | 149 | 4 | 560 |
| xmas | Kerstboom | 162 | 4 | 850 |
| light | Vuurtoren | 168 | 4 | 1000 |
| cafe | Koffiebar | 218 | 5 | 1250 |
| castle | Kasteel | 517 | 13 | 1900 |

## Ontwerp
- Bewust één licht thema: een belichte werktafel. Achtergrond `#e4e9f0`, inkt `#1c2230`,
  accent steentjesrood `#d4211c`, munten geel `#f2b705`. Kleuren staan als tokens op `:root`.
- Fonts: Bricolage Grotesque (titels), Figtree (UI).
- Geen emoji als iconen. Iconen zijn inline SVG of CSS.
- Herkenbaar uit het echte leven: dozen met setnummer en leeftijd, genummerde zakjes die je
  openscheurt, een lichtblauw kadertje met "2x" per stap, gele pijlen, het klikgeluid,
  een draaiend model bij stappen aan de achterkant, en extra steentjes over na afloop.
- Respecteer `prefers-reduced-motion` (confetti, autodraaien en animaties uit).

## Testen
- Syntaxcheck: haal de `<script>`-blokken eruit en draai `node --check`.
- `node tools/check-sets.js` voor alle sets.
- Visueel testen op een echte gsm of in de mobiele weergave van de browser-devtools.
  Controleer na elke wijziging: home laadt met thumbnails, zakje openscheuren, steentje slepen en
  vastklikken, fout steentje (schudden), hint, voltooien (confetti + munten), kopen met dubbel
  tikken, terugkeren en verder bouwen na herladen, vrij bouwen, vitrine.

## Ideeën voor later
- Meer sets: iets rond haar favoriete series/films (eigen ontwerp), een fiets, een molen.
- Bouwboekje als overzicht om terug te bladeren naar eerdere stappen.
- Prestaties: bij heel oude toestellen de pixelratio verlagen.
