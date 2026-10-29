/** Exact 2×2 sticker permutations. Faces are viewed from outside, row-major.
 * Colors use their solved face names; D=white, U=yellow, F=green, R=red.
 * Functions return fresh arrays and never mutate their input.
 */
export const FACES = Object.freeze(['U', 'R', 'F', 'D', 'L', 'B']);
export const AUFS = Object.freeze(['', 'U', 'U2', "U'"]);
export const BOTTOM_AUFS = Object.freeze(['', 'D', 'D2', "D'"]);
export const COLOR_FACES = Object.freeze({ white: 'D', yellow: 'U', green: 'F', blue: 'B', red: 'R', orange: 'L' });
/** Standard URF/UFL/ULB/UBR/DFR/DLF/DBL/DRB corner order. Each triplet
 * starts on U/D and has the same cyclic handedness, suitable for cubie twists.
 */
export const CORNER_SLOTS = Object.freeze([
  { name: 'URF', indices: [3, 4, 9], position: [1, 1, 1] },
  { name: 'UFL', indices: [2, 8, 17], position: [-1, 1, 1] },
  { name: 'ULB', indices: [0, 16, 21], position: [-1, 1, -1] },
  { name: 'UBR', indices: [1, 20, 5], position: [1, 1, -1] },
  { name: 'DFR', indices: [13, 11, 6], position: [1, -1, 1] },
  { name: 'DLF', indices: [12, 19, 10], position: [-1, -1, 1] },
  { name: 'DBL', indices: [14, 23, 18], position: [-1, -1, -1] },
  { name: 'DRB', indices: [15, 7, 22], position: [1, -1, -1] },
].map(slot => Object.freeze({ ...slot, indices: Object.freeze(slot.indices), position: Object.freeze(slot.position) })));

const STICKERS = [];
for (const face of FACES) {
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    const a = col * 2 - 1, b = 1 - row * 2;
    const geometry = {
      U: [[a, 1, -b], [0, 1, 0]], R: [[1, b, -a], [1, 0, 0]],
      F: [[a, b, 1], [0, 0, 1]], D: [[a, -1, b], [0, -1, 0]],
      L: [[-1, b, a], [-1, 0, 0]], B: [[-a, b, -1], [0, 0, -1]],
    };
    const [position, normal] = geometry[face];
    STICKERS.push({ face, position, normal });
  }
}
const stickerKey = (p, n) => `${p.join(',')}/${n.join(',')}`;
const INDEX = new Map(STICKERS.map((s, i) => [stickerKey(s.position, s.normal), i]));
const SPECS = {
  U: [1, 1, -1], D: [1, -1, 1], R: [0, 1, -1], L: [0, -1, 1],
  F: [2, 1, -1], B: [2, -1, 1], x: [0, 0, -1], y: [1, 0, -1], z: [2, 0, -1],
};
function rotate(v, axis, sign) {
  const [x, y, z] = v;
  if (axis === 0) return [x, -sign * z, sign * y];
  if (axis === 1) return [sign * z, y, -sign * x];
  return [-sign * y, sign * x, z];
}
const PERMS = new Map();
for (const [move, [axis, layer, sign]] of Object.entries(SPECS)) {
  const quarter = STICKERS.map(s => layer && s.position[axis] !== layer
    ? INDEX.get(stickerKey(s.position, s.normal))
    : INDEX.get(stickerKey(rotate(s.position, axis, sign), rotate(s.normal, axis, sign))));
  let permutation = STICKERS.map((_, i) => i);
  for (let turns = 1; turns <= 3; turns++) {
    permutation = permutation.map(i => quarter[i]);
    PERMS.set(`${move}${turns}`, permutation);
  }
}
const moveText = ({ face, turns }) => face + (turns === 2 ? '2' : turns === 3 ? "'" : '');
const join = (...parts) => parts.filter(Boolean).join(' ').trim();
const inverseMoves = moves => [...moves].reverse().map(({ face, turns }) => ({ face, turns: 4 - turns }));

/** Parses moves, 2′ suffixes, Unicode primes, parentheses and commutators.
 * On a 2×2, a wide turn moves both layers and is a whole-cube rotation.
 * Slice notation is deliberately rejected: a 2×2 has no middle slice.
 */
export function parseAlg(algorithm = '') {
  if (typeof algorithm !== 'string') throw new TypeError('Algorithm must be text.');
  const source = algorithm.replace(/[’′`]/g, "'").replace(/[“”]/g, '"').replace(/²/g, '2');
  let cursor = 0;
  const skip = () => { while (/\s/.test(source[cursor] || '') && cursor < source.length) cursor++; };
  function suffix(moves) {
    skip();
    let count = 1;
    if (/\d/.test(source[cursor] || '')) {
      const start = cursor;
      while (/\d/.test(source[cursor] || '')) cursor++;
      count = Number(source.slice(start, cursor));
      if (count < 1 || count > 100) throw new Error('Group repetition must be between 1 and 100.');
    }
    let result = Array.from({ length: count }, () => moves).flat();
    if (source[cursor] === "'") { cursor++; result = inverseMoves(result); }
    return result;
  }
  function sequence(stops = '') {
    let result = [];
    while (cursor < source.length) {
      skip();
      if (cursor >= source.length || stops.includes(source[cursor])) break;
      const char = source[cursor];
      if (char === '(') {
        cursor++;
        const group = sequence(')');
        if (source[cursor] !== ')') throw new Error('Unclosed algorithm group.');
        cursor++;
        result.push(...suffix(group));
      } else if (char === '[') {
        cursor++;
        const left = sequence(',:]');
        const separator = source[cursor++];
        if (separator !== ',' && separator !== ':') throw new Error('Use [A, B] or [A: B].');
        const right = sequence(']');
        if (source[cursor] !== ']') throw new Error('Unclosed commutator.');
        cursor++;
        result.push(...suffix(separator === ','
          ? [...left, ...right, ...inverseMoves(left), ...inverseMoves(right)]
          : [...left, ...right, ...inverseMoves(left)]));
      } else {
        const token = source.slice(cursor).match(/^(?:2)?([URFDLBurfdlbxyzXYZ])([wW]?)(?:\s*(2'?|'2|'))?/);
        if (!token) throw new Error(`Unsupported notation at “${source.slice(cursor, cursor + 16)}”.`);
        cursor += token[0].length;
        if (token[0].startsWith('2') && !token[2]) throw new Error('Use 2Rw (both layers), not numbered slice turns, on a 2×2.');
        let face = token[1], turns = token[3]?.includes('2') ? 2 : token[3] === "'" ? 3 : 1;
        const wide = token[2] || /^[urfdlb]$/.test(face) || token[0].startsWith('2');
        if (/^[xyzXYZ]$/.test(face)) {
          if (wide) throw new Error('Wide suffix is not valid on a cube rotation.');
          face = face.toLowerCase();
        } else if (wide) {
          const wideMap = { R: ['x', 1], L: ['x', -1], U: ['y', 1], D: ['y', -1], F: ['z', 1], B: ['z', -1] };
          const [rotation, direction] = wideMap[face.toUpperCase()];
          face = rotation;
          if (direction < 0) turns = 4 - turns;
        }
        result.push({ face, turns });
      }
      if (result.length > 10000) throw new Error('Algorithm exceeds 10,000 moves.');
    }
    return result;
  }
  const moves = sequence();
  skip();
  if (cursor !== source.length) throw new Error(`Unexpected “${source[cursor]}” in algorithm.`);
  return moves;
}
export const normalizeAlg = algorithm => parseAlg(algorithm).map(moveText).join(' ');
export const inverse = algorithm => inverseMoves(parseAlg(algorithm)).map(moveText).join(' ');
/** Combines adjacent turns of the same face/rotation axis, including cascaded
 * cancellations. It does not reorder moves or alter recognition/solution steps.
 */
export function simplifyAlg(algorithm) {
  const reduced = [];
  for (const move of parseAlg(algorithm)) {
    if (reduced.at(-1)?.face !== move.face) { reduced.push(move); continue; }
    const previous = reduced.pop(), turns = (previous.turns + move.turns) % 4;
    if (turns) reduced.push({ face: move.face, turns });
  }
  return reduced.map(moveText).join(' ');
}
export const solvedState = () => FACES.flatMap(face => Array(4).fill(face));
function assertState(state) {
  if (!Array.isArray(state) || state.length !== 24 || state.some(color => !FACES.includes(color))) {
    throw new Error('Cube state must contain 24 face-letter colors.');
  }
}
function applyMoves(state, moves) {
  let output = state.slice();
  for (const { face, turns } of moves) {
    const permutation = PERMS.get(`${face}${turns}`);
    const next = Array(24);
    for (let i = 0; i < 24; i++) next[permutation[i]] = output[i];
    output = next;
  }
  return output;
}
export function applyAlg(state, algorithm) {
  assertState(state);
  return applyMoves(state, parseAlg(algorithm));
}
export function facelets(state) {
  assertState(state);
  return Object.fromEntries(FACES.map((face, i) => [face, state.slice(i * 4, i * 4 + 4)]));
}

// Breadth-first rotation group: exactly the 24 physically possible color frames.
const ROTATIONS = [{ alg: '', state: solvedState() }];
const ROTATED_SOLVED = new Set([solvedState().join('')]);
for (let i = 0; i < ROTATIONS.length; i++) {
  for (const move of ['x', 'y', 'z']) {
    const state = applyAlg(ROTATIONS[i].state, move), key = state.join('');
    if (!ROTATED_SOLVED.has(key)) {
      ROTATED_SOLVED.add(key);
      ROTATIONS.push({ alg: join(ROTATIONS[i].alg, move), state });
    }
  }
}
export const cubeOrientations = () => ROTATIONS.map(({ alg }) => alg);
export function isSolved(state) {
  assertState(state);
  return ROTATED_SOLVED.has(state.join(''));
}
export function isFaceComplete(state, face = 'D') {
  assertState(state);
  const offset = FACES.indexOf(face) * 4;
  if (offset < 0) throw new Error(`Unknown face ${face}.`);
  return state.slice(offset, offset + 4).every(color => color === state[offset]);
}
/** With a color supplied, only that intended first face counts as complete.
 * This matters when a scramble already has the opposite color complete below.
 */
export const isFirstLayerComplete = (state, color) => color === undefined
  ? isFaceComplete(state, 'D')
  : facelets(state).D.every(sticker => sticker === (COLOR_FACES[color] || color));

/** Checks an alternative against this exact canonical recognition position.
 * Final AUF and a solved-frame regrip are appended when necessary. Returning to
 * the exact color frame means inversion preserves the canonical bottom case.
 */
export function validateAlternative(canonicalAlg, candidateAlg) {
  try {
    const normalized = normalizeAlg(candidateAlg);
    const canonical = normalizeAlg(canonicalAlg);
    const start = applyAlg(solvedState(), inverse(canonical));
    const end = applyAlg(start, normalized);
    for (const auf of AUFS) {
      const aligned = applyAlg(end, auf);
      const frame = ROTATIONS.find(({ state }) => state.join('') === aligned.join(''));
      if (frame) {
        const rotation = inverse(frame.alg), correction = join(auf, rotation);
        return {
          valid: true, normalized, algorithm: simplifyAlg(join(normalized, correction)), auf, rotation,
          correction, reason: correction ? `Validated with final ${correction}.` : 'Solves this recognition position.',
        };
      }
    }
    // Some algorithms rotate the original top away from U before their final
    // AUF. Try restoring the frame first, then turning the original top.
    for (const frame of ROTATIONS.slice(1)) {
      const rotation = inverse(frame.alg), aligned = applyAlg(end, rotation);
      for (const auf of AUFS.slice(1)) {
        if (applyAlg(aligned, auf).join('') === solvedState().join('')) {
          const correction = join(rotation, auf);
          return { valid: true, normalized, algorithm: simplifyAlg(join(normalized, correction)), auf, rotation,
            correction, reason: `Validated with final ${correction}.` };
        }
      }
    }
    return { valid: false, normalized, algorithm: normalized, auf: '', rotation: '', correction: '', reason: 'This algorithm does not solve the fixed case, even with a final AUF. Adjust its starting U/y setup.' };
  } catch (error) {
    return { valid: false, normalized: '', algorithm: '', auf: '', rotation: '', correction: '', reason: error.message };
  }
}

const COLOR_SETUP = Object.fromEntries(Object.entries(COLOR_FACES).map(([color, face]) => {
  const rotation = ROTATIONS.find(({ state }) => state[12] === face);
  return [color, rotation.alg];
}));
function drillParts({ alg = '', preAuf = '', postAuf = '', bottomAuf = '', orientation = '', initialAuf = '', color = 'white', finish = '' } = {}) {
  if (!Object.hasOwn(COLOR_SETUP, color)) throw new Error(`Unknown first-layer color: ${color}.`);
  const normalizedPre = normalizeAlg(preAuf), normalizedPost = normalizeAlg(postAuf);
  if (!AUFS.includes(normalizedPre) || !AUFS.includes(normalizedPost)) throw new Error('AUF must be empty, U, U2 or U′.');
  const normalizedInitial = normalizeAlg(initialAuf);
  if (!AUFS.includes(normalizedInitial)) throw new Error('Initial AUF must be empty, U, U2 or U′.');
  const normalizedBottom = normalizeAlg(bottomAuf);
  if (!BOTTOM_AUFS.includes(normalizedBottom)) throw new Error('Bottom AUF must be empty, D, D2 or D′.');
  const yaw = normalizeAlg(orientation);
  if (parseAlg(yaw).some(move => move.face !== 'y')) throw new Error('Starting orientation must consist of y rotations.');
  return {
    alg: normalizeAlg(alg), preAuf: normalizedPre, postAuf: normalizedPost, bottomAuf: normalizedBottom,
    orientation: yaw, initialAuf: normalizedInitial, color, finish: normalizeAlg(finish), colorSetup: COLOR_SETUP[color],
  };
}

/** A drill is constructed by inversion, so its displayed solution is exact.
 * Starting yaw and the initial upper-layer offset are undone before the
 * first-layer finish. Yaw and U commute, so the U alignment can follow the
 * regrip even though the scramble ends with U. The bottom offset is
 * undone after completing that face, before the recognition AUF and algorithm.
 * Color setup selects a physical solved frame with the chosen color below.
 */
export function createDrill(options = {}) {
  const parts = drillParts(options);
  const core = join(parts.preAuf, parts.alg, parts.postAuf);
  const setup = inverse(parts.orientation);
  const initialAlignment = inverse(parts.initialAuf);
  const bottomSetup = inverse(parts.bottomAuf);
  const solution = join(setup, initialAlignment, parts.finish, bottomSetup, core);
  const scramble = simplifyAlg(join(parts.colorSetup, inverse(core), parts.bottomAuf, inverse(parts.finish), parts.orientation, parts.initialAuf));
  const state = applyAlg(solvedState(), scramble);
  const afterSetupState = applyAlg(state, setup);
  const afterInitialAlignmentState = applyAlg(afterSetupState, initialAlignment);
  const afterFinishState = applyAlg(afterInitialAlignmentState, parts.finish);
  const afterBottomSetupState = applyAlg(afterFinishState, bottomSetup);
  const solved = applyAlg(state, solution);
  if (!isFirstLayerComplete(afterFinishState, parts.color)) {
    throw new Error('Algorithm must use a complete first layer on D in the canonical color frame. Correct its final cube rotation before training.');
  }
  if (!isSolved(solved)) throw new Error('Internal error: drill solution does not solve its scramble.');
  return { ...parts, caseId: options.caseId ?? '', scramble, solution, setup, initialAlignment, bottomSetup, core, state,
    afterSetupState, afterInitialAlignmentState, afterFinishState, afterBottomSetupState, solvedState: solved, firstLayerColor: COLOR_FACES[parts.color],
    verified: true };
}

const FINISH_CACHE = new Map();
/** Legacy helper; the PDF first-face catalog is the practice UI's case source.
 * All reduced outer-turn sequences, in half-turn metric, without adjacent
 * turns of the same face. No cancellation or commuting-equivalence exclusions.
 */
export function finishOptions(maxLength = 3) {
  if (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > 3) throw new Error('Finish length must be 1, 2 or 3.');
  if (!FINISH_CACHE.has(maxLength)) {
    const options = [];
    const visit = (moves, lastFace) => {
      if (moves.length) {
        const alg = moves.map(moveText).join(' ');
        options.push(Object.freeze({ id: alg, alg, length: moves.length }));
      }
      if (moves.length === maxLength) return;
      for (const face of FACES) if (face !== lastFace) for (let turns = 1; turns <= 3; turns++) visit([...moves, { face, turns }], face);
    };
    visit([], '');
    FINISH_CACHE.set(maxLength, Object.freeze(options.sort((a, b) => a.length - b.length || a.alg.localeCompare(b.alg))));
  }
  return FINISH_CACHE.get(maxLength);
}

/** Legacy 1–3-move filter, not used to prune PDF first-face combinations.
 * Rejects already-complete bottoms and sequences completing D before their
 * final turn. Ending on the constructed case preserves its CLL/EG bottom state.
 * Apply starting yaw separately: finishes are stated in the canonical frame.
 */
export function compatibleFinishes(alg, candidates = finishOptions(), options = {}) {
  const { afterFinishState } = createDrill({ ...options, alg, orientation: '', finish: '' });
  if (!isFaceComplete(afterFinishState, 'D')) return [];
  return candidates.filter(candidate => {
    try {
      const moves = parseAlg(typeof candidate === 'string' ? candidate : candidate.alg);
      if (moves.length < 1 || moves.length > 3 || moves.some(({ face }) => !FACES.includes(face))) return false;
      let state = applyMoves(afterFinishState, inverseMoves(moves));
      if (isFaceComplete(state, 'D')) return false;
      for (let i = 0; i < moves.length - 1; i++) {
        state = applyMoves(state, [moves[i]]);
        if (isFaceComplete(state, 'D')) return false;
      }
      return isFaceComplete(applyMoves(state, [moves.at(-1)]), 'D');
    } catch { return false; }
  });
}

/** Cubies grouped by corner position, useful for independently checking cases. */
export function corners(state) {
  assertState(state);
  const groups = new Map();
  STICKERS.forEach(({ position, face }, index) => {
    const key = position.join(',');
    if (!groups.has(key)) groups.set(key, { position: [...position], stickers: {} });
    groups.get(key).stickers[face] = state[index];
  });
  return [...groups.values()];
}

/** Bottom permutation class, independent of yaw and bottom-color choice.
 * Adjacent bars distinguish the three EG sets once the D face is complete.
 */
export function bottomSignature(state) {
  const faces = facelets(state);
  if (!isFaceComplete(state, 'D')) return { complete: false, set: null, bars: [] };
  const bars = ['F', 'R', 'B', 'L'].filter(face => faces[face][2] === faces[face][3]);
  const set = bars.length === 4 ? 'CLL' : bars.length === 1 ? 'EG1' : bars.length === 0 ? 'EG2' : null;
  return { complete: true, set, bars, color: faces.D[0] };
}
