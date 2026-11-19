import { solvedSquare1, applySquare1Alg, inverseSquare1, parseSquare1Alg, formatSquare1Alg, isCubeShape } from './square1.js';
import { CASES_SQ1_OBL } from './catalog-square1-obl.js';
import { CASES_SQ1_EP } from './catalog-square1-ep.js';

const MOD = n => ((n % 12) + 12) % 12;
const signed = n => MOD(n) > 6 ? MOD(n) - 12 : MOD(n);
const rotate = (layer, amount) => layer.map((_, index) => layer[MOD(index - amount)]);
const ALL_TURNS = [0, 3, 6, -3, 1, -1, 2, -2, 4, -4, 5, -5];
export const SQUARE1_LAST_LAYER_TURNS = [0, 3, 6, -3];
const START = solvedSquare1();
const MIDDLE_FLIP = '/ (6,0) / (6,0) / (6,0)';
const COLOUR_SWAP = '(1,0) / (6,6) / (-1,0)';
const pick = (items, random) => items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];
const tuple = (a, b) => `(${signed(a)},${signed(b)})`;
const sliceCount = alg => (alg.match(/\//g) || []).length;

/** Combine adjacent turns and cancel adjacent slices without changing state. */
export function normalizeSquare1Algorithm(alg) {
  const stack = [];
  for (const move of parseSquare1Alg(alg)) {
    const last = stack.at(-1);
    if (move.type === 'slice') {
      if (last?.type === 'slice') stack.pop(); else stack.push(move);
    } else {
      const next = { ...move };
      if (last?.type === 'turn') { stack.pop(); next.top = signed(next.top + last.top); next.bottom = signed(next.bottom + last.bottom); }
      if (next.top || next.bottom) stack.push(next);
    }
  }
  return formatSquare1Alg(stack);
}
function endingTurn(alg, a, b) {
  const moves = parseSquare1Alg(alg), last = moves.at(-1);
  if (last?.type === 'turn') { last.top = signed(last.top + a); last.bottom = signed(last.bottom + b); }
  else moves.push({ type: 'turn', top: signed(a), bottom: signed(b) });
  return formatSquare1Alg(moves);
}

const colourBoundary = layer => layer.map((id, index) => id[0] + (id === layer[MOD(index - 1)] ? '0' : '1')).join('');
const layerColourKey = layer => ALL_TURNS.map(amount => colourBoundary(rotate(layer, amount))).sort()[0];
const colourKey = state => layerColourKey(state.top) + '|' + layerColourKey(state.bottom);
const oppositeColours = state => Object.fromEntries(['top', 'bottom'].map(layer =>
  [layer, state[layer].map(id => (id[0] === 'T' ? 'B' : 'T') + id.slice(1))]));

/** OBL ignores permutation, middle orientation and the choice of U/D colour. */
export function square1OBLCaseKey(state) {
  if (!isCubeShape(state)) throw new Error('OBL begins with both layers in cube shape.');
  return [colourKey(state), colourKey(oppositeColours(state))].sort()[0];
}
export function isOBLSolved(state) {
  return isCubeShape(state) && state.top.every(id => id[0] === state.top[0][0]) &&
    state.bottom.every(id => id[0] === state.bottom[0][0]);
}

const cornerCode = layer => layer.map(id => id[1] === 'C' ? id : '-').join(',');
function cornerAlignment(state) {
  if (!isCubeShape(state)) throw new Error('EP begins with both layers in cube shape.');
  const result = ['top', 'bottom'].map(layer => ALL_TURNS.find(amount =>
    cornerCode(rotate(state[layer], amount)) === cornerCode(START[layer])));
  if (result.some(amount => amount === undefined)) throw new Error('EP algorithms must preserve solved, oriented corners.');
  return result;
}
function edgePermutation(state) {
  return ['top', 'bottom'].flatMap((layer, side) => state[layer].filter(id => id[1] === 'E').map(id => {
    if (id[0] !== (side ? 'B' : 'T')) throw new Error('EP algorithms must preserve edge orientation.');
    return Number(id[2]) + side * 4;
  }));
}
export function square1EPPermutation(state) {
  const [a, b] = cornerAlignment(state);
  return edgePermutation(applySquare1Alg(state, tuple(a, b)));
}
// Rotate both a layer's positions and its colour labels together. This keeps
// adjacent/opposite swaps and the two U/O directions distinct.
const permutationClass = p => [0, 1, 2, 3].map(n => p.map((_, i) => (p[(i + n) % 4] - n + 4) % 4).join('')).sort()[0];
export function square1EPCaseKey(state) {
  const p = square1EPPermutation(state);
  return permutationClass(p.slice(0, 4)) + '|' + permutationClass(p.slice(4).map(n => n - 4));
}
export function isEPSolved(state, { middle = true } = {}) {
  try { return (!middle || !state.middleFlipped) && square1EPPermutation(state).every((id, index) => id === index); }
  catch { return false; }
}

const caseKeyCache = new Map();
function referenceKey(item, key) {
  if (!caseKeyCache.has(item.id)) caseKeyCache.set(item.id,
    key(applySquare1Alg(START, inverseSquare1(item.algorithms[0].alg))));
  return caseKeyCache.get(item.id);
}
function validate(alg, item, stage) {
  const normalized = normalizeSquare1Algorithm(alg);
  if (!normalized) throw new Error('Enter a nonempty Square-1 algorithm.');
  const state = applySquare1Alg(START, inverseSquare1(normalized));
  const key = stage === 'obl' ? square1OBLCaseKey : square1EPCaseKey;
  if ((stage === 'obl' ? isOBLSolved(state) : isEPSolved(state, { middle: false }))) throw new Error('This algorithm creates a solved case.');
  if (!item || key(state) !== referenceKey(item, key)) throw new Error(`This algorithm does not match the selected ${stage.toUpperCase()} case.`);
  return normalized;
}
export const validateOBLAlgorithm = (alg, item) => validate(alg, item, 'obl');
export const validateEPAlgorithm = (alg, item) => validate(alg, item, 'ep');

function alignColours(state, reference) {
  const result = ['top', 'bottom'].map(layer => ALL_TURNS.find(amount =>
    colourBoundary(rotate(state[layer], amount)) === colourBoundary(reference[layer])));
  return result.some(amount => amount === undefined) ? null : result;
}
const oblPoolCache = new Map();
function oblSetups(item, reference) {
  // Include the actual grip, rather than only the rotational case class, so
  // custom algorithms can use a different initial U/D alignment or colour.
  const cacheKey = item.id + ':' + colourBoundary(reference.top) + ':' + colourBoundary(reference.bottom);
  if (oblPoolCache.has(cacheKey)) return oblPoolCache.get(cacheKey);
  const pool = item.scrambles.map(raw => {
    let setup = normalizeSquare1Algorithm(raw), state = applySquare1Alg(START, setup), alignment = alignColours(state, reference);
    if (!alignment) {
      setup = normalizeSquare1Algorithm(COLOUR_SWAP + ' ' + setup);
      state = applySquare1Alg(START, setup); alignment = alignColours(state, reference);
    }
    if (!alignment) throw new Error('The stored OBL setup does not match its case.');
    return endingTurn(setup, ...alignment);
  });
  oblPoolCache.set(cacheKey, pool);
  return pool;
}

let epRoutes;
function epRouteTable() {
  if (epRoutes) return epRoutes;
  // Exactly 24 × 24 edge permutations after corners have been aligned. Each
  // macro restores the same corner positions and standard layer alignment.
  const routes = new Map([['01234567', { alg: '', permutation: [0, 1, 2, 3, 4, 5, 6, 7], middleFlipped: false, slashes: 0 }]]);
  for (const item of CASES_SQ1_EP) {
    const inverse = inverseSquare1(item.algorithms[0].alg), state = applySquare1Alg(START, inverse);
    const base = normalizeSquare1Algorithm(inverse + ' ' + tuple(...cornerAlignment(state)));
    for (const a of SQUARE1_LAST_LAYER_TURNS) for (const b of SQUARE1_LAST_LAYER_TURNS) {
      const alg = normalizeSquare1Algorithm(`${tuple(a, b)} ${base} ${tuple(-a, -b)}`);
      const endpoint = applySquare1Alg(START, alg), permutation = edgePermutation(endpoint), key = permutation.join('');
      const entry = { alg, permutation, middleFlipped: endpoint.middleFlipped, slashes: sliceCount(alg) };
      const old = routes.get(key);
      if (!old || entry.slashes < old.slashes || (entry.slashes === old.slashes && alg.length < old.alg.length)) routes.set(key, entry);
    }
  }
  if (routes.size !== 576) throw new Error('The EP algorithm catalogue is incomplete.');
  epRoutes = routes; return routes;
}
const epPoolCache = new Map();
function epSetups(reference) {
  const alignment = cornerAlignment(reference), target = applySquare1Alg(reference, tuple(...alignment));
  const targetPermutation = edgePermutation(target), targetKey = targetPermutation.join('');
  const cacheKey = `${targetKey}:${reference.middleFlipped}:${alignment.join(',')}`;
  if (epPoolCache.has(cacheKey)) return epPoolCache.get(cacheKey);
  const routes = epRouteTable(), pool = [];
  for (const [firstKey, first] of routes) {
    if (firstKey === '01234567' || firstKey === targetKey) continue;
    const inverse = [];
    first.permutation.forEach((value, index) => { inverse[value] = index; });
    const correction = targetPermutation.map(value => inverse[value]).join('');
    const second = routes.get(correction);
    const fixMiddle = (first.middleFlipped !== second.middleFlipped) !== reference.middleFlipped;
    const setup = normalizeSquare1Algorithm([first.alg, second.alg, fixMiddle ? MIDDLE_FLIP : '', tuple(-alignment[0], -alignment[1])].join(' '));
    pool.push({ alg: endingTurn(setup, 0, 0), slashes: sliceCount(setup) });
  }
  // A deliberately varied two-stage route conceals the selected algorithm.
  // Keep setups practical while avoiding very short, recognisable inverses.
  const shortest = Math.min(...pool.map(entry => entry.slashes));
  const practical = pool.filter(entry => entry.slashes >= 12 && entry.slashes <= Math.max(18, shortest + 4));
  const result = (practical.length ? practical : pool).map(entry => entry.alg);
  epPoolCache.set(cacheKey, result); return result;
}

function drill(stage, { caseId = '', alg = '', orientation = '', scrambleStyle = 'disguised', layerAlignment = 'random', random = Math.random } = {}) {
  if (orientation !== '') throw new Error('Square-1 uses the illustrated reference grip.');
  if (!['provided', 'disguised'].includes(scrambleStyle)) throw new Error('Unknown Square-1 setup style.');
  if (!['reference', 'random'].includes(layerAlignment)) throw new Error('Unknown Square-1 layer alignment.');
  const cases = stage === 'obl' ? CASES_SQ1_OBL : CASES_SQ1_EP, item = cases.find(entry => entry.id === caseId);
  if (!item) throw new Error('Choose a valid Square-1 case.');
  const algorithm = validate(alg || item.algorithms[0].alg, item, stage);
  const inverse = inverseSquare1(algorithm), reference = applySquare1Alg(START, inverse);
  let setup = inverse;
  if (scrambleStyle === 'disguised') {
    const raw = stage === 'obl' ? oblSetups(item, reference) : epSetups(reference);
    const inverseKey = normalizeSquare1Algorithm(inverse);
    const pool = raw.filter(candidate => {
      const key = normalizeSquare1Algorithm(candidate);
      return key !== inverseKey && !key.endsWith(' ' + inverseKey) && (stage !== 'obl' || sliceCount(key) >= 3);
    });
    if (!pool.length) throw new Error('No alternate setup is available for this algorithm.');
    setup = pick(pool, random);
  }
  const a = layerAlignment === 'random' ? pick(SQUARE1_LAST_LAYER_TURNS, random) : 0;
  const b = layerAlignment === 'random' ? pick(SQUARE1_LAST_LAYER_TURNS, random) : 0;
  const scramble = layerAlignment === 'random' ? endingTurn(setup, a, b) : setup;
  const alignment = layerAlignment === 'random' ? tuple(-a, -b) : '';
  const solution = [alignment, algorithm].filter(Boolean).join(' '), state = applySquare1Alg(START, scramble);
  const outcome = applySquare1Alg(state, solution);
  if (!(stage === 'obl' ? isOBLSolved(outcome) : isEPSolved(outcome))) throw new Error('The generated setup does not match the selected solution.');
  return { caseId, state, setup, scramble, solution, orientation: '', scrambleStyle, layerAlignment,
    initialTop: a, initialBottom: b, alignment, stage };
}
export const createOBLDrill = options => drill('obl', options);
export const createEPDrill = options => drill('ep', options);
