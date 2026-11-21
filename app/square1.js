/** Square-1 geometry. Each layer is twelve 30° sectors, clockwise as viewed
 * directly from OUTSIDE that layer. A corner occupies two adjacent sectors.
 * The bottom outside view already reverses global orientation, so a slice
 * exchanges corresponding six-sector halves without reversing their arrays.
 * Geometry/notation reference: https://www.jaapsch.net/puzzles/square1.htm
 */
const mod = n => ((n % 12) + 12) % 12;
const signed = n => { const v = mod(n); return v > 6 ? v - 12 : v; };
const rotate = (layer, amount) => layer.map((_, index) => layer[mod(index - amount)]);
const turn = (top, bottom) => ({ type: 'turn', top: signed(top), bottom: signed(bottom) });
const SLICE = Object.freeze({ type: 'slice' });

export function solvedSquare1() {
  return { top: Array.from({ length: 4 }, (_, i) => [`TC${i}`, `TC${i}`, `TE${i}`]).flat(),
    bottom: Array.from({ length: 4 }, (_, i) => [`BE${i}`, `BC${i}`, `BC${i}`]).flat(), middleFlipped: false };
}
export function parseSquare1Alg(text = '') {
  if (typeof text !== 'string') throw new TypeError('Square-1 algorithm must be text.');
  if (text.length > 12000) throw new Error('Square-1 algorithm is too long.');
  const result = []; let offset = 0;
  while (offset < text.length) {
    const space = /^\s+/.exec(text.slice(offset));
    if (space) { offset += space[0].length; continue; }
    if (text[offset] === '/') {
      result.push(SLICE); offset++;
      if (result.length > 1000) throw new Error('Square-1 algorithm has too many moves.');
      continue;
    }
    const parenthesized = text[offset] === '(';
    const match = (parenthesized ? /^\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*\)/ : /^([+-]?\d+)\s*,\s*([+-]?\d+)/).exec(text.slice(offset));
    if (!match) throw new Error(`Invalid Square-1 notation near “${text.slice(offset, offset + 24)}”. Use (top,bottom) and /.`);
    const a = Number(match[1]), b = Number(match[2]);
    if (!Number.isInteger(a) || !Number.isInteger(b) || Math.abs(a) > 6 || Math.abs(b) > 6) throw new Error('Square-1 turns must be whole numbers from −6 to 6.');
    result.push(turn(a, b)); offset += match[0].length;
    if (result.length > 1000) throw new Error('Square-1 algorithm has too many moves.');
  }
  return result;
}
export function formatSquare1Alg(moves) {
  return moves.map(move => move.type === 'slice' ? '/' : `(${signed(move.top)},${signed(move.bottom)})`).join(' ');
}
export function inverseSquare1(text = '') {
  return formatSquare1Alg(parseSquare1Alg(text).reverse().map(move => move.type === 'slice' ? SLICE : turn(-move.top, -move.bottom)));
}
export function isSliceableSquare1(state) {
  return [state.top, state.bottom].every(layer => layer[11] !== layer[0] && layer[5] !== layer[6]);
}
export function applySquare1Alg(initial, text = '') {
  const state = { top: [...initial.top], bottom: [...initial.bottom], middleFlipped: Boolean(initial.middleFlipped) };
  for (const move of parseSquare1Alg(text)) {
    if (move.type === 'turn') { state.top = rotate(state.top, move.top); state.bottom = rotate(state.bottom, move.bottom); }
    else {
      if (!isSliceableSquare1(state)) throw new Error('Illegal Square-1 slice: a corner crosses the slice line.');
      const topHalf = state.top.slice(0, 6);
      state.top.splice(0, 6, ...state.bottom.slice(0, 6)); state.bottom.splice(0, 6, ...topHalf);
      state.middleFlipped = !state.middleFlipped;
    }
  }
  return state;
}
export function square1LayerPieces(layer) {
  const first = layer.findIndex((piece, i) => piece !== layer[mod(i - 1)]);
  const result = [];
  for (let n = 0; n < 12;) {
    const start = mod(first + n), id = layer[start]; let width = 1;
    while (n + width < 12 && layer[mod(start + width)] === id) width++;
    result.push({ id, start, width }); n += width;
  }
  return result;
}
export function square1LayerSignature(layer) {
  const widths = square1LayerPieces(layer).map(piece => piece.width).join('');
  return Array.from({ length: widths.length }, (_, i) => widths.slice(i) + widths.slice(0, i)).sort()[0];
}
export const square1ShapeKey = state => `${square1LayerSignature(state.top)}-${square1LayerSignature(state.bottom)}`;
export const isCubeShape = state => [state.top, state.bottom].every(layer => square1LayerSignature(layer) === '12121212');
export function square1LegalRotations(layer) {
  return [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6].filter(amount => {
    const next = rotate(layer, amount); return next[11] !== next[0] && next[5] !== next[6];
  });
}
/** Breadth-first traversal of shapes modulo independent layer rotations.
 * Retains layer order and reflections; each edge is one legal slash plus free
 * layer alignment. It therefore finds shortest solutions in slash metric.
 * Permutation parity and middle-layer orientation are deliberately outside
 * cube-shape training; neither affects this shape graph.
 */
export function generateSquare1Shapes() {
  const start = solvedSquare1(), queue = [{ state: start, key: square1ShapeKey(start), setup: '', slashes: 0 }];
  const seen = new Set([queue[0].key]);
  for (let index = 0; index < queue.length; index++) {
    const node = queue[index];
    for (const a of square1LegalRotations(node.state.top)) for (const b of square1LegalRotations(node.state.bottom)) {
      const step = `${a || b ? `(${a},${b}) ` : ''}/`;
      const state = applySquare1Alg(node.state, step), key = square1ShapeKey(state);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ state, key, setup: `${node.setup} ${step}`.trim(), slashes: node.slashes + 1 });
    }
  }
  return queue;
}
const ALL_ROTATIONS = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6];
const MIN_DISGUISED_SLASHES = 5;
const MAX_DISGUISED_SLASHES = 8;
const pick = (items, random) => items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];
const boundaries = layer => layer.map((piece, index) => piece === layer[mod(index - 1)] ? '0' : '1').join('');

function legalTransitions(state) {
  const result = [];
  for (const top of square1LegalRotations(state.top)) for (const bottom of square1LegalRotations(state.bottom)) {
    const move = `${top || bottom ? `(${top},${bottom}) ` : ''}/`;
    const next = applySquare1Alg(state, move);
    result.push({ top, bottom, move, state: next, key: square1ShapeKey(next) });
  }
  return result;
}

let disguiseGraph;
const disguiseReachability = new Map();
function reachableIn(target) {
  // Build only on first use of disguised setups. Exact-length reachability is
  // a pruning bound for the short-route search; actual moves are checked below.
  if (!disguiseGraph) disguiseGraph = new Map(generateSquare1Shapes().map(node =>
    [node.key, new Set(legalTransitions(node.state).map(next => next.key).filter(key => key !== node.key))]));
  if (!disguiseReachability.has(target)) {
    const reachable = [new Set([target])];
    for (let depth = 1; depth <= MAX_DISGUISED_SLASHES; depth++) {
      const previous = reachable.at(-1);
      reachable.push(new Set([...disguiseGraph].filter(([, neighbours]) =>
        [...neighbours].some(key => previous.has(key))).map(([key]) => key)));
    }
    disguiseReachability.set(target, reachable);
  }
  return disguiseReachability.get(target);
}

function appendLayerTurn(algorithm, top, bottom) {
  const moves = parseSquare1Alg(algorithm), last = moves.at(-1);
  if (last?.type === 'turn') {
    moves[moves.length - 1] = turn(last.top + top, last.bottom + bottom);
  } else moves.push(turn(top, bottom));
  // Keep a final (0,0) visible: it is a legitimate random outcome and makes the
  // end-of-setup layer adjustment explicit rather than stopping at the slash.
  return formatSquare1Alg(moves);
}

/** Ignore initial/final layer alignment when comparing a route with an inverse.
 * Combining adjacent turns also makes equivalent preferred move spellings give
 * the same exclusion. Remove immediate inverse slice pairs after zero turns.
 */
function routeCore(algorithm) {
  const moves = [];
  for (const move of parseSquare1Alg(algorithm)) {
    const last = moves.at(-1);
    if (move.type === 'turn') {
      const combined = last?.type === 'turn' ? (moves.pop(), turn(last.top + move.top, last.bottom + move.bottom)) : move;
      if (combined.top || combined.bottom) moves.push(combined);
    } else if (last?.type === 'slice') moves.pop();
    else moves.push(move);
  }
  if (moves[0]?.type === 'turn') moves.shift();
  if (moves.at(-1)?.type === 'turn') moves.pop();
  return formatSquare1Alg(moves);
}

function orderedChoices(items, random) {
  if (!items.length) return [];
  const offset = Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)));
  return [...items.slice(offset), ...items.slice(0, offset)];
}

// A repeated geometric shape can carry a different piece permutation and is
// useful disguise. Repeating the same pieces up to layer turns or a whole-puzzle
// top/bottom flip is redundant, including a change to the untrained equator.
const pieceCycle = layer => layer.map((_, index) => [...layer.slice(index), ...layer.slice(0, index)].join(',')).sort()[0];
const pieceStateKey = state => [pieceCycle(state.top), pieceCycle(state.bottom)].sort().join('|');

function disguisedSetup(reference, inverseSetup, random) {
  const target = square1ShapeKey(reference), start = solvedSquare1(), startKey = square1ShapeKey(start);
  const reachable = reachableIn(target), excluded = routeCore(inverseSetup);
  // Choose moves only after finding a shape path. Rotational symmetry gives
  // many moves per shape edge; keeping them out of the graph search prevents
  // an infeasible short depth from exploring the same shape path repeatedly.
  const realize = path => {
    const visited = new Set([pieceStateKey(start)]);
    const finishCache = new Map();
    const candidatesFor = (state, index) => legalTransitions(state).filter(next => next.key === path[index] &&
      (!index || ((next.top || next.bottom) && !(next.top === 6 && next.bottom === 6))));
    // Reachability of this exact shape path depends only on oriented piece
    // boundaries. A dead end must not be retried for every colour permutation.
    const canFinish = (state, index) => {
      if (index === path.length) return true;
      const key = `${index}:${boundaries(state.top)}:${boundaries(state.bottom)}`;
      if (finishCache.has(key)) return finishCache.get(key);
      const possible = candidatesFor(state, index).some(next => canFinish(next.state, index + 1));
      finishCache.set(key, possible);
      return possible;
    };
    if (!canFinish(start, 0)) return null;
    let attempts = 0;
    function visit(state, index, moves) {
      // Identity exclusions depend on the path's physical states, so they are
      // not memoized with the geometry check above. Bound rare exhaustive
      // branches and try a different short route instead of blocking the UI.
      if (++attempts > 64) return null;
      if (index === path.length) {
        const algorithm = moves.join(' ');
        return routeCore(algorithm) === excluded ? null : { state, algorithm };
      }
      const candidates = candidatesFor(state, index).filter(next => canFinish(next.state, index + 1));
      // / / cancels; / (6,6) / only swaps the layers as a whole-puzzle regrip.
      // Neither is counted towards the five useful slices of a disguised route.
      for (const next of orderedChoices(candidates, random)) {
        if (attempts >= 64) break;
        const key = pieceStateKey(next.state);
        if (visited.has(key)) continue;
        visited.add(key);
        const result = visit(next.state, index + 1, [...moves, next.move]);
        visited.delete(key);
        if (result) return result;
      }
      return null;
    }
    return visit(start, 0, []);
  };
  let result;
  for (let depth = MIN_DISGUISED_SLASHES; depth <= MAX_DISGUISED_SLASHES && !result; depth++) {
    if (!reachable[depth].has(startKey)) continue;
    const visits = new Map([[startKey, 1]]);
    function findPath(key, remaining, path) {
      if (!remaining) return key === target ? realize(path) : null;
      const choices = [...disguiseGraph.get(key)].filter(next => next !== startKey && reachable[remaining - 1].has(next));
      // Prefer new shapes, but do not prohibit repeats: every route out of cube
      // shape passes through Kite/Kite, including routes targeting Kite/Kite.
      const ordered = [...orderedChoices(choices.filter(next => !visits.has(next)), random),
        ...orderedChoices(choices.filter(next => visits.has(next)), random)];
      for (const next of ordered) {
        visits.set(next, (visits.get(next) || 0) + 1);
        const found = findPath(next, remaining - 1, [...path, next]);
        if (visits.get(next) === 1) visits.delete(next); else visits.set(next, visits.get(next) - 1);
        if (found) return found;
      }
      return null;
    }
    result = findPath(startKey, depth, []);
  }
  if (!result) throw new Error('Could not construct a short disguised Square-1 setup.');
  // No intermediate cube shape or repeated piece state: the minimum length
  // comes from a genuine route, not a premix followed by the inverse or padding.
  const { state, algorithm } = result;
  // A shape solver need not restore colours/permutation. Match only the piece
  // boundaries so the preferred case algorithm still applies in its normal grip.
  const align = (actual, desired) => {
    const wanted = boundaries(desired);
    const amount = ALL_ROTATIONS.find(value => boundaries(rotate(actual, value)) === wanted);
    if (amount === undefined) throw new Error('Disguised setup did not reach the selected Square-1 shape.');
    return amount;
  };
  return appendLayerTurn(algorithm, align(state.top, reference.top), align(state.bottom, reference.bottom));
}

export function createSquare1Drill({ caseId = '', alg = '', orientation = '', scrambleStyle = 'provided',
  layerAlignment = scrambleStyle === 'provided' ? 'reference' : 'random', random = Math.random } = {}) {
  if (orientation !== '') throw new Error('Square-1 uses the illustrated reference grip.');
  if (!['provided', 'varied', 'disguised'].includes(scrambleStyle)) throw new Error('Unknown Square-1 setup style.');
  if (!['reference', 'random'].includes(layerAlignment)) throw new Error('Unknown Square-1 layer alignment.');
  const inverseSetup = inverseSquare1(alg), reference = applySquare1Alg(solvedSquare1(), inverseSetup);
  if (isCubeShape(reference)) throw new Error('Choose an unsolved cube-shape case.');
  if (!isCubeShape(applySquare1Alg(reference, alg))) throw new Error('This algorithm does not restore cube shape.');
  const setup = scrambleStyle === 'disguised' ? disguisedSetup(reference, inverseSetup, random) : inverseSetup;
  const a = layerAlignment === 'random' ? pick(ALL_ROTATIONS, random) : 0;
  const b = layerAlignment === 'random' ? pick(ALL_ROTATIONS, random) : 0;
  const alignment = layerAlignment === 'random' ? `(${a},${b})` : '';
  const scramble = layerAlignment === 'random' ? appendLayerTurn(setup, a, b) : setup;
  const solution = [inverseSquare1(alignment), alg].filter(Boolean).join(' ');
  return { caseId, state: applySquare1Alg(solvedSquare1(), scramble), setup, scramble, solution, orientation: '', scrambleStyle,
    layerAlignment, initialTop: a, initialBottom: b, alignment: inverseSquare1(alignment) };
}
