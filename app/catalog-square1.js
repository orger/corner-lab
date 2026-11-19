import { generateSquare1Shapes, inverseSquare1, square1LayerSignature } from './square1.js';

export const SQUARE1_SOURCE_URL = 'https://www.jaapsch.net/puzzles/square1.htm';
export const SQUARE1_SOURCE = 'Corner Lab shape search · geometry and names referenced to Jaap’s Puzzle Page';
export const SETS_SQ1 = ['CS'];
const canonical = text => {
  const widths = text.replaceAll('c', '2').replaceAll('e', '1');
  return Array.from({ length: widths.length }, (_, i) => widths.slice(i) + widths.slice(0, i)).sort()[0];
};
// Clockwise 4-corner/4-edge sequences from Jaap's shape definitions. Names
// identify geometric facts; all solution sequences are generated here.
const commonNames = new Map([
  ['cececece', 'Square'], ['ccecceee', 'Mushroom'], ['ccceecee', 'Shield'],
  ['cceecece', 'Right fist'], ['ccceceee', 'Left paw'], ['cceeccee', 'Barrel'],
  ['cccceeee', 'Scallop'], ['cceceece', 'Kite'], ['ccececee', 'Left fist'], ['ccceeece', 'Right paw'],
].map(([signature, name]) => [canonical(signature), name]));
export function square1ShapeName(signature) {
  if (commonNames.has(signature)) return commonNames.get(signature);
  const corners = [...signature].filter(value => value === '2').length;
  if (corners === 6) return 'Star';
  if (corners === 5) {
    const edges = [...signature].flatMap((value, index) => value === '1' ? [index] : []);
    const gap = Math.min(edges[1] - edges[0] - 1, signature.length - (edges[1] - edges[0]) - 1);
    return gap === 0 ? '5-corner · paired edges' : `5-corner · ${gap}-corner edge gap`;
  }
  // Unambiguous descriptive labels preserve both chiral 3-corner shapes.
  // Gap counts run clockwise, starting at the lexicographically lowest cycle.
  const first = signature.indexOf('2'), cycle = signature.slice(first) + signature.slice(0, first);
  const gaps = cycle.split('2').slice(1).map(part => part.length);
  const rotations = gaps.map((_, index) => [...gaps.slice(index), ...gaps.slice(0, index)]);
  rotations.sort((a, b) => a.join(',').localeCompare(b.join(',')));
  return `${corners}-corner · gaps ${rotations[0].join('–')}`;
}

/** Every ordered top/bottom shape pair, modulo independent layer rotations.
 * Of 170 possible pairs, the already-square pair is omitted. Mirrors and
 * upside-down cases remain distinct; middle shape and parity are unrestricted.
 */
export const CASES_SQ1 = generateSquare1Shapes().filter(item => item.slashes).map(item => {
  const id = `SQ1-${item.key}`;
  const topShape = square1LayerSignature(item.state.top), bottomShape = square1LayerSignature(item.state.bottom);
  const topName = square1ShapeName(topShape), bottomName = square1ShapeName(bottomShape);
  const algorithmId = `${id}-optimal`;
  return {
    id, set: 'CS', name: `${topName} / ${bottomName}`, group: `${item.slashes} ${item.slashes === 1 ? 'slash' : 'slashes'}`,
    slashes: item.slashes, topShape, bottomShape, topName, bottomName,
    defaultAlgorithmId: algorithmId, setup: item.setup,
    algorithms: [{ id: algorithmId, label: `Shortest shape solution · ${item.slashes} ${item.slashes === 1 ? 'slash' : 'slashes'}`,
      alg: inverseSquare1(item.setup), source: SQUARE1_SOURCE, sourceUrl: SQUARE1_SOURCE_URL }],
  };
});
export const GROUPS_SQ1 = [...new Set(CASES_SQ1.map(item => item.group))];
