import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { CASES_SKEWB_NS2, GROUPS_SKEWB_NS2, SKEWB_NS2_SOURCE } from '../app/catalog-skewb-ns2.js';
import { solvedSkewb, applySkewbAlg, parseSkewbAlg, normalizeSkewbAlg, inverseSkewb, skewbFacelets, skewbStateKey, isSolvedSkewb, isSkewbFaceSolved, validateSkewbAlgorithm, createSkewbDrill, previewSkewbState } from '../app/skewb.js';
import { skewbSVG, SKEWB_COLORS } from '../app/skewb-view.js';

const applyWCA = (state, alg) => applySkewbAlg(state, alg, { notation: 'wca' });
const source = JSON.parse(fs.readFileSync(new URL('../scripts/skewb-ns2-source.json', import.meta.url), 'utf8'));
const report = JSON.parse(fs.readFileSync(new URL('../scripts/skewb-catalog-report.json', import.meta.url), 'utf8'));
const supplement = JSON.parse(fs.readFileSync(new URL('../scripts/skewb-ns2-supplement.json', import.meta.url), 'utf8'));

test('Skewb WCA R has the documented DRB axis and physically correct sticker cycle', () => {
  const state = applyWCA(solvedSkewb(), 'R');
  // Manually derived clockwise DRB turn: centres D→R→B→D; corners
  // DFR→URB→DBL→DFR, with DRB twisting in place. UFR stays untouched.
  assert.deepEqual(skewbFacelets(state), {
    U: ['U', 'U', 'F', 'U', 'U'], D: ['B', 'D', 'B', 'B', 'B'],
    F: ['F', 'F', 'F', 'L', 'F'], B: ['R', 'R', 'B', 'R', 'R'],
    R: ['D', 'R', 'D', 'D', 'D'], L: ['L', 'L', 'L', 'L', 'U'],
  });
  assert.equal(state.filter((value, index) => value !== index).length, 15);
});

test('Skewb distinguishes NS solution letters from the WCA scramble alphabet', () => {
  const identity = solvedSkewb(), ns = skewbFacelets(applySkewbAlg(identity, 'R'));
  // NS R is URB: U→B→R→U, unlike WCA R at DRB.
  assert.equal(ns.U[0], 'R'); assert.equal(ns.B[0], 'U'); assert.equal(ns.R[0], 'B');
  assert.notDeepEqual(applyWCA(identity, 'R'), applySkewbAlg(identity, 'R'));
  for (const [wca, ns] of [['U', 'B'], ['R', 'r'], ['L', 'l'], ['B', 'b']]) {
    assert.deepEqual(applyWCA(identity, wca), applySkewbAlg(identity, ns));
  }
  assert.throws(() => applySkewbAlg(identity, 'U'), /Invalid Skewb move/);
  assert.throws(() => applyWCA(identity, 'r'), /Invalid Skewb move/);
  assert.equal(parseSkewbAlg("U R' L B").length, 4, 'history parser accepts WCA setup syntax');
  assert.equal(parseSkewbAlg("F r' B l x y2").length, 6, 'history parser also accepts NS solve syntax');
});

test('Skewb moves have order three, cube rotations have order four, and inverse round trips preserve the input', () => {
  const initial = solvedSkewb();
  for (const move of 'FRBLfrbl') {
    assert.deepEqual(applySkewbAlg(initial, `${move} ${move} ${move}`), initial);
    assert.deepEqual(applySkewbAlg(initial, `${move}2`), applySkewbAlg(initial, `${move}'`));
  }
  for (const move of 'xyz') {
    assert.deepEqual(applySkewbAlg(initial, `${move} ${move} ${move} ${move}`), initial);
    assert.ok(isSolvedSkewb(applySkewbAlg(initial, move)));
  }
  const x = skewbFacelets(applySkewbAlg(initial, 'x'));
  assert.deepEqual(Object.fromEntries(Object.entries(x).map(([f, a]) => [f, a[0]])), { U: 'F', D: 'B', F: 'D', B: 'U', R: 'R', L: 'L' });
  for (const [alg, notation] of [["x r' R B l F' y2 f b' z", 'ns'], ["U R' L B' U' x2 R L'", 'wca']]) {
    const state = applySkewbAlg(initial, alg, { notation });
    assert.deepEqual(applySkewbAlg(state, inverseSkewb(alg), { notation }), initial);
    assert.deepEqual([...state].sort((a, b) => a - b), initial);
  }
  assert.deepEqual(initial, solvedSkewb(), 'simulation never mutates a supplied state');
  const seen = new Set([skewbStateKey(initial)]), states = [initial];
  for (let i = 0; i < states.length; i++) for (const move of 'xyz') {
    const next = applySkewbAlg(states[i], move), key = skewbStateKey(next);
    if (!seen.has(key)) { seen.add(key); states.push(next); }
  }
  assert.equal(states.length, 24);
  assert.ok(states.every(isSolvedSkewb));
});

test('Skewb parser rejects ambiguous hammer/source notation and malformed input', () => {
  assert.equal(normalizeSkewbAlg("r2' R2 x3 y3' z2'"), "r R' x' y z2");
  assert.equal(normalizeSkewbAlg('R3 x1'), 'x');
  assert.equal(inverseSkewb("r R' x2"), "x2 R r'");
  for (const alg of ["S", "H", "h", "r/R2'", 'r.R', 'M', 'Rw', '(r R)', 'R4', 'R0', "R''", '<script>']) assert.throws(() => parseSkewbAlg(alg), /Invalid Skewb move/);
  assert.throws(() => parseSkewbAlg(null), /must be text/);
  assert.throws(() => parseSkewbAlg('R '.repeat(6001)), /too long/);
  assert.throws(() => parseSkewbAlg('R '.repeat(1001)), /too many moves/);
  assert.throws(() => parseSkewbAlg('R', { notation: 'cube' }), /Unknown Skewb notation/);
  for (const state of [null, [], Array(30).fill(0), Array(30).fill(30)]) assert.throws(() => isSolvedSkewb(state), /Invalid Skewb state/);
});

test('Skewb catalogue includes every requested NS2 case, no EG2 cases, with source provenance and explicit NS choices', () => {
  assert.equal(CASES_SKEWB_NS2.length, 134);
  assert.equal(GROUPS_SKEWB_NS2.length, 20);
  const imported = CASES_SKEWB_NS2.filter(item => !item.supplemental);
  assert.deepEqual(imported.map(c => c.sourceId), Array.from({ length: 131 }, (_, i) => i + 1));
  assert.equal(new Set(CASES_SKEWB_NS2.map(c => c.id)).size, 134);
  assert.equal(SKEWB_NS2_SOURCE.commit, source.commit);
  assert.equal(SKEWB_NS2_SOURCE.sourceCases, 131);
  assert.equal(SKEWB_NS2_SOURCE.supplementalCases, 3);
  assert.equal(SKEWB_NS2_SOURCE.preparedScrambles, 2680);
  assert.equal(SKEWB_NS2_SOURCE.verifiedAlgorithms, 499);
  assert.equal(SKEWB_NS2_SOURCE.sourceVerifiedAlgorithms, 495);
  assert.equal(SKEWB_NS2_SOURCE.supplementalAlgorithms, 4);
  assert.equal(report.rejected.length, 81);
  assert.equal(report.sourceVerifiedAlgorithms + report.rejected.length + report.duplicateAlgorithms, report.sourceAlgorithms);
  assert.equal(createHash('sha256').update(JSON.stringify(imported)).digest('hex'),
    '98c4e86e29c095ba0b5a08e0944b5424f4650aae604f04b41aecb74697d7a915',
    'All existing case objects, algorithm choices and reference setups remain unchanged.');
  for (const item of imported) {
    const raw = source.cases[item.sourceId];
    assert.equal(item.set, 'NS2'); assert.equal(raw.algset, 'NS2');
    assert.equal(item.group, raw.group); assert.equal(item.name, raw.name);
    assert.ok(item.algorithms.length);
    assert.ok(item.algorithms.some(a => a.id === item.defaultAlgorithmId && a.sourceNotation === 'NS'));
    assert.equal(item.scrambles.length, 20);
    assert.equal(new Set(item.scrambles).size, 20);
    for (const alg of item.algorithms) {
      assert.match(alg.sourceUrl, /mihlefeld\/Alg-Trainers\/blob\//);
      assert.equal(alg.originalAlg, raw.a[alg.sourceIndex]);
      assert.doesNotMatch(alg.alg, /[SHh./]/);
      assert.equal(alg.alg, normalizeSkewbAlg(alg.alg, { notation: 'ns' }));
    }
  }
});

test('all 2680 Skewb scrambles reach their exact case and every retained algorithm solves all twenty setups', () => {
  const identity = solvedSkewb(); let checkedAlgs = 0, checkedSetups = 0, combined = 0;
  for (const item of CASES_SKEWB_NS2) {
    const reference = applyWCA(identity, item.setup);
    assert.ok(!isSolvedSkewb(reference), item.id);
    assert.ok(isSkewbFaceSolved(reference, 'D'), `${item.id}: completed side on D`);
    const states = item.scrambles.map(scramble => {
      checkedSetups++;
      const state = applyWCA(identity, scramble);
      assert.deepEqual(state, reference, `${item.id}: prepared scramble matches full reference state`);
      assert.deepEqual(applyWCA(state, inverseSkewb(scramble)), identity, `${item.id}: WCA setup inverse round trip`);
      return state;
    });
    for (const alg of item.algorithms) {
      checkedAlgs++;
      assert.equal(validateSkewbAlgorithm(item.id, alg.alg).valid, true, alg.id);
      for (const state of states) {
        combined++;
        assert.ok(isSolvedSkewb(applySkewbAlg(state, alg.alg)), `${alg.id}: completes the whole Skewb`);
      }
    }
  }
  assert.equal(checkedSetups, 2680); assert.equal(checkedAlgs, 499); assert.equal(combined, 9980);
});

test('the three supplemental NS2 basics have Pure Pi or side-facing U-centre Pi + 3S geometry', () => {
  const added = CASES_SKEWB_NS2.filter(item => item.supplemental);
  assert.deepEqual(added.map(item => item.id), ['NS2-132', 'NS2-133', 'NS2-134']);
  assert.deepEqual(added.map(item => item.group), ['Pn + HZ Pure', 'Pi + 3S', 'Pi + 3S']);
  assert.equal(added[0].name, 'Pure Pi');
  assert.equal(CASES_SKEWB_NS2.filter(item => item.group === 'Pi + 3S').length, 4);
  assert.equal(CASES_SKEWB_NS2.filter(item => item.group === 'Pn + HZ Pure').length, 5);
  const expected = ["R' F R F' R' F R F'", "R' F R F'", "F R' F' R"];
  for (const [index, item] of added.entries()) {
    assert.equal(item.sourceId, null, 'New IDs must not claim the upstream EG2 source entries.');
    assert.equal(item.sourceUrl, supplement.sourceUrl);
    assert.equal(item.algorithms[0].alg, expected[index]);
    assert.equal(item.defaultAlgorithmId, item.algorithms[0].id);
    const reference = applyWCA(solvedSkewb(), item.setup), faces = skewbFacelets(reference);
    const solved = applySkewbAlg(reference, item.algorithms[0].alg), complete = skewbFacelets(solved);
    assert(isSolvedSkewb(solved));
    assert(isSkewbFaceSolved(reference, 'D'));
    const oppositeBottom = complete.U[0];
    assert.equal(faces.U.slice(1).filter(color => color === oppositeBottom).length, 0, 'Pi has no oriented U-layer corners.');
    if (!index) {
      for (const face of ['U', 'D', 'F', 'B', 'R', 'L']) assert.equal(faces[face][0], complete[face][0], 'Pure Pi centres are already correct.');
      assert.equal(item.algorithms.length, 2, 'Pure Pi offers sledge and hedge choices.');
    } else {
      assert.equal(faces.R[0], oppositeBottom, 'The U centre is on a side in the reference grip.');
      assert.equal(['F', 'R', 'B', 'L'].filter(face => faces[face][0] !== complete[face][0]).length, 3, 'Three side centres are misplaced.');
      assert.equal(parseSkewbAlg(item.algorithms[0].alg).length, 4, 'One hammer, with no hidden regrip or extra turns.');
    }
  }
});

test('supplemental disguised setups are distinct short physical routes without identity padding', () => {
  for (const item of CASES_SKEWB_NS2.filter(item => item.supplemental)) {
    assert.equal(item.scrambles.length, 20);
    assert.equal(new Set(item.scrambles).size, 20);
    assert(!item.scrambles.includes(item.setup), 'Disguise excludes the direct setup.');
    for (const scramble of item.scrambles) {
      const tokens = scramble.split(' ');
      assert(tokens.length >= 8 && tokens.length <= 10, 'Keep the alternate route practical.');
      assert(tokens.every((token, index) => /^[URLB]'?$/.test(token) && (!index || token[0] !== tokens[index - 1][0])));
      let state = solvedSkewb(); const seen = new Set([skewbStateKey(state)]);
      for (const token of tokens) {
        state = applyWCA(state, token); const key = skewbStateKey(state);
        assert(!seen.has(key), 'A route must not revisit a state as padding.');
        seen.add(key);
      }
    }
  }
});

test('the supplemental cases are genuinely new under every whole-cube orientation and solved colour frame', () => {
  const orientations = [solvedSkewb()], seen = new Set([skewbStateKey(orientations[0])]);
  for (let i = 0; i < orientations.length; i++) for (const move of ['x', 'y', 'z']) {
    const next = applySkewbAlg(orientations[i], move), key = skewbStateKey(next);
    if (!seen.has(key)) { seen.add(key); orientations.push(next); }
  }
  const canonical = state => {
    const variants = [];
    for (const frame of orientations) for (const view of orientations) variants.push(view.map(index => frame[state[index]]).join(','));
    return variants.sort()[0];
  };
  const original = new Set(CASES_SKEWB_NS2.filter(item => !item.supplemental).map(item => canonical(applyWCA(solvedSkewb(), item.setup))));
  assert.equal(original.size, 131);
  for (const item of CASES_SKEWB_NS2.filter(item => item.supplemental)) {
    const key = canonical(applyWCA(solvedSkewb(), item.setup));
    assert(!original.has(key), `${item.name} must not duplicate an existing case or another new case.`);
    original.add(key);
  }
  assert.equal(original.size, 134);
});

test('Skewb drill styles use WCA setups, preserve case state and reveal the selected NS solution', () => {
  for (const item of CASES_SKEWB_NS2) {
    const alg = item.algorithms.at(-1).alg;
    const reference = createSkewbDrill({ caseId: item.id, alg, scrambleStyle: 'provided' });
    assert.equal(reference.scramble, item.setup);
    assert.equal(reference.solution, alg);
    assert.equal(reference.orientation, '');
    assert.equal(reference.scrambleNotation, 'wca'); assert.equal(reference.solutionNotation, 'ns');
    assert.deepEqual(previewSkewbState(alg), reference.state);
    assert.deepEqual(previewSkewbState(item.id), reference.state);
    for (let index = 0; index < 20; index++) {
      const varied = createSkewbDrill({ caseId: item.id, alg, random: () => (index + .5) / 20 });
      assert.equal(varied.scrambleStyle, 'disguised');
      assert.equal(varied.scramble, item.scrambles[index]);
      assert.deepEqual(varied.state, reference.state);
      assert.ok(isSolvedSkewb(applySkewbAlg(varied.state, varied.solution)));
    }
  }
  const first = CASES_SKEWB_NS2[0];
  assert.equal(validateSkewbAlgorithm(first.id, first.algorithms[0].alg + ' y').valid, true, 'a custom ending regrip is allowed');
  assert.equal(validateSkewbAlgorithm(first.id, '').valid, false);
  assert.equal(validateSkewbAlgorithm('EG2-132', first.algorithms[0].alg).valid, false);
  assert.equal(validateSkewbAlgorithm(first.id, 'S').valid, false);
  assert.throws(() => createSkewbDrill({ caseId: first.id, alg: '' }), /does not solve/);
  assert.throws(() => createSkewbDrill({ caseId: first.id, orientation: 'y' }), /reference grip/);
  assert.throws(() => createSkewbDrill({ caseId: first.id, scrambleStyle: 'random-state' }), /setup style/);
  assert.throws(() => createSkewbDrill({ caseId: 'EG2-132' }), /Unknown Skewb NS2 case/);
  assert.throws(() => createSkewbDrill({ caseId: first.id, random: () => 1 }), /random selection/);
  assert.deepEqual(previewSkewbState(''), solvedSkewb());
});

test('Skewb diagrams show all thirty actual stickers and the completed bottom side at phone and library sizes', () => {
  const state = previewSkewbState(CASES_SKEWB_NS2[0].id), facelets = skewbFacelets(state);
  for (const options of [{ size: 265 }, { size: 460 }, { size: 390, net: true }]) {
    const svg = skewbSVG(state, options);
    assert.match(svg, /max-width:100%;height:auto/);
    assert.match(svg, /role="img"/);
    assert.equal((svg.match(/<polygon\b/g) || []).length, 30);
    for (const [face, colors] of Object.entries(facelets)) for (let i = 0; i < colors.length; i++) {
      assert.ok(svg.includes(`data-sticker="${face}-${i}" data-color="${colors[i]}" fill="${SKEWB_COLORS[colors[i]]}"`));
    }
    assert.doesNotMatch(svg, /NaN|undefined|5×5|Square-1|<script/);
  }
  assert.match(skewbSVG(state), /completed side on the bottom/);
  assert.match(skewbSVG(state), /Completed side ↓/);
  assert.equal(new Set(facelets.D).size, 1);
  assert.notEqual(facelets.D[0], 'U', 'reference artwork follows actual bottom colour rather than assuming white');
  assert.doesNotMatch(skewbSVG(state, { labels: false }), /<text/);
});

test('Skewb diagram projection joins UFR consistently and mirrors back/left/bottom outside views correctly', () => {
  const svg = skewbSVG(applyWCA(solvedSkewb(), 'R'));
  const sticker = id => {
    const match = svg.match(new RegExp(`<polygon data-sticker="${id}" data-color="([A-Z])"[^>]*points="([^"]+)"`));
    assert.ok(match, id); return { color: match[1], points: match[2] };
  };
  // The stationary UFR anchor lies at (110,112) in all three adjacent faces.
  // These fixed projection coordinates are independent of the renderer's
  // bilinear interpolation and the facelet-loop comparison above.
  assert.deepEqual(sticker('U-3'), { color: 'U', points: '110.00,112.00 67.50,88.00 152.50,88.00' });
  assert.deepEqual(sticker('F-2'), { color: 'F', points: '110.00,112.00 110.00,167.00 67.50,88.00' });
  assert.deepEqual(sticker('R-1'), { color: 'R', points: '110.00,112.00 152.50,88.00 110.00,167.00' });
  // After the manually checked DRB turn, DFR carries orange on F, yellow on R,
  // and blue on D. DFR is top-right when viewing the bottom from outside.
  assert.deepEqual(sticker('F-3'), { color: 'L', points: '110.00,222.00 67.50,198.00 110.00,167.00' });
  assert.deepEqual(sticker('R-4'), { color: 'D', points: '110.00,222.00 110.00,167.00 152.50,198.00' });
  assert.deepEqual(sticker('D-2'), { color: 'B', points: '303.00,180.00 303.00,209.00 274.00,180.00' });
  // URB is top-left in the back outside view; DBL is bottom-left on the left.
  assert.deepEqual(sticker('B-1'), { color: 'R', points: '245.00,100.00 274.00,100.00 245.00,129.00' });
  assert.deepEqual(sticker('L-4'), { color: 'U', points: '245.00,78.00 245.00,49.00 274.00,78.00' });
});
