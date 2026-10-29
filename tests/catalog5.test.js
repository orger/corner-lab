import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES5, CASES5_BY_ID, SETS5, GROUPS5 } from '../app/catalog5.js';
import { AUFS, solvedState, applyAlg, inverse, normalizeAlg, isSolved, reductionStatus, createDrill } from '../app/cube5.js';

test('the 5×5 catalog preserves all 13 source rows and 27 labelled move strings', () => {
  assert.deepEqual(SETS5, ['L2E']);
  assert.equal(CASES5.length, 13);
  assert.equal(CASES5_BY_ID.size, 13);
  assert.equal(CASES5.reduce((total, item) => total + item.algorithms.length, 0), 27);
  assert.deepEqual(CASES5.map(item => item.id), Array.from({ length: 13 }, (_, index) => `LTE-${String(index + 1).padStart(2, '0')}`));
  assert.deepEqual(CASES5.map(item => item.originalName), [
    'same alt same 12 easy', 'same alt same 12 easy', 'centres swapped both bad',
    '2 centres flipped (flip 2 edges around other centre)', 'Regular parity case',
    'both broken 12 case', 'both same 12 21', 'both same 21 12', 'both alt 12 21',
    'both alt 21 12', 'both alt broken 12 21',
    'centres swapped one bad one good good c. back', 'centres swapped both good',
  ]);
  assert.equal(CASES5[0].name, 'same alt same 12 easy (Rw setup)');
  assert.equal(CASES5[1].name, 'same alt same 12 easy (3Lw setup)');
  const ids = new Set();
  for (const item of CASES5) {
    assert.ok(GROUPS5.includes(item.group));
    assert.equal(item.set, 'L2E');
    assert.equal(item.puzzle, '5x5');
    assert.equal(item.defaultAlgorithmId, `${item.id}-a2`);
    item.algorithms.forEach((algorithm, index) => {
      assert.equal(algorithm.id, `${item.id}-a${index + 1}`);
      assert.equal(algorithm.label, ['Reverse direction', 'Solve · supplied algorithm', 'Other axis'][index]);
      assert.equal(algorithm.sourceColumn, index + 1);
      assert.equal(algorithm.alg, algorithm.sourceAlg);
      assert.equal(algorithm.source, 'Your algorithm table');
      ids.add(algorithm.id);
    });
  }
  assert.equal(ids.size, 27);
  assert.equal(CASES5[0].algorithms[1].alg, "Rw' U' R' U (R' F R F') Rw", 'source grouping is retained');
  assert.equal(CASES5[2].algorithms[1].alg, "Rw2' F2 U2' Rw2' U2' F2 Rw2", 'source half-turn primes are retained');
});

test('every second column is exactly the first column inverse after notation normalization', () => {
  for (const item of CASES5) {
    const [forward, reverse] = item.algorithms;
    assert.equal(reverse.direction, 'inverse');
    assert.equal(reverse.inverseOf, forward.id);
    assert.equal(reverse.setupAlg, forward.sourceAlg, 'default solution retains the exact supplied setup');
    assert.equal(normalizeAlg(reverse.alg), inverse(forward.alg), item.id);
    assert.deepEqual(applyAlg(solvedState(), `${forward.alg} ${reverse.alg}`), solvedState(), item.id);
  }
});

test('each supplied sequence generates a genuine reduced-centres last-edges setup and solves it exactly', () => {
  for (const item of CASES5) for (const algorithm of item.algorithms) {
    const start = applyAlg(solvedState(), inverse(algorithm.alg));
    const status = reductionStatus(start);
    assert.equal(status.centresSolved, true, algorithm.id);
    assert.equal(status.pairedCount, item.id === 'LTE-05' ? 11 : 10, algorithm.id);
    assert.equal(status.unpaired.length, item.id === 'LTE-05' ? 1 : 2, algorithm.id);
    assert.equal(status.fullyReduced, false, algorithm.id);
    assert.deepEqual(applyAlg(start, algorithm.alg), solvedState(), algorithm.id);
  }
});

test('inverse columns are not silently treated as equivalent algorithms for a fixed starting picture', () => {
  const sameStateRows = new Set(['LTE-03', 'LTE-05', 'LTE-06', 'LTE-07', 'LTE-08', 'LTE-13']);
  for (const item of CASES5) {
    const [forward, reverse] = item.algorithms;
    const firstStart = applyAlg(solvedState(), inverse(forward.alg));
    const secondStart = applyAlg(solvedState(), inverse(reverse.alg));
    assert.equal(firstStart.join('') === secondStart.join(''), sameStateRows.has(item.id), item.id);
    assert.equal(isSolved(applyAlg(firstStart, reverse.alg)), sameStateRows.has(item.id), item.id);
  }
});

test('row 3 third-column sequence uses the other printed axis and has its own matching setup', () => {
  const [first, , third] = CASES5_BY_ID.get('LTE-03').algorithms;
  assert.equal(third.alg, 'Uw2 R2 F2 Uw2 F2 R2 Uw2');
  assert.equal(third.direction, 'additional');
  const firstStart = applyAlg(solvedState(), inverse(first.alg));
  const thirdStart = applyAlg(solvedState(), inverse(third.alg));
  assert.deepEqual(reductionStatus(firstStart).unpaired.map(edge => edge.name), ['UF', 'UB']);
  assert.deepEqual(reductionStatus(thirdStart).unpaired.map(edge => edge.name), ['FR', 'FL']);
  assert.equal(isSolved(applyAlg(firstStart, third.alg)), false);
  assert.deepEqual(applyAlg(solvedState(), third.alg), applyAlg(solvedState(), `x y ${first.alg} y' x'`));
  assert.deepEqual(applyAlg(firstStart, `y' x' ${third.alg} x y`), solvedState(), 'an explicit frame conjugation is required to use it on the first picture');
});

test('unusual source grips retain their actual unpaired-edge locations', () => {
  const cases = [
    ['LTE-02', 0, ['UF', 'DF']], ['LTE-11', 0, ['UF', 'DB']],
    ['LTE-12', 0, ['UB', 'DF']], ['LTE-05', 0, ['UF']],
  ];
  for (const [id, index, expected] of cases) {
    const algorithm = CASES5_BY_ID.get(id).algorithms[index];
    assert.deepEqual(reductionStatus(applyAlg(solvedState(), inverse(algorithm.alg))).unpaired.map(edge => edge.name), expected);
  }
});

test('all 27 sequences solve under every selectable U setup and starting yaw', () => {
  for (const item of CASES5) for (const algorithm of item.algorithms) for (const preAuf of AUFS) for (const orientation of ['', 'y', 'y2', "y'"]) {
    const drill = createDrill({ caseId: item.id, alg: algorithm.alg, preAuf, orientation });
    assert.equal(drill.verified, true);
    assert.equal(drill.status.centresSolved, true, algorithm.id);
    assert.equal(drill.status.pairedCount, item.id === 'LTE-05' ? 11 : 10, algorithm.id);
    assert.deepEqual(applyAlg(drill.state, drill.solution), solvedState(), algorithm.id);
  }
});
