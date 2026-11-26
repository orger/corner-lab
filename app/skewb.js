import { CASES_SKEWB_NS2 } from './catalog-skewb-ns2.js';

/** Skewb sticker geometry, with x=right, y=up, z=front.
 * A 120° corner turn moves the half with positive dot product against its
 * corner axis. Corners carry three stickers; centres carry one, so centre
 * orientation (not visible on an ordinary Skewb) is deliberately ignored.
 * WCA axes: U=UBL, R=DRB, L=DLF, B=DBL, independently documented at
 * https://github.com/cubing/cubing.js/blob/main/src/cubing/puzzle-geometry/notation-mapping/SkewbNotationMapper.ts
 * NS solutions use uppercase top and lowercase bottom corners. Setups use
 * WCA notation. S/H abbreviations are expanded in the generated catalogue.
 */
const FACES = {
  U: { normal: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1] },
  D: { normal: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1] },
  F: { normal: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] },
  B: { normal: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] },
  R: { normal: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
  L: { normal: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
};
export const SKEWB_NS_CORNERS = Object.freeze({ F: 'UFR', R: 'URB', B: 'UBL', L: 'ULF', f: 'DFR', r: 'DRB', b: 'DBL', l: 'DLF' });
export const SKEWB_WCA_CORNERS = Object.freeze({ U: 'UBL', R: 'DRB', L: 'DLF', B: 'DBL' });
const CORNER_AXES = Object.fromEntries(['UFR', 'URB', 'UBL', 'ULF', 'DFR', 'DRB', 'DBL', 'DLF'].map(name =>
  [name, [name.includes('R') ? 1 : -1, name.includes('U') ? 1 : -1, name.includes('F') ? 1 : -1]]));
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const key = (position, normal) => `${position}:${normal}`;
const slots = [];
for (const [face, { normal }] of Object.entries(FACES)) {
  slots.push({ position: normal, normal, color: face });
  for (const position of Object.values(CORNER_AXES)) if (dot(position, normal) === 1) slots.push({ position, normal, color: face });
}
const slotIndex = new Map(slots.map((slot, i) => [key(slot.position, slot.normal), i]));
const identity = slots.map((_, i) => i);
// Geometry metadata for stage-specific projections. Return detached vectors so
// a catalogue builder or diagram cannot mutate the simulator's move tables.
export const skewbStickerGeometry = () => slots.map(({ position, normal, color }, index) =>
  ({ index, position: [...position], normal: [...normal], color }));
const turn120 = (vector, axis) => {
  const d = dot(vector, axis), c = cross(axis, vector);
  return vector.map((value, i) => Math.round((-value + axis[i] * d - c[i]) / 2));
};
const turn90 = (vector, axis) => {
  const d = dot(vector, axis), c = cross(axis, vector);
  return vector.map((_, i) => axis[i] * d - c[i]);
};
const permutation = (axis, whole = false) => slots.map((slot, i) => {
  if (!whole && dot(slot.position, axis) <= 0) return i;
  const rotate = whole ? turn90 : turn120;
  return slotIndex.get(key(rotate(slot.position, axis), rotate(slot.normal, axis)));
});
const corners = Object.fromEntries(Object.entries(CORNER_AXES).map(([name, axis]) => [name, permutation(axis)]));
const rotations = { x: permutation([1, 0, 0], true), y: permutation([0, 1, 0], true), z: permutation([0, 0, 1], true) };
const applyPermutation = (state, move) => {
  const result = Array(30);
  for (let i = 0; i < 30; i++) result[move[i]] = state[i];
  return result;
};
function checkedState(state) {
  if (!Array.isArray(state) || state.length !== 30 || new Set(state).size !== 30 || state.some(value => !Number.isInteger(value) || value < 0 || value >= 30)) throw new Error('Invalid Skewb state.');
  return state;
}
const notationOf = options => typeof options === 'string' ? options : options?.notation || 'auto';

/** Syntax parser. Auto accepts either alphabet for loading historical records;
 * executing an algorithm always chooses one notation explicitly (default NS).
 */
export function parseSkewbAlg(text = '', options = {}) {
  if (typeof text !== 'string') throw new TypeError('Skewb algorithm must be text.');
  if (text.length > 12000) throw new Error('Skewb algorithm is too long.');
  const notation = notationOf(options);
  if (!['auto', 'ns', 'wca'].includes(notation)) throw new Error('Unknown Skewb notation.');
  const allowed = notation === 'wca' ? 'URLBxyz' : notation === 'ns' ? 'FRBLfrblxyz' : 'UFRBLfrblxyz';
  const tokens = text.trim() ? text.trim().split(/\s+/) : [];
  if (tokens.length > 1000) throw new Error('Skewb algorithm has too many moves.');
  return tokens.map(token => {
    const match = /^([A-Za-z])([123]?)(['′]?)$/.exec(token);
    if (!match || !allowed.includes(match[1])) throw new Error(`Invalid Skewb move “${token}”. Use explicit ${notation === 'wca' ? 'U, R, L, B' : 'F, R, B, L and f, r, b, l'} moves, x/y/z rotations and primes, separated by spaces.`);
    return { move: match[1], amount: (match[2] ? Number(match[2]) : 1) * (match[3] ? -1 : 1) };
  });
}
export function formatSkewbAlg(moves) {
  return moves.map(({ move, amount }) => {
    const order = rotations[move] ? 4 : 3, turns = (amount % order + order) % order;
    return !turns ? '' : move + (turns === 1 ? '' : turns === order - 1 ? "'" : String(turns));
  }).filter(Boolean).join(' ');
}
export const normalizeSkewbAlg = (text, options = {}) => formatSkewbAlg(parseSkewbAlg(text, options));
export const inverseSkewb = (text = '', options = {}) => formatSkewbAlg(parseSkewbAlg(text, options).reverse().map(({ move, amount }) => ({ move, amount: -amount })));
export const solvedSkewb = () => [...identity];
export function applySkewbAlg(initial, text = '', options = { notation: 'ns' }) {
  let state = [...checkedState(initial)];
  const notation = notationOf(options) === 'auto' ? 'ns' : notationOf(options);
  const map = notation === 'wca' ? SKEWB_WCA_CORNERS : SKEWB_NS_CORNERS;
  for (const { move, amount } of parseSkewbAlg(text, { notation })) {
    const p = rotations[move] || corners[map[move]], order = rotations[move] ? 4 : 3;
    for (let i = 0, turns = (amount % order + order) % order; i < turns; i++) state = applyPermutation(state, p);
  }
  return state;
}
const solvedOrientations = [identity], solvedKeys = new Set([identity.join(',')]);
for (let i = 0; i < solvedOrientations.length; i++) for (const rotation of Object.values(rotations)) {
  const next = applyPermutation(solvedOrientations[i], rotation), k = next.join(',');
  if (!solvedKeys.has(k)) { solvedKeys.add(k); solvedOrientations.push(next); }
}
export const isSolvedSkewb = state => solvedKeys.has(checkedState(state).join(','));
export const skewbStateKey = state => checkedState(state).join(',');

/** Each outside face lists its centre then top-left, top-right, bottom-right,
 * bottom-left triangles. Colours use solved face names: U white, D yellow,
 * F green, B blue, R red, L orange (the WCA scramble starting grip).
 */
export function skewbFacelets(state) {
  checkedState(state);
  return Object.fromEntries(Object.entries(FACES).map(([face, { normal, right, up }]) => {
    const positions = [normal, ...[[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([r, u]) => normal.map((n, i) => n + r * right[i] + u * up[i]))];
    return [face, positions.map(position => slots[state[slotIndex.get(key(position, normal))]].color)];
  }));
}
export const isSkewbFaceSolved = (state, face = 'D') => {
  const colors = skewbFacelets(state)[face];
  if (!colors) throw new Error('Unknown Skewb face.');
  return new Set(colors).size === 1;
};
const CASE_MAP = new Map(CASES_SKEWB_NS2.map(item => [item.id, item]));
export function validateSkewbAlgorithm(caseId, text) {
  const item = typeof caseId === 'object' ? caseId : CASE_MAP.get(caseId);
  if (!item?.setup) return { valid: false, reason: 'Unknown Skewb NS2 case.' };
  try {
    const algorithm = normalizeSkewbAlg(text, { notation: 'ns' });
    const reference = applySkewbAlg(solvedSkewb(), item.setup, { notation: 'wca' });
    if (!isSolvedSkewb(applySkewbAlg(reference, algorithm))) return { valid: false, reason: 'This algorithm does not solve the selected NS2 case from its reference grip.' };
    return { valid: true, algorithm };
  } catch (error) { return { valid: false, reason: error.message }; }
}
export function previewSkewbState(algorithmOrCaseId) {
  const item = typeof algorithmOrCaseId === 'object' ? algorithmOrCaseId : CASE_MAP.get(algorithmOrCaseId) || CASES_SKEWB_NS2.find(item => item.algorithms.some(a => a.alg === algorithmOrCaseId));
  if (item?.setup) return applySkewbAlg(solvedSkewb(), item.setup, { notation: 'wca' });
  return applySkewbAlg(solvedSkewb(), inverseSkewb(algorithmOrCaseId || '', { notation: 'ns' }));
}
export function createSkewbDrill({ caseId = '', alg, orientation = '', scrambleStyle = 'disguised', random = Math.random } = {}) {
  if (orientation !== '') throw new Error('Skewb NS2 uses the illustrated reference grip.');
  if (!['provided', 'disguised'].includes(scrambleStyle)) throw new Error('Unknown Skewb setup style.');
  const item = CASE_MAP.get(caseId);
  if (!item) throw new Error('Unknown Skewb NS2 case.');
  const solution = alg ?? item.algorithms.find(a => a.id === item.defaultAlgorithmId)?.alg ?? item.algorithms[0].alg;
  const checked = validateSkewbAlgorithm(item, solution);
  if (!checked.valid) throw new Error(checked.reason);
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Skewb random selection must be between zero and one.');
  const scramble = scrambleStyle === 'disguised' ? item.scrambles[Math.floor(value * item.scrambles.length)] : item.setup;
  return { caseId, state: applySkewbAlg(solvedSkewb(), scramble, { notation: 'wca' }), setup: '', scramble, solution: checked.algorithm, orientation: '', scrambleStyle, scrambleNotation: 'wca', solutionNotation: 'ns' };
}
