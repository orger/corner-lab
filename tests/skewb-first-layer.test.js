import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES_SKEWB_FIRST_LAYER as cases, GROUPS_SKEWB_FIRST_LAYER as groups,
  DEFAULT_SKEWB_FIRST_LAYER_CASE_IDS as defaults, SKEWB_FIRST_LAYER_SOURCE as source } from '../app/catalog-skewb-first-layer.js';
import { solvedSkewb, applySkewbAlg, inverseSkewb, isSolvedSkewb, isSkewbFaceSolved,
  skewbStateKey, skewbStickerGeometry, parseSkewbAlg } from '../app/skewb.js';
import { createSkewbFirstLayerDrill, previewSkewbFirstLayerState, isSkewbFirstLayerSolved,
  hasSkewbFirstLayerAnchor, skewbFirstLayerCaseKey, skewbFirstLayerCorners,
  skewbFirstLayerProjection, validateSkewbFirstLayerAlgorithm } from '../app/skewb-first-layer.js';

const solved = solvedSkewb();
const fullKey = state => skewbStateKey(state);
// An independent five-sticker projection, deliberately smaller than the
// production builder's 13-sticker projection. One labelled D sticker uniquely
// determines its corner's position and orientation. D centre=5; clockwise
// around D the original D stickers are DFR=6, DRB=7, DBL=8, DLF=9.
const compact = state => [5, 6, 7, 8, 9].map(sticker => state.indexOf(sticker));
const compactKey = state => compact(state).join(',');
const rearStickers = [7, 8, 18, 19, 24, 28];
const allBottomStickers = [5, 6, 7, 8, 9, 13, 14, 18, 19, 23, 24, 28, 29];

test('first-layer catalogue exactly covers the 81 legal configurations, with shortest solutions', () => {
  const tokens = [...'FRBLfrbl'].flatMap(letter => [letter, `${letter}'`]);
  const moves = tokens.map(token => {
    const destinations = [];
    applySkewbAlg(solved, token).forEach((piece, slot) => { destinations[piece] = slot; });
    return destinations;
  });
  const start = [5, 6, 7, 8, 9], states = [start], seen = new Map([[start.join(','), 0]]), distances = [0];
  for (let index = 0; index < states.length; index++) {
    for (const move of moves) {
      const next = states[index].map(slot => move[slot]), key = next.join(',');
      if (seen.has(key)) continue;
      seen.set(key, states.length); states.push(next); distances.push(distances[index] + 1);
    }
  }
  assert.equal(states.length, 69984);
  const eligible = new Map(states.flatMap((state, index) => state[0] === 5 && state[2] === 7 && state[3] === 8 ? [[state.join(','), distances[index]]] : []));
  assert.equal(eligible.size, 81);
  const actual = new Map();
  for (const item of cases) {
    const state = applySkewbAlg(solved, item.setup), key = compactKey(state);
    assert.ok(eligible.has(key), item.id);
    assert.equal(item.turns, eligible.get(key), `${item.id}: minimum turns`);
    assert.equal(item.id, skewbFirstLayerCaseKey(state));
    for (const algorithm of item.algorithms) assert.equal(parseSkewbAlg(algorithm.alg).length, eligible.get(key), `${algorithm.id}: optimal finish`);
    actual.set(key, item.turns);
  }
  assert.deepEqual(actual, eligible);
  assert.deepEqual(source.shortestTurns, { 0: 1, 1: 4, 2: 7, 3: 14, 4: 29, 5: 26 });
});

test('case identity distinguishes all nine possibilities for each labelled front corner', () => {
  const left = new Set(), right = new Set(), pairs = new Set();
  let oneAlreadySolved = 0, bothUnsolved = 0;
  for (const item of cases) {
    const corners = skewbFirstLayerCorners(applySkewbAlg(solved, item.setup));
    assert.deepEqual(corners.DLF, item.leftCorner); assert.deepEqual(corners.DFR, item.rightCorner);
    const leftKey = `${corners.DLF.position}-${corners.DLF.yellowFace}`, rightKey = `${corners.DFR.position}-${corners.DFR.yellowFace}`;
    left.add(leftKey); right.add(rightKey); pairs.add(`${leftKey}/${rightKey}`);
    if (Number(corners.DLF.solved) + Number(corners.DFR.solved) === 1) oneAlreadySolved++;
    if (!corners.DLF.solved && !corners.DFR.solved) bothUnsolved++;
  }
  assert.equal(left.size, 9); assert.equal(right.size, 9); assert.equal(pairs.size, 81);
  for (const l of left) for (const r of right) assert.ok(pairs.has(`${l}/${r}`));
  assert.equal(oneAlreadySolved, 16); assert.equal(bothUnsolved, 64);
  assert.equal(cases.length, 81); assert.equal(new Set(cases.map(item => item.id)).size, 81);
  assert.deepEqual(cases.map(item => item.displayId), Array.from({ length: 81 }, (_, index) => `FL-${String(index + 1).padStart(2, '0')}`));
  assert.equal(defaults.length, 80); assert.ok(defaults.every(id => !cases.find(item => item.id === id).isSkip));
  assert.equal(groups.length, 6);
  assert.deepEqual(Object.fromEntries(groups.map(group => [group, cases.filter(item => item.group === group).length])), source.groups);
  for (const item of cases) {
    assert.equal(item.set, 'FL'); assert.equal(item.puzzle, 'skewb'); assert.ok(groups.includes(item.group));
    assert.ok(item.algorithms.some(algorithm => algorithm.id === item.defaultAlgorithmId));
    assert.equal(new Set(item.algorithms.map(algorithm => algorithm.id)).size, item.algorithms.length);
  }
});

test('all 1620 disguised setups keep the exact anchors and every preferred finish solves the entire first layer', () => {
  for (const item of cases) {
    assert.equal(item.scrambles.length, 20); assert.equal(new Set(item.scrambles).size, 20);
    const fullStates = new Set(), projection = compactKey(applySkewbAlg(solved, item.setup));
    for (const scramble of item.scrambles) {
      const state = applySkewbAlg(solved, scramble);
      assert.equal(state[5], 5, `${item.id}: bottom centre`);
      assert.ok(rearStickers.every(sticker => state[sticker] === sticker), `${item.id}: both rear corners including their side stickers`);
      assert.ok(hasSkewbFirstLayerAnchor(state)); assert.equal(skewbFirstLayerCaseKey(state), item.id);
      assert.equal(compactKey(state), projection);
      fullStates.add(fullKey(state));
      for (const algorithm of item.algorithms) {
        const result = applySkewbAlg(state, algorithm.alg);
        assert.ok(allBottomStickers.every(sticker => result[sticker] === sticker), `${algorithm.id}: completes exact first layer`);
        assert.ok(isSkewbFirstLayerSolved(result));
        assert.notEqual(scramble, inverseSkewb(algorithm.alg));
      }
    }
    assert.equal(fullStates.size, 20, `${item.id}: varied irrelevant pieces, not only different spelling`);
  }
});

test('disguised first-layer setups stay short and contain no cancellation or repeated full state', () => {
  for (const item of cases) for (const scramble of item.scrambles) {
    const tokens = scramble.split(' ');
    assert.ok(tokens.length >= 5 && tokens.length <= 7);
    let state = solved, previous = '', seen = new Set([fullKey(solved)]);
    tokens.forEach((token, index) => {
      assert.notEqual(token[0], previous, `${scramble}: adjacent turns around the same corner`);
      previous = token[0]; state = applySkewbAlg(state, token);
      const key = fullKey(state); assert.ok(!seen.has(key), `${scramble}: identity padding`); seen.add(key);
      if (index < tokens.length - 1 && hasSkewbFirstLayerAnchor(state)) assert.notEqual(skewbFirstLayerCaseKey(state), item.id, `${scramble}: unnecessary tail after prepared case`);
    });
  }
});

test('provided setups follow the chosen algorithm, while disguised drills preserve its case and vary upper pieces', () => {
  for (const item of cases) for (const choice of item.algorithms) {
    assert.equal(validateSkewbFirstLayerAlgorithm(item.id, choice.alg).valid, true);
    const direct = createSkewbFirstLayerDrill({ caseId: item.id, alg: choice.alg, scrambleStyle: 'provided', random: () => 0 });
    assert.equal(direct.scramble, inverseSkewb(choice.alg));
    assert.equal(direct.solution, choice.alg); assert.equal(direct.scrambleNotation, 'ns'); assert.equal(direct.solutionNotation, 'ns');
    assert.equal(skewbFirstLayerCaseKey(direct.state), item.id);
    assert.deepEqual(previewSkewbFirstLayerState(item.id), applySkewbAlg(solved, item.setup));
    assert.deepEqual(previewSkewbFirstLayerState(item), applySkewbAlg(solved, item.setup));
    for (const fraction of [0, 0.49, 0.999]) {
      const drill = createSkewbFirstLayerDrill({ caseId: item.id, alg: choice.alg, random: () => fraction });
      assert.notEqual(drill.scramble, direct.scramble); assert.equal(drill.solution, choice.alg);
      assert.ok(isSkewbFirstLayerSolved(applySkewbAlg(drill.state, drill.solution)));
      assert.deepEqual(skewbFirstLayerProjection(drill.state), skewbFirstLayerProjection(direct.state));
    }
  }
});

test('already solved is an optional skip, with nontrivial setups that only mix irrelevant pieces', () => {
  const skip = cases.find(item => item.isSkip);
  assert.equal(cases.filter(item => item.isSkip).length, 1); assert.equal(skip.algorithms[0].alg, '');
  assert.equal(skip.turns, 0); assert.ok(!defaults.includes(skip.id));
  for (const scramble of skip.scrambles) {
    const state = applySkewbAlg(solved, scramble);
    assert.ok(isSkewbFirstLayerSolved(state)); assert.ok(!isSolvedSkewb(state));
  }
  const drill = createSkewbFirstLayerDrill({ caseId: skip.id, random: () => 0 });
  assert.equal(drill.isSkip, true); assert.equal(drill.solution, '');
  assert.equal(validateSkewbFirstLayerAlgorithm(skip.id, '').valid, true);
  assert.deepEqual(previewSkewbFirstLayerState(''), solved);
  assert.deepEqual(previewSkewbFirstLayerState({ id: 'square1-reference', alg: '' }), solved);
});

test('first-layer goal requires exact side colours and the bottom centre; invalid choices fail clearly', () => {
  // A y rotation still presents a solid yellow bottom but swaps the identities
  // of the back/front corner anchors, so this fixed-grip stage is not solved.
  const rotated = applySkewbAlg(solved, 'y');
  assert.ok(isSkewbFaceSolved(rotated, 'D')); assert.ok(!isSkewbFirstLayerSolved(rotated));
  assert.throws(() => skewbFirstLayerCaseKey(rotated), /bottom centre and both back-bottom corners/);
  const item = cases.find(item => !item.isSkip);
  assert.equal(validateSkewbFirstLayerAlgorithm(item.id, '').valid, false);
  assert.equal(validateSkewbFirstLayerAlgorithm(item.id, 'U').valid, false);
  assert.equal(validateSkewbFirstLayerAlgorithm('missing', 'R').valid, false);
  assert.throws(() => createSkewbFirstLayerDrill({ caseId: 'missing' }), /Unknown/);
  assert.throws(() => createSkewbFirstLayerDrill({ caseId: item.id, alg: 'R R R' }), /does not complete|nonempty/);
  assert.throws(() => createSkewbFirstLayerDrill({ caseId: item.id, orientation: 'y' }), /fixed grip/);
  assert.throws(() => createSkewbFirstLayerDrill({ caseId: item.id, scrambleStyle: 'random' }), /Unknown/);
  for (const value of [-1, 1, NaN, Infinity]) assert.throws(() => createSkewbFirstLayerDrill({ caseId: item.id, random: () => value }), /between zero and one/);
  for (const state of [null, [], Array(30).fill(0)]) assert.throws(() => isSkewbFirstLayerSolved(state), /Invalid Skewb state/);
});

test('generic Skewb geometry export cannot mutate the simulator', () => {
  const before = applySkewbAlg(solved, 'F r B'), copy = skewbStickerGeometry();
  copy[0].position[0] = 999; copy[0].normal[0] = 999; copy[0].color = 'X'; copy[0].index = -1;
  assert.deepEqual(applySkewbAlg(solved, 'F r B'), before);
  assert.notEqual(skewbStickerGeometry()[0].position[0], 999);
  assert.equal(skewbStickerGeometry()[0].color, 'U');
});
