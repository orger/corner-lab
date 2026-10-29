// Catalog build/test helpers. No runtime dependency or remote requests.
import { AUFS, applyAlg, inverse, solvedState, isSolved, normalizeAlg, cubeOrientations, parseAlg } from '../app/cube.js';

export const YAWS = ['', 'y', 'y2', "y'"];
export const join = (...parts) => parts.filter(Boolean).join(' ');

export function compactAlgorithm(algorithm) {
  const result = [];
  for (const move of parseAlg(algorithm)) {
    if (result.at(-1)?.face === move.face) {
      const turns = (result.pop().turns + move.turns) % 4;
      if (turns) result.push({ face: move.face, turns });
    } else result.push(move);
  }
  return result.map(({ face, turns }) => face + (turns === 2 ? '2' : turns === 3 ? "'" : '')).join(' ');
}

/** A source's picture/AUF may differ. Explicit setup is retained in the result. */
export function alignAlgorithm(canonical, candidate, { rotations = true } = {}) {
  candidate = normalizeAlg(candidate);
  const start = applyAlg(solvedState(), inverse(canonical));
  const endings = rotations ? ['', ...cubeOrientations().filter(Boolean)] : [''];
  // Prefer U/y setups. Some sources place their completed first face on top;
  // investigate all physical starting frames before excluding those choices.
  const setupGroups = [YAWS, cubeOrientations().filter(rotation => !YAWS.includes(rotation))];
  for (const setups of setupGroups) for (const endRotation of endings) for (const rotation of setups) for (const auf of AUFS) {
    const setup = join(auf, rotation);
    const end = applyAlg(start, join(setup, candidate, endRotation));
    for (const finalAuf of AUFS) if (isSolved(applyAlg(end, finalAuf))) {
      const rotated = applyAlg(end, finalAuf);
      const frameCorrection = cubeOrientations().find(rotation => applyAlg(rotated, rotation).join('') === solvedState().join(''));
      return Object.fromEntries(Object.entries({ alg: join(setup, candidate, endRotation, finalAuf, frameCorrection), setup, finalAuf, endRotation, frameCorrection }).map(([key, value]) => [key, compactAlgorithm(value)]));
    }
  }
  return null;
}

// Equivalence includes starting U AUF, physical yaw, full color-frame yaw and
// cyclic relabeling of the four upper cubies (final AUF). In EG1 these last two
// operations differ because the bottom has a bar. All preserve chirality.
const colorFrames = YAWS.map(yaw => {
  const frame = applyAlg(solvedState(), yaw);
  return Object.fromEntries(['U', 'R', 'F', 'D', 'L', 'B'].map((face, i) => [face, frame[i * 4]]));
});
export function caseOrbit(state) {
  const keys = new Set();
  const topIndices = new Set(TOP_CORNERS.flat());
  for (const upperColors of colorFrames) for (const colors of colorFrames) for (const yaw of YAWS) for (const auf of AUFS) {
    const recolored = state.map((c, i) => colors[topIndices.has(i) ? upperColors[c] : c]);
    keys.add(applyAlg(recolored, join(yaw, auf)).join(''));
  }
  return keys;
}
export function caseKey(state) { return [...caseOrbit(state)].sort()[0]; }

// Corner sticker cycles all have the same chirality. These are UFR, URB,
// UBL, ULF and DFR, DFL, DLB, DBR in the engine's facelet convention.
export const TOP_CORNERS = [[3, 4, 9], [1, 20, 5], [0, 16, 21], [2, 8, 17]];
export const BOTTOM_CORNERS = [[13, 11, 6], [12, 19, 10], [14, 23, 18], [15, 7, 22]];

export function* permutations(items) {
  if (!items.length) { yield []; return; }
  for (let i = 0; i < items.length; i++) {
    for (const rest of permutations(items.filter((_, j) => i !== j))) yield [items[i], ...rest];
  }
}

/** Exactly 4! × 3³ = 648 legal upper-layer states above one fixed bottom. */
export function* topStates(bottomState = solvedState()) {
  const solved = solvedState();
  for (const permutation of permutations([0, 1, 2, 3])) {
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
      const twists = [a, b, c, (6 - a - b - c) % 3];
      const state = [...bottomState];
      TOP_CORNERS.forEach((indices, position) => indices.forEach((index, sticker) => {
        state[index] = solved[TOP_CORNERS[permutation[position]][(sticker + twists[position]) % 3]];
      }));
      yield state;
    }
  }
}
