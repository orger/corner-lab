/** Exact 5×5 sticker geometry. Row-major faces are viewed from outside.
 * Color letters match Corner Lab: white D, yellow U, green F, red R.
 * Wide turns move exactly the requested number of layers, including 3-wide.
 */
export const FACES = Object.freeze(['U', 'R', 'F', 'D', 'L', 'B']);
export const AUFS = Object.freeze(['', 'U', 'U2', "U'"]);
const SIZE = 5, RADIUS = 2;
const NORMALS = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1] };
const geometry = [];
for (const face of FACES) for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
  const a = col - RADIUS, b = RADIUS - row;
  const position = {
    U: [a, RADIUS, -b], R: [RADIUS, b, -a], F: [a, b, RADIUS],
    D: [a, -RADIUS, b], L: [-RADIUS, b, a], B: [-a, b, -RADIUS],
  }[face];
  geometry.push(Object.freeze({ face, row, col, position: Object.freeze(position), normal: Object.freeze([...NORMALS[face]]) }));
}
export const STICKER_GEOMETRY = Object.freeze(geometry);
const stickerKey = (position, normal) => `${position.join(',')}/${normal.join(',')}`;
const INDEX = new Map(geometry.map((sticker, index) => [stickerKey(sticker.position, sticker.normal), index]));
const SPECS = {
  U: [1, 1, -1], D: [1, -1, 1], R: [0, 1, -1], L: [0, -1, 1],
  F: [2, 1, -1], B: [2, -1, 1], x: [0, 0, -1], y: [1, 0, -1], z: [2, 0, -1],
};
const join = (...parts) => parts.filter(Boolean).join(' ').trim();
function rotate([x, y, z], axis, sign) {
  if (axis === 0) return [x, -sign * z, sign * y];
  if (axis === 1) return [sign * z, y, -sign * x];
  return [-sign * y, sign * x, z];
}
const permutationKey = ({ face, width, turns }) => `${face}/${width}/${turns}`;
const PERMS = new Map();
for (const [face, [axis, side, sign]] of Object.entries(SPECS)) {
  for (const width of side ? [1, 2, 3, 4, 5] : [5]) {
    const quarter = geometry.map(sticker => side && sticker.position[axis] * side < SIZE - RADIUS - width
      ? INDEX.get(stickerKey(sticker.position, sticker.normal))
      : INDEX.get(stickerKey(rotate(sticker.position, axis, sign), rotate(sticker.normal, axis, sign))));
    let permutation = geometry.map((_, index) => index);
    for (let turns = 1; turns <= 3; turns++) {
      permutation = permutation.map(index => quarter[index]);
      PERMS.set(permutationKey({ face, width, turns }), permutation);
    }
  }
}
const moveText = ({ face, width, turns }) => {
  const base = face === face.toLowerCase() || width === 1 ? face : `${width === 2 ? '' : width}${face}w`;
  return base + (turns === 2 ? '2' : turns === 3 ? "'" : '');
};
const inverseMoves = moves => [...moves].reverse().map(move => ({ ...move, turns: 4 - move.turns }));

/** Supports outer moves, Rw/r (two layers), 3Rw (three layers), rotations,
 * Unicode primes, 2′, grouped repeats and [A,B]/[A:B]. Numbered single slices
 * and M/E/S are rejected rather than assigned an ambiguous interpretation.
 */
export function parseAlg(algorithm = '') {
  if (typeof algorithm !== 'string') throw new TypeError('Algorithm must be text.');
  const source = algorithm.replace(/[’′`]/g, "'").replace(/²/g, '2');
  let cursor = 0;
  const skip = () => { while (cursor < source.length && /\s/.test(source[cursor])) cursor++; };
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
    const result = [];
    while (cursor < source.length) {
      skip();
      if (cursor >= source.length || stops.includes(source[cursor])) break;
      if (source[cursor] === '(') {
        cursor++;
        const group = sequence(')');
        if (source[cursor] !== ')') throw new Error('Unclosed algorithm group.');
        cursor++;
        result.push(...suffix(group));
      } else if (source[cursor] === '[') {
        cursor++;
        const left = sequence(',:]'), separator = source[cursor++];
        if (separator !== ',' && separator !== ':') throw new Error('Use [A, B] or [A: B].');
        const right = sequence(']');
        if (source[cursor] !== ']') throw new Error('Unclosed commutator.');
        cursor++;
        result.push(...suffix(separator === ','
          ? [...left, ...right, ...inverseMoves(left), ...inverseMoves(right)]
          : [...left, ...right, ...inverseMoves(left)]));
      } else {
        const token = source.slice(cursor).match(/^([2-5])?([URFDLBurfdlbxyzXYZ])([wW]?)(?:\s*(2'?|'2|'))?/);
        if (!token) throw new Error(`Unsupported notation at “${source.slice(cursor, cursor + 16)}”.`);
        cursor += token[0].length;
        let face = token[2], width = 1;
        const turns = token[4]?.includes('2') ? 2 : token[4] === "'" ? 3 : 1;
        if (/^[xyzXYZ]$/.test(face)) {
          if (token[1] || token[3]) throw new Error('Cube rotations cannot have wide-layer prefixes.');
          face = face.toLowerCase(); width = 5;
        } else {
          const wide = Boolean(token[3]) || /^[urfdlb]$/.test(face);
          if (token[1] && !wide) throw new Error('Use 3Rw for three layers; numbered single-slice notation is not supported.');
          width = token[1] ? Number(token[1]) : wide ? 2 : 1;
          face = face.toUpperCase();
        }
        result.push({ face, width, turns });
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
export function simplifyAlg(algorithm) {
  const result = [];
  for (const move of parseAlg(algorithm)) {
    const previous = result.at(-1);
    if (previous?.face === move.face && previous.width === move.width) {
      result.pop();
      const turns = (previous.turns + move.turns) % 4;
      if (turns) result.push({ ...move, turns });
    } else result.push(move);
  }
  return result.map(moveText).join(' ');
}
const identityPermutation = () => geometry.map((_, index) => index);
function movesPermutation(moves) {
  let result = identityPermutation();
  for (const move of moves) {
    const permutation = PERMS.get(permutationKey(move));
    result = result.map(index => permutation[index]);
  }
  return result;
}
const PRIMITIVE_BY_PERMUTATION = new Map();
for (const face of [...FACES, 'x', 'y', 'z']) {
  for (const width of FACES.includes(face) ? [1, 2, 3, 4] : [5]) for (const turns of [1, 2, 3]) {
    const move = { face, width, turns };
    PRIMITIVE_BY_PERMUTATION.set(PERMS.get(permutationKey(move)).join(','), move);
  }
}
const REGRIPS = ['x', 'y', 'z'].flatMap(face => [1, 2, 3].map(turns => ({ face, width: 5, turns })));
const CONJUGATES = new Map();
function conjugateMove(move, frame) {
  const key = `${permutationKey(frame)}|${permutationKey(move)}`;
  if (!CONJUGATES.has(key)) {
    // Q (Q^-1 A Q) Q^-1 = A, using the same source-to-destination
    // permutation composition as the physical sticker simulator.
    const conjugated = movesPermutation([{ ...frame, turns: 4 - frame.turns }, move, frame]);
    const result = PRIMITIVE_BY_PERMUTATION.get(conjugated.join(','));
    if (!result) throw new Error('Internal error: a regripped move did not map to a physical face turn.');
    CONJUGATES.set(key, result);
  }
  return CONJUGATES.get(key);
}
function wideComplement(move) {
  const opposite = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' }[move.face];
  const [axis, side] = SPECS[move.face];
  return [
    { face: ['x', 'y', 'z'][axis], width: 5, turns: side > 0 ? move.turns : 4 - move.turns },
    { face: opposite, width: SIZE - move.width, turns: move.turns },
  ];
}

/** Randomized equivalent notation, not a search/solver-generated scramble.
 * Reframes 1–3 move segments, changing their face names by conjugation, and
 * uses identities such as Rw = x 3Lw. The result preserves the entire 150-slot
 * permutation, not only its visible colors. Length is capped at 1.8× the
 * simplified source; very short inputs may have no useful rewrite available.
 */
export function equivalentScramble(algorithm, random = Math.random) {
  if (typeof random !== 'function') throw new TypeError('Scramble random source must be a function.');
  const sample = () => {
    const value = Number(random());
    if (!Number.isFinite(value)) throw new Error('Scramble random source must return a finite number.');
    return Math.max(0, Math.min(0.9999999999999999, value));
  };
  const provided = simplifyAlg(algorithm), source = parseAlg(provided), maximumLength = Math.floor(source.length * 1.8);
  let segments = source.length >= 18 ? 2 + Math.floor(sample() * 2) : source.length >= 10 ? 1 + Math.floor(sample() * 2) : source.length >= 3 ? 1 : 0;
  if (source.length + 2 * segments > maximumLength) segments = 0;
  const reframed = [];
  let offset = 0, previousFrame = null;
  for (let index = 0; index < segments; index++) {
    const remaining = source.length - offset, remainingSegments = segments - index;
    const length = remainingSegments === 1 ? remaining : 3 + Math.floor(sample() * (remaining - (remainingSegments - 1) * 3 - 2));
    const chunk = source.slice(offset, offset + length);
    let frames = REGRIPS.filter(frame => chunk.some(move => moveText(conjugateMove(move, frame)) !== moveText(move)));
    const different = frames.filter(frame => permutationKey(frame) !== previousFrame);
    if (different.length) frames = different;
    const frame = frames[Math.floor(sample() * frames.length)] || REGRIPS[0];
    reframed.push(frame, ...chunk.map(move => conjugateMove(move, frame)), { ...frame, turns: 4 - frame.turns });
    previousFrame = permutationKey(frame); offset += length;
  }
  if (!segments) reframed.push(...source);
  const eligible = reframed.flatMap((move, index) => FACES.includes(move.face) && [2, 3].includes(move.width) ? [index] : []);
  for (let index = eligible.length - 1; index > 0; index--) {
    const other = Math.floor(sample() * (index + 1));
    [eligible[index], eligible[other]] = [eligible[other], eligible[index]];
  }
  const available = Math.min(eligible.length, maximumLength - reframed.length, Math.max(1, Math.ceil(source.length * .2)));
  const wideComplements = available > 0 ? 1 + Math.floor(sample() * available) : 0;
  const replaced = new Set(eligible.slice(0, wideComplements));
  const rewritten = reframed.flatMap((move, index) => replaced.has(index) ? wideComplement(move) : [move]);
  const alg = simplifyAlg(rewritten.map(moveText).join(' ')), moves = parseAlg(alg);
  if (movesPermutation(source).join(',') !== movesPermutation(moves).join(',')) throw new Error('Internal error: varied scramble changed the 5×5 permutation.');
  return { alg, method: 'equivalent-move-rewrites', sourceMoveCount: source.length, moveCount: moves.length,
    reframedSegments: segments, wideComplements, changed: alg !== provided, permutationVerified: true };
}
export const solvedState = () => FACES.flatMap(face => Array(25).fill(face));
function assertState(state) {
  if (!Array.isArray(state) || state.length !== 150 || state.some(color => !FACES.includes(color))) throw new Error('A 5×5 state must contain 150 face-letter colors.');
}
export function applyAlg(state, algorithm) {
  assertState(state);
  let result = state.slice();
  for (const move of parseAlg(algorithm)) {
    const permutation = PERMS.get(permutationKey(move)), next = Array(150);
    for (let index = 0; index < 150; index++) next[permutation[index]] = result[index];
    result = next;
  }
  return result;
}
export function facelets(state) {
  assertState(state);
  return Object.fromEntries(FACES.map((face, index) => [face, state.slice(index * 25, index * 25 + 25)]));
}
const ROTATIONS = [{ alg: '', state: solvedState() }], ROTATED_SOLVED = new Set([solvedState().join('')]);
for (let index = 0; index < ROTATIONS.length; index++) for (const move of ['x', 'y', 'z']) {
  const state = applyAlg(ROTATIONS[index].state, move), key = state.join('');
  if (!ROTATED_SOLVED.has(key)) { ROTATED_SOLVED.add(key); ROTATIONS.push({ alg: join(ROTATIONS[index].alg, move), state }); }
}
export const cubeOrientations = () => ROTATIONS.map(frame => frame.alg);
export function isSolved(state) { assertState(state); return ROTATED_SOLVED.has(state.join('')); }

/** Each edge's three physical cubies are ordered by its first face's row-major
 * indices. The second strip is reversed where required to keep partners paired.
 */
export const EDGE_SLOTS = Object.freeze(['UF', 'UR', 'UB', 'UL', 'FR', 'FL', 'BR', 'BL', 'DF', 'DR', 'DB', 'DL'].map(name => {
  const faces = name.split(''), normals = faces.map(face => NORMALS[face]);
  const fixedAxes = normals.map(normal => normal.findIndex(value => value !== 0));
  const axis = [0, 1, 2].find(value => !fixedAxes.includes(value));
  const cubies = [-1, 0, 1].map(offset => {
    const position = [0, 0, 0]; position[axis] = offset;
    fixedAxes.forEach((fixedAxis, index) => { position[fixedAxis] = normals[index][fixedAxis] * RADIUS; });
    return Object.freeze({ position: Object.freeze(position), indices: Object.freeze(normals.map(normal => INDEX.get(stickerKey(position, normal)))) });
  }).sort((a, b) => a.indices[0] - b.indices[0]);
  return Object.freeze({ name, faces: Object.freeze(faces), axis, cubies: Object.freeze(cubies) });
}));
const CENTRE_LOCAL_INDICES = [6, 7, 8, 11, 12, 13, 16, 17, 18];
/** Reduction means uniform 3×3 centre blocks plus 12 paired edge groups.
 * Corner/edge permutation and outer-layer orientation may remain unsolved.
 */
export function reductionStatus(state) {
  assertState(state);
  const centres = FACES.map((face, index) => {
    const colors = CENTRE_LOCAL_INDICES.map(local => state[index * 25 + local]);
    return { face, color: state[index * 25 + 12], colors, solved: colors.every(color => color === colors[4]) };
  });
  const edges = EDGE_SLOTS.map(slot => {
    const cubies = slot.cubies.map(cubie => ({ ...cubie, colors: cubie.indices.map(index => state[index]) }));
    const pairs = cubies.map(cubie => cubie.colors);
    const paired = pairs.every(pair => pair[0] === pairs[1][0] && pair[1] === pairs[1][1]);
    return { name: slot.name, faces: [...slot.faces], paired, pairs, cubies };
  });
  const centresSolved = centres.every(centre => centre.solved), unpaired = edges.filter(edge => !edge.paired);
  return { centresSolved, centersSolved: centresSolved, centres, pairedCount: edges.length - unpaired.length,
    fullyReduced: centresSolved && unpaired.length === 0, edges, unpaired };
}
export const edgeStatus = reductionStatus;
export const isReduced = state => reductionStatus(state).fullyReduced;

/** Inversion provides an exact reviewable solution. Status is reported rather
 * than used to silently discard imported algorithms with unusual side effects.
 */
export function createDrill({ caseId = '', alg = '', orientation = '', preAuf = '', scrambleStyle = 'provided', random = Math.random } = {}) {
  alg = normalizeAlg(alg); orientation = normalizeAlg(orientation); preAuf = normalizeAlg(preAuf);
  if (parseAlg(orientation).some(move => move.face !== 'y')) throw new Error('Starting grip must consist of y rotations.');
  if (!AUFS.includes(preAuf)) throw new Error('Upper setup must be empty, U, U2 or U′.');
  if (!['provided', 'varied'].includes(scrambleStyle)) throw new Error('Scramble style must be provided or varied.');
  const setup = inverse(orientation), core = join(preAuf, alg);
  const providedScramble = simplifyAlg(join(inverse(core), orientation)), solution = join(setup, core);
  const scrambleDetails = scrambleStyle === 'varied' ? equivalentScramble(providedScramble, random)
    : { alg: providedScramble, method: 'inverse-selected-solution', sourceMoveCount: parseAlg(providedScramble).length,
      moveCount: parseAlg(providedScramble).length, reframedSegments: 0, wideComplements: 0, changed: false, permutationVerified: true };
  const scramble = scrambleDetails.alg;
  const state = applyAlg(solvedState(), scramble), afterSetupState = applyAlg(state, setup);
  if (state.join('') !== applyAlg(solvedState(), providedScramble).join('')) throw new Error('Internal error: varied scramble changed the target 5×5 case.');
  const solved = applyAlg(state, solution);
  if (!isSolved(solved)) throw new Error('Internal error: 5×5 drill solution does not solve its scramble.');
  return { caseId, alg, orientation, preAuf, setup, core, scramble, providedScramble, scrambleStyle, scrambleDetails, solution, state, afterSetupState,
    solvedState: solved, status: reductionStatus(state), afterSetupStatus: reductionStatus(afterSetupState), verified: true };
}
