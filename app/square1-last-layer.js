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
const MIN_DISGUISED_SLICES = 5;

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
// Starting/finishing U/D adjustments do not disguise an otherwise unchanged
// inverse. Compare the actual route between its first and last slices.
function routeKey(alg) {
  const normalized = normalizeSquare1Algorithm(alg);
  return normalized.slice(normalized.indexOf('/'), normalized.lastIndexOf('/') + 1);
}
function compactPool(candidates) {
  const byRoute = new Map();
  for (const candidate of candidates) {
    const alg = normalizeSquare1Algorithm(candidate), slashes = sliceCount(alg);
    if (slashes < MIN_DISGUISED_SLICES) continue;
    // Two slices separated by a half-turn of both layers merely exchange the
    // complete layers. Do not count that regrip as extra disguise practice.
    const moves = parseSquare1Alg(alg);
    if (moves.some((move, index) => move.type === 'turn' && move.top === 6 && move.bottom === 6 &&
      moves[index - 1]?.type === 'slice' && moves[index + 1]?.type === 'slice')) continue;
    const key = routeKey(alg), old = byRoute.get(key);
    if (!old || alg.length < old.alg.length) byRoute.set(key, { alg: endingTurn(alg, 0, 0), slashes });
  }
  return [...byRoute.values()].sort((a, b) => a.slashes - b.slashes || a.alg.length - b.alg.length).slice(0, 64).map(entry => entry.alg);
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
  const rawRoutes = new Set([...item.scrambles, ...item.algorithms.flatMap(entry => [inverseSquare1(entry.alg), entry.alg])]);
  const aligned = [];
  for (const raw of rawRoutes) for (const prefix of ['', COLOUR_SWAP]) {
    const setup = normalizeSquare1Algorithm(prefix + ' ' + raw);
    try {
      const alignment = alignColours(applySquare1Alg(START, setup), reference);
      if (alignment) aligned.push(endingTurn(setup, ...alignment));
    } catch { /* A forward solution need not be executable from solved. */ }
  }
  // Very easy OBL cases have only one-to-four-slice source routes. Combine
  // those with a short, nonidentity edge permutation, rather than padding an
  // inverse with cancelling moves. These prefixes genuinely move pieces and
  // preserve the solved layer colours, so every aligned colour pattern stays
  // correct. Longer OBL cases use their short source/algorithm alternatives.
  const prefixes = shortEPPrefixes();
  const pool = compactPool([...aligned, ...aligned.filter(alg => sliceCount(alg) < MIN_DISGUISED_SLICES)
    .flatMap(alg => prefixes.map(prefix => prefix.alg + ' ' + alg))]);
  oblPoolCache.set(cacheKey, pool);
  return pool;
}

let epRoutes, epPrefixes;
function buildEPRoutes(maxSlices = Infinity) {
  // Exactly 24 × 24 edge permutations after corners have been aligned. Each
  // macro restores the same corner positions and standard layer alignment.
  const routes = new Map([['01234567', [{ alg: '', permutation: [0, 1, 2, 3, 4, 5, 6, 7], middleFlipped: false, slashes: 0 }]]]);
  const seen = new Set();
  for (const item of CASES_SQ1_EP) {
    for (const algorithm of item.algorithms) {
      if (sliceCount(algorithm.alg) > maxSlices) continue;
      for (const direction of [inverseSquare1(algorithm.alg), algorithm.alg]) for (const swap of [false, true]) for (const mirror of [false, true]) {
      // Exchanging U/D and reflecting both layers commute with the slice.
      // Either transform alone exchanges the two standard boundary patterns;
      // (1,-1) supplies that initial grip. Simulate each resulting macro to
      // verify cube shape, solved corners and oriented edges before using it.
      const moves = parseSquare1Alg(direction).map(move => {
        if (move.type === 'slice') return move;
        const [a, b] = swap ? [move.bottom, move.top] : [move.top, move.bottom];
        return { type: 'turn', top: mirror ? -a : a, bottom: mirror ? -b : b };
      });
      const transformed = (swap !== mirror ? '(1,-1) ' : '') + formatSquare1Alg(moves);
      let base, endpoint, permutation;
      try {
        const state = applySquare1Alg(START, transformed), alignment = cornerAlignment(state);
        base = normalizeSquare1Algorithm(transformed + ' ' + tuple(...alignment));
        if (seen.has(base)) continue;
        seen.add(base);
        endpoint = applySquare1Alg(state, tuple(...alignment)); permutation = edgePermutation(endpoint);
      } catch { continue; }
      const baseMoves = parseSquare1Alg(base), first = baseMoves[0], last = baseMoves.at(-1);
      const begin = first?.type === 'turn' ? first : { top: 0, bottom: 0 };
      const end = last?.type === 'turn' ? last : { top: 0, bottom: 0 };
      const core = base.slice(base.indexOf('/'), base.lastIndexOf('/') + 1);
      for (const a of SQUARE1_LAST_LAYER_TURNS) for (const b of SQUARE1_LAST_LAYER_TURNS) {
        // The base is already normalized; conjugation changes only its first
        // and last tuples, so do not parse the whole sequence sixteen times.
        const before = [signed(begin.top + a), signed(begin.bottom + b)];
        const after = [signed(end.top - a), signed(end.bottom - b)];
        const alg = [before.some(Boolean) ? tuple(...before) : '', core, after.some(Boolean) ? tuple(...after) : ''].filter(Boolean).join(' ');
        // Conjugation changes only the edge labels/positions. Computing it
        // directly avoids resimulating every macro's sixteen quarter-turn
        // variants, which otherwise dominates first-use time on phones.
        const conjugated = [a, b].flatMap((amount, side) => {
          const n = MOD(amount) / 3, offset = side * 4;
          return [0, 1, 2, 3].map(i => (permutation[offset + (i + n) % 4] - offset - n + 4) % 4 + offset);
        });
        const key = conjugated.join('');
        const entry = { alg, permutation: conjugated, middleFlipped: endpoint.middleFlipped, slashes: sliceCount(alg), route: core };
        const options = routes.get(key) || [];
        if (!options.some(option => option.route === entry.route && option.middleFlipped === entry.middleFlipped)) options.push(entry);
        routes.set(key, options);
      }
      }
    }
  }
  for (const options of routes.values()) options.sort((a, b) => a.slashes - b.slashes || a.alg.length - b.alg.length);
  return routes;
}
function epRouteTable() {
  if (!epRoutes) {
    epRoutes = buildEPRoutes();
    if (epRoutes.size !== 576) throw new Error('The EP algorithm catalogue is incomplete.');
  }
  return epRoutes;
}
function shortEPPrefixes() {
  // Easy OBL needs only these few short routes, not the full EP lookup.
  if (!epPrefixes) epPrefixes = [...buildEPRoutes(4).values()].map(options => options[0]).filter(route => route.slashes)
    .sort((a, b) => a.slashes - b.slashes || a.alg.length - b.alg.length);
  return epPrefixes;
}
const epPoolCache = new Map();
function epSetups(reference) {
  const alignment = cornerAlignment(reference), target = applySquare1Alg(reference, tuple(...alignment));
  const targetPermutation = edgePermutation(target), targetKey = targetPermutation.join('');
  const cacheKey = `${targetKey}:${reference.middleFlipped}`;
  const inReferenceGrip = pool => pool.map(alg => endingTurn(alg, -alignment[0], -alignment[1]));
  if (epPoolCache.has(cacheKey)) return inReferenceGrip(epPoolCache.get(cacheKey));
  const routes = epRouteTable(), pool = [];
  const finish = (first, second = { alg: '', middleFlipped: false }) => {
    const flip = (first.middleFlipped !== second.middleFlipped) !== reference.middleFlipped;
    const parts = flip ? [[MIDDLE_FLIP, first.alg, second.alg], [first.alg, MIDDLE_FLIP, second.alg], [first.alg, second.alg, MIDDLE_FLIP]] : [[first.alg, second.alg]];
    for (const route of parts) pool.push(route.join(' '));
  };
  // First consider every verified alternative, including the opposite
  // direction and both middle orientations. Many cases need no composition.
  for (const direct of routes.get(targetKey)) finish(direct);
  // Short combinations provide alternatives for cases with only one source
  // algorithm and bring very short cases up to the five-slice practice floor.
  // Keep the best route for each middle orientation when combining, and use
  // a short (at most five-slice) component on at least one side. This bounded
  // search finds practical alternatives without slowing down phone practice.
  const representatives = options => [false, true].map(middle => options.find(route => route.middleFlipped === middle)).filter(Boolean);
  for (const [firstKey, firstOptions] of routes) {
    if (firstKey === '01234567' || firstKey === targetKey) continue;
    for (const first of representatives(firstOptions)) {
      const inverse = [];
      first.permutation.forEach((value, index) => { inverse[value] = index; });
      const correction = targetPermutation.map(value => inverse[value]).join('');
      for (const second of representatives(routes.get(correction))) {
        if (first.slashes <= 5 || second.slashes <= 5) finish(first, second);
      }
    }
  }
  const result = compactPool(pool);
  epPoolCache.set(cacheKey, result); return inReferenceGrip(result);
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
    const inverseKey = normalizeSquare1Algorithm(inverse), preferredRoute = routeKey(inverse);
    const pool = raw.filter(candidate => {
      const key = normalizeSquare1Algorithm(candidate);
      return routeKey(key) !== preferredRoute && !key.endsWith(' ' + inverseKey);
    });
    if (!pool.length) throw new Error('No alternate setup is available for this algorithm.');
    const shortest = sliceCount(pool[0]);
    // Usually choose among the shortest routes and routes just one slice
    // longer. If only one route exists at that length, include the next
    // distinct route as well (EP's fixed middle orientation fixes parity, so
    // its next possible length can be two slices longer).
    const ceiling = sliceCount(pool[Math.min(1, pool.length - 1)]) === shortest ? shortest :
      Math.max(shortest + 1, sliceCount(pool[Math.min(1, pool.length - 1)]));
    setup = pick(pool.filter(candidate => sliceCount(candidate) <= ceiling), random);
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
