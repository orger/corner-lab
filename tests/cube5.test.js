import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FACES, AUFS, STICKER_GEOMETRY, EDGE_SLOTS, solvedState, applyAlg, parseAlg,
  normalizeAlg, simplifyAlg, inverse, equivalentScramble, facelets, isSolved, isReduced,
  cubeOrientations, reductionStatus, edgeStatus, createDrill,
} from '../app/cube5.js';
import { cubeSVG5, edgeSVG5, COLORS5 } from '../app/cubeview5.js';
import { CASES5 } from '../app/catalog5.js';

const INSERT = "Rw' F R' F' R U' R U Rw";
const TRANSVERSE = 'Uw2 R2 F2 Uw2 F2 R2 Uw2';
const PARITY = "Rw U2 Rw U2 Rw' U2 3Rw U2 Lw' U2 Rw U2 Rw' U2 Rw' x' U2 Rw'";

test('5×5 has 150 stickers, 54 center stickers and 36 physical edge cubies', () => {
  const state = solvedState();
  assert.equal(state.length, 150);
  assert.equal(STICKER_GEOMETRY.length, 150);
  for (const face of FACES) assert.equal(state.filter(color => color === face).length, 25);
  assert.equal(EDGE_SLOTS.length, 12);
  const edgeIndices = EDGE_SLOTS.flatMap(edge => edge.cubies.flatMap(cubie => cubie.indices));
  assert.equal(edgeIndices.length, 72);
  assert.equal(new Set(edgeIndices).size, 72);
  for (const edge of EDGE_SLOTS) {
    assert.equal(edge.cubies.length, 3);
    for (const cubie of edge.cubies) {
      assert.equal(cubie.indices.length, 2);
      assert.deepEqual(cubie.indices.map(index => state[index]), edge.faces);
      assert.ok(cubie.indices.every(index => STICKER_GEOMETRY[index].position.join(',') === cubie.position.join(',')));
    }
  }
  const status = reductionStatus(state);
  assert.equal(status.centres.length, 6);
  assert.equal(status.centres.reduce((sum, centre) => sum + centre.colors.length, 0), 54);
  assert.equal(status.centresSolved, true);
  assert.equal(status.pairedCount, 12);
  assert.deepEqual(status.unpaired, []);
});

test('outer, two-wide, three-wide and whole-cube moves have order four and exact inverses', () => {
  const state = applyAlg(solvedState(), "Rw U 3Fw' D Lw2 B 3Uw");
  for (const base of [...FACES, ...FACES.map(face => `${face}w`), ...FACES.map(face => `3${face}w`), 'x', 'y', 'z']) {
    assert.deepEqual(applyAlg(state, `${base} ${base} ${base} ${base}`), state, base);
    assert.deepEqual(applyAlg(state, `${base} ${base}'`), state, base);
    assert.deepEqual(applyAlg(state, `${base}2 ${base}2`), state, base);
    assert.notDeepEqual(applyAlg(state, base), state, base);
  }
});

test('each outer face is rotated clockwise in its own outside row-major view', () => {
  for (const face of FACES) {
    const base = FACES.indexOf(face) * 25;
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      const marker = Array(150).fill('U'); marker[base + row * 5 + col] = 'R';
      const moved = applyAlg(marker, face);
      assert.equal(moved.indexOf('R'), base + col * 5 + (4 - row), `${face}/${row}/${col}`);
    }
  }
});

test('Rw and 3Rw move exactly two and three layers, not the whole cube', () => {
  const solved = solvedState();
  for (const [move, width] of [['R', 1], ['Rw', 2], ['3Rw', 3], ['x', 5]]) {
    const f = facelets(applyAlg(solved, move));
    for (let row = 0; row < 5; row++) {
      assert.deepEqual(f.U.slice(row * 5, row * 5 + 5), [...Array(5 - width).fill('U'), ...Array(width).fill('F')], move);
      assert.deepEqual(f.F.slice(row * 5, row * 5 + 5), [...Array(5 - width).fill('F'), ...Array(width).fill('D')], move);
    }
  }
  // An independently placed marker verifies the middle plane is included only
  // by 3Rw, and the left inner plane remains untouched by both wide moves.
  for (const [move, width] of [['Rw', 2], ['3Rw', 3]]) for (let x = -2; x <= 2; x++) {
    const before = STICKER_GEOMETRY.findIndex(sticker => sticker.face === 'F' && sticker.position.join(',') === [x, 1, 2].join(','));
    const marker = Array(150).fill('U'); marker[before] = 'R';
    const after = x >= 3 - width
      ? STICKER_GEOMETRY.findIndex(sticker => sticker.face === 'U' && sticker.position.join(',') === [x, 2, -1].join(',')) : before;
    assert.equal(applyAlg(marker, move).indexOf('R'), after, `${move}/x=${x}`);
  }
});

test('wide-turn identities hold for all axes and complementary widths', () => {
  const state = applyAlg(solvedState(), "3Fw Rw' U B2 3Lw D' Fw");
  for (const [wide, decomposition] of [
    ['3Rw', 'x Lw'], ['Rw', 'x 3Lw'], ['3Lw', "x' Rw"], ['Lw', "x' 3Rw"],
    ['3Uw', 'y Dw'], ['Uw', 'y 3Dw'], ['3Dw', "y' Uw"], ['Dw', "y' 3Uw"],
    ['3Fw', 'z Bw'], ['Fw', 'z 3Bw'], ['3Bw', "z' Fw"], ['Bw', "z' 3Fw"],
  ]) assert.deepEqual(applyAlg(state, wide), applyAlg(state, decomposition), wide);
  for (const [wide, rotation] of [['5Rw', 'x'], ['5Uw', 'y'], ['5Fw', 'z'], ['5Lw', "x'"], ['5Dw', "y'"], ['5Bw', "z'"]]) {
    assert.deepEqual(applyAlg(state, wide), applyAlg(state, rotation), wide);
  }
});

test('5×5 notation preserves layer widths, parses source grouping and half-turn primes', () => {
  assert.equal(normalizeAlg("3Rw2’ Lw′ r U2' (R U R' U')2"), "3Rw2 Lw' Rw U2 R U R' U' R U R' U'");
  assert.equal(normalizeAlg("2Rw 3rw' Fw² x'"), "Rw 3Rw' Fw2 x'");
  assert.equal(normalizeAlg('[Rw,U2]'), "Rw U2 Rw' U2");
  assert.equal(normalizeAlg('[3Fw:R2]'), "3Fw R2 3Fw'");
  assert.equal(normalizeAlg("(Rw U)2'"), "U' Rw' U' Rw'");
  assert.deepEqual(parseAlg('R Rw 3Rw').map(move => move.width), [1, 2, 3]);
  for (const invalid of ['3R', '6Rw', '0Rw', 'M', 'R3', 'Rw ?', '(3Rw U', 'xw', '3x']) assert.throws(() => normalizeAlg(invalid), undefined, invalid);
  assert.equal(simplifyAlg("Rw Rw 3Rw 3Rw' U U'"), 'Rw2');
  assert.equal(simplifyAlg("R Rw R'"), "R Rw R'", 'different widths must not be combined');
});

test('long move sequences preserve physical piece inventories and invert exactly', () => {
  const pieceInventory = state => {
    const groups = new Map();
    STICKER_GEOMETRY.forEach((sticker, index) => {
      const position = sticker.position.join(',');
      if (!groups.has(position)) groups.set(position, []);
      groups.get(position).push(state[index]);
    });
    return [...groups.values()].map(colors => colors.sort().join('')).sort();
  };
  const solved = solvedState(), inventory = pieceInventory(solved);
  const bases = [...FACES, ...FACES.map(face => `${face}w`), ...FACES.map(face => `3${face}w`), 'x', 'y', 'z'];
  let seed = 6151;
  const random = () => { seed = seed * 16807 % 2147483647; return seed; };
  for (let iteration = 0; iteration < 50; iteration++) {
    const alg = Array.from({ length: 70 }, () => bases[random() % bases.length] + ['', '2', "'"][random() % 3]).join(' ');
    const state = applyAlg(solved, alg);
    assert.deepEqual(pieceInventory(state), inventory);
    assert.deepEqual(applyAlg(state, inverse(alg)), solved);
    assert.deepEqual(applyAlg(solved, simplifyAlg(alg)), state);
    assert.equal(inverse(inverse(alg)), normalizeAlg(alg));
    for (const face of FACES) assert.equal(state.filter(color => color === face).length, 25);
  }
  assert.deepEqual(solved, solvedState(), 'input arrays stay immutable');
});

test('reduction accepts a scrambled 3×3 state but rejects split centers and edges', () => {
  const outerScramble = applyAlg(solvedState(), "R U F2 D' L B2 R2");
  assert.equal(isSolved(outerScramble), false);
  assert.equal(isReduced(outerScramble), true);
  const wide = reductionStatus(applyAlg(solvedState(), 'Rw'));
  assert.equal(wide.centresSolved, false);
  assert.ok(wide.pairedCount < 12);
  const slots = EDGE_SLOTS.find(edge => edge.name === 'UF');
  const flipped = solvedState();
  const [a, b] = slots.cubies[0].indices;
  [flipped[a], flipped[b]] = [flipped[b], flipped[a]];
  assert.equal(reductionStatus(flipped).pairedCount, 11, 'one reversed wing is not paired with the midge');
  for (const cubie of slots.cubies.slice(1)) {
    const [i, j] = cubie.indices; [flipped[i], flipped[j]] = [flipped[j], flipped[i]];
  }
  assert.equal(isReduced(flipped), true, 'all three flipped together are a paired edge group');
  assert.deepEqual(edgeStatus(flipped), reductionStatus(flipped));
});

test('all 24 whole-cube orientations preserve reduced and solved status', () => {
  assert.equal(cubeOrientations().length, 24);
  for (const orientation of cubeOrientations()) {
    const state = applyAlg(solvedState(), orientation);
    assert.equal(isSolved(state), true);
    assert.equal(isReduced(state), true);
  }
  assert.equal(isSolved(applyAlg(solvedState(), 'Rw')), false);
});

test('source inserts, transverse alternatives and parity expose their actual unpaired locations', () => {
  for (const [alg, names] of [[INSERT, ['UF', 'UB']], [TRANSVERSE, ['FR', 'FL']], [PARITY, ['UF']]]) {
    const status = reductionStatus(applyAlg(solvedState(), inverse(alg)));
    assert.equal(status.centresSolved, true);
    assert.deepEqual(status.unpaired.map(edge => edge.name), names);
    assert.equal(status.pairedCount, 12 - names.length);
    assert.ok(status.unpaired.every(edge => edge.pairs.length === 3 && edge.pairs.every(pair => pair.length === 2)));
  }
});

test('drills retain exact source algorithms and solve with every grip and optional upper setup', () => {
  for (const alg of [INSERT, TRANSVERSE, PARITY]) for (const orientation of ['', 'y', 'y2', "y'"]) for (const preAuf of AUFS) {
    const drill = createDrill({ caseId: 'edge-test', alg, orientation, preAuf });
    assert.equal(drill.caseId, 'edge-test');
    assert.equal(drill.alg, normalizeAlg(alg));
    assert.equal(drill.setup, inverse(orientation));
    assert.deepEqual(drill.state, applyAlg(solvedState(), drill.scramble));
    assert.deepEqual(drill.afterSetupState, applyAlg(drill.state, drill.setup));
    assert.ok(isSolved(applyAlg(drill.state, drill.solution)));
    assert.ok(drill.status.centresSolved);
    assert.ok(drill.status.pairedCount >= 10);
  }
  assert.throws(() => createDrill({ alg: INSERT, orientation: 'x' }), /Starting grip/);
  assert.throws(() => createDrill({ alg: INSERT, preAuf: 'Rw' }), /Upper setup/);
});

test('5×5 renderers show accurate tile counts, strip partners and all actual unpaired edges', () => {
  const solved = solvedState();
  assert.equal((cubeSVG5(solved).match(/<polygon/g) || []).length, 75);
  assert.equal((cubeSVG5(solved, { net: true }).match(/<rect/g) || []).length, 150);
  const allEdges = edgeSVG5(solved, { size: 450, onlyUnpaired: false });
  assert.equal((allEdges.match(/<g /g) || []).length, 12);
  assert.equal((allEdges.match(/<rect/g) || []).length, 84);
  assert.match(edgeSVG5(solved), /All 12 edge groups are paired/);
  const transverse = applyAlg(solved, inverse(TRANSVERSE));
  const detail = edgeSVG5(transverse, { size: 240, onlyUnpaired: true });
  assert.match(detail, /width="240"/);
  assert.match(detail, /viewBox="0 0 230 74"/);
  assert.match(detail, />FR<\/text>/);
  assert.match(detail, />FL<\/text>/);
  assert.doesNotMatch(detail, />UF<\/text>/);
  assert.equal((detail.match(/<rect/g) || []).length, 14);
  const r = facelets(applyAlg(solved, 'R'));
  const svg = cubeSVG5(applyAlg(solved, 'R'));
  const fills = [...svg.matchAll(/<polygon[^>]+fill="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(fills, [...r.U, ...r.F, ...r.R].map(color => COLORS5[color]));
});

function seededRandom(initial) {
  let seed = initial;
  return () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
}

test('varied setups preserve every source case exactly across seeds and starting grips', () => {
  for (const c of CASES5) for (const alternative of c.algorithms) {
    for (const orientation of ['', 'y', 'y2', "y'"]) for (const seed of [1, 19, 48271, 992123]) {
      const provided = createDrill({ caseId: c.id, alg: alternative.alg, orientation });
      const varied = createDrill({ caseId: c.id, alg: alternative.alg, orientation,
        scrambleStyle: 'varied', random: seededRandom(seed) });
      assert.deepEqual(varied.state, provided.state, `${alternative.id}/${orientation}/${seed}`);
      assert.deepEqual(varied.afterSetupState, provided.afterSetupState);
      assert.equal(varied.solution, provided.solution);
      assert.equal(varied.scrambleStyle, 'varied');
      assert.equal(varied.scrambleDetails.method, 'equivalent-move-rewrites');
      assert.equal(varied.scrambleDetails.permutationVerified, true);
      assert.equal(varied.scrambleDetails.changed, true);
      assert.ok(varied.scrambleDetails.reframedSegments >= 1);
      assert.ok(varied.scrambleDetails.wideComplements >= 1);
      assert.ok(parseAlg(varied.scramble).length <= Math.floor(parseAlg(provided.scramble).length * 1.8));
      assert.notEqual(varied.scramble, provided.scramble);
      assert.equal(varied.scramble.includes(provided.scramble), false, 'do not enclose the unchanged complete source setup');
      assert.ok(isSolved(applyAlg(varied.state, varied.solution)));
    }
  }
});

test('varied notation preserves the entire sticker permutation on arbitrary marked states', () => {
  const setups = ["Rw U 3Fw2 R' D B2 Lw'", "3Lw' U2 F Rw2 x' 3Uw", "Rw2 F2 U2 Rw2 U2 F2 Rw2"];
  for (const setup of setups) {
    const rewrite = equivalentScramble(setup, seededRandom(48271));
    for (let index = 0; index < 150; index++) {
      const marker = Array(150).fill('U'); marker[index] = 'R';
      assert.deepEqual(applyAlg(marker, rewrite.alg), applyAlg(marker, setup), `${setup}/sticker${index}`);
    }
  }
});

test('varied setups are reproducible, differ across seeds and handle short input honestly', () => {
  const alg = CASES5[0].algorithms[1].alg;
  const generate = seed => createDrill({ alg, scrambleStyle: 'varied', random: seededRandom(seed) });
  assert.equal(generate(48271).scramble, generate(48271).scramble);
  const variants = new Set(Array.from({ length: 20 }, (_, index) => generate((index + 1) * 15013).scramble));
  assert.ok(variants.size >= 10, `${variants.size} distinct seeded rewrites`);
  const short = equivalentScramble('R', seededRandom(5));
  assert.equal(short.alg, 'R');
  assert.equal(short.changed, false);
  assert.equal(short.permutationVerified, true);
  assert.equal(equivalentScramble('', seededRandom(5)).alg, '');
  for (const value of [0, 1]) {
    const rewritten = equivalentScramble(inverse(alg), () => value);
    assert.deepEqual(applyAlg(solvedState(), rewritten.alg), applyAlg(solvedState(), inverse(alg)));
  }
  assert.throws(() => equivalentScramble(alg, () => NaN), /finite number/);
  assert.throws(() => createDrill({ alg, scrambleStyle: 'solver' }), /Scramble style/);
  const defaultDrill = createDrill({ alg });
  assert.equal(defaultDrill.scrambleStyle, 'provided');
  assert.equal(defaultDrill.scramble, simplifyAlg(inverse(alg)));
  assert.equal(defaultDrill.scrambleDetails.method, 'inverse-selected-solution');
});
