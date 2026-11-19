import fs from 'node:fs';
import assert from 'node:assert/strict';
import { solvedSkewb, applySkewbAlg, normalizeSkewbAlg, isSolvedSkewb, isSkewbFaceSolved, skewbStateKey } from '../app/skewb.js';

const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const source = read('./skewb-ns2-source.json');
const sourceUrl = `${source.repository}/blob/${source.commit}/${source.files.algorithms.path}`;
const conventions = [
  { name: 'NS', macros: { S: "r' R r R'", H: "R r' R' r" } },
  { name: 'Sarah hammers', macros: { S: "R' F R F'", H: "F R' F' R" } },
];

/** Slashes in this source mean equivalent fingertricks, not puzzle moves.
 * Check their equivalence before choosing one; expand both S/H conventions
 * separately, accepting only algorithms which solve the supplied full state.
 */
function normalizeSource(text, convention) {
  let clean = text.replaceAll('.', ' ').replace(/\bh\b/g, 'H');
  clean = clean.replace(/([A-Za-z][123]?'?)\s*\/\s*([A-Za-z][123]?'?)/g, (_, left, right) => {
    assert.equal(normalizeSkewbAlg(left), normalizeSkewbAlg(right), `Non-equivalent source alternative: ${text}`);
    return left;
  });
  clean = clean.trim().split(/\s+/).map(token => convention.macros[token] || token).join(' ');
  return normalizeSkewbAlg(clean, { notation: 'ns' });
}

const cases = [], rejected = [], duplicates = [], groups = [];
let sourceCount = 0, validatedCount = 0;
for (const [sourceId, item] of Object.entries(source.cases)) {
  assert.equal(item.algset, 'NS2', 'Only the requested NS2 set is included.');
  const id = `NS2-${sourceId.padStart(3, '0')}`;
  const setup = normalizeSkewbAlg(item.s, { notation: 'wca' });
  const state = applySkewbAlg(solvedSkewb(), setup, { notation: 'wca' });
  assert.ok(!isSolvedSkewb(state), `${id}: reference must be an unsolved case`);
  assert.ok(isSkewbFaceSolved(state, 'D'), `${id}: the completed side must be on the bottom`);
  assert.equal(source.scrambles[sourceId]?.length, 20, `${id}: expected 20 prepared scrambles`);
  const scrambles = source.scrambles[sourceId].map(text => normalizeSkewbAlg(text, { notation: 'wca' }));
  for (const scramble of scrambles) assert.equal(skewbStateKey(applySkewbAlg(solvedSkewb(), scramble, { notation: 'wca' })), skewbStateKey(state), `${id}: scramble must reach its exact reference state`);
  const algorithms = [], seen = new Set();
  for (const [sourceIndex, originalAlg] of item.a.entries()) {
    sourceCount++;
    const hasHammer = /\b[SHh]\b/.test(originalAlg), variants = hasHammer ? conventions : conventions.slice(0, 1);
    let accepted = false;
    for (const convention of variants) {
      let alg;
      try { alg = normalizeSource(originalAlg, convention); }
      catch (error) { throw new Error(`${id} option ${sourceIndex + 1}: ${error.message}`); }
      if (!isSolvedSkewb(applySkewbAlg(state, alg))) continue;
      accepted = true;
      if (seen.has(alg)) { duplicates.push({ caseId: id, sourceIndex, originalAlg }); continue; }
      seen.add(alg); validatedCount++;
      algorithms.push({
        id: `${id}-a${sourceIndex + 1}${convention.name === 'Sarah hammers' ? '-hammers' : ''}`,
        alg, label: `${convention.name === 'Sarah hammers' ? 'Expanded hammers' : 'NS2'} · option ${sourceIndex + 1}`,
        source: 'Alg-Trainers · Malte Ihlefeld', sourceUrl, sourceIndex, originalAlg,
        sourceNotation: hasHammer ? convention.name : 'NS',
      });
    }
    if (!accepted) rejected.push({ caseId: id, sourceIndex, originalAlg, reason: 'Does not solve the supplied reference state under either documented hammer convention.' });
  }
  assert.ok(algorithms.length, `${id}: every requested case needs a verified solution`);
  const defaultAlgorithm = algorithms.find(alg => alg.sourceNotation === 'NS') || algorithms[0];
  if (!groups.includes(item.group)) groups.push(item.group);
  cases.push({ id, puzzle: 'skewb', set: 'NS2', name: item.name, group: item.group, sourceId: Number(sourceId),
    sourceUrl: source.sourceUrl, setup, scrambles, defaultAlgorithmId: defaultAlgorithm.id, algorithms });
}
assert.equal(cases.length, 131);
assert.equal(groups.length, 20);
assert.deepEqual(cases.map(c => c.sourceId), Array.from({ length: 131 }, (_, i) => i + 1));
const metadata = { source: source.source, sourceUrl: source.sourceUrl, repository: source.repository, commit: source.commit,
  license: source.license, cases: cases.length, groups: groups.length, sourceAlgorithms: sourceCount,
  verifiedAlgorithms: validatedCount, omittedAlgorithms: rejected.length, duplicateAlgorithms: duplicates.length,
  preparedScrambles: cases.reduce((count, c) => count + c.scrambles.length, 0) };
const text = `/** Generated from the NS2 subset of Alg-Trainers by Malte Ihlefeld (GPLv3).\n * Snapshot ${source.commit}. Source and validation report: scripts/skewb-*.json.\n * Rebuild: node scripts/build-skewb-catalog.mjs. All solve algorithms use\n * explicit NS notation; all setups use WCA notation. No EG2 cases are included.\n */\nexport const SKEWB_NS2_SOURCE = ${JSON.stringify(metadata, null, 2)};\nexport const SETS_SKEWB_NS2 = ['NS2'];\nexport const GROUPS_SKEWB_NS2 = ${JSON.stringify(groups)};\nexport const CASES_SKEWB_NS2 = ${JSON.stringify(cases, null, 2)};\n`;
fs.writeFileSync(new URL('../app/catalog-skewb-ns2.js', import.meta.url), text);
fs.writeFileSync(new URL('./skewb-catalog-report.json', import.meta.url), JSON.stringify({ ...metadata, rejected, duplicates }, null, 2) + '\n');
console.log(`Skewb NS2: ${cases.length} cases, ${validatedCount} verified choices, ${metadata.preparedScrambles} equivalent setups; ${rejected.length} unverified source alternatives omitted.`);
