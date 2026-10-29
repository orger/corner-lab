import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FACES, AUFS, BOTTOM_AUFS, CORNER_SLOTS, solvedState, applyAlg, inverse, normalizeAlg, simplifyAlg, parseAlg,
  facelets, isSolved, cubeOrientations, isFirstLayerComplete, bottomSignature,
  createDrill, validateAlternative, finishOptions, compatibleFinishes, corners,
} from '../app/cube.js';
import { FIRST_FACE_CASES } from '../app/first-face-cases.js';
import { CASES } from '../app/catalog.js';

const SUNE = "R U R' U R U2 R'";
const TPERM = "R U R' U' R' F R2 U' R' U' R U R' F'";
const YPERM = "F R U' R' U' R U R' F' R U R' U' R' F R F'";
const key = state => state.join('');

test('identity and all 9 move generators have order four and exact inverses', () => {
  const solved = solvedState();
  for (const face of [...FACES, 'x', 'y', 'z']) {
    assert.deepEqual(applyAlg(solved, `${face} ${face} ${face} ${face}`), solved, face);
    assert.deepEqual(applyAlg(solved, `${face} ${face}'`), solved, face);
    assert.deepEqual(applyAlg(solved, `${face}2 ${face}2`), solved, face);
    assert.notDeepEqual(applyAlg(solved, face), solved, face);
  }
  assert.deepEqual(applyAlg(solved, ''), solved);
  assert.notEqual(applyAlg(solved, ''), solved);
});

test('outer turns follow standard Singmaster direction and row-major face views', () => {
  const r = facelets(applyAlg(solvedState(), 'R'));
  assert.deepEqual(r.U, ['U', 'F', 'U', 'F']);
  assert.deepEqual(r.F, ['F', 'D', 'F', 'D']);
  assert.deepEqual(r.D, ['D', 'B', 'D', 'B']);
  const u = facelets(applyAlg(solvedState(), 'U'));
  assert.deepEqual(u.F, ['R', 'R', 'F', 'F']);
  assert.deepEqual(u.L, ['F', 'F', 'L', 'L']);
  const f = facelets(applyAlg(solvedState(), 'F'));
  assert.deepEqual(f.U, ['U', 'U', 'L', 'L']);
  assert.deepEqual(f.R, ['U', 'R', 'U', 'R']);
});

test('whole cube rotations equal opposing layer rotations', () => {
  const mixed = applyAlg(solvedState(), "R U2 F' D L B2");
  for (const [rotation, outer] of [['x', "R L'"], ['y', "U D'"], ['z', "F B'"]]) {
    assert.deepEqual(applyAlg(mixed, rotation), applyAlg(mixed, outer));
  }
  for (const [a, b] of [['R', 'L'], ['U', 'D'], ['F', 'B']]) {
    assert.deepEqual(applyAlg(mixed, `${a} ${b}`), applyAlg(mixed, `${b} ${a}`));
  }
});

test('cube has exactly 24 solved orientations and rejects twisted states', () => {
  const rotations = cubeOrientations();
  assert.equal(rotations.length, 24);
  assert.equal(new Set(rotations.map(alg => key(applyAlg(solvedState(), alg)))).size, 24);
  for (const rotation of rotations) assert.ok(isSolved(applyAlg(solvedState(), rotation)));
  assert.equal(isSolved(applyAlg(solvedState(), 'R')), false);
  assert.equal(isSolved(applyAlg(solvedState(), 'U')), false);
  const invalid = solvedState().map(color => color === 'F' ? 'B' : color === 'B' ? 'F' : color);
  assert.equal(isSolved(invalid), false, 'a mirror color arrangement is not a cube rotation');
});

test('parser supports Unicode, compact sequences, grouped repeats and 2x2 wide turns', () => {
  assert.equal(normalizeAlg(" RUR′  U2’ "), "R U R' U2");
  assert.equal(normalizeAlg("R' F ' R 2"), "R' F' R2");
  assert.equal(normalizeAlg("(R U R' U')2"), "R U R' U' R U R' U'");
  assert.equal(normalizeAlg("(R U)2'"), "U' R' U' R'");
  assert.equal(normalizeAlg('[R,U]'), "R U R' U'");
  assert.equal(normalizeAlg('[R:U2]'), "R U2 R'");
  assert.equal(normalizeAlg("r u' Lw2 2Fw d b'"), "x y' x2 z y' z");
  assert.equal(normalizeAlg('R²'), 'R2');
  for (const alg of ['R3', 'M', '(R U', '[R]', '2R', 'R ?', 'R)']) {
    assert.throws(() => normalizeAlg(alg), undefined, alg);
  }
  assert.equal(parseAlg('').length, 0);
});

test('long deterministic sequences preserve stickers, cubies and inverse identity', () => {
  let seed = 48271;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed; };
  const solved = solvedState();
  const cubieIds = corners(solved).map(corner => Object.values(corner.stickers).sort().join('')).sort();
  for (let iteration = 0; iteration < 100; iteration++) {
    const alg = Array.from({ length: 50 }, () => [...FACES, 'x', 'y', 'z'][random() % 9] + ['', '2', "'"][random() % 3]).join(' ');
    const state = applyAlg(solved, alg);
    for (const face of FACES) assert.equal(state.filter(color => color === face).length, 4);
    assert.deepEqual(corners(state).map(corner => Object.values(corner.stickers).sort().join('')).sort(), cubieIds);
    assert.deepEqual(applyAlg(state, inverse(alg)), solved);
    const simplified = simplifyAlg(alg);
    assert.deepEqual(applyAlg(solved, simplified), state);
    const reducedMoves = parseAlg(simplified);
    assert.ok(reducedMoves.every((move, index) => !index || move.face !== reducedMoves[index - 1].face));
    assert.equal(normalizeAlg(inverse(inverse(alg))), normalizeAlg(alg));
  }
  assert.deepEqual(solved, solvedState(), 'input was not mutated');
});

test('scramble simplification combines turns and handles cascading cancellation', () => {
  assert.equal(simplifyAlg("R R U U U L2 L' F F2 B2 B2"), "R2 U' L F'");
  assert.equal(simplifyAlg("R U U' R'"), '');
  assert.equal(simplifyAlg("Rw x' y y y"), "y'");
  assert.equal(simplifyAlg("R L R'"), "R L R'", 'moves on different faces are not reordered');
  const drill = createDrill({ alg: SUNE, preAuf: 'U', postAuf: 'U2', orientation: 'y2', color: 'green' });
  const moves = parseAlg(drill.scramble);
  assert.ok(moves.every((move, index) => !index || move.face !== moves[index - 1].face));
  assert.equal(drill.core, `U ${SUNE} U2`, 'solution teaching segments remain unchanged');
  assert.ok(isSolved(applyAlg(drill.state, drill.solution)));
});

test('standard Sune, T and Y algorithms produce complete CLL bottoms', () => {
  for (const alg of [SUNE, TPERM, YPERM]) {
    const state = applyAlg(solvedState(), inverse(alg));
    assert.ok(isFirstLayerComplete(state));
    assert.equal(bottomSignature(state).set, 'CLL');
    assert.ok(isSolved(applyAlg(state, alg)));
  }
  assert.equal(bottomSignature(applyAlg(solvedState(), 'R')).complete, false);
});

test('alternative validation appends final AUF and rejects wrong recognition positions', () => {
  assert.equal(validateAlternative(SUNE, SUNE).valid, true);
  const missingAuf = validateAlternative(SUNE, `${SUNE} U'`);
  assert.equal(missingAuf.valid, true);
  assert.equal(missingAuf.auf, 'U');
  assert.equal(missingAuf.algorithm, SUNE);
  const duplicateFrame = validateAlternative(SUNE, `${SUNE} x`);
  assert.equal(duplicateFrame.algorithm, SUNE);
  assert.equal(duplicateFrame.correction, "x'");
  assert.ok(isSolved(applyAlg(applyAlg(solvedState(), inverse(SUNE)), missingAuf.algorithm)));
  for (const rotation of cubeOrientations()) for (const auf of AUFS) {
    const rotated = validateAlternative(SUNE, `${SUNE} ${auf} ${rotation}`);
    assert.equal(rotated.valid, true);
    assert.deepEqual(applyAlg(applyAlg(solvedState(), inverse(SUNE)), rotated.algorithm), solvedState());
    assert.deepEqual(applyAlg(solvedState(), inverse(rotated.algorithm)), applyAlg(solvedState(), inverse(SUNE)));
  }
  assert.equal(validateAlternative(SUNE, TPERM).valid, false);
  assert.equal(validateAlternative(SUNE, 'invalid').valid, false);
});

test('all color, recognition AUF, finishing AUF and grip combinations solve exactly', () => {
  const colorFace = { white: 'D', yellow: 'U', green: 'F', blue: 'B', red: 'R', orange: 'L' };
  for (const [color, face] of Object.entries(colorFace)) {
    for (const preAuf of AUFS) for (const postAuf of AUFS) for (const orientation of ['', 'y', 'y2', "y'"]) {
      const drill = createDrill({ caseId: 'sune', alg: SUNE, preAuf, postAuf, orientation, color });
      assert.deepEqual(applyAlg(solvedState(), drill.scramble), drill.state);
      assert.ok(isSolved(applyAlg(drill.state, drill.solution)));
      assert.ok(isFirstLayerComplete(drill.afterFinishState));
      assert.equal(facelets(drill.state).D[0], face);
      assert.equal(drill.caseId, 'sune');
      assert.deepEqual(applyAlg(drill.state, drill.setup), drill.afterSetupState);
    }
  }
  assert.throws(() => createDrill({ alg: SUNE, orientation: 'x' }));
  assert.throws(() => createDrill({ alg: SUNE, preAuf: 'R' }));
  assert.throws(() => createDrill({ alg: SUNE, color: 'purple' }));
  assert.throws(() => createDrill({ alg: `${SUNE} x` }), /canonical color frame/);
  assert.throws(() => createDrill({ alg: 'R' }), /canonical color frame/);
});

test('legacy generator retains all 4,338 reduced 1–3 turn sequences', () => {
  assert.equal(finishOptions(1).length, 18);
  assert.equal(finishOptions(2).length, 288);
  const options = finishOptions();
  assert.equal(options.length, 4338);
  assert.equal(new Set(options.map(option => option.id)).size, 4338);
  for (const option of options) {
    const moves = parseAlg(option.alg);
    assert.equal(moves.length, option.length);
    assert.ok(moves.every((move, index) => index === 0 || move.face !== moves[index - 1].face));
  }
  assert.ok(options.some(option => option.alg === "R U R'"));
  assert.ok(options.some(option => option.alg === "R' U' R"));
});

test('legacy compatibility filter requires a first D completion on the final move', () => {
  const candidates = ["R U R'", "R' U' R", 'U', 'D2', 'R U', 'R', 'R U R\' U'];
  const compatible = compatibleFinishes(SUNE, candidates);
  assert.ok(compatible.includes("R U R'"));
  assert.ok(compatible.includes("R' U' R"));
  assert.ok(compatible.includes('R'));
  assert.equal(compatible.includes('U'), false);
  assert.equal(compatible.includes('D2'), false);
  assert.equal(compatible.includes('R U'), false, 'bottom already completed before trailing U');
  assert.equal(compatible.includes("R U R' U"), false, 'more than three moves');
  for (const finish of compatible) {
    const drill = createDrill({ alg: SUNE, finish, preAuf: 'U2', postAuf: 'U', orientation: 'y', color: 'red' });
    assert.ok(isSolved(applyAlg(drill.state, drill.solution)));
    assert.equal(bottomSignature(drill.afterFinishState).set, 'CLL');
  }
});

test('every legacy filtered sequence has incomplete proper prefixes and exact case restoration', () => {
  const options = compatibleFinishes(TPERM, finishOptions());
  assert.ok(options.length > 100);
  const target = createDrill({ alg: TPERM }).state;
  for (const option of options) {
    let state = applyAlg(target, inverse(option.alg));
    assert.equal(isFirstLayerComplete(state), false, option.alg);
    const moves = option.alg.split(' ');
    for (let i = 0; i < moves.length; i++) {
      state = applyAlg(state, moves[i]);
      assert.equal(isFirstLayerComplete(state), i === moves.length - 1, option.alg);
    }
    assert.deepEqual(state, target);
  }
});

test('bottom offsets are independent of upper AUFs and are explicitly undone after finishing', () => {
  for (const preAuf of AUFS) for (const postAuf of AUFS) for (const bottomAuf of BOTTOM_AUFS) {
    const drill = createDrill({ alg: SUNE, finish: "R U R'", preAuf, postAuf, bottomAuf, orientation: 'y', color: 'blue' });
    const canonical = createDrill({ alg: SUNE, preAuf, postAuf, color: 'blue' });
    assert.equal(drill.bottomAuf, bottomAuf);
    assert.equal(drill.bottomSetup, inverse(bottomAuf));
    assert.deepEqual(drill.afterFinishState, applyAlg(canonical.state, bottomAuf));
    assert.deepEqual(drill.afterBottomSetupState, canonical.state);
    assert.deepEqual(applyAlg(drill.afterFinishState, drill.bottomSetup), drill.afterBottomSetupState);
    assert.ok(isSolved(applyAlg(drill.state, drill.solution)));
    assert.equal(drill.solution, ["y'", "R U R'", inverse(bottomAuf), preAuf, SUNE, postAuf].filter(Boolean).join(' '));
    assert.equal(isFirstLayerComplete(drill.afterFinishState, 'blue'), true);
    assert.equal(isFirstLayerComplete(drill.afterSetupState, 'blue'), false);
  }
  assert.equal(createDrill({ alg: SUNE, bottomAuf: 'D′' }).bottomAuf, "D'");
  assert.throws(() => createDrill({ alg: SUNE, bottomAuf: 'U' }), /Bottom AUF/);
  assert.throws(() => createDrill({ alg: SUNE, bottomAuf: 'R' }), /Bottom AUF/);
});

test('initial AUF moves the insertion around U and is undone after the regrip for every training frame', () => {
  const representatives = ['CLL', 'EG1', 'EG2'].map(set => CASES.find(c => c.set === set && c.group === 'Sune'));
  for (const c of representatives) for (const color of ['white', 'yellow', 'green', 'blue', 'red', 'orange']) {
    for (const orientation of ['', 'y', 'y2', "y'"]) for (const preAuf of AUFS) for (const postAuf of AUFS) for (const bottomAuf of BOTTOM_AUFS) {
      const options = { alg: c.algorithms[0].alg, finish: "R U' R'", color, orientation, preAuf, postAuf, bottomAuf };
      const original = createDrill(options);
      assert.equal(original.initialAuf, '');
      assert.equal(original.initialAlignment, '');
      assert.deepEqual(original.afterInitialAlignmentState, original.afterSetupState);
      for (const initialAuf of AUFS) {
        const drill = createDrill({ ...options, initialAuf });
        assert.equal(drill.initialAuf, initialAuf);
        assert.equal(drill.initialAlignment, inverse(initialAuf));
        assert.deepEqual(drill.state, applyAlg(original.state, initialAuf), 'AUF applies after the complete original scramble, including its grip');
        assert.deepEqual(drill.afterSetupState, applyAlg(original.afterSetupState, initialAuf));
        assert.deepEqual(drill.afterInitialAlignmentState, original.afterSetupState, 'alignment restores the canonical insertion position');
        assert.deepEqual(applyAlg(drill.afterInitialAlignmentState, drill.finish), drill.afterFinishState);
        assert.deepEqual(drill.afterFinishState, original.afterFinishState, 'first-face completion and last-layer recognition remain unchanged');
        assert.deepEqual(drill.afterBottomSetupState, original.afterBottomSetupState);
        assert.deepEqual(applyAlg(drill.state, drill.solution), original.solvedState);
        assert.equal(drill.solution, [drill.setup, inverse(initialAuf), drill.finish, drill.bottomSetup, drill.core].filter(Boolean).join(' '));
      }
    }
  }
  assert.equal(createDrill({ alg: SUNE, initialAuf: 'U′' }).initialAuf, "U'");
  assert.equal(createDrill({ alg: SUNE, initialAuf: "U2'" }).initialAuf, 'U2');
  for (const initialAuf of ['R', 'D', 'y', 'U R', 'U U']) assert.throws(() => createDrill({ alg: SUNE, initialAuf }), /Initial AUF/);
  assert.throws(() => createDrill({ alg: SUNE, initialAuf: null }), /text/);
});

test('the requested R U-prime R-prime insertion carries UFL to DFR and starts in all four upper corners', () => {
  const firstFace = FIRST_FACE_CASES.find(item => item.id === 'FF-LS-Uplus3');
  const start = applyAlg(solvedState(), inverse(firstFace.alg));
  const cubieKey = (state, slot) => slot.indices.map(index => state[index]).sort().join('');
  const source = CORNER_SLOTS.find(slot => slot.name === 'UFL');
  const destination = CORNER_SLOTS.find(slot => slot.name === 'DFR');
  const piece = cubieKey(solvedState(), destination);
  assert.equal(cubieKey(start, source), piece, 'the bottom front-right cubie starts at the upper front-left');
  assert.notEqual(cubieKey(start, destination), piece);
  assert.deepEqual(facelets(start).D, ['D', 'R', 'D', 'D']);
  assert.equal(start[17], 'D', 'its first-face sticker points left');
  const end = applyAlg(start, firstFace.alg);
  assert.equal(cubieKey(end, destination), piece);
  assert.deepEqual(end, solvedState());
  const positions = AUFS.map(initialAuf => {
    const state = applyAlg(start, initialAuf);
    return CORNER_SLOTS.find(slot => cubieKey(state, slot) === piece).name;
  });
  assert.deepEqual(new Set(positions), new Set(['URF', 'UFL', 'ULB', 'UBR']));
});

test('first-face diagrams match independent PDF and requested-insertion sticker-coordinate fixtures', () => {
  // Coordinates read from the supplied transparent-cube diagrams. The bottom
  // left bar is D[0,2]; side indices follow the documented outside face views.
  const fixtures = {
    'FF-LS-Dplus4': { D: [1, 2, 3], L: [3] },
    'FF-LS-Dminus4': { D: [0, 2, 3], R: [2] },
    'FF-LS-Uplus3': { D: [0, 2, 3], L: [1] }, // User adaptation: R U' R', UFL → DFR.
    'FF-LS-Uminus3': { D: [0, 2, 3], R: [0] },
    'FF-LS-U3': { D: [0, 2, 3], U: [2] },
    'FF-DD-OP5': { D: [0, 2], R: [2, 3] },
    'FF-DD-KT5': { D: [0, 2], F: [3], B: [2] },
    'FF-UD-JK1': { D: [0, 2], F: [1, 3] },
    'FF-UD-QT1': { D: [0, 2], B: [0, 2] },
    'FF-UU-BC1': { D: [0, 2], U: [1, 3] },
    'FF-UU-BD5': { D: [0, 2], U: [1, 2] },
    'FF-UU-QR3': { D: [0, 2], B: [0, 1] },
  };
  for (const firstFace of FIRST_FACE_CASES) {
    const state = applyAlg(solvedState(), inverse(firstFace.alg));
    const f = facelets(state);
    const onBottom = f.D.filter(color => color === 'D').length;
    assert.equal(onBottom, firstFace.group === 'LS' ? 3 : 2, firstFace.id);
    if (firstFace.group !== 'LS') assert.deepEqual(f.D.map(color => color === 'D'), [true, false, true, false], firstFace.id);
    const upstairs = corners(state).filter(corner => corner.position[1] === 1 && Object.values(corner.stickers).includes('D')).length;
    const expectedUpstairs = firstFace.group === 'LS' ? Number(firstFace.name.startsWith('U')) : { DD: 0, UD: 1, UU: 2 }[firstFace.group];
    assert.equal(upstairs, expectedUpstairs, firstFace.id);
    if (fixtures[firstFace.id]) {
      for (const face of FACES) {
        assert.deepEqual(f[face].flatMap((color, index) => color === 'D' ? [index] : []), fixtures[firstFace.id][face] || [], `${firstFace.id}/${face}`);
      }
    }
  }
});

test('every PDF primary and alternative first completes the intended face on its last move', () => {
  for (const firstFace of FIRST_FACE_CASES) {
    const start = applyAlg(solvedState(), inverse(firstFace.alg));
    for (const alternative of firstFace.algorithms) {
      let state = start;
      assert.equal(isFirstLayerComplete(state, 'D'), false, alternative.id);
      const moves = normalizeAlg(alternative.alg).split(' ');
      for (let index = 0; index < moves.length; index++) {
        state = applyAlg(state, moves[index]);
        assert.equal(isFirstLayerComplete(state, 'D'), index === moves.length - 1, `${alternative.id}/${index}`);
      }
    }
  }
});

test('all PDF finishes remain valid across color, grip and bottom offsets in all three EG sets', () => {
  const representatives = ['CLL', 'EG1', 'EG2'].map(set => CASES.find(c => c.set === set && c.group === 'Sune'));
  for (const c of representatives) for (const firstFace of FIRST_FACE_CASES) {
    for (const color of ['white', 'yellow', 'green', 'blue', 'red', 'orange']) {
      for (const orientation of ['', 'y', 'y2', "y'"]) for (const bottomAuf of BOTTOM_AUFS) {
        const drill = createDrill({ caseId: c.id, alg: c.algorithms[0].alg, finish: firstFace.alg,
          preAuf: 'U', postAuf: "U'", bottomAuf, color, orientation });
        assert.equal(isFirstLayerComplete(drill.afterSetupState, color), false, firstFace.id);
        let state = drill.afterSetupState;
        const moves = firstFace.alg.split(' ');
        for (let index = 0; index < moves.length; index++) {
          state = applyAlg(state, moves[index]);
          assert.equal(isFirstLayerComplete(state, color), index === moves.length - 1, `${firstFace.id}/${index}`);
        }
        assert.deepEqual(state, drill.afterFinishState);
        assert.equal(bottomSignature(drill.afterBottomSetupState).set, c.set);
        assert.ok(isSolved(applyAlg(drill.state, drill.solution)));
      }
    }
  }
});
