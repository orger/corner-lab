/** The user's 13-row 5×5 last-two-edges table, in its original row order.
 * Algorithm text, including grouping and half-turn prime spelling, is preserved.
 * Column 1 is the supplied setup; column 2 is the supplied solution and default.
 * The setup can also be selected for reverse-direction practice with its own
 * matching scramble. See docs/5X5-GUIDE.md.
 */
export const SETS5 = ['L2E'];
export const GROUPS5 = ['Easy inserts', 'Centre swaps', 'Parity', 'Double broken', 'Double same', 'Double alternating'];

const rows = [
  ['same alt same 12 easy', 'Easy inserts', [
    "Rw' F R' F' R U' R U Rw",
    "Rw' U' R' U (R' F R F') Rw",
  ]],
  ['same alt same 12 easy', 'Easy inserts', [
    "Rw F R' F' R U' R U 3Lw'",
    "3Lw U' R' U (R' F R F') Rw'",
  ]],
  ['centres swapped both bad', 'Centre swaps', [
    'Rw2 F2 U2 Rw2 U2 F2 Rw2',
    "Rw2' F2 U2' Rw2' U2' F2 Rw2",
    'Uw2 R2 F2 Uw2 F2 R2 Uw2',
  ]],
  ['2 centres flipped (flip 2 edges around other centre)', 'Centre swaps', [
    "Lw Rw' F R' F' R U' R U Lw' Rw",
    "Rw' Lw U' R' U (R' F R F') Rw Lw'",
  ]],
  ['Regular parity case', 'Parity', [
    "Rw U2 Rw U2 Rw' U2 3Rw U2 Lw' U2 Rw U2 Rw' U2 Rw' x' U2 Rw'",
    "Rw U2 x Rw U2 Rw U2' Rw' U2 Lw U2 3Rw' U2' Rw U2 Rw' U2' Rw'",
  ]],
  ['both broken 12 case', 'Double broken', [
    "Rw2 U2 Lw' U2 3Rw U2 Rw' U2 x' U2 Rw' U2 Rw'",
    "Rw U2 Rw U2' x U2 Rw U2' 3Rw' U2 Lw U2' Rw2",
  ]],
  ['both same 12 21', 'Double same', [
    "Rw2 U2 Rw U2 Rw' U2 Rw U2 Rw F2 Rw U2 Rw' U2 Rw' F2",
    "F2 Rw U2 Rw U2' Rw' F2 Rw' U2 Rw' U2' Rw U2 Rw' U2' Rw2",
  ]],
  ['both same 21 12', 'Double same', [
    "Rw2 U2 Rw' U2 Rw U2 Rw' U2 Rw' B2 Rw' U2 Rw U2 Rw B2",
    "B2 Rw' U2 Rw' U2' Rw B2 Rw U2 Rw U2' Rw' U2 Rw U2' Rw2",
  ]],
  ['both alt 12 21', 'Double alternating', [
    "Rw' U2 Rw2 U2 Rw U2 Rw' U2 Rw U2 Rw2 U2 Rw'",
    "Rw U2 Rw2 U2' Rw' U2 Rw U2' Rw' U2 Rw2 U2' Rw",
  ]],
  ['both alt 21 12', 'Double alternating', [
    "Rw U2 Rw2 U2 Rw' U2 Rw U2 Rw' U2 Rw2 U2 Rw",
    "Rw' U2' Rw2 U2' Rw U2' Rw' U2 Rw U2' Rw2 U2' Rw'",
  ]],
  ['both alt broken 12 21', 'Double alternating', [
    "Rw2 U2 Rw' U2 Rw U2 Rw' U2 Rw' U2 3Lw U2 Rw' U2 Rw",
    "Rw' U2 Rw U2' 3Lw' U2 Rw U2 Rw U2' Rw' U2 Rw U2' Rw2",
  ]],
  ['centres swapped one bad one good good c. back', 'Centre swaps', [
    "Rw2 U2 Rw U2 Rw' U2 Rw U2 x U2 Rw U2 Rw B2 Rw2",
    "Rw2 B2 Rw' U2 Rw' U2' x' U2 Rw' U2' Rw U2 Rw' U2' Rw2",
  ]],
  ['centres swapped both good', 'Centre swaps', [
    "Rw U R' U' Rw2 U' R' U Rw2 U R' U' Rw'",
    "Rw U R U' Rw2 U' R U Rw2 U R U' Rw'",
  ]],
];

export const CASES5 = rows.map(([originalName, group, algorithms], index) => {
  const id = `LTE-${String(index + 1).padStart(2, '0')}`;
  const name = index === 0 ? `${originalName} (Rw setup)` : index === 1 ? `${originalName} (3Lw setup)` : originalName;
  return {
    id, puzzle: '5x5', set: 'L2E', group, name, originalName, sourceRow: index + 1,
    defaultAlgorithmId: `${id}-a2`,
    algorithms: algorithms.map((alg, column) => ({
      id: `${id}-a${column + 1}`, alg, sourceAlg: alg, source: 'Your algorithm table',
      label: ['Reverse direction', 'Solve · supplied algorithm', 'Other axis'][column], sourceColumn: column + 1,
      direction: column === 0 ? 'forward' : column === 1 ? 'inverse' : 'additional',
      ...(column === 1 ? { inverseOf: `${id}-a1`, setupAlg: algorithms[0] } : {}),
    })),
  };
});

export const CASES5_BY_ID = new Map(CASES5.map(item => [item.id, item]));
