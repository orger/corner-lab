import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAlg, inverse, solvedState, normalizeAlg, bottomSignature, cubeOrientations } from '../app/cube.js';
import { alignAlgorithm, caseKey, join, YAWS } from './catalog-utils.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'scripts', name), 'utf8'));
const source = read('catalog-source.json');
const jperm = read('catalog-jperm.json');
const sourceUrl = 'https://github.com/mihlefeld/Alg-Trainers/blob/34b5b16b47639ff21122c7ab46a044966d41ea00/2x2-EG-Trainer/algs_info.json';
const SETS = ['CLL', 'EG1', 'EG2'];
const GROUPS = ['Sune', 'Anti-Sune', 'Pi', 'U', 'L', 'T', 'H', 'O'];
const CASES = [];
const report = { rejected: [], corrections: [], jpermMappings: [], sourceCommit: '34b5b16b47639ff21122c7ab46a044966d41ea00' };
const mislabeledAS6 = "R U R' U' R' F R F' R U2 R' U' R U' R'";

function addChoice(row, candidate, source, url, sourceName) {
  let aligned;
  try { aligned = alignAlgorithm(row.algorithms[0]?.alg ?? candidate, candidate); }
  catch (error) { report.rejected.push({ id: row.id, candidate, source, reason: error.message }); return; }
  if (!aligned) { report.rejected.push({ id: row.id, candidate, source, reason: 'No solving setup/AUF found' }); return; }
  if (row.algorithms.some(a => a.alg === aligned.alg)) return;
  row.algorithms.push({ id: `${row.id}-a${row.algorithms.length + 1}`, ...aligned, source, url, sourceName });
}
function addCase(set, group, name, canonical, metadata = {}) {
  // Outer-turn EG algorithms can finish with a different physical cube frame.
  // Keep the white first layer on D when an algorithm is inverted for practice.
  const correction = cubeOrientations().find(rotation => bottomSignature(applyAlg(solvedState(), inverse(join(canonical, rotation)))).color === 'D');
  canonical = join(canonical, correction);
  const row = { id: `${set}-${name}`, set, group, name, algorithms: [], ...metadata };
  addChoice(row, normalizeAlg(canonical), metadata.source || 'Alg-Trainers · Malte Ihlefeld', metadata.url || sourceUrl, name);
  const bottom = bottomSignature(applyAlg(solvedState(), inverse(row.algorithms[0].alg)));
  if (bottom.set !== set) throw new Error(`Wrong bottom for ${row.id}: ${JSON.stringify(bottom)}`);
  row.bottomBars = bottom.bars;
  CASES.push(row);
  return row;
}

for (const row of Object.values(source)) {
  if (row.algset === 'LEG-1') continue;
  const result = addCase(row.algset.replace('-', ''), row.group, row.name, row.a[0]);
  for (const alg of row.a.slice(1)) {
    if (result.id === 'CLL-AS5' && alg === mislabeledAS6) continue;
    addChoice(result, alg, 'Alg-Trainers · Malte Ihlefeld', sourceUrl, row.name);
  }
}
addChoice(CASES.find(row => row.id === 'CLL-AS6'), mislabeledAS6, 'Alg-Trainers · Malte Ihlefeld', sourceUrl, 'AS5 (source entry; corrected to AS6)');
report.corrections.push({ sourceCase: 'CLL-AS5', actualCase: 'CLL-AS6', algorithm: mislabeledAS6, reason: 'Exact simulation matches AS6 with final U2; it does not solve AS5.' });

const pblUrl = 'https://jperm.net/algs/2x2/pbl';
const t = jperm.cll.find(row => row.name === 'Adjacent');
const y = jperm.cll.find(row => row.name === 'Diagonal');
addCase('CLL', 'O', 'O-Solved', '', { title: 'Solved / AUF only', source: 'Identity', url: pblUrl });
for (const [name, title, row] of [['O-Adjacent', 'Adjacent swap · T / J perm', t], ['O-Diagonal', 'Diagonal swap · Y perm', y]]) {
  const result = addCase('CLL', 'O', name, row.alg[0], { title, source: 'J Perm · CLL / PBL', url: pblUrl });
  for (const a of row.alg.slice(1)) addChoice(result, a, 'J Perm · CLL / PBL', pblUrl, row.name);
}
for (const row of jperm.eg1.filter(row => row.group === 'Ortega')) {
  // EG1 pictures consistently use the bottom bar at the back.
  const canonical = YAWS.map(yaw => join(yaw, row.alg[0])).find(alg => bottomSignature(applyAlg(solvedState(), inverse(alg))).bars[0] === 'B');
  addCase('EG1', 'O', `O-${row.name}`, canonical, {
    title: row.name === 'Solved' ? 'Top solved · adjacent swap below' : `${row.name} swap on top`,
    source: 'J Perm · EG-1 / Ortega', url: 'https://jperm.net/algs/2x2/eg-1',
  });
}
const upsideY = addCase('EG2', 'O', 'O-Solved', `x2 ${y.alg[1]} x2`, {
  title: 'Top solved · upside-down Y perm', source: 'J Perm · PBL, rotated to bottom', url: pblUrl,
});
addChoice(upsideY, `x2 ${y.alg[0]} x2`, 'J Perm · PBL, rotated to bottom', pblUrl, 'Diag U (flipped)');
for (const [name, pblName] of [['Adjacent', 'Adj/Diag'], ['Diagonal', 'Diag/Diag']]) {
  addCase('EG2', 'O', `O-${name}`, jperm.pbl.find(row => row.name === pblName).alg[0], {
    title: `${name} swap on top`, source: 'J Perm · PBL', url: pblUrl,
  });
}

// Different sites number the same pattern differently. Match cube states,
// then retain the source's name separately rather than relabel a case wrongly.
for (const set of ['CLL', 'EG1']) for (const row of jperm[set.toLowerCase()]) {
  const group = row.group === 'Antisune' ? 'Anti-Sune' : ['Ortega', 'PLL'].includes(row.group) ? 'O' : row.group;
  const correction = cubeOrientations().find(rotation => bottomSignature(applyAlg(solvedState(), inverse(join(row.alg[0], rotation)))).color === 'D');
  const key = caseKey(applyAlg(solvedState(), inverse(join(row.alg[0], correction))));
  const matches = CASES.filter(c => c.set === set && c.group === group && caseKey(applyAlg(solvedState(), inverse(c.algorithms[0].alg))) === key);
  if (matches.length !== 1) { report.rejected.push({ set, sourceName: row.name, reason: `Expected one case match, found ${matches.length}` }); continue; }
  const target = matches[0];
  for (const alg of row.alg) addChoice(target, alg, `J Perm · ${set === 'CLL' ? 'CLL' : 'EG-1'}`, `https://jperm.net/algs/2x2/${set === 'CLL' ? 'cll' : 'eg-1'}`, row.name);
  report.jpermMappings.push({ source: `${set} ${row.name}`, caseId: target.id });
}
CASES.sort((a, b) => SETS.indexOf(a.set) - SETS.indexOf(b.set) || GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.name.localeCompare(b.name));
for (const row of CASES) {
  row.title ??= `${row.group} ${row.name.replace(/^[A-Za-z-]+/, '')}`;
  delete row.source; delete row.url;
}
const output = `// Generated by scripts/catalog-build.js; see docs/SOURCES.md and LICENSE.\n// Source IDs are stable; diagrams and scramble states come from actual moves.\nexport const SETS = ${JSON.stringify(SETS)};\nexport const GROUPS = ${JSON.stringify(GROUPS)};\nexport const CASES = ${JSON.stringify(CASES, null, 2)};\n`;
fs.writeFileSync(path.join(root, 'app/catalog.js'), output);
report.counts = Object.fromEntries(SETS.map(set => [set, CASES.filter(c => c.set === set).length]));
report.algorithmCount = CASES.reduce((n, c) => n + c.algorithms.length, 0);
fs.writeFileSync(path.join(root, 'scripts/catalog-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report.counts, algorithmCount: report.algorithmCount, rejected: report.rejected.length }));
