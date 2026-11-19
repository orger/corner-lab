import test from 'node:test';
import assert from 'node:assert/strict';
import { solvedSquare1, applySquare1Alg, inverseSquare1, parseSquare1Alg, square1LayerPieces, isCubeShape } from '../app/square1.js';
import { CASES_SQ1_OBL, GROUPS_SQ1_OBL } from '../app/catalog-square1-obl.js';
import { CASES_SQ1_EP } from '../app/catalog-square1-ep.js';
import { createOBLDrill, createEPDrill, validateOBLAlgorithm, validateEPAlgorithm, square1OBLCaseKey,
  square1EPCaseKey, square1EPPermutation, isOBLSolved, isEPSolved, normalizeSquare1Algorithm } from '../app/square1-last-layer.js';
import { square1LastLayerSVG } from '../app/square1-last-layer-view.js';

const seeded = seed => () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const reference = item => applySquare1Alg(solvedSquare1(), inverseSquare1(item.algorithms[0].alg));
const colours = state => ['top', 'bottom'].map(k => state[k].map((id, i, layer) => id[0] + (id === layer[(i + 11) % 12] ? 0 : 1)).join('')).join('|');
const pieces = state => {
  const all = state.top.concat(state.bottom);
  assert.equal(new Set(all).size, 16);
  for (const id of new Set(all)) assert.equal(all.filter(x => x === id).length, id[1] === 'C' ? 2 : 1);
  for (const layer of [state.top, state.bottom]) {
    const groups = square1LayerPieces(layer);
    assert.equal(groups.length, new Set(groups.map(p => p.id)).size, 'pieces stay contiguous');
  }
};
const parity = p => p.reduce((sum, value, i) => sum + p.slice(i + 1).filter(v => v < value).length, 0) % 2;

test('OBL catalogue covers the complete orientation set, including all seven EO cases', () => {
  assert.equal(CASES_SQ1_OBL.length, 185);
  assert.equal(new Set(CASES_SQ1_OBL.map(c => c.id)).size, 185);
  assert.deepEqual(GROUPS_SQ1_OBL.map(g => CASES_SQ1_OBL.filter(c => c.group === g).length), [7, 2, 7, 38, 89, 36, 6]);
  const known = new Set(CASES_SQ1_OBL.map(c => square1OBLCaseKey(reference(c))));
  assert.equal(known.size, 185);
  const masks = Array.from({ length: 256 }, (_, i) => i).filter(n => n.toString(2).replaceAll('0', '').length === 4);
  const expected = new Set();
  // Independently enumerate every assignment of four white corners and four
  // white edges among the two square layers. IDs remain unique at this stage.
  for (const cm of masks) for (const em of masks) {
    const s = solvedSquare1();
    for (const layer of ['top', 'bottom']) s[layer] = s[layer].map(id => {
      const index = Number(id[2]) + (id[0] === 'T' ? 0 : 4), mask = id[1] === 'C' ? cm : em;
      return (((mask >> index) & 1) ? 'T' : 'B') + id.slice(1) + id[0];
    });
    if (!isOBLSolved(s)) expected.add(square1OBLCaseKey(s));
  }
  assert.deepEqual(known, expected, 'no orientation case is missing or duplicated');
});

test('EP catalogue covers all 576 edge permutations as 99 cases, including 50 parity cases', () => {
  assert.equal(CASES_SQ1_EP.length, 99);
  assert.equal(CASES_SQ1_EP.filter(c => c.parity).length, 50);
  const known = new Set(CASES_SQ1_EP.map(c => square1EPCaseKey(reference(c))));
  assert.equal(known.size, 99);
  const perms = xs => xs.length ? xs.flatMap(x => perms(xs.filter(y => y !== x)).map(rest => [x, ...rest])) : [[]];
  const expected = new Set();
  for (const top of perms([0, 1, 2, 3])) for (const bottom of perms([0, 1, 2, 3])) {
    if (top.every((v, i) => v === i) && bottom.every((v, i) => v === i)) continue;
    const state = solvedSquare1();
    state.top = state.top.map(id => id[1] === 'E' ? 'TE' + top[Number(id[2])] : id);
    state.bottom = state.bottom.map(id => id[1] === 'E' ? 'BE' + bottom[Number(id[2])] : id);
    expected.add(square1EPCaseKey(state));
  }
  assert.deepEqual(known, expected);
  for (const item of CASES_SQ1_EP) {
    const p = square1EPPermutation(reference(item));
    assert.equal(Boolean(parity(p)), item.parity, item.name);
  }
});

test('every imported algorithm is legal and belongs to its labelled case', () => {
  for (const [cases, validate] of [[CASES_SQ1_OBL, validateOBLAlgorithm], [CASES_SQ1_EP, validateEPAlgorithm]]) {
    const ids = new Set();
    for (const item of cases) {
      assert(item.algorithms.some(a => a.id === item.defaultAlgorithmId));
      for (const algorithm of item.algorithms) {
        assert(!ids.has(algorithm.id)); ids.add(algorithm.id);
        assert(algorithm.sourceUrl.startsWith('https://'));
        assert.doesNotThrow(() => validate(algorithm.alg, item), algorithm.id);
        const state = applySquare1Alg(solvedSquare1(), inverseSquare1(algorithm.alg));
        assert(isCubeShape(state)); pieces(state);
        assert.deepEqual(applySquare1Alg(state, algorithm.alg), solvedSquare1());
      }
    }
  }
});

test('all 3700 upstream OBL alternate setups produce their labelled orientation case', () => {
  for (const item of CASES_SQ1_OBL) {
    assert.equal(item.scrambles.length, 20);
    const expected = square1OBLCaseKey(reference(item));
    for (const setup of item.scrambles) {
      const state = applySquare1Alg(solvedSquare1(), setup);
      assert.equal(square1OBLCaseKey(state), expected, item.id); pieces(state);
      let solved = false;
      for (const a of [0, 3, 6, -3]) for (const b of [0, 3, 6, -3]) {
        try { solved ||= isOBLSolved(applySquare1Alg(state, `(${a},${b}) ` + item.algorithms[0].alg)); } catch { /* another reference grip */ }
      }
      assert(solved, item.id);
    }
  }
});

test('disguised drills preserve the requested case and its exact preferred grip', () => {
  for (const [cases, create, key, goal] of [
    [CASES_SQ1_OBL, createOBLDrill, square1OBLCaseKey, isOBLSolved],
    [CASES_SQ1_EP, createEPDrill, square1EPCaseKey, isEPSolved],
  ]) for (const item of cases) {
    const expected = reference(item), setups = new Set();
    for (const random of [() => 0, () => .25, () => .5, () => .75, () => .99999, seeded(2757)]) {
      const drill = create({ caseId: item.id, scrambleStyle: 'disguised', layerAlignment: 'reference', random });
      assert.equal(key(drill.state), key(expected), item.id);
      assert.equal(colours(drill.state), colours(expected), 'reference grip retains colour positions');
      if (item.set === 'EP') assert.deepEqual(drill.state, expected, 'EP preserves every piece and the middle');
      assert(goal(applySquare1Alg(drill.state, drill.solution)), item.id);
      assert.deepEqual(applySquare1Alg(solvedSquare1(), drill.scramble), drill.state);
      const actual = normalizeSquare1Algorithm(drill.scramble), reverse = normalizeSquare1Algorithm(inverseSquare1(item.algorithms[0].alg));
      assert.notEqual(actual, reverse, 'never the straight inverse');
      assert(!actual.endsWith(' ' + reverse), 'never a random prefix followed by the preferred inverse');
      pieces(drill.state); setups.add(drill.scramble);
    }
    assert(setups.size >= 4, item.id + ' offers varied alternate routes');
  }
});

test('all preferred alternatives and changed grips work with disguised setups', () => {
  for (const [cases, create, goal] of [[CASES_SQ1_OBL, createOBLDrill, isOBLSolved], [CASES_SQ1_EP, createEPDrill, isEPSolved]]) {
    for (const item of cases) for (const algorithm of item.algorithms) {
      const drill = create({ caseId: item.id, alg: algorithm.alg, random: seeded(831) });
      assert(goal(applySquare1Alg(drill.state, drill.solution)), algorithm.id);
    }
    for (const item of [cases[0], cases[24], cases.at(-1)]) {
      // An unconventional 30-degree starting grip is valid custom notation;
      // random extra offsets are still quarter turns relative to that grip.
      const alg = '(1,0) ' + item.algorithms[0].alg;
      const drill = create({ caseId: item.id, alg, layerAlignment: 'reference', random: seeded(18) });
      const expected = applySquare1Alg(solvedSquare1(), inverseSquare1(alg));
      assert.equal(colours(drill.state), colours(expected));
      assert(goal(applySquare1Alg(drill.state, drill.solution)));
      const plain = create({ caseId: item.id, alg: item.algorithms[0].alg, random: seeded(21) });
      const redundant = create({ caseId: item.id, alg: '(1,0) (-1,0) ' + item.algorithms[0].alg, random: seeded(21) });
      assert.equal(plain.scramble, redundant.scramble, 'disguise depends on the case, not move text');
    }
  }
});

test('independent ending AUFs cover all 16 combinations and are undone by the solution', () => {
  for (const [item, create, goal] of [[CASES_SQ1_OBL[8], createOBLDrill, isOBLSolved], [CASES_SQ1_EP[0], createEPDrill, isEPSolved]]) {
    const seen = new Set();
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
      const values = [a / 4, b / 4];
      const drill = create({ caseId: item.id, scrambleStyle: 'provided', layerAlignment: 'random', random: () => values.shift() });
      assert.equal(parseSquare1Alg(drill.scramble).at(-1).type, 'turn');
      assert.match(drill.scramble, /\/ \(-?\d+,-?\d+\)$/);
      assert.deepEqual(applySquare1Alg(drill.state, drill.alignment), reference(item));
      assert(goal(applySquare1Alg(drill.state, drill.solution)));
      seen.add(`${drill.initialTop},${drill.initialBottom}`);
    }
    assert.equal(seen.size, 16); assert(seen.has('0,0'));
    const provided = create({ caseId: item.id, scrambleStyle: 'provided', layerAlignment: 'reference' });
    assert.deepEqual(provided.state, reference(item));
    assert.equal(provided.initialTop, 0); assert.equal(provided.initialBottom, 0);
    const fixed = create({ caseId: item.id, layerAlignment: 'reference', random: seeded(357) });
    const random = create({ caseId: item.id, layerAlignment: 'random', random: seeded(357) });
    assert.equal(fixed.setup, random.setup);
    assert.deepEqual(applySquare1Alg(random.state, random.alignment), fixed.state);
  }
});

test('stage checks distinguish OBL, EP, middle orientation and invalid custom algorithms', () => {
  const middleOnly = applySquare1Alg(solvedSquare1(), '/ (6,0) / (6,0) / (6,0)');
  assert.deepEqual(middleOnly.top, solvedSquare1().top); assert.deepEqual(middleOnly.bottom, solvedSquare1().bottom);
  assert(isOBLSolved(middleOnly)); assert(!isEPSolved(middleOnly)); assert(isEPSolved(middleOnly, { middle: false }));
  assert(isOBLSolved(reference(CASES_SQ1_EP[0]))); assert(!isEPSolved(reference(CASES_SQ1_EP[0])));
  for (const [cases, create, validate] of [[CASES_SQ1_OBL, createOBLDrill, validateOBLAlgorithm], [CASES_SQ1_EP, createEPDrill, validateEPAlgorithm]]) {
    assert.throws(() => validate('', cases[0]), /nonempty/);
    assert.throws(() => validate('R U', cases[0]), /notation/);
    assert.throws(() => validate(cases[1].algorithms[0].alg, cases[0]), /match/);
    assert.throws(() => validate('/', cases[0]), /cube shape/);
    assert.throws(() => create({ caseId: 'missing' }), /valid Square-1 case/);
    for (const options of [{ orientation: 'x2' }, { layerAlignment: 'bad' }, { scrambleStyle: 'bad' }]) {
      assert.throws(() => create({ caseId: cases[0].id, ...options }));
    }
  }
});

test('last-layer diagrams show real orientation colours and side stickers derived from piece identity', () => {
  const solved = solvedSquare1(), before = JSON.stringify(solved);
  const obl = square1LastLayerSVG(solved, { stage: 'obl', size: 300 });
  assert.match(obl, /width="300"/); assert.match(obl, /Top · outside view/); assert.match(obl, /Bottom · outside view/);
  assert.equal((obl.match(/data-colour="white"/g) || []).length, 8);
  assert.equal((obl.match(/data-colour="yellow"/g) || []).length, 8);
  assert.doesNotMatch(obl, /data-sticker="side"/);
  const ep = square1LastLayerSVG(solved, { stage: 'ep' });
  assert.equal((ep.match(/data-sticker="side"/g) || []).length, 24);
  for (const side of ['red', 'green', 'orange', 'blue']) assert.equal((ep.match(new RegExp(`data-colour="${side}"`, 'g')) || []).length, 6);
  assert.match(ep, /Equator square/);
  assert.match(ep, /data-piece="TE0"[\s\S]*?data-sticker="side" data-colour="red"/);
  assert.match(ep, /data-piece="BE0"[\s\S]*?data-sticker="side" data-colour="blue"/);
  assert.equal(JSON.stringify(solved), before, 'rendering does not mutate state');
  for (const item of [...CASES_SQ1_OBL, ...CASES_SQ1_EP]) {
    const svg = square1LastLayerSVG(reference(item), { stage: item.set.toLowerCase(), labels: false });
    assert.equal((svg.match(/data-piece=/g) || []).length, 16);
    assert.doesNotMatch(svg, /NaN|Infinity|undefined|Top ·|Equator/);
  }
});
