import test from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_FACE_CASES, FIRST_FACE_FAMILIES, FIRST_FACE_GROUPS, DEFAULT_FIRST_FACE_CASE_IDS } from '../app/first-face-cases.js';
import { CASES } from '../app/catalog.js';
import { AUFS, BOTTOM_AUFS, applyAlg, inverse, solvedState, parseAlg, createDrill } from '../app/cube.js';

const firstFaceComplete = (state, color = 'D') => state.slice(12, 16).every(sticker => sticker === color);
const targetMask = state => state.map((color, i) => color === 'D' ? i : null).filter(i => i !== null).join(',');
const moveText = ({ face, turns }) => face + (turns === 2 ? '2' : turns === 3 ? "'" : '');

test('the PDF contributes 36 named cases in its 22 representative/mirror families', () => {
  assert.deepEqual(FIRST_FACE_GROUPS, ['LS', 'DD', 'UD', 'UU']);
  assert.equal(FIRST_FACE_CASES.length, 36);
  assert.equal(FIRST_FACE_FAMILIES.length, 22);
  assert.equal(new Set(FIRST_FACE_CASES.map(item => item.id)).size, 36);
  assert.deepEqual(FIRST_FACE_GROUPS.map(group => FIRST_FACE_CASES.filter(item => item.group === group).length), [5, 4, 12, 15]);
  assert.deepEqual(FIRST_FACE_GROUPS.map(group => FIRST_FACE_FAMILIES.filter(item => item.group === group).length), [3, 3, 6, 10]);
  assert.deepEqual(FIRST_FACE_CASES.map(item => item.name), [
    'D+4', 'D-4', 'U+3', 'U-3', 'U3', 'KO5', 'PT5', 'OP5', 'KT5',
    'JK1', 'QT1', 'PQ3', 'JO3', 'OQ3', 'JP3', 'RT5', 'IK5', 'DK3', 'AT3', 'BP3', 'CO3',
    'BC1', 'BD5', 'CF3', 'BE3', 'BR5', 'CI5', 'DQ3', 'AJ3', 'FJ5', 'EQ5', 'QR3', 'JQ5', 'IQ5', 'JR5', 'FQ3',
  ]);
  for (const family of FIRST_FACE_FAMILIES) {
    assert.ok(family.caseIds.length >= 1 && family.caseIds.length <= 2);
    assert.equal(family.representativeId, family.caseIds[0]);
    assert.deepEqual(family.caseIds, FIRST_FACE_CASES.filter(item => item.family === family.id).map(item => item.id));
  }
});

test('primary move counts are retained and the two defaults use the requested insertions', () => {
  const histogram = {};
  for (const item of FIRST_FACE_CASES) {
    assert.equal(item.length, parseAlg(item.alg).filter(move => /^[URFDLB]$/.test(move.face)).length);
    histogram[item.length] = (histogram[item.length] || 0) + 1;
    assert.equal(item.alg, item.algorithms[0].alg);
  }
  assert.deepEqual(histogram, { 1: 3, 3: 17, 4: 2, 5: 14 });
  assert.equal(FIRST_FACE_CASES.reduce((total, item) => total + item.length, 0), 132);
  assert.deepEqual(DEFAULT_FIRST_FACE_CASE_IDS.map(id => {
    const item = FIRST_FACE_CASES.find(item => item.id === id);
    return [item.name, item.alg];
  }), [['U-3', "R U R'"], ['U+3', "R U' R'"]]);
});

test('the user insertion keeps its stable ID and clearly retains the original PDF provenance', () => {
  const item = FIRST_FACE_CASES.find(item => item.id === 'FF-LS-Uplus3');
  assert.equal(item.alg, "R U' R'");
  assert.equal(item.userAdapted, true);
  assert.match(item.source, /User adaptation/);
  assert.match(item.sourceNote, /front-left.*front-right/);
  assert.equal(item.originalSourceAlg, "R' U' R");
  assert.equal(item.algorithms.length, 1, 'the original PDF pattern is not offered as an interchangeable solution');
  assert.equal(item.algorithms[0].id, 'FF-LS-Uplus3-a1');
  assert.equal(item.algorithms[0].sourceAlg, "R U' R'");
  assert.equal(item.algorithms[0].originalSourceAlg, "R' U' R");
  assert.equal(item.algorithms[0].userAdapted, true);
  assert.notEqual(targetMask(applyAlg(solvedState(), inverse(item.alg))), targetMask(applyAlg(solvedState(), inverse(item.originalSourceAlg))));
});

test('all source alternatives are retained and normalization preserves their actual moves', () => {
  const all = FIRST_FACE_CASES.flatMap(item => item.algorithms);
  assert.equal(all.length, 45);
  assert.equal(new Set(all.map(item => item.id)).size, 45);
  for (const item of all) assert.deepEqual(applyAlg(solvedState(), item.alg), applyAlg(solvedState(), item.sourceAlg), item.id);
  assert.equal(FIRST_FACE_CASES.find(item => item.name === 'JQ5').algorithms[1].sourceAlg, "U (R U' R' U) R' U' R");
  assert.equal(FIRST_FACE_CASES.find(item => item.name === 'JQ5').algorithms[1].length, 8, 'both lines of the wrapped secondary algorithm are included');
  assert.deepEqual(FIRST_FACE_CASES.filter(item => item.breaksBar).map(item => item.name), ['OQ3', 'JP3']);
  assert.equal(FIRST_FACE_CASES.find(item => item.name === 'KT5').algorithms[1].breaksBar, true);
});

test('36 primary patterns have distinct target-color masks and every alternative completes its first face', () => {
  const patterns = new Set();
  for (const item of FIRST_FACE_CASES) {
    const start = applyAlg(solvedState(), inverse(item.alg));
    patterns.add(targetMask(start));
    assert.equal(firstFaceComplete(start), false, item.id);
    for (const algorithm of item.algorithms) {
      assert.equal(firstFaceComplete(applyAlg(start, algorithm.alg)), true, algorithm.id);
    }
  }
  assert.equal(patterns.size, 36, 'no duplicate named patterns in their canonical orientations');
});

test('each PDF primary preserves its color pattern across every CLL/EG case and U-AUF pair with varied D offsets', () => {
  for (const firstFace of FIRST_FACE_CASES) {
    const expectedMask = targetMask(applyAlg(solvedState(), inverse(firstFace.alg)));
    for (const lastLayer of CASES) for (const preAuf of AUFS) for (const postAuf of AUFS) {
      const bottomAuf = BOTTOM_AUFS[(AUFS.indexOf(preAuf) + AUFS.indexOf(postAuf)) % BOTTOM_AUFS.length];
      const drill = createDrill({ caseId: lastLayer.id, alg: lastLayer.algorithms[0].alg, finish: firstFace.alg, preAuf, postAuf, bottomAuf });
      assert.equal(targetMask(drill.afterSetupState), expectedMask, `${firstFace.id} / ${lastLayer.id}`);
      let state = drill.afterSetupState;
      const moves = parseAlg(firstFace.alg);
      for (let index = 0; index < moves.length; index++) {
        assert.equal(firstFaceComplete(state), false, `${firstFace.id}: face must stay incomplete before the final move`);
        state = applyAlg(state, moveText(moves[index]));
      }
      assert.equal(firstFaceComplete(state), true, firstFace.id);
      assert.deepEqual(state, drill.afterFinishState);
      assert.deepEqual(applyAlg(state, `${drill.bottomSetup} ${drill.core}`), solvedState(), `${firstFace.id} / ${lastLayer.id}: exact last-layer solution`);
    }
  }
});
