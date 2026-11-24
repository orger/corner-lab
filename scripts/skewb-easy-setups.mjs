import assert from 'node:assert/strict';
import { solvedSkewb, applySkewbAlg, inverseSkewb, isSkewbFaceSolved, isSolvedSkewb } from '../app/skewb.js';

// Build-time search only. Runtime practice reads the generated, verified pool.
// WCA U/R/L/B preserve the UFR anchor. Choose the physically rotated solved
// orientation whose inverse solution restores that anchor, then find actual
// WCA routes from the standard white-up/green-front starting position.
const tokens = ['U', "U'", 'R', "R'", 'L', "L'", 'B', "B'"];
const identity = solvedSkewb();
const permutations = tokens.map(move => applySkewbAlg(identity, move, { notation: 'wca' }));
const step = (state, permutation) => permutation.map(index => state[index]);
const key = state => String.fromCharCode(...state);
const sameAxis = (a, b) => Math.floor(a / 2) === Math.floor(b / 2);
const inversePath = path => path.slice().reverse().map(index => index ^ 1);
const format = path => path.map(index => tokens[index]).join(' ');
const anchor = identity.filter(index => permutations.every(move => move[index] === index));
const orientations = [{ state: identity, alg: '' }], orientationKeys = new Set([key(identity)]);
for (let i = 0; i < orientations.length; i++) for (const move of ['x', 'y', 'z']) {
  const state = applySkewbAlg(orientations[i].state, move), stateKey = key(state);
  if (!orientationKeys.has(stateKey)) {
    orientationKeys.add(stateKey);
    orientations.push({ state, alg: [orientations[i].alg, move].filter(Boolean).join(' ') });
  }
}
assert.equal(orientations.length, 24);
assert.equal(anchor.length, 3);

let forwardTable;
function forwardRoutes() {
  if (forwardTable) return forwardTable;
  const queue = [{ state: identity, path: [] }], seen = new Map([[key(identity), queue[0]]]);
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node.path.length === 5) continue;
    for (let move = 0; move < tokens.length; move++) {
      if (node.path.length && sameAxis(node.path.at(-1), move)) continue;
      const state = step(node.state, permutations[move]), stateKey = key(state);
      if (seen.has(stateKey)) continue;
      const next = { state, path: [...node.path, move] };
      seen.set(stateKey, next); queue.push(next);
    }
  }
  forwardTable = seen; return seen;
}

export function prepareEasySkewbSetups(solution, count = 20) {
  const references = orientations.map(frame => ({ ...frame, target: applySkewbAlg(frame.state, inverseSkewb(solution)) }))
    .filter(frame => anchor.every(index => frame.target[index] === index));
  assert.equal(references.length, 1, 'The reference must have one unambiguous WCA anchor frame.');
  const reference = references[0], targetKey = key(reference.target);
  assert(isSkewbFaceSolved(reference.target, 'D'));
  assert(!isSolvedSkewb(reference.target));
  assert.deepEqual(applySkewbAlg(reference.target, solution), reference.state);

  const forward = forwardRoutes(), routes = new Map(), visited = new Set([targetKey]);
  function retain(path) {
    if (path.some((move, i) => i && sameAxis(move, path[i - 1]))) return;
    let state = identity;
    const seen = new Set([key(state)]);
    for (const move of path) {
      state = step(state, permutations[move]);
      const stateKey = key(state);
      if (seen.has(stateKey)) return; // Reject cancelling moves and longer identity padding.
      seen.add(stateKey);
    }
    assert.equal(key(state), targetKey);
    routes.set(format(path), path.length);
  }
  function search(state, path) {
    const match = forward.get(key(state));
    if (match) retain([...match.path, ...inversePath(path)]);
    if (path.length === 5) return;
    for (let move = 0; move < tokens.length; move++) {
      if (path.length && sameAxis(path.at(-1), move)) continue;
      const next = step(state, permutations[move]), stateKey = key(next);
      if (visited.has(stateKey)) continue;
      visited.add(stateKey); search(next, [...path, move]); visited.delete(stateKey);
    }
  }
  search(reference.target, []);
  // Stable ASCII ordering keeps generated releases identical across platforms.
  const choices = [...routes].sort(([a, lengthA], [b, lengthB]) => lengthA - lengthB || (a < b ? -1 : a > b ? 1 : 0));
  assert(choices.length > count, 'Need a direct setup plus twenty alternate routes.');
  const setup = choices[0][0], scrambles = choices.slice(1, count + 1).map(([alg]) => alg);
  return { setup, scrambles, referenceSolvedOrientation: reference.alg };
}
