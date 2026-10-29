import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES, SETS, GROUPS } from '../app/catalog.js';
import { AUFS, FACES, applyAlg, inverse, solvedState, bottomSignature, isFaceComplete, createDrill } from '../app/cube.js';
import { topStates, caseKey, TOP_CORNERS, YAWS, join } from '../scripts/catalog-utils.js';

test('catalog retains all 43 cases in each set, including all nine oriented-top cases', () => {
  assert.equal(CASES.length, 129);
  assert.equal(new Set(CASES.map(row => row.id)).size, CASES.length);
  for (const set of SETS) {
    const selected = CASES.filter(row => row.set === set);
    assert.equal(selected.length, 43);
    for (const group of GROUPS) assert.equal(selected.filter(row => row.group === group).length, group === 'O' ? 3 : group === 'H' ? 4 : 6);
    assert.deepEqual(new Set(selected.filter(row => row.group === 'O').map(row => row.name)), new Set(['O-Solved', 'O-Adjacent', 'O-Diagonal']));
  }
  assert.equal(CASES.find(row => row.id === 'CLL-O-Solved').algorithms[0].alg, '');
});

test('every alternative solves exactly the same fixed case and preserves the correct bottom', () => {
  const solved = solvedState();
  for (const row of CASES) {
    const canonical = applyAlg(solved, inverse(row.algorithms[0].alg));
    assert.equal(bottomSignature(canonical).set, row.set, row.id);
    assert.equal(bottomSignature(canonical).color, 'D', row.id);
    assert.equal(isFaceComplete(canonical, 'U'), row.group === 'O', row.id);
    if (row.set === 'EG1') assert.deepEqual(bottomSignature(canonical).bars, ['B'], row.id);
    for (const choice of row.algorithms) {
      assert.deepEqual(applyAlg(canonical, choice.alg), solved, `${choice.id}: fixed case`);
      assert.deepEqual(applyAlg(solved, inverse(choice.alg)), canonical, `${choice.id}: inverse case`);
      assert.ok(choice.source && choice.url, `${choice.id}: attribution`);
    }
  }
});

test('exhaustive upper-corner enumeration proves complete coverage through real pre/post AUF drills', () => {
  const upperIndices = new Set(TOP_CORNERS.flat());
  const bottomKey = state => state.filter((_, i) => !upperIndices.has(i)).join('');
  const colorFrames = YAWS.map(yaw => {
    const state = applyAlg(solvedState(), yaw);
    return Object.fromEntries(FACES.map((face, i) => [face, state[i * 4]]));
  });
  for (const set of SETS) {
    const selected = CASES.filter(row => row.set === set);
    const reference = applyAlg(solvedState(), inverse(selected[0].algorithms[0].alg));
    const expected = new Set([...topStates(reference)].map(state => state.join('')));
    assert.equal(expected.size, 24 * 27, `${set}: 4! corner permutations × 3³ twists`);
    const actual = new Set();
    for (const row of selected) for (const preAuf of AUFS) for (const postAuf of AUFS) {
      const state = applyAlg(solvedState(), inverse(join(preAuf, row.algorithms[0].alg, postAuf)));
      // Physical yaw and cyclic side-color naming remove the arbitrary front
      // color only; states must match the exact fixed bottom reference.
      for (const colors of colorFrames) for (const yaw of YAWS) {
        const oriented = applyAlg(state.map(color => colors[color]), yaw);
        if (bottomKey(oriented) === bottomKey(reference)) actual.add(oriented.join(''));
      }
    }
    assert.deepEqual(actual, expected, `${set}: no missing or impossible upper-layer states`);
    const keys = selected.map(row => caseKey(applyAlg(solvedState(), inverse(row.algorithms[0].alg))));
    assert.equal(new Set(keys).size, 43, `${set}: no duplicate case families`);
  }
});

test('all source choices support all AUF pairs with variable first-layer color', () => {
  for (const row of CASES) for (const choice of row.algorithms) for (const preAuf of AUFS) for (const postAuf of AUFS) {
    const drill = createDrill({ caseId: row.id, alg: choice.alg, preAuf, postAuf, color: 'orange', orientation: 'y' });
    assert.equal(drill.verified, true, choice.id);
    assert.equal(bottomSignature(drill.afterFinishState).set, row.set, choice.id);
    assert.equal(bottomSignature(drill.afterFinishState).color, 'L', choice.id);
  }
});
