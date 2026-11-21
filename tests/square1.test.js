import test from 'node:test';
import assert from 'node:assert/strict';
import { solvedSquare1, parseSquare1Alg, inverseSquare1, applySquare1Alg, isSliceableSquare1, isCubeShape,
  square1LayerPieces, square1LayerSignature, square1ShapeKey, square1LegalRotations, generateSquare1Shapes, createSquare1Drill } from '../app/square1.js';
import { CASES_SQ1, GROUPS_SQ1, square1ShapeName } from '../app/catalog-square1.js';
import { square1SVG } from '../app/square1-view.js';

const signature = widths => Array.from({ length: widths.length }, (_, i) => widths.slice(i) + widths.slice(0, i)).sort()[0];
function necklaces(corners, edges) {
  const result = new Set();
  function visit(c, e, text) {
    if (!c && !e) { result.add(signature(text)); return; }
    if (c) visit(c - 1, e, text + '2');
    if (e) visit(c, e - 1, text + '1');
  }
  visit(corners, edges, ''); return result;
}
function assertPieces(state) {
  const all = [...state.top, ...state.bottom], pieces = new Set(all);
  assert.equal(pieces.size, 16);
  assert.equal(state.top.length, 12); assert.equal(state.bottom.length, 12);
  for (const id of pieces) assert.equal(all.filter(piece => piece === id).length, id.includes('C') ? 2 : 1);
  for (const layer of [state.top, state.bottom]) {
    const groups = square1LayerPieces(layer);
    assert.equal(groups.reduce((total, piece) => total + piece.width, 0), 12);
    assert.equal(new Set(groups.map(piece => piece.id)).size, groups.length, 'every piece stays contiguous');
    for (const piece of groups) assert.equal(piece.width, piece.id.includes('C') ? 2 : 1);
  }
}

test('standard Square-1 notation and inverse keep explicit layer signs', () => {
  assert.deepEqual(parseSquare1Alg(' (1, -2) / -3,6 / '), [
    { type: 'turn', top: 1, bottom: -2 }, { type: 'slice' },
    { type: 'turn', top: -3, bottom: 6 }, { type: 'slice' },
  ]);
  assert.equal(inverseSquare1('(1,-2) / (-3,6) /'), '/ (3,6) / (-1,2)');
  assert.deepEqual(parseSquare1Alg(''), []);
  assert.equal(inverseSquare1(''), '');
  for (const text of ['R U', '(7,0)', '(1.5,0)', '(1,)', '1', '(0,0) rubbish', '//x', '/'.repeat(1001), ' '.repeat(12001)]) {
    assert.throws(() => parseSquare1Alg(text));
  }
  assert.throws(() => parseSquare1Alg(null), /text/);
});

test('reference grip matches independent published cube-shape notation fixtures', () => {
  // Jaap's notation section explicitly gives these two cube-shape preserving
  // sequences. This checks signs and initial alignment independently of inverse.
  const start = solvedSquare1();
  assert.equal(isCubeShape(start), true);
  assert.equal(isSliceableSquare1(start), true);
  for (const alg of ['(1,0) / (-1,0)', '(0,-1) / (0,-1)']) {
    const result = applySquare1Alg(start, alg);
    assert.equal(isCubeShape(result), true, alg); assertPieces(result);
  }
  const kite = applySquare1Alg(start, '/');
  assert.equal(square1ShapeName(square1LayerSignature(kite.top)), 'Kite');
  assert.equal(square1ShapeName(square1LayerSignature(kite.bottom)), 'Kite');
  assert.equal(isCubeShape(kite), false);
  assert.equal(kite.middleFlipped, true);
  assert.deepEqual(applySquare1Alg(kite, '/'), start);
});

test('corners crossing either end of either layer block a slice', () => {
  const start = solvedSquare1();
  for (const alg of ['(-1,0)', '(0,1)', '(2,0)', '(0,-2)']) {
    const state = applySquare1Alg(start, alg);
    assert.equal(isSliceableSquare1(state), false, alg);
    assert.throws(() => applySquare1Alg(state, '/'), /corner crosses/);
  }
  assert.equal(isSliceableSquare1(applySquare1Alg(start, '(1,-1)')), true);
  assert.deepEqual(applySquare1Alg(start, '(6,6) (6,6)'), start);
  assert.deepEqual(start, solvedSquare1(), 'input state is never mutated');
});

test('generated graph covers every combinatorially possible ordered pair once', () => {
  const expected = new Set();
  for (let topCorners = 2; topCorners <= 6; topCorners++) {
    const top = necklaces(topCorners, 12 - topCorners * 2);
    const bottom = necklaces(8 - topCorners, 12 - (8 - topCorners) * 2);
    for (const a of top) for (const b of bottom) expected.add(`${a}-${b}`);
  }
  const graph = generateSquare1Shapes();
  assert.equal(expected.size, 170);
  assert.deepEqual(new Set(graph.map(item => item.key)), expected);
  assert.equal(CASES_SQ1.length, 169, 'only already-square shape is omitted');
  assert.equal(new Set(CASES_SQ1.map(item => item.id)).size, 169);
  assert.equal(new Set(CASES_SQ1.map(item => item.name)).size, 169);
  assert.equal(Math.max(...graph.map(item => item.slashes)), 7);
  assert.deepEqual(graph.map(item => item.key), generateSquare1Shapes().map(item => item.key), 'stable IDs/order');
  assert.deepEqual(GROUPS_SQ1, ['1 slash', '2 slashes', '3 slashes', '4 slashes', '5 slashes', '6 slashes', '7 slashes']);
});

test('all generated solutions are legal, preserve pieces and restore cube shape', () => {
  for (const item of CASES_SQ1) {
    const alg = item.algorithms[0].alg, start = solvedSquare1();
    const state = applySquare1Alg(start, item.setup);
    assert.equal(square1ShapeKey(state), item.id.slice(4), item.id);
    assert.equal(isCubeShape(state), false);
    assertPieces(state);
    assert.deepEqual(applySquare1Alg(state, alg), start, item.name);
    assert.equal(parseSquare1Alg(alg).filter(move => move.type === 'slice').length, item.slashes);
    assert.equal(isSliceableSquare1(state), true);
  }
});

test('slice counts satisfy optimal graph distances, independently of chosen solutions', () => {
  const graph = generateSquare1Shapes(), distance = new Map(graph.map(item => [item.key, item.slashes]));
  for (const node of graph) {
    let lower = node.slashes === 0;
    for (const top of square1LegalRotations(node.state.top)) for (const bottom of square1LegalRotations(node.state.bottom)) {
      const neighbour = applySquare1Alg(node.state, `(${top},${bottom}) /`);
      const depth = distance.get(square1ShapeKey(neighbour));
      assert.ok(Math.abs(depth - node.slashes) <= 1, 'a legal slash cannot skip a BFS depth');
      if (depth === node.slashes - 1) lower = true;
    }
    assert.equal(lower, true, 'every non-square shape has a one-slash route to the previous depth');
  }
});

test('random starting rotations preserve the case and align before solving', () => {
  for (const item of CASES_SQ1) for (const value of [0, 0.3, 0.65, 0.99999]) {
    const drill = createSquare1Drill({ caseId: item.id, alg: item.algorithms[0].alg, scrambleStyle: 'varied', random: () => value });
    assert.equal(square1ShapeKey(drill.state), item.id.slice(4));
    assert.equal(drill.layerAlignment, 'random');
    assert.equal(parseSquare1Alg(drill.scramble).at(-1).type, 'turn');
    assert.deepEqual(applySquare1Alg(drill.state, drill.solution), solvedSquare1());
    assert.deepEqual(applySquare1Alg(solvedSquare1(), drill.scramble), drill.state);
  }
  const item = CASES_SQ1[0], alg = item.algorithms[0].alg;
  assert.equal(createSquare1Drill({ alg }).scramble, inverseSquare1(alg));
  assert.throws(() => createSquare1Drill({ alg, orientation: 'y' }), /reference grip/);
  assert.throws(() => createSquare1Drill({ alg, scrambleStyle: 'bad' }), /setup style/);
  assert.throws(() => createSquare1Drill({ alg, layerAlignment: 'bad' }), /layer alignment/);
  assert.throws(() => createSquare1Drill({ alg: '' }), /unsolved/);
});

test('geometry diagrams show both outside views, real corner vertices and every piece', () => {
  for (const state of [solvedSquare1(), ...CASES_SQ1.map(item => applySquare1Alg(solvedSquare1(), item.setup))]) {
    const svg = square1SVG(state, { size: 300 });
    assert.match(svg, /width="300"/);
    assert.match(svg, /Top · outside view/); assert.match(svg, /Bottom · outside view/);
    assert.equal((svg.match(/<polygon /g) || []).length, 16);
    assert.equal((svg.match(/data-width="2"/g) || []).length, 8);
    assert.equal((svg.match(/data-width="1"/g) || []).length, 8);
    assert.equal((svg.match(/stroke-dasharray/g) || []).length, 2);
    assert.doesNotMatch(svg, /NaN|Infinity/);
  }
  const solved = square1SVG(solvedSquare1());
  assert.match(solved, /47\.000,-47\.000/, 'corner outer vertices form a real square');
  assert.match(solved, /-47\.000,47\.000/);
});


test('practice diagrams can hide recognition names until reveal', () => {
  const state = applySquare1Alg(solvedSquare1(), '/');
  const practice = square1SVG(state, { shapeNames: false });
  assert.match(practice, /Top · outside view/);
  assert.match(practice, /Bottom · outside view/);
  assert.doesNotMatch(practice, /Kite/);
  assert.match(square1SVG(state), /Kite/);
});


const seededRandom = seed => () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);

test('random ending turns independently cover all 144 top/bottom alignments, including blocked cuts', () => {
  const item = CASES_SQ1[0], ends = new Set();
  let blocked = false;
  for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) {
    const values = [a / 12, b / 12];
    const drill = createSquare1Drill({ alg: item.algorithms[0].alg, scrambleStyle: 'provided', layerAlignment: 'random', random: () => values.shift() });
    assert.equal(square1ShapeKey(drill.state), item.id.slice(4));
    assert.equal(drill.layerAlignment, 'random');
    assert.deepEqual(parseSquare1Alg(drill.scramble).at(-1), {type:'turn', top:drill.initialTop, bottom:drill.initialBottom});
    assert.match(drill.scramble, /\/ \(-?\d+,-?\d+\)$/);
    assert.deepEqual(applySquare1Alg(drill.state, drill.solution), solvedSquare1());
    blocked ||= !isSliceableSquare1(drill.state);
    ends.add(`${drill.initialTop},${drill.initialBottom}`);
  }
  assert.equal(ends.size, 144);
  assert.equal(blocked, true, 'random alignment is not limited to positions that are already sliceable');
  assert(ends.has('0,0'), 'the no-adjustment outcome remains an explicit final turn');
});

const sliceCore = algorithm => {
  const moves = parseSquare1Alg(algorithm), first = moves.findIndex(move => move.type === 'slice');
  let last = moves.length - 1; while (last >= 0 && moves[last].type !== 'slice') last--;
  return JSON.stringify(moves.slice(first, last + 1));
};
const sliceCount = algorithm => parseSquare1Alg(algorithm).filter(move => move.type === 'slice').length;

// Compare actual piece order independently of the generator's serialized key.
// Layer rotations and swapping the layers as a whole-puzzle regrip are free.
function sameLayerPieces(a, b) {
  return b.some((_, offset) => a.every((piece, index) => piece === b[(index + offset) % 12]));
}
function equivalentPieceStates(a, b) {
  return sameLayerPieces(a.top, b.top) && sameLayerPieces(a.bottom, b.bottom) ||
    sameLayerPieces(a.top, b.bottom) && sameLayerPieces(a.bottom, b.top);
}

test('disguised setups take genuine varied 5–7-slice routes to every selected shape', () => {
  const lengths = [];
  for (const item of CASES_SQ1) {
    const scrambles = new Set(), routes = new Set();
    // Constant sources cover deterministic edge cases; the seeded source also
    // exercises independent move and end-alignment choices through the route.
    for (const random of [() => 0, () => .25, () => .5, () => .75, () => .99999, seededRandom(48271)]) {
      const drill = createSquare1Drill({caseId:item.id, alg:item.algorithms[0].alg, scrambleStyle:'disguised', layerAlignment:'random', random});
      const moves = parseSquare1Alg(drill.scramble);
      const length = sliceCount(drill.scramble); lengths.push(length);
      assert.ok(length >= 5 && length <= 7, `${item.name}: ${length} slices`);
      assert.ok(length >= Math.max(5, item.slashes), 'respects both the floor and the shape distance');
      assert.equal(moves.at(-1).type, 'turn', 'ending turns are always written after the final slash');
      assert(!moves.some((move, index) => move.type === 'slice' && moves[index + 1]?.type === 'slice'), 'no immediate slice cancellations');
      const stages = [solvedSquare1()]; let prefix = [];
      for (const [index, move] of moves.entries()) {
        prefix.push(move.type === 'slice' ? '/' : `(${move.top},${move.bottom})`);
        if (move.type !== 'slice') continue;
        if (stages.length > 1) {
          assert.ok(moves[index - 1]?.type === 'turn');
          const before = moves[index - 1];
          assert.ok(before.top || before.bottom, 'zero alignment cannot disguise an inverse slice pair');
          assert.ok(before.top !== 6 || before.bottom !== 6, 'a two-slice whole-puzzle flip cannot pad the floor');
        }
        const stage = applySquare1Alg(solvedSquare1(), prefix.join(' '));
        assert.equal(isCubeShape(stage), false, 'no cube-shape premix followed by an exposed inverse');
        assert.ok(stages.every(previous => !equivalentPieceStates(stage, previous)), 'no identity or regrip loop between slices');
        stages.push(stage);
      }
      assert.equal(square1ShapeKey(drill.state), item.id.slice(4));
      assertPieces(drill.state);
      assert.deepEqual(applySquare1Alg(solvedSquare1(), drill.scramble), drill.state);
      assert(isCubeShape(applySquare1Alg(drill.state, drill.solution)), item.name);
      assert.equal(drill.scrambleStyle, 'disguised');
      assert.notEqual(sliceCore(drill.setup), sliceCore(inverseSquare1(item.algorithms[0].alg)), 'outer alignment alone cannot disguise the chosen inverse');
      scrambles.add(drill.scramble);
      routes.add(sliceCore(drill.setup));
    }
    assert(scrambles.size >= 4, `${item.name} has multiple disguised routes`);
    assert(routes.size >= 2, `${item.name} varies the actual route, not just the final turns`);
  }
  lengths.sort((a, b) => a - b);
  assert.deepEqual([lengths[0], lengths[Math.floor(lengths.length / 2)], lengths.at(-1)], [5, 5, 7]);
});

test('disguise and ending alignment are independent; disguise depends on shape rather than preferred move text', () => {
  for (const item of [CASES_SQ1[0], CASES_SQ1[63], CASES_SQ1.at(-1)]) {
    const options = {caseId:item.id, alg:item.algorithms[0].alg, scrambleStyle:'disguised'};
    const reference = createSquare1Drill({...options, layerAlignment:'reference', random:seededRandom(937)});
    const randomized = createSquare1Drill({...options, layerAlignment:'random', random:seededRandom(937)});
    assert.equal(reference.setup, randomized.setup);
    assert.deepEqual(applySquare1Alg(randomized.state, randomized.alignment), reference.state);
    assert(isCubeShape(applySquare1Alg(reference.state, reference.solution)));
    assert.equal(reference.initialTop, 0); assert.equal(reference.initialBottom, 0);
    assert.equal(reference.layerAlignment, 'reference');
    const equivalent = createSquare1Drill({...options, alg:'(1,0) (-1,0) ' + options.alg, layerAlignment:'reference', random:seededRandom(937)});
    assert.equal(equivalent.scramble, reference.scramble, 'the selected algorithm reverse is not appended to the disguise');
  }
});

test('short disguise rejects a custom selected inverse even when its turns are split or its outer alignment changes', () => {
  for (const item of [CASES_SQ1[0], ...[5, 6, 7].map(slashes => CASES_SQ1.find(item => item.slashes === slashes))]) {
    const options = { caseId: item.id, scrambleStyle: 'disguised', layerAlignment: 'reference' };
    const first = createSquare1Drill({ ...options, alg: item.algorithms[0].alg, random: seededRandom(326) });
    const inverse = inverseSquare1(first.setup);
    const direct = createSquare1Drill({ ...options, alg: inverse, random: seededRandom(326) });
    assert.notEqual(sliceCore(direct.setup), sliceCore(first.setup), 'replaying the same RNG must backtrack from the new selected inverse');
    assert.equal(sliceCount(direct.setup), Math.max(5, item.slashes));
    assert.ok(isCubeShape(applySquare1Alg(direct.state, direct.solution)));
    // Split every original turn into a cancelling prefix plus itself. This is
    // equivalent notation, so it must not bypass the direct-inverse rejection.
    const split = inverse.replace(/\(/g, '(1,0) (-1,0) (');
    const equivalent = createSquare1Drill({ ...options, alg: split, random: seededRandom(326) });
    assert.equal(equivalent.setup, direct.setup);
    const withOuterTurn = `(1,0) (-1,0) ${inverse} (3,0)`;
    const rotated = createSquare1Drill({ ...options, alg: withOuterTurn, random: seededRandom(326) });
    assert.notEqual(sliceCore(rotated.setup), sliceCore(first.setup));
    assert.ok(isCubeShape(applySquare1Alg(rotated.state, rotated.solution)));
  }
});

test('short disguised cube-shape routes keep all144 independent final top/bottom positions', () => {
  const item = CASES_SQ1.find(item => item.slashes === 7), alg = item.algorithms[0].alg;
  const options = { caseId: item.id, alg, scrambleStyle: 'disguised' };
  let routeDraws = 0;
  const reference = createSquare1Drill({ ...options, layerAlignment: 'reference', random: () => { routeDraws++; return .25; } });
  const endings = new Set(); let blocked = false;
  for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) {
    let draws = 0;
    const drill = createSquare1Drill({ ...options, layerAlignment: 'random', random: () => ++draws <= routeDraws ? .25 : draws === routeDraws + 1 ? a / 12 : b / 12 });
    assert.equal(drill.setup, reference.setup);
    assert.equal(sliceCount(drill.scramble), 7);
    assert.deepEqual(applySquare1Alg(drill.state, drill.alignment), reference.state);
    assert.ok(isCubeShape(applySquare1Alg(drill.state, drill.solution)));
    endings.add(`${drill.initialTop},${drill.initialBottom}`);
    blocked ||= !isSliceableSquare1(drill.state);
  }
  assert.equal(endings.size, 144); assert.equal(blocked, true);
});
