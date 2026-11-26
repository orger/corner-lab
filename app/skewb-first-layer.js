import { CASES_SKEWB_FIRST_LAYER } from './catalog-skewb-first-layer.js';
import { solvedSkewb, applySkewbAlg, inverseSkewb, normalizeSkewbAlg, skewbStateKey, skewbStickerGeometry, SKEWB_NS_CORNERS } from './skewb.js';

const GEOMETRY = skewbStickerGeometry();
const cornerPosition = name => [name.includes('R') ? 1 : -1, name.includes('U') ? 1 : -1, name.includes('F') ? 1 : -1];
const same = (a, b) => a.every((value, index) => value === b[index]);
const cornerIds = name => GEOMETRY.filter(slot => same(slot.position, cornerPosition(name))).map(slot => slot.index);
export const SKEWB_FIRST_LAYER_BOTTOM_CORNERS = Object.freeze(['DLF', 'DFR', 'DBL', 'DRB']);
export const SKEWB_FIRST_LAYER_CENTRE = GEOMETRY.find(slot => slot.color === 'D' && same(slot.position, [0, -1, 0])).index;
export const SKEWB_FIRST_LAYER_FIXED_STICKERS = Object.freeze([SKEWB_FIRST_LAYER_CENTRE, ...cornerIds('DBL'), ...cornerIds('DRB')]);
export const SKEWB_FIRST_LAYER_TRACKED_STICKERS = Object.freeze([SKEWB_FIRST_LAYER_CENTRE, ...SKEWB_FIRST_LAYER_BOTTOM_CORNERS.flatMap(cornerIds)]);
const positions = new Map(Object.values(SKEWB_NS_CORNERS).map(name => [cornerPosition(name).join(','), name]));
const yellowIds = Object.fromEntries(['DLF', 'DFR'].map(corner => [corner, cornerIds(corner).find(index => GEOMETRY[index].color === 'D')]));
const CASE_MAP = new Map(CASES_SKEWB_FIRST_LAYER.map(item => [item.id, item]));
const START = solvedSkewb();

/** Exact first-layer pieces, not only four yellow stickers: the yellow centre
 * and all three stickers of each bottom corner must match the reference frame.
 */
export function isSkewbFirstLayerSolved(state) {
  skewbStateKey(state);
  return SKEWB_FIRST_LAYER_TRACKED_STICKERS.every(index => state[index] === index);
}
export function hasSkewbFirstLayerAnchor(state) {
  skewbStateKey(state);
  return SKEWB_FIRST_LAYER_FIXED_STICKERS.every(index => state[index] === index);
}
export function skewbFirstLayerProjection(state) {
  skewbStateKey(state);
  const locations = [];
  state.forEach((piece, slot) => { locations[piece] = slot; });
  return SKEWB_FIRST_LAYER_TRACKED_STICKERS.map(index => locations[index]);
}
export function skewbFirstLayerCorners(state) {
  skewbStateKey(state);
  return Object.fromEntries(['DLF', 'DFR'].map(corner => {
    const slot = GEOMETRY[state.indexOf(yellowIds[corner])];
    return [corner, { position: positions.get(slot.position.join(',')), yellowFace: slot.color,
      solved: cornerIds(corner).every(index => state[index] === index) }];
  }));
}
export function skewbFirstLayerCaseKey(state) {
  if (!hasSkewbFirstLayerAnchor(state)) throw new Error('The bottom centre and both back-bottom corners must already be solved.');
  const corners = skewbFirstLayerCorners(state);
  return `SFL-DLF-${corners.DLF.position}-${corners.DLF.yellowFace}-DFR-${corners.DFR.position}-${corners.DFR.yellowFace}`;
}
export function validateSkewbFirstLayerAlgorithm(caseId, text) {
  const item = typeof caseId === 'object' ? caseId : CASE_MAP.get(caseId);
  if (!item) return { valid: false, reason: 'Unknown Skewb first-layer case.' };
  try {
    const algorithm = normalizeSkewbAlg(text, { notation: 'ns' });
    if (!algorithm && !item.isSkip) throw new Error('Choose a nonempty first-layer solution.');
    const reference = applySkewbAlg(START, item.setup);
    if (!isSkewbFirstLayerSolved(applySkewbAlg(reference, algorithm))) throw new Error('This algorithm does not complete the selected first layer, including its centre and all four corners.');
    return { valid: true, algorithm };
  } catch (error) { return { valid: false, reason: error.message }; }
}
export function previewSkewbFirstLayerState(algorithmOrCaseId) {
  if (!algorithmOrCaseId || (typeof algorithmOrCaseId === 'object' && algorithmOrCaseId.id === 'square1-reference')) return solvedSkewb();
  const item = typeof algorithmOrCaseId === 'object' && Array.isArray(algorithmOrCaseId.algorithms) ? algorithmOrCaseId :
    CASE_MAP.get(algorithmOrCaseId) || CASES_SKEWB_FIRST_LAYER.find(item => item.algorithms.some(alg => alg.alg === (algorithmOrCaseId?.alg ?? algorithmOrCaseId)));
  if (item) return applySkewbAlg(START, item.setup);
  return applySkewbAlg(START, inverseSkewb(algorithmOrCaseId?.alg ?? algorithmOrCaseId, { notation: 'ns' }));
}
export function createSkewbFirstLayerDrill({ caseId = '', alg, orientation = '', scrambleStyle = 'disguised', random = Math.random } = {}) {
  if (orientation !== '') throw new Error('Skewb first-layer practice uses the two solved back-bottom corners as its fixed grip.');
  if (!['provided', 'disguised'].includes(scrambleStyle)) throw new Error('Unknown Skewb first-layer setup style.');
  const item = CASE_MAP.get(caseId);
  if (!item) throw new Error('Unknown Skewb first-layer case.');
  const solution = alg ?? item.algorithms.find(choice => choice.id === item.defaultAlgorithmId)?.alg ?? item.algorithms[0].alg;
  const checked = validateSkewbFirstLayerAlgorithm(item, solution);
  if (!checked.valid) throw new Error(checked.reason);
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Skewb random selection must be between zero and one.');
  const inverse = normalizeSkewbAlg(inverseSkewb(checked.algorithm), { notation: 'ns' });
  const pool = item.scrambles.filter(scramble => normalizeSkewbAlg(scramble, { notation: 'ns' }) !== inverse);
  if (scrambleStyle === 'disguised' && !pool.length) throw new Error('No alternative first-layer setup is available.');
  const scramble = scrambleStyle === 'provided' ? inverse : pool[Math.floor(value * pool.length)];
  const state = applySkewbAlg(START, scramble);
  if (skewbFirstLayerCaseKey(state) !== item.id || !isSkewbFirstLayerSolved(applySkewbAlg(state, checked.algorithm))) throw new Error('The setup does not match the selected first-layer solution.');
  return { caseId, state, setup: '', scramble, solution: checked.algorithm, orientation: '', scrambleStyle,
    scrambleNotation: 'ns', solutionNotation: 'ns', isSkip: Boolean(item.isSkip) };
}
