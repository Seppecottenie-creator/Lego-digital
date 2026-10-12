// Controleert alle sets in steentjes.html: overlap, ondersteuning, standaardmaten en grootte.
// Gebruik: node tools/check-sets.js [pad/naar/steentjes.html]
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'steentjes.html');
const src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('// ==== SETS-BEGIN ====');
const b = src.indexOf('// ==== SETS-END ====');
if (a < 0 || b < 0) { console.error('SETS-markers niet gevonden'); process.exit(1); }
const ctx = {};
new Function('ctx', src.slice(a, b) + '\nObject.assign(ctx,{SETS,P,studCells,cellsOf,STD,COL});')(ctx);
const { SETS, P, studCells, cellsOf, STD, COL } = ctx;

const PLATE = 32;
const STDSET = {};
for (const t of Object.keys(STD)) STDSET[t] = new Set(STD[t].map(([w, d]) => Math.min(w, d) + 'x' + Math.max(w, d)));
let fail = 0;
for (const s of SETS) {
  const errs = [], warns = [];
  const occ = new Map(), studs = new Map();
  const parts = s.raw.map((r, i) => P(r, i));
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
  for (const p of parts) {
    if (!COL[p.c]) errs.push(`#${p.i} onbekende kleur ${p.c}`);
    if (STDSET[p.t] && !STDSET[p.t].has(Math.min(p.w, p.d) + 'x' + Math.max(p.w, p.d)))
      errs.push(`#${p.i} geen standaardmaat ${p.t} ${p.w}x${p.d}`);
    if (p.t === 's' && (p.dir < 0 || p.dir > 3)) errs.push(`#${p.i} rare richting`);
    // overlap
    for (const k of cellsOf(p)) {
      if (occ.has(k)) errs.push(`#${p.i} (${p.t} ${p.w}x${p.d} @${p.x},${p.z},${p.y}) overlapt met #${occ.get(k)} in cel ${k}`);
      occ.set(k, p.i);
    }
    // ondersteuning: noppen eronder, iets erboven waar dit onderdeel in klikt, of (wiel) zijdelings
    let ok = p.y === 0;
    for (let i = 0; i < p.X && !ok; i++) for (let j = 0; j < p.Z && !ok; j++) {
      if (studs.has((p.x + i) + ',' + (p.z + j) + ',' + p.y)) ok = true;
    }
    if (!ok) {
      const mine = new Set(studCells(p).map(c => c.join(',')));
      for (const q of parts.slice(0, p.i)) {
        if (q.y !== p.y + p.h) continue;
        for (let i = 0; i < q.X && !ok; i++) for (let j = 0; j < q.Z && !ok; j++) if (mine.has((q.x + i) + ',' + (q.z + j))) ok = true;
      }
    }
    if (!ok && p.t === 'w') {
      for (const dz of [-1, 1]) for (let i = 0; i < p.X; i++) if (occ.has((p.x + i) + ',' + (dz < 0 ? p.z - 1 : p.z + p.Z) + ',' + p.y)) ok = true;
    }
    if (!ok) errs.push(`#${p.i} (${p.t} ${p.w}x${p.d} ${p.c} @${p.x},${p.z},${p.y}) zweeft`);
    for (const [x, z] of studCells(p)) studs.set(x + ',' + z + ',' + (p.y + p.h), p.i);
    minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x + p.X); minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z + p.Z);
  }
  // iets bovenop een niet-noppen-oppervlak (tegel, wig, ...) is verdacht
  for (const p of parts) {
    const top = p.y + p.h, sc = new Set(studCells(p).map(c => c.join(',')));
    for (let i = 0; i < p.X; i++) for (let j = 0; j < p.Z; j++) {
      const k = (p.x + i) + ',' + (p.z + j);
      if (sc.has(k)) continue;
      const above = occ.get(k + ',' + top);
      if (above !== undefined && above > p.i && parts[above].y === top) warns.push(`#${above} rust deels op gladde #${p.i} (${p.t})`);
    }
  }
  const w = maxx - minx, d = maxz - minz;
  if (w > PLATE || d > PLATE) errs.push(`te groot voor de mat: ${w}x${d}`);
  const ids = new Set();
  console.log(`${s.id.padEnd(7)} ${String(parts.length).padStart(4)} onderdelen  ${w}x${d}  prijs ${s.price}  ` + (errs.length ? `FOUTEN: ${errs.length}` : 'ok') + (warns.length ? `  (waarschuwingen: ${warns.length})` : ''));
  for (const e of errs.slice(0, 25)) console.log('   - ' + e);
  if (process.env.V) for (const e of warns.slice(0, 25)) console.log('   ~ ' + e);
  if (errs.length) fail++;
}
process.exit(fail ? 1 : 0);
