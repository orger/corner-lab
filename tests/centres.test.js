import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES_CENTRES, GROUPS_CENTRES, SETS_CENTRES, compileCentresAlg } from '../app/catalog-centres.js';
import { applyAlg, inverse, solvedState, reductionStatus, isSolved } from '../app/cube5.js';
import { createCentresDrill } from '../app/centres-drill.js';
import { centreSVG5 } from '../app/centres-view.js';

test('all 19 unsolved PDF cases are present once, preserving page order and source notation', () => {
  assert.equal(CASES_CENTRES.length, 19);
  assert.deepEqual(SETS_CENTRES, ['L2C']);
  assert.equal(new Set(CASES_CENTRES.map(item => item.id)).size, 19);
  assert.deepEqual(GROUPS_CENTRES.map(group => CASES_CENTRES.filter(item => item.group === group).length), [3, 10, 6]);
  for (const [index, item] of CASES_CENTRES.entries()) {
    assert.equal(item.id, `LTC-${String(index + 1).padStart(2, '0')}`);
    assert.equal(item.algorithms.length, 1);
    assert.equal(item.defaultAlgorithmId, item.algorithms[0].id);
    assert.equal(item.sourcePage, index < 11 ? 1 : 2);
    assert.equal(item.set, 'L2C');
  }
  assert.equal(CASES_CENTRES[2].algorithms[0].sourceAlg, "Rw U' M' U Rw' U' M");
});

test('inverse setup of every PDF algorithm exactly matches its visually transcribed U/F diagrams', () => {
  for (const item of CASES_CENTRES) {
    const state = applyAlg(solvedState(), inverse(item.algorithms[0].alg));
    const status = reductionStatus(state);
    for (const centre of status.centres) {
      assert.equal(centre.colors.join(''), item.referenceCentres[centre.face] || centre.face.repeat(9), `${item.id} ${centre.face}`);
    }
    const upper = status.centres.find(centre => centre.face === 'U');
    assert.equal(upper.colors.filter(color => color !== 'U').length, item.displacedCentres);
    assert.ok(isSolved(applyAlg(state, item.algorithms[0].alg)));
  }
});

test('PDF M notation is exactly the single middle slice, including primes and half turns', () => {
  const state = applyAlg(solvedState(), compileCentresAlg('M'));
  assert.deepEqual(state, applyAlg(solvedState(), "3Lw Lw'"));
  assert.deepEqual(applyAlg(state, compileCentresAlg("M'")), solvedState());
  assert.deepEqual(applyAlg(solvedState(), compileCentresAlg('M2′')), applyAlg(state, compileCentresAlg('M')));
  assert.equal(compileCentresAlg("(Rw U' Rw')"), "(Rw U' Rw')");
  assert.throws(() => compileCentresAlg(3), /text/);
});

test('all centre drills solve in every starting grip and preserve the four finished centres', () => {
  for (const item of CASES_CENTRES) for (const orientation of ['', 'y', 'y2', "y'"]) {
    const drill = createCentresDrill({ caseId: item.id, alg: item.algorithms[0].sourceAlg, orientation });
    assert.equal(drill.centreCaseVerified, true);
    assert.ok(isSolved(applyAlg(drill.state, drill.solution)), `${item.id} ${orientation}`);
    assert.equal(drill.status.centres.filter(centre => !centre.solved).length, 2);
    const front = drill.afterSetupStatus.centres.find(centre => centre.face === 'F');
    assert.ok([0, 1, 3, 4, 6, 7].every(index => front.colors[index] === front.color));
  }
});

test('varied centre scrambles preserve the exact case and remain soluble', () => {
  let seed = 7384;
  const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 2 ** 32);
  for (const item of CASES_CENTRES) for (const orientation of ['', 'y', 'y2', "y'"]) {
    const drill = createCentresDrill({ caseId: item.id, alg: item.algorithms[0].alg, orientation, scrambleStyle: 'varied', random });
    assert.deepEqual(drill.state, applyAlg(solvedState(), drill.providedScramble));
    assert.equal(drill.scrambleDetails.permutationVerified, true);
    assert.ok(isSolved(applyAlg(drill.state, drill.solution)));
  }
});

test('centre drill validation rejects other puzzle stages', () => {
  assert.throws(() => createCentresDrill({ alg: 'R' }), /last-two-centres/);
  assert.throws(() => createCentresDrill({ alg: 'Rw' }), /last-two-centres/);
});

test('centre diagrams show actual face locations and all nine stickers per centre', () => {
  for (const orientation of ['', 'y', 'y2', "y'"]) {
    const drill = createCentresDrill({ alg: CASES_CENTRES[0].algorithms[0].alg, orientation });
    const svg = centreSVG5(drill.state);
    assert.equal((svg.match(/data-centre-index=/g) || []).length, 18);
    for (const centre of drill.status.centres.filter(centre => !centre.solved)) assert.ok(svg.includes(`data-face="${centre.face}"`));
  }
  assert.equal((centreSVG5(solvedState(), { onlyUnsolved: false }).match(/data-centre-index=/g) || []).length, 54);
  assert.match(centreSVG5(solvedState()), /All six centres are solved/);
});
