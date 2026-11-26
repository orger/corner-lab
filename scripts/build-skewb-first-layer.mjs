/** Exhaustive first-layer projection, followed by short alternative setups.
 * All turns are explicit NS corner turns; WCA's four axes cover only 27 of
 * the 81 cases in this fixed grip. Generated data is used without a runtime
 * search, including on the phone and in the native offline shell.
 */
import fs from 'node:fs';
import { solvedSkewb, applySkewbAlg, inverseSkewb, skewbStateKey } from '../app/skewb.js';
import { SKEWB_FIRST_LAYER_TRACKED_STICKERS as tracked, SKEWB_FIRST_LAYER_FIXED_STICKERS as fixed,
  skewbFirstLayerCaseKey, skewbFirstLayerCorners, isSkewbFirstLayerSolved } from '../app/skewb-first-layer.js';

const TOKENS = ['F', "F'", 'R', "R'", 'B', "B'", 'L', "L'", 'f', "f'", 'r', "r'", 'b', "b'", 'l', "l'"];
const identity = solvedSkewb();
const maps = TOKENS.map(token => {
  const result = [];
  applySkewbAlg(identity, token).forEach((source, destination) => { result[source] = destination; });
  return result;
});
const key = value => String.fromCharCode(...value);
const seen = new Map([[key(tracked), 0]]), states = [[...tracked]], parents = [-1], parentMoves = [-1], depths = [0], transitions = [];
for (let index = 0; index < states.length; index++) {
  const row = new Uint32Array(TOKENS.length);
  for (let move = 0; move < TOKENS.length; move++) {
    const next = states[index].map(slot => maps[move][slot]);
    const nextKey = key(next);
    let nextIndex = seen.get(nextKey);
    if (nextIndex === undefined) {
      nextIndex = states.length;
      seen.set(nextKey, nextIndex); states.push(next);
      parents.push(index); parentMoves.push(move); depths.push(depths[index] + 1);
    }
    row[move] = nextIndex;
  }
  transitions.push(row);
}
if (states.length !== 69984) throw new Error(`Unexpected projected state count: ${states.length}`);
const fixedIndices = fixed.map(sticker => tracked.indexOf(sticker));
const eligible = states.flatMap((state, index) => fixedIndices.every(i => state[i] === tracked[i]) ? [index] : []);
if (eligible.length !== 81) throw new Error(`Unexpected first-layer case count: ${eligible.length}`);
const route = index => {
  const result = [];
  while (parents[index] !== -1) { result.push(TOKENS[parentMoves[index]]); index = parents[index]; }
  return result.reverse().join(' ');
};
const shortestSolutions = target => {
  const found = [], path = [];
  function visit(index) {
    if (index === 0) { found.push(path.map(move => TOKENS[move]).join(' ')); return; }
    for (let move = 0; move < TOKENS.length && found.length < 3; move++) {
      const next = transitions[index][move];
      if (depths[next] !== depths[index] - 1) continue;
      path.push(move); visit(next); path.pop();
    }
  }
  visit(target);
  return found;
};
const distanceFrom = target => {
  const distance = new Int8Array(states.length).fill(-1), queue = new Uint32Array(states.length);
  distance[target] = 0; queue[0] = target;
  let end = 1;
  for (let head = 0; head < end; head++) {
    const current = queue[head];
    for (const next of transitions[current]) {
      if (distance[next] !== -1) continue;
      distance[next] = distance[current] + 1; queue[end++] = next;
    }
  }
  return distance;
};
const permutation = (seed) => {
  const order = Array.from({ length: 16 }, (_, index) => index);
  for (let i = 15; i > 0; i--) {
    seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
    const j = seed % (i + 1); [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};
function disguisedSetups(target, algorithms) {
  const distance = distanceFrom(target), excluded = new Set(algorithms.map(algorithm => inverseSkewb(algorithm)));
  const results = [], fullStates = new Set(), path = [];
  const rootKey = skewbStateKey(identity);
  function accept() {
    const text = path.map(move => TOKENS[move]).join(' ');
    if (excluded.has(text)) return;
    let state = identity;
    const prefixes = new Set([rootKey]);
    for (const move of path) {
      state = applySkewbAlg(state, TOKENS[move]);
      const full = skewbStateKey(state);
      if (prefixes.has(full)) return; // No full-puzzle identity padding.
      prefixes.add(full);
    }
    const full = skewbStateKey(state);
    if (fullStates.has(full)) return;
    if (algorithms.some(alg => !isSkewbFirstLayerSolved(applySkewbAlg(state, alg)))) throw new Error('Invalid projected setup.');
    fullStates.add(full); results.push(text);
  }
  let examined = 0;
  function visit(index, remaining, previousAxis, seed) {
    if (++examined > 1000000 || results.length >= 20 || distance[index] > remaining) return;
    if (!remaining) { if (index === target) accept(); return; }
    // Do not tack extra turns onto an already prepared case.
    if (index === target && path.length) return;
    for (const move of permutation(seed)) {
      if ((move >> 1) === previousAxis) continue;
      const next = transitions[index][move];
      if (distance[next] > remaining - 1) continue;
      path.push(move);
      visit(next, remaining - 1, move >> 1, Math.imul(seed + move + 1, 1664525) >>> 0);
      path.pop();
      if (results.length >= 20 || examined > 1000000) return;
    }
  }
  // At least five moves; hard cases get one extra turn beyond their optimum.
  for (let length = Math.max(5, depths[target] + 1); length <= 9 && results.length < 20; length++) {
    examined = 0;
    visit(0, length, -1, target + length * 2153 + 1);
  }
  if (results.length !== 20) throw new Error(`Only ${results.length} distinct full-state setups for ${target}`);
  return results;
}
const groups = ['One corner in the upper layer', 'One corner twisted in place', 'Both corners in the upper layer', 'One upper corner and one twisted corner', 'Both corners twisted in place', 'Already solved'];
const groupFor = ({ DLF: left, DFR: right }) => {
  const solved = Number(left.solved) + Number(right.solved);
  if (solved === 2) return groups[5];
  const upper = Number(left.position.startsWith('U')) + Number(right.position.startsWith('U'));
  if (solved === 1) return groups[upper ? 0 : 1];
  return groups[upper === 2 ? 2 : upper === 1 ? 3 : 4];
};
const describe = corner => corner.solved ? 'solved' : `${corner.position} · yellow ${corner.yellowFace}`;
let catalogueCount = 0;
const catalogue = eligible.map(target => {
  const setup = route(target), state = applySkewbAlg(identity, setup), id = skewbFirstLayerCaseKey(state);
  const corners = skewbFirstLayerCorners(state), isSkip = target === 0;
  const solutions = shortestSolutions(target);
  const algorithms = solutions.map((alg, index) => ({ id: `${id}-${alg ? alg.replaceAll("'", 'p').replaceAll(' ', '') : 'skip'}`, alg,
    label: isSkip ? 'Already solved · no turns' : `${depths[target]} turn${depths[target] === 1 ? '' : 's'} · option ${index + 1}`,
    source: 'Corner Lab exhaustive first-layer search', sourceUrl: 'https://github.com/orger/corner-lab', sourceNotation: 'NS' }));
  const item = { id, puzzle: 'skewb', set: 'FL', name: isSkip ? 'Already solved' : `LF: ${describe(corners.DLF)} / RF: ${describe(corners.DFR)}`,
    group: groupFor(corners), leftCorner: corners.DLF, rightCorner: corners.DFR, turns: depths[target], isSkip, setup,
    scrambles: disguisedSetups(target, solutions), defaultAlgorithmId: algorithms[0].id, algorithms };
  console.log(`${catalogueCount++ + 1}/81 ${id}: ${item.scrambles[0].split(' ').length}–${item.scrambles.at(-1).split(' ').length} turns`);
  return item;
});

catalogue.sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group) || a.id.localeCompare(b.id, 'en'));
catalogue.forEach((item, index) => { item.displayId = `FL-${String(index + 1).padStart(2, '0')}`; });
const metadata = {
  cases: catalogue.length, practiceCases: catalogue.filter(item => !item.isSkip).length,
  projectedStates: states.length, notation: 'NS', preparedScrambles: catalogue.reduce((sum, item) => sum + item.scrambles.length, 0),
  shortestTurns: catalogue.reduce((counts, item) => { counts[item.turns] = (counts[item.turns] || 0) + 1; return counts; }, {}),
  groups: Object.fromEntries(groups.map(group => [group, catalogue.filter(item => item.group === group).length])),
  scrambleTurns: [...new Set(catalogue.flatMap(item => item.scrambles.map(text => text.split(' ').length)))].sort((a, b) => a - b),
};
const output = `/** Generated by scripts/build-skewb-first-layer.mjs.\n * Exhaustive legal cases with the D centre, DBL and DRB corners solved.\n * A case ignores upper pieces and other centres. Both setups and solutions\n * use NS corner-turn notation in the fixed white-U, green-F, yellow-D grip.\n * There are 9 positions/orientations for each front corner: 81 cases,\n * including the optional already-solved case (not selected by default).\n */\nexport const SKEWB_FIRST_LAYER_SOURCE = ${JSON.stringify(metadata, null, 2)};\nexport const SETS_SKEWB_FIRST_LAYER = ['FL'];\nexport const GROUPS_SKEWB_FIRST_LAYER = ${JSON.stringify(groups)};\nexport const CASES_SKEWB_FIRST_LAYER = ${JSON.stringify(catalogue, null, 2)};\nexport const DEFAULT_SKEWB_FIRST_LAYER_CASE_IDS = CASES_SKEWB_FIRST_LAYER.filter(item => !item.isSkip).map(item => item.id);\n`;
fs.writeFileSync(new URL('../app/catalog-skewb-first-layer.js', import.meta.url), output);
console.log(JSON.stringify(metadata, null, 2));
